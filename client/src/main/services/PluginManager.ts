import { app, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { EventEmitter } from 'events';
import { PluginManifest, PluginContext } from '../../shared/plugin-types';
import { DSNNode } from './DSNNode';
import { AIProviderManager } from './AIProviderManager';
import { SecretsManager } from './SecretsManager';
import { ServiceRegistry } from './ServiceRegistry';
import { PersonalityManager } from './PersonalityManager';
import { SkillDefinition } from '../../shared/types';
import { ServiceDefinition } from '../../shared/service-types';
import { SignedEnvelopeService } from './SignedEnvelopeService';
import { TrustEvaluator } from './TrustEvaluator';
import { TrustGate } from './TrustGate';
import { SignedEnvelope, Capability, TrustAssessment, CapabilityCheckResult } from '../../shared/trust-types';
import { BasePluginManager } from '../../shared/plugin-core/BasePluginManager';
import { TraitDefinition } from '../../shared/trait-types';

export class PluginManager extends BasePluginManager<PluginContext> {
  private pluginsDir: string;
  private bundledPluginsDir: string;
  private extendedPluginsDir: string;
  private resolvedBundledDir: string | null = null;
  private resolvedExtendedDir: string | null = null;
  private storagePath: string;
  private dsnNode: DSNNode;
  private aiManager: AIProviderManager;
  private signedEnvelopeService: SignedEnvelopeService;
  private trustEvaluator: TrustEvaluator;
  private trustGate: TrustGate;
  private serviceRegistry: ServiceRegistry;
  private personalityManager: PersonalityManager;
  private storageCache: Record<string, any> | null = null;

  constructor(
    dsnNode: DSNNode,
    aiManager: AIProviderManager,
    signedEnvelopeService: SignedEnvelopeService,
    trustEvaluator: TrustEvaluator,
    trustGate: TrustGate,
    serviceRegistry: ServiceRegistry,
    personalityManager: PersonalityManager
  ) {
    super();
    this.dsnNode = dsnNode;
    this.aiManager = aiManager;
    this.signedEnvelopeService = signedEnvelopeService;
    this.trustEvaluator = trustEvaluator;
    this.trustGate = trustGate;
    this.serviceRegistry = serviceRegistry;
    this.personalityManager = personalityManager;
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
    this.bundledPluginsDir = path.join(process.cwd(), 'plugins');
    this.extendedPluginsDir = path.join(process.cwd(), 'plugins-extended');
    this.storagePath = path.join(app.getPath('userData'), 'plugin-storage.json');
  }

  async initialize() {
    console.log(`Initializing PluginManager. User plugins: ${this.pluginsDir}, Core plugins: ${this.bundledPluginsDir}, Extended plugins: ${this.extendedPluginsDir}`);
    await this.ensurePluginsDir();
    await this.loadStorage();
    await this.scanBundledPlugins();
    await this.scanExtendedPlugins();
    await this.scanPlugins();
    this.setupIPC();
  }

  // ... (ensurePluginsDir, loadStorage, saveStorage, scanBundledPlugins, scanPlugins remain mostly the same) ...
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
        path.join(app.getAppPath(), 'plugins'),
        path.join(path.dirname(app.getAppPath()), 'plugins'),
        path.join(process.cwd(), '..', 'plugins')
    ];

    let found = false;
    for (const p of potentialPaths) {
        try {
            await fs.access(p);
            console.log(`Scanning core bundled plugins in ${p}`);
            this.resolvedBundledDir = path.resolve(p);
            const entries = await fs.readdir(p, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    await this.loadPlugin(path.join(p, entry.name), true); // isCore = true
                }
            }
            found = true;
            break;
        } catch {
            continue;
        }
    }

    if (!found) {
      console.log('Core plugins directory not found or inaccessible:', this.bundledPluginsDir);
    }
  }

  private async scanExtendedPlugins() {
    const potentialPaths = [
        this.extendedPluginsDir,
        path.join(app.getAppPath(), 'plugins-extended'),
        path.join(path.dirname(app.getAppPath()), 'plugins-extended'),
        path.join(process.cwd(), '..', 'plugins-extended')
    ];

    let found = false;
    for (const p of potentialPaths) {
        try {
            await fs.access(p);
            console.log(`Scanning extended plugins in ${p}`);
            this.resolvedExtendedDir = path.resolve(p);
            const entries = await fs.readdir(p, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    await this.loadPlugin(path.join(p, entry.name), false); // isCore = false
                }
            }
            found = true;
            break;
        } catch {
            continue;
        }
    }

    if (!found) {
      console.log('Extended plugins directory not found or inaccessible:', this.extendedPluginsDir);
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

  async loadPlugin(pluginPath: string, isCore: boolean = false): Promise<boolean> {
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

          if (pkg.icon) {
            try {
              const iconPath = path.join(pluginPath, pkg.icon);
              const iconExt = path.extname(iconPath).toLowerCase();
              const iconBuffer = await fs.readFile(iconPath);
              let mimeType = 'image/png';
              if (iconExt === '.svg') mimeType = 'image/svg+xml';
              else if (iconExt === '.jpg' || iconExt === '.jpeg') mimeType = 'image/jpeg';
              else if (iconExt === '.gif') mimeType = 'image/gif';
              else if (iconExt === '.webp') mimeType = 'image/webp';
              manifest.icon = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
            } catch (e) {
              console.warn(`Failed to load icon for plugin ${manifest.id}:`, e);
            }
          }
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

      // Set isCore flag on manifest
      manifest.isCore = isCore;

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

      // Attach runtime props to manifest for BasePluginManager
      manifest.trust = trust;
      manifest.status = status;
      // Note: capabilityDecisions are passed to createContext via a different mechanism or attached to manifest?
      // BasePluginManager doesn't handle capabilityDecisions directly, so we might need to store them or pass them.
      // We can attach them to the loaded plugin after loading, but createContext needs them.
      // Solution: Store them temporarily or override createContext to use them.
      this.currentCapabilityDecisions = capabilityDecisions;

      const result = await this.loadPluginFromManifest(manifest, pluginPath);
      this.currentCapabilityDecisions = undefined;
      return result;

    } catch (error) {
      console.error(`Failed to load plugin at ${pluginPath}:`, error);
      return false;
    }
  }

  private currentCapabilityDecisions: Map<Capability, CapabilityCheckResult> | undefined;

  protected async executePlugin(manifest: PluginManifest, pluginPath: string, _context: PluginContext): Promise<any> {
    if (manifest.status === 'active' && manifest.main) {
        const entryPoint = path.join(pluginPath, manifest.main);
        // @ts-ignore
        // Use new Function to bypass webpack/vite transpilation of dynamic import
        // This ensures we use the native Node.js ESM loader for plugins
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const rawModule = await dynamicImport(pathToFileURL(entryPoint).href);
        // Support both ESM (named exports) and CommonJS (default export)
        return rawModule.activate ? rawModule : (rawModule.default || rawModule);
    }
    return null;
  }

  async unloadPlugin(id: string): Promise<boolean> {
      const plugin = this.plugins.get(id);
      if (!plugin) return false;
      
      // Deactivate if possible
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

  async uninstallPlugin(id: string): Promise<boolean> {
      const plugin = this.plugins.get(id);
      if (!plugin) return false;
      
      // Core plugins cannot be uninstalled
      if (plugin.manifest.isCore) {
          throw new Error("Cannot uninstall core plugins. You can disable them instead.");
      }
      
      // User plugins (in userData/plugins) can always be uninstalled
      const isUserPlugin = plugin.path.startsWith(this.pluginsDir);
      
      // Extended plugins (in plugins-extended/) can be uninstalled
      const isExtendedPlugin = this.resolvedExtendedDir && plugin.path.startsWith(this.resolvedExtendedDir);
      
      if (!isUserPlugin && !isExtendedPlugin) {
          throw new Error("Cannot uninstall this plugin");
      }

      await this.unloadPlugin(id);
      
      try {
        await fs.rm(plugin.path, { recursive: true, force: true });
      } catch (e) {
          console.error(`Failed to delete plugin directory for ${id}:`, e);
      }
      
      return true;
  }

  protected createContext(manifest: PluginManifest): PluginContext {
    const eventEmitter = new EventEmitter();
    const decisions = this.currentCapabilityDecisions; // Capture from load scope

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
        set: async (_key: string, _value: string, _label?: string) => {
          console.warn(`Plugin ${manifest.id}: secrets.set not wired — call setSecretsProvider()`);
        },
        get: async (_key: string) => {
          console.warn(`Plugin ${manifest.id}: secrets.get not wired — call setSecretsProvider()`);
          return null;
        },
        delete: async (_key: string) => {
          console.warn(`Plugin ${manifest.id}: secrets.delete not wired — call setSecretsProvider()`);
          return false;
        },
        has: async (_key: string) => {
          console.warn(`Plugin ${manifest.id}: secrets.has not wired — call setSecretsProvider()`);
          return false;
        },
        list: async (_options?: any) => {
          console.warn(`Plugin ${manifest.id}: secrets.list not wired — call setSecretsProvider()`);
          return [];
        }
      },
      ipc: {
        send: (channel, data) => {
          const targetChannel = `plugin:${manifest.id}:${channel}`;
          const windows = BrowserWindow.getAllWindows();
          windows.forEach((win: BrowserWindow) => win.webContents.send(targetChannel, data));
        },
        on: (channel, handler) => {
          const targetChannel = `plugin:${manifest.id}:${channel}`;
          ipcMain.on(targetChannel, (_event, data) => handler(data));
        },
        handle: (channel, handler) => {
            const targetChannel = `plugin:${manifest.id}:${channel}`;
            ipcMain.handle(targetChannel, (_event, data) => handler(data));
        },
        invoke: async (_channel, _data) => {
           throw new Error("Invoke not yet implemented");
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
            register: (_gateway) => console.warn('Gateways not implemented')
        },
        sandbox: {} as any
      },
      dsn: {
        registerTool: (toolDefinition: SkillDefinition, handler: Function) => {
            check('dsn:register-tool');
            console.log(`Plugin ${manifest.id} registering tool: ${toolDefinition.name}`);
            this.serviceRegistry.registerToolHandler(toolDefinition.name, handler, toolDefinition);
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
            // Support both 'prompt' and 'userPrompt' for flexibility
            const userPrompt = request.userPrompt || request.prompt || '';
            const prompt = request.systemPrompt
                ? `System: ${request.systemPrompt}\n\nUser: ${userPrompt}`
                : userPrompt;
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
      traits: {
        register: (trait: TraitDefinition) => {
            // check('traits:register'); // TODO: Add permission check
            console.log(`Plugin ${manifest.id} registering trait: ${trait.name}`);
            this.personalityManager.getTraitRegistry().register({
                ...trait,
                source: manifest.id // Enforce source
            });
        },
        unregister: (traitId: string) => {
            // check('traits:write');
            const trait = this.personalityManager.getTraitRegistry().get(traitId);
            if (trait && trait.source === manifest.id) {
                this.personalityManager.getTraitRegistry().unregister(traitId);
            } else {
                console.warn(`Plugin ${manifest.id} tried to unregister trait ${traitId} which it does not own.`);
            }
        }
      }
    };
  }

  // ... (setupIPC, isDisabled, setDisabledState, disablePlugin, enablePlugin, invokeRenderer, uninstallPlugin, installPlugin, setSecretsProvider) ...
  // Note: uninstallPlugin is overridden above.
  
  private setupIPC() {
    ipcMain.handle('get-plugins', () => {
      return Array.from(this.plugins.values()).map(p => ({
        ...p.manifest,
        path: p.path,
        isAlephExtension: !!p.alephConfig,
        alephConfig: p.alephConfig,
        trust: p.trust,
        status: p.status,
        isCore: p.manifest.isCore || false
      }));
    });

    ipcMain.handle('read-plugin-file', async (_event, filePath) => {
      const resolvedPath = path.resolve(filePath);
      const allowedDirs = [this.pluginsDir, this.bundledPluginsDir];
      if (this.resolvedBundledDir) allowedDirs.push(this.resolvedBundledDir);
      if (this.resolvedExtendedDir) allowedDirs.push(this.resolvedExtendedDir);
      
      // Also allow any loaded plugin's directory
      for (const plugin of this.plugins.values()) {
          allowedDirs.push(plugin.path);
      }
      
      const isAllowed = allowedDirs.some(dir => {
          const relative = path.relative(dir, resolvedPath);
          return !relative.startsWith('..') && !path.isAbsolute(relative);
      });
      
      if (!isAllowed) {
        console.error(`Access denied: ${resolvedPath} is not in`, allowedDirs);
        throw new Error(`Access denied: Cannot read files outside plugin directories (${resolvedPath})`);
      }

      // Check if the file exists before reading to avoid noisy ENOENT errors
      try {
        await fs.access(resolvedPath);
      } catch {
        throw new Error(`Plugin file not found: ${resolvedPath}`);
      }
      return await fs.readFile(resolvedPath, 'utf-8');
    });

    ipcMain.handle('plugin:invoke-tool', async (_event, { toolName, args }) => {
        return await this.serviceRegistry.invokeTool(toolName, args);
    });

    ipcMain.handle('plugin:invoke-renderer', async (_event, { pluginId, channel, data }) => {
        return await this.invokeRenderer(pluginId, channel, data);
    });

    ipcMain.on('plugin:register-tool', (_event, { pluginId, toolName }) => {
        console.log(`Registering renderer tool proxy for ${toolName} from ${pluginId}`);
        this.serviceRegistry.registerToolHandler(toolName, async (args: any) => {
            const windows = BrowserWindow.getAllWindows();
            const win = windows[0]; 
            if (!win) throw new Error("No renderer window available");

            return new Promise((resolve, reject) => {
                const requestId = Math.random().toString(36).substring(7);
                const responseChannel = `plugin:tool-response:${requestId}`;
                ipcMain.once(responseChannel, (_event, response) => {
                    if (response.error) reject(new Error(response.error));
                    else resolve(response.result);
                });
                win.webContents.send(`plugin:${pluginId}:tool-request`, {
                    requestId,
                    toolName,
                    args
                });
                setTimeout(() => {
                    ipcMain.removeAllListeners(responseChannel);
                    reject(new Error("Tool invocation timed out"));
                }, 30000);
            });
        });
    });
    
    ipcMain.handle('plugin:install', async (_event, sourcePath) => {
        return await this.installPlugin(sourcePath);
    });

    ipcMain.handle('plugin:disable', async (_event, id) => {
        return await this.disablePlugin(id);
    });

    ipcMain.handle('plugin:enable', async (_event, id) => {
        return await this.enablePlugin(id);
    });

    ipcMain.handle('plugin:uninstall', async (_event, id) => {
        return await this.uninstallPlugin(id);
    });
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
            // @ts-ignore
            // Use new Function to bypass webpack/vite transpilation of dynamic import
            // This ensures we use the native Node.js ESM loader for plugins
            const dynamicImport = new Function('specifier', 'return import(specifier)');
            const rawModule = await dynamicImport(pathToFileURL(entryPoint).href);
            const pluginModule = rawModule.activate ? rawModule : (rawModule.default || rawModule);
            
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

  public async invokeRenderer(pluginId: string, channel: string, data: any): Promise<any> {
    const windows = BrowserWindow.getAllWindows();
    const win = windows[0];
    if (!win) throw new Error("No renderer window available");

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        const responseChannel = `plugin:${pluginId}:invoke-response:${requestId}`;
        const timeout = setTimeout(() => {
            ipcMain.removeAllListeners(responseChannel);
            reject(new Error(`Renderer invocation timed out for ${pluginId}:${channel}`));
        }, 30000);

        ipcMain.once(responseChannel, (_event, response) => {
            clearTimeout(timeout);
            if (response.error) reject(new Error(response.error));
            else resolve(response.result);
        });

        win.webContents.send(`plugin:${pluginId}:invoke-request`, {
            requestId,
            channel,
            data
        });
    });
  }

  public async installPlugin(sourcePath: string): Promise<boolean> {
      try {
          const stats = await fs.stat(sourcePath);
          if (!stats.isDirectory()) {
              throw new Error("Installation only supports directories for now.");
          }

          const manifestPath = path.join(sourcePath, 'manifest.json');
          const packagePath = path.join(sourcePath, 'package.json');
          let id = '';
          
          try {
              const content = await fs.readFile(manifestPath, 'utf-8');
              id = JSON.parse(content).id;
          } catch {
              try {
                  const content = await fs.readFile(packagePath, 'utf-8');
                  id = JSON.parse(content).name;
              } catch {
                  throw new Error("Invalid plugin: missing manifest.json or package.json");
              }
          }

          if (!id) throw new Error("Invalid plugin: no ID found");

          const destPath = path.join(this.pluginsDir, id);
          await fs.cp(sourcePath, destPath, { recursive: true });
          await this.loadPlugin(destPath);
          return true;
      } catch (e) {
          console.error("Failed to install plugin:", e);
          throw e;
      }
  }

  public setSecretsProvider(secretsManager: SecretsManager): void {
    for (const [pluginId, plugin] of this.plugins) {
      plugin.context.secrets = {
        set: async (key: string, value: string, label?: string) => {
          await secretsManager.setSecret({
            namespace: 'plugins',
            key: `${pluginId}/${key}`,
            value,
            label,
            origin: pluginId,
          });
        },
        get: async (key: string) => {
          return secretsManager.getSecret({
            namespace: 'plugins',
            key: `${pluginId}/${key}`,
          });
        },
        delete: async (key: string) => {
          return secretsManager.deleteSecret({
            namespace: 'plugins',
            key: `${pluginId}/${key}`,
          });
        },
        has: async (key: string) => {
          return secretsManager.hasSecret({
            namespace: 'plugins',
            key: `${pluginId}/${key}`,
          });
        },
        list: async (options?: any) => {
            const secrets = await secretsManager.listSecrets({
                namespace: 'plugins',
                ...options
            });
            const prefix = `${pluginId}/`;
            return secrets.filter(s => s.key.startsWith(prefix)).map(s => ({
                ...s,
                key: s.key.substring(prefix.length)
            }));
        }
      };
    }
  }
}
