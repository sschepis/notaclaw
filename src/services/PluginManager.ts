import path from 'path';
import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { EventEmitter } from 'events';
import { PluginManifest, PluginContext, SandboxProvider, SandboxSession, ExecutionResult } from '../shared/plugin-types';
import { BasePluginManager } from '../shared/plugin-core/BasePluginManager';
import { DSNNode } from './DSNNode';
import { AIProviderManager } from './AIProviderManager';
import { SecretsManager } from './SecretsManager';
import { ServiceRegistry } from './ServiceRegistry';
import { SignedEnvelopeService } from './SignedEnvelopeService';
import { TrustEvaluator } from './TrustEvaluator';
import { TrustGate } from './TrustGate';
import { createLogger } from './Logger';
import { WorkflowEngine } from './WorkflowEngine';
import { SignedEnvelope, Capability, TrustAssessment, CapabilityCheckResult } from '../shared/trust-types';
import { SkillDefinition } from '../shared/types';
import { ServiceDefinition, GatewayDefinition } from '../shared/service-types';
import { spawn } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════
// Headless IPC Bus — EventEmitter-based local IPC for plugins
// ═══════════════════════════════════════════════════════════════════════════

class HeadlessIPCBus {
    private bus = new EventEmitter();
    private handlers = new Map<string, (data: any) => Promise<any>>();

    send(channel: string, data: any): void {
        this.bus.emit(channel, data);
    }

    on(channel: string, handler: (data: any) => void): void {
        this.bus.on(channel, handler);
    }

    handle(channel: string, handler: (data: any) => Promise<any>): void {
        this.handlers.set(channel, handler);
    }

    async invoke(channel: string, data: any): Promise<any> {
        const handler = this.handlers.get(channel);
        if (!handler) {
            throw new Error(`No handler registered for IPC channel: ${channel}`);
        }
        return handler(data);
    }

    removeAll(): void {
        this.bus.removeAllListeners();
        this.handlers.clear();
    }
}

// Global IPC bus shared across all plugins
const globalIPCBus = new HeadlessIPCBus();

// ═══════════════════════════════════════════════════════════════════════════
// Basic Sandbox Provider — uses child_process for code execution
// ═══════════════════════════════════════════════════════════════════════════

class BasicSandboxProvider implements SandboxProvider {
    async createSession(type: 'node' | 'python' | 'bash'): Promise<SandboxSession> {
        const sessionId = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempDir = path.join(process.cwd(), 'data', 'sandbox', sessionId);
        await fs.mkdir(tempDir, { recursive: true });

        const shell = type === 'node' ? 'node' : type === 'python' ? 'python3' : 'bash';

        return {
            id: sessionId,
            async exec(command: string, options?: { timeout?: number }): Promise<ExecutionResult> {
                const timeout = options?.timeout ?? 30000;
                return new Promise((resolve) => {
                    const proc = spawn(shell, ['-c', command], {
                        cwd: tempDir,
                        timeout,
                        env: { ...process.env, HOME: tempDir },
                    });

                    let stdout = '';
                    let stderr = '';

                    proc.stdout.on('data', (d) => { stdout += d.toString(); });
                    proc.stderr.on('data', (d) => { stderr += d.toString(); });

                    proc.on('close', (code) => {
                        resolve({ stdout, stderr, exitCode: code ?? 1 });
                    });

                    proc.on('error', (err) => {
                        resolve({ stdout, stderr: stderr + err.message, exitCode: 1 });
                    });
                });
            },
            async write(filePath: string, content: string): Promise<void> {
                const fullPath = path.join(tempDir, filePath);
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, content);
            },
            async read(filePath: string): Promise<string> {
                return fs.readFile(path.join(tempDir, filePath), 'utf-8');
            },
            async close(): Promise<void> {
                try {
                    await fs.rm(tempDir, { recursive: true, force: true });
                } catch {
                    // Best effort cleanup
                }
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Plugin Manager
// ═══════════════════════════════════════════════════════════════════════════

export class PluginManager extends BasePluginManager<PluginContext> {
  private pluginsDir: string;
  private bundledPluginsDir: string;
  private resolvedBundledDir: string | null = null;
  private storagePath: string;
  private storageCache: Record<string, any> | null = null;
  private sandboxProvider = new BasicSandboxProvider();

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
    await this.scanExtendedPlugins();
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

  private async scanExtendedPlugins() {
    // Try to find plugins-extended relative to where we found plugins
    let extendedDir = path.join(process.cwd(), 'plugins-extended');
    
    if (this.resolvedBundledDir) {
        extendedDir = path.join(path.dirname(this.resolvedBundledDir), 'plugins-extended');
    }

    try {
        await fs.access(extendedDir);
        console.log(`Scanning extended plugins in ${extendedDir}`);
        const entries = await fs.readdir(extendedDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                await this.loadPlugin(path.join(extendedDir, entry.name));
            }
        }
    } catch {
        // Optional directory, ignore if missing
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
      const isDisabled = this.isDisabled(manifest.id);

      if (isDisabled) {
          status = 'disabled';
      }

      try {
        const envelopeContent = await fs.readFile(envelopePath, 'utf-8');
        const envelope = JSON.parse(envelopeContent) as SignedEnvelope<PluginManifest>;
        
        const verification = await this.signedEnvelopeService.verify(envelope);
        if (!verification.valid) {
            console.error(`Plugin ${manifest.id} signature verification failed: ${verification.error}`);
            status = 'blocked';
        } else if (!isDisabled) {
            // Only apply trust decisions if the plugin is not explicitly disabled
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

      // Pass capabilityDecisions as argument to avoid class-level race condition
      const result = await this.loadPluginFromManifestWithDecisions(manifest, pluginPath, capabilityDecisions);
      return result;

    } catch (error) {
      console.error(`Failed to load plugin at ${pluginPath}:`, error);
      return false;
    }
  }

  /**
   * Extended loadPluginFromManifest that passes capability decisions as a
   * parameter instead of storing them in a mutable class field.
   * This prevents race conditions when loading plugins concurrently.
   */
  private async loadPluginFromManifestWithDecisions(
    manifest: PluginManifest,
    pluginPath: string,
    capabilityDecisions?: Map<Capability, CapabilityCheckResult>
  ): Promise<boolean> {
    if (this.isPluginLoaded(manifest.id)) {
      console.warn(`[PluginManager] Plugin ${manifest.id} already loaded. Skipping.`);
      return true;
    }

    try {
      const context = this.createContextWithDecisions(manifest, capabilityDecisions);
      const instance = await this.executePlugin(manifest, pluginPath, context);

      if (instance && typeof instance.activate === 'function') {
        await instance.activate(context);
      }

      const loaded = {
        manifest,
        path: pluginPath,
        context,
        instance,
        status: (manifest.status || 'active') as 'active' | 'error' | 'blocked' | 'pending-confirmation' | 'disabled',
        loadedAt: new Date()
      };

      this.registerPlugin(manifest.id, loaded);
      return true;
    } catch (e) {
      console.error(`[PluginManager] Failed to load plugin ${manifest.id}:`, e);
      return false;
    }
  }

  protected async executePlugin(manifest: PluginManifest, pluginPath: string, _context: PluginContext): Promise<any> {
    if (manifest.status === 'active' && manifest.main) {
        const entryPoint = path.join(pluginPath, manifest.main);
        // Use new Function to bypass webpack/vite transpilation of dynamic import
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const rawModule = await dynamicImport(pathToFileURL(entryPoint).href);
        // Handle double-wrapped default exports from CJS modules bundled with __esModule flag
        // e.g. { default: { __esModule: true, default: { activate, deactivate } } }
        let pluginModule = rawModule.activate ? rawModule : (rawModule.default || rawModule);
        if (pluginModule && pluginModule.__esModule && pluginModule.default) {
            pluginModule = pluginModule.default;
        }
        return pluginModule;
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

  /**
   * Create context with capability decisions passed as parameter (no race).
   */
  private createContextWithDecisions(
    manifest: PluginManifest,
    decisions?: Map<Capability, CapabilityCheckResult>
  ): PluginContext {
    const eventEmitter = new EventEmitter();

    const check = (cap: Capability) => {
        if (!decisions) return;
        const result = decisions.get(cap);
        if (result?.decision === 'DENY') throw new Error(`Capability ${cap} denied: ${result.reason}`);
    };

    // Create scoped IPC that routes through the global bus
    const pluginIPC = {
        send: (channel: string, data: any) => {
            globalIPCBus.send(`${manifest.id}:${channel}`, data);
        },
        on: (channel: string, handler: (data: any) => void) => {
            // Listen on both scoped and global channels
            globalIPCBus.on(`${manifest.id}:${channel}`, handler);
            globalIPCBus.on(channel, handler);
        },
        handle: (channel: string, handler: (data: any) => Promise<any>) => {
            globalIPCBus.handle(`${manifest.id}:${channel}`, handler);
        },
        invoke: async (channel: string, data: any) => {
            return globalIPCBus.invoke(channel, data);
        }
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
      ipc: pluginIPC,
      services: {
        tools: {
            register: (tool) => {
                check('dsn:register-tool');
                this.serviceRegistry.registerToolHandler(tool.name, tool.handler, {
                    description: tool.description,
                    parameters: tool.parameters,
                    pluginId: manifest.id,
                });
            }
        },
        gateways: {
            register: (gateway: GatewayDefinition) => {
                check('gateway:register');
                this.serviceRegistry.registerGateway(gateway);
            }
        },
        sandbox: this.sandboxProvider
      },
      dsn: {
        registerTool: (toolDefinition: SkillDefinition, handler: Function) => {
            check('dsn:register-tool');
            console.log(`Plugin ${manifest.id} registering tool: ${toolDefinition.name}`);
            this.serviceRegistry.registerToolHandler(toolDefinition.name, handler, {
                description: toolDefinition.description,
                parameters: (toolDefinition as any).parameters,
                pluginId: manifest.id,
            });
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
      },
        workflow: {
            createRunner: (config: any, options: any) => {
                check('workflow:create');
                return WorkflowEngine.createAIAssistantRunner(
                    config,
                    {
                        aiManager: this.aiManager,
                        dsnNode: this.dsnNode
                    },
                    options,
                    createLogger(`plugin:${manifest.id}:workflow`)
                );
            }
        },
        traits: {

        register: (_trait: any) => {
            console.warn(`Plugin ${manifest.id} tried to register a trait (not supported in headless mode)`);
        },
        unregister: (_traitId: string) => {
            // No-op
        }
      }
    };
  }

  /**
   * @deprecated Use createContextWithDecisions instead
   */
  protected createContext(manifest: PluginManifest): PluginContext {
    return this.createContextWithDecisions(manifest, undefined);
  }

  private isDisabled(id: string): boolean {
      return !!this.storageCache?._system?.disabledPlugins?.includes(id);
  }

  private async setDisabledState(id: string, disabled: boolean) {
      if (!this.storageCache) this.storageCache = {};
      if (!this.storageCache._system) this.storageCache._system = {};
      if (!this.storageCache._system.disabledPlugins) this.storageCache._system.disabledPlugins = [];

      const list = this.storageCache._system.disabledPlugins;
      if (disabled) {
          if (!list.includes(id)) list.push(id);
      } else {
          const index = list.indexOf(id);
          if (index !== -1) list.splice(index, 1);
      }

      await this.saveStorage();
  }

  public async disablePlugin(id: string): Promise<boolean> {
      const plugin = this.plugins.get(id);
      if (!plugin) return false;

      await this.setDisabledState(id, true);
      plugin.status = 'disabled';
      this.emit('plugin-state-changed', { id, status: 'disabled' });
      return true;
  }

  public async enablePlugin(id: string): Promise<boolean> {
      const plugin = this.plugins.get(id);
      if (!plugin) return false;

      await this.setDisabledState(id, false);
      plugin.status = 'active';

      if (plugin.manifest.main && !plugin.instance) {
          try {
            const entryPoint = path.join(plugin.path, plugin.manifest.main);
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const rawModule = await dynamicImport(pathToFileURL(entryPoint).href);
            let pluginModule = rawModule.activate ? rawModule : (rawModule.default || rawModule);
            if (pluginModule && pluginModule.__esModule && pluginModule.default) {
                pluginModule = pluginModule.default;
            }

            if (typeof pluginModule.activate === 'function') {
                plugin.instance = pluginModule.activate(plugin.context);
                console.log(`Plugin ${id} activated.`);
            }
          } catch (e) {
              console.error(`Failed to activate plugin ${id}:`, e);
              plugin.status = 'error';
              return false;
          }
      }

      this.emit('plugin-state-changed', { id, status: 'active' });
      return true;
  }
}
