import path from 'path';
import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { EventEmitter } from 'events';
import { PluginManifest, PluginContext } from '../shared/plugin-types';
import { BasePluginManager } from '../shared/plugin-core/BasePluginManager';
import { DSNNode } from './DSNNode';
import { AIProviderManager } from './AIProviderManager';
import { SecretsManager } from './SecretsManager';
import { ServiceRegistry } from './ServiceRegistry';
import { SignedEnvelopeService } from './SignedEnvelopeService';
import { TrustEvaluator } from './TrustEvaluator';
import { TrustGate } from './TrustGate';
import { SignedEnvelope, Capability, TrustAssessment, CapabilityCheckResult } from '../shared/trust-types';
import { SkillDefinition } from '../shared/types';
import { ServiceDefinition, GatewayDefinition } from '../shared/service-types';

export class PluginManager extends BasePluginManager<PluginContext> {
  private pluginsDir: string;
  private bundledPluginsDir: string;
  private resolvedBundledDir: string | null = null;
  private storagePath: string;
  private storageCache: Record<string, any> | null = null;
  
  // Capability decisions from the last load attempt
  private currentCapabilityDecisions: Map<Capability, CapabilityCheckResult> | undefined;

  constructor(
    private dsnNode: DSNNode,
    private aiManager: AIProviderManager,
    private secretsManager: SecretsManager,
    private signedEnvelopeService: SignedEnvelopeService,
    private trustEvaluator: TrustEvaluator,
    private trustGate: TrustGate,
    private serviceRegistry: ServiceRegistry
  ) {
    super();
    const dataDir = path.join(process.cwd(), 'data');
    this.pluginsDir = path.join(dataDir, 'plugins');
    this.bundledPluginsDir = path.join(process.cwd(), 'plugins');
    this.storagePath = path.join(dataDir, 'plugin-storage.json');
  }

  async initialize() {
    console.log(`Initializing PluginManager. User plugins: ${this.pluginsDir}, Bundled plugins: ${this.bundledPluginsDir}`);
    await this.ensurePluginsDir();
    await this.loadStorage();
    await this.scanBundledPlugins();
    await this.scanPlugins();
  }

  private async ensurePluginsDir() {
    try {
      await fs.access(this.pluginsDir);
    } catch {
      await fs.mkdir(this.pluginsDir, { recursive: true });
    }
  }

  private async loadStorage() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.storageCache = JSON.parse(data);
    } catch {
      this.storageCache = {};
    }
  }

  private async saveStorage() {
    if (this.storageCache) {
      await fs.writeFile(this.storagePath, JSON.stringify(this.storageCache, null, 2));
    }
  }

  private async scanBundledPlugins() {
    const potentialPaths = [
        this.bundledPluginsDir,
        path.join(process.cwd(), '..', 'plugins') // Try parent dir if running from src
    ];

    let found = false;
    for (const p of potentialPaths) {
        try {
            await fs.access(p);
            console.log(`Scanning bundled plugins in ${p}`);
            this.resolvedBundledDir = path.resolve(p);
            const entries = await fs.readdir(p, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    await this.loadPlugin(path.join(p, entry.name));
                }
            }
            found = true;
            break; 
        } catch {
            continue;
        }
    }

    if (!found) {
      console.log('Bundled plugins directory not found or inaccessible:', this.bundledPluginsDir);
    }
  }

  private async scanPlugins() {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(path.join(this.pluginsDir, entry.name));
        }
      }
    } catch (error) {
      console.error('Error scanning user plugins:', error);
    }
  }

  async loadPlugin(pluginPath: string): Promise<boolean> {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const packagePath = path.join(pluginPath, 'package.json');
      const alephPath = path.join(pluginPath, 'aleph.json');
      const envelopePath = path.join(pluginPath, 'signed-envelope.json');

      let manifest: PluginManifest;
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } catch {
        try {
          const packageContent = await fs.readFile(packagePath, 'utf-8');
          const pkg = JSON.parse(packageContent);
          manifest = {
            id: pkg.name || path.basename(pluginPath),
            version: pkg.version || '0.0.0',
            name: pkg.name?.replace('@alephnet/', '').split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || path.basename(pluginPath),
            description: pkg.description || '',
            main: pkg.main,
            permissions: []
          };
        } catch {
          console.warn(`No manifest.json or package.json found at ${pluginPath}`);
          return false;
        }
      }

      // Load Aleph config
      try {
        const alephContent = await fs.readFile(alephPath, 'utf-8');
        manifest.alephConfig = JSON.parse(alephContent);
        manifest.isAlephExtension = true;
      } catch {}

      // Trust verification
      let trust: TrustAssessment | undefined;
      let capabilityDecisions: Map<Capability, CapabilityCheckResult> | undefined;
      let status: 'active' | 'error' | 'blocked' | 'pending-confirmation' | 'disabled' = 'active';

      if (this.isDisabled(manifest.id)) {
          status = 'disabled';
      }

      try {
        const envelopeContent = await fs.readFile(envelopePath, 'utf-8');
        const envelope = JSON.parse(envelopeContent) as SignedEnvelope<PluginManifest>;
        
        const verification = await this.signedEnvelopeService.verify(envelope);
        if (!verification.valid) {
            console.error(`Plugin ${manifest.id} signature verification failed: ${verification.error}`);
            status = 'blocked';
        } else {
            trust = await this.trustEvaluator.evaluate(envelope);
            capabilityDecisions = this.trustGate.checkAll(envelope, trust);
            
            for (const [cap, result] of capabilityDecisions) {
                if (result.decision === 'DENY') {
                    console.error(`Plugin ${manifest.id} denied capability ${cap}: ${result.reason}`);
                    status = 'blocked';
                    break;
                }
                if (result.decision === 'CONFIRM') {
                    status = 'pending-confirmation';
                }
            }
        }
      } catch (e) {
        // No envelope found logic
      }

      if (status === 'blocked') return false;

      // Attach runtime props to manifest
      manifest.trust = trust;
      manifest.status = status;
      this.currentCapabilityDecisions = capabilityDecisions;

      const result = await this.loadPluginFromManifest(manifest, pluginPath);
      this.currentCapabilityDecisions = undefined;
      return result;

    } catch (error) {
      console.error(`Failed to load plugin at ${pluginPath}:`, error);
      return false;
    }
  }

  protected async executePlugin(manifest: PluginManifest, pluginPath: string, _context: PluginContext): Promise<any> {
    if (manifest.status === 'active' && manifest.main) {
        const entryPoint = path.join(pluginPath, manifest.main);
        // Use new Function to bypass webpack/vite transpilation of dynamic import
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const rawModule = await dynamicImport(pathToFileURL(entryPoint).href);
        return rawModule.activate ? rawModule : (rawModule.default || rawModule);
    }
    return null;
  }

  async unloadPlugin(id: string): Promise<boolean> {
      const plugin = this.plugins.get(id);
      if (!plugin) return false;
      
      if (plugin.instance && typeof plugin.instance.deactivate === 'function') {
          try {
              await plugin.instance.deactivate();
          } catch (e) {
              console.error(`Error deactivating plugin ${id}:`, e);
          }
      }

      this.unregisterPlugin(id);
      return true;
  }

  protected createContext(manifest: PluginManifest): PluginContext {
    const eventEmitter = new EventEmitter();
    const decisions = this.currentCapabilityDecisions;

    const check = (cap: Capability) => {
        if (!decisions) return;
        const result = decisions.get(cap);
        if (result?.decision === 'DENY') throw new Error(`Capability ${cap} denied: ${result.reason}`);
    };

    return {
      id: manifest.id,
      manifest,
      on: (event: any, callback: any) => {
        eventEmitter.on(event, callback);
      },
      storage: {
        get: async (key) => {
          check('store:read');
          const pluginData = this.storageCache?.[manifest.id] || {};
          return pluginData[key];
        },
        set: async (key, value) => {
          check('store:write');
          if (!this.storageCache) this.storageCache = {};
          if (!this.storageCache[manifest.id]) this.storageCache[manifest.id] = {};
          this.storageCache[manifest.id][key] = value;
          await this.saveStorage();
        },
        delete: async (key) => {
          check('store:write');
          if (this.storageCache?.[manifest.id]) {
            delete this.storageCache[manifest.id][key];
            await this.saveStorage();
          }
        }
      },
      secrets: {
        set: async (key: string, value: string, label?: string) => {
          await this.secretsManager.setSecret({
            namespace: 'plugins',
            key: `${manifest.id}/${key}`,
            value,
            label,
            origin: manifest.id,
          });
        },
        get: async (key: string) => {
          return this.secretsManager.getSecret({
            namespace: 'plugins',
            key: `${manifest.id}/${key}`,
          });
        },
        delete: async (key: string) => {
          return this.secretsManager.deleteSecret({
            namespace: 'plugins',
            key: `${manifest.id}/${key}`,
          });
        },
        has: async (key: string) => {
          return this.secretsManager.hasSecret({
            namespace: 'plugins',
            key: `${manifest.id}/${key}`,
          });
        },
        list: async (options?: any) => {
            const secrets = await this.secretsManager.listSecrets({
                namespace: 'plugins',
                ...options
            });
            const prefix = `${manifest.id}/`;
            return secrets.filter(s => s.key.startsWith(prefix)).map(s => ({
                ...s,
                key: s.key.substring(prefix.length)
            }));
        }
      },
      ipc: {
        send: (_channel, _data) => {
          console.warn(`Plugin ${manifest.id} tried to send IPC message (not supported in headless mode)`);
        },
        on: (_channel, _handler) => {
          // No-op
        },
        handle: (_channel, _handler) => {
            // No-op
        },
        invoke: async (_channel, _data) => {
           throw new Error("IPC invoke not supported in headless mode");
        }
      },
      services: {
        tools: {
            register: (tool) => {
                check('dsn:register-tool');
                this.serviceRegistry.registerToolHandler(tool.name, tool.handler);
            }
        },
        gateways: {
            register: (gateway: GatewayDefinition) => {
                check('gateway:register');
                this.serviceRegistry.registerGateway(gateway);
            }
        },
        sandbox: {} as any
      },
      dsn: {
        registerTool: (toolDefinition: SkillDefinition, handler: Function) => {
            check('dsn:register-tool');
            console.log(`Plugin ${manifest.id} registering tool: ${toolDefinition.name}`);
            this.serviceRegistry.registerToolHandler(toolDefinition.name, handler);
        },
        registerService: (serviceDef: ServiceDefinition, _handler: Function) => {
            check('dsn:register-service');
            console.log(`Plugin ${manifest.id} registering service: ${serviceDef.id}`);
            this.serviceRegistry.register(serviceDef);
        },
        invokeTool: async (toolName: string, args: any) => {
            check('dsn:invoke-tool');
            return await this.serviceRegistry.invokeTool(toolName, args);
        },
        publishObservation: (_content: string, _smf: number[]) => {
            check('dsn:publish-observation');
            console.log(`Plugin ${manifest.id} publishing observation`);
        },
        getIdentity: async () => {
            check('dsn:identity');
            const config = this.dsnNode.getConfig();
            if (!config) throw new Error("DSN Node not initialized");
            return config.keyTriplet;
        }
      },
      ai: {
        complete: async (request: any) => {
            check('ai:complete');
            const prompt = request.systemPrompt 
                ? `System: ${request.systemPrompt}\n\nUser: ${request.userPrompt}`
                : request.userPrompt;
            const response = await this.aiManager.processRequest(prompt, {
                contentType: request.contentType || 'chat',
                temperature: request.temperature,
                model: request.model
            });
            return {
                text: response.content,
                raw: response
            };
        }
      }
    };
  }

  private isDisabled(id: string): boolean {
      return !!this.storageCache?._system?.disabledPlugins?.includes(id);
  }
}
