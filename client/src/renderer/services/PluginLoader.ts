import React from 'react';
import ReactDOM from 'react-dom';
import * as FramerMotion from 'framer-motion';
import * as LucideReact from 'lucide-react';
import * as JSXRuntime from 'react/jsx-runtime';
import { RendererPluginContext, PluginManifest } from '../../shared/plugin-types';
import { UIExtensionAPI } from '../../shared/slot-types';
import { usePluginStore } from '../store/usePluginStore';
import { useAppStore } from '../store/useAppStore';
import { useAlephStore } from '../store/useAlephStore';
import { useFenceStore } from '../store/useFenceStore';
import { useSlotRegistry } from './SlotRegistry';
import { BasePluginManager } from '../../shared/plugin-core/BasePluginManager';
import { LoadedPlugin } from '../../shared/plugin-core/types';
import { SandboxService, SandboxType } from './SandboxService';

// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = (message: string, ...args: unknown[]) => {
  if (DEBUG) console.log(`[PluginLoader] ${message}`, ...args);
};
const warn = (message: string, ...args: unknown[]) => {
  console.warn(`[PluginLoader] ${message}`, ...args);
};
const error = (message: string, ...args: unknown[]) => {
  console.error(`[PluginLoader] ${message}`, ...args);
};

export class PluginLoader extends BasePluginManager<RendererPluginContext> {
  private static instance: PluginLoader;
  private loadingPlugins: Set<string> = new Set();
  private ipcHandlers: Map<string, Function> = new Map();
  private sandboxService: SandboxService;

  private constructor() {
    super();
    this.sandboxService = SandboxService.getInstance();
  }

  static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  async initialize(): Promise<void> {
    log('Initializing...');
    
    try {
      const plugins = await window.electronAPI.getPlugins();
      
      if (!Array.isArray(plugins)) {
        warn('getPlugins did not return an array');
        return;
      }
      
      usePluginStore.getState().setPlugins(plugins);
      log(`Found ${plugins.length} plugin(s)`);

      for (const plugin of plugins) {
        if (plugin.renderer) {
          await this.loadPlugin(plugin);
        }
      }
      
      log(`Initialization complete. Loaded ${this.plugins.size} plugin(s)`);
    } catch (err) {
      error('Failed to initialize:', err);
    }
  }

  async loadPlugin(manifest: PluginManifest): Promise<boolean> {
    if (this.loadingPlugins.has(manifest.id)) {
      log(`Plugin "${manifest.id}" is currently loading, skipping`);
      return false;
    }
    
    if (!manifest.path) {
      warn(`Invalid plugin "${manifest.id}": missing path`);
      return false;
    }

    this.loadingPlugins.add(manifest.id);
    try {
        return await this.loadPluginFromManifest(manifest, manifest.path);
    } finally {
        this.loadingPlugins.delete(manifest.id);
    }
  }

  protected async executePlugin(manifest: PluginManifest, _path: string, context: RendererPluginContext): Promise<any> {
      if (!manifest.renderer) return null;
      
      // Try to find the bundle.js file
      // The build script outputs bundle.js in the same directory as the renderer entry point
      const rendererFile = manifest.renderer;
      const lastSlash = rendererFile.lastIndexOf('/');
      const rendererDir = lastSlash !== -1 ? rendererFile.substring(0, lastSlash) : '';
      const bundlePath = `${manifest.path}/${rendererDir ? rendererDir + '/' : ''}bundle.js`;
      const indexPath = `${manifest.path}/${manifest.renderer}`;
      
      let code: string | undefined;
      
      try {
        code = await window.electronAPI.readPluginFile(bundlePath);
        log(`Loaded bundle for "${manifest.id}"`);
      } catch {
        try {
          code = await window.electronAPI.readPluginFile(indexPath);
          log(`Loaded index.js for "${manifest.id}" (no bundle found)`);
        } catch (e) {
          warn(`Could not load plugin "${manifest.id}": file not found`, e);
          return null;
        }
      }
      
      if (!code) {
        warn(`Plugin "${manifest.id}" code is empty or invalid`);
        return null;
      }

      let sandboxType: SandboxType = 'local';
      
      return await this.sandboxService.execute({
          type: sandboxType,
          code,
          context
      });
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    if (!pluginId || typeof pluginId !== 'string') {
      warn('unloadPlugin called with invalid pluginId');
      return false;
    }
    
    if (!this.plugins.has(pluginId)) {
      log(`Plugin "${pluginId}" not loaded, nothing to unload`);
      return false;
    }
    
    try {
      log(`Unloading plugin "${pluginId}"...`);
      
      // Cleanup instance if it has dispose method (e.g. Sandbox cleanup)
      const plugin = this.plugins.get(pluginId);
      if (plugin && plugin.instance && typeof plugin.instance.dispose === 'function') {
          try {
              plugin.instance.dispose();
              log(`Disposed plugin instance for "${pluginId}"`);
          } catch (e) {
              warn(`Error disposing plugin "${pluginId}":`, e);
          }
      }
      
      const registry = useSlotRegistry.getState();
      registry.unregisterAllForPlugin(pluginId);
      
      this.unregisterPlugin(pluginId);
      log(`Plugin "${pluginId}" unloaded successfully`);
      return true;
    } catch (err) {
      error(`Failed to unload plugin "${pluginId}":`, err);
      return false;
    }
  }
  
  getLoadedPluginInfo(): Array<LoadedPlugin> {
    return this.getPlugins();
  }
  
  async reloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      warn(`Cannot reload plugin "${pluginId}": not loaded`);
      return false;
    }
    
    log(`Reloading plugin "${pluginId}"...`);
    await this.unloadPlugin(pluginId);
    return this.loadPlugin(plugin.manifest);
  }

  private createUIExtensionAPI(pluginId: string): UIExtensionAPI {
    const getRegistry = () => useSlotRegistry.getState();
    
    return {
      registerSlot: (slotId, options) => getRegistry().registerSlot(slotId, pluginId, options),
      registerPanel: (options) => getRegistry().registerPanel(pluginId, options),
      registerStageView: (options) => getRegistry().registerView(pluginId, options),
      registerNavigation: (options) => getRegistry().registerNavigation(pluginId, options),
      registerInspectorTab: (options) => getRegistry().registerInspectorTab(pluginId, options),
      registerInspectorSection: (options) => getRegistry().registerInspectorSection(pluginId, options),
      registerMessageDecorator: (options) => getRegistry().registerMessageDecorator(pluginId, options),
      registerSettingsTab: (options) => getRegistry().registerSettingsTab(pluginId, options),
      registerCommand: (options) => getRegistry().registerCommand(pluginId, options),
      registerBottomPanelTab: (options) => getRegistry().registerBottomPanelTab(pluginId, options),
      showModal: (options) => getRegistry().showModal(options),
      closeModal: (id) => getRegistry().closeModal(id),
      showToast: (options) => getRegistry().showToast(options)
    };
  }

  protected createContext(plugin: PluginManifest): RendererPluginContext & { require: (id: string) => any } {
    const ui = this.createUIExtensionAPI(plugin.id);

    window.electronAPI.onPluginMessage(plugin.id, 'invoke-request', async (payload: any) => {
        const { requestId, channel, data } = payload;
        const fullChannel = `plugin:${plugin.id}:${channel}`;
        const handler = this.ipcHandlers.get(fullChannel);
        
        if (handler) {
            try {
                const result = await handler(data);
                window.electronAPI.sendPluginMessage(plugin.id, `invoke-response:${requestId}`, { result });
            } catch (e: any) {
                window.electronAPI.sendPluginMessage(plugin.id, `invoke-response:${requestId}`, { error: e.message });
            }
        } else {
            window.electronAPI.sendPluginMessage(plugin.id, `invoke-response:${requestId}`, { error: `No handler for ${channel}` });
        }
    });
    
    return {
      id: plugin.id,
      manifest: plugin,
      on: (event, callback) => {
        window.electronAPI.onPluginMessage(plugin.id, event, callback);
      },
      storage: {
        get: async (key) => window.electronAPI.pluginStorageGet(plugin.id, key),
        set: async (key, value) => window.electronAPI.pluginStorageSet(plugin.id, key, value),
        delete: async (key) => window.electronAPI.pluginStorageDelete(plugin.id, key)
      },
      secrets: {
        set: async (key: string, value: string, label?: string) => {
          await window.electronAPI.secretsSet({
            namespace: 'plugins' as const,
            key: `${plugin.id}/${key}`,
            value,
            label,
            origin: plugin.id,
          });
        },
        get: async (key: string) => {
          return window.electronAPI.secretsGet({
            namespace: 'plugins' as const,
            key: `${plugin.id}/${key}`,
          });
        },
        delete: async (key: string) => {
          return window.electronAPI.secretsDelete({
            namespace: 'plugins' as const,
            key: `${plugin.id}/${key}`,
          });
        },
        has: async (key: string) => {
          return window.electronAPI.secretsHas({
            namespace: 'plugins' as const,
            key: `${plugin.id}/${key}`,
          });
        },
        list: async (options?: any) => {
          return window.electronAPI.secretsList({
            ...options,
            namespace: 'plugins' as const,
          });
        }
      },
      ipc: {
        send: (channel, data) => {
           window.electronAPI.sendPluginMessage(plugin.id, channel, data);
        },
        on: (channel, handler) => {
           window.electronAPI.onPluginMessage(plugin.id, channel, handler);
        },
        handle: (channel, handler) => {
           const fullChannel = `plugin:${plugin.id}:${channel}`;
           log(`Registering IPC handler for ${fullChannel}`);
           this.ipcHandlers.set(fullChannel, handler);
        },
        invoke: async (channel, data) => {
            // We use the generic plugin:invoke-renderer mechanism or a direct IPC invoke if allowed
            // But here we want to invoke main process handlers from the plugin renderer
            // The standard way in this architecture seems to be sending a message and waiting for response,
            // or using window.electronAPI if exposed.
            
            // Let's assume we can use window.electronAPI.invokePlugin (if we added it) or just wrap standard IPC.
            // Since we don't have a direct 'invoke' bridge for arbitrary channels, we might need to rely on
            // specific APIs or add a generic one.
            
            // However, we added 'plugin:invoke-tool' to ipcMain.
            // But that's a specific channel.
            
            // If the plugin wants to invoke a channel it registered in main?
            // PluginManager.ts sets up `plugin:${id}:${channel}` handling.
            // But `ipcMain.handle` was used there.
            
            // To invoke it from renderer:
            return window.electronAPI.pluginInvokeRenderer(plugin.id, channel, data);
        }
      },
      services: {
        tools: {
          register: (tool: any) => {
             window.electronAPI.pluginRegisterTool(plugin.id, tool.name);
             window.electronAPI.onPluginMessage(plugin.id, 'tool-request', async (data: any) => {
                 try {
                     if (data.toolName === tool.name) {
                         const result = await tool.handler(data.args);
                         window.electronAPI.sendPluginMessage(plugin.id, `tool-response:${data.requestId}`, {
                             result
                         });
                     }
                 } catch (e: any) {
                     window.electronAPI.sendPluginMessage(plugin.id, `tool-response:${data.requestId}`, {
                         error: e.message
                     });
                 }
             });
          }
        },
        gateways: {
            register: (_gateway: any) => console.warn('Gateways not implemented')
        },
        sandbox: {} as any
      },
      dsn: {
      registerTool: (toolDefinition, handler) => {
           window.electronAPI.pluginRegisterTool(plugin.id, toolDefinition.name);
           window.electronAPI.onPluginMessage(plugin.id, 'tool-request', async (data: any) => {
               try {
                   if (data.toolName === toolDefinition.name) {
                       const result = await handler(data.args);
                       window.electronAPI.sendPluginMessage(plugin.id, `tool-response:${data.requestId}`, {
                           result
                       });
                   }
               } catch (e: any) {
                   window.electronAPI.sendPluginMessage(plugin.id, `tool-response:${data.requestId}`, {
                       error: e.message
                   });
               }
           });
      },
      invokeTool: async (_toolName, _args) => {
          console.warn("dsn.invokeTool not implemented in renderer");
          return null;
      },
      registerService: (_svc, _handler) => console.warn("DSN services not supported in renderer yet"),
      publishObservation: (_content, _smf) => console.warn("DSN observations not supported in renderer yet"),
      getIdentity: async () => { throw new Error("Not implemented"); }
    },
      ai: {
        complete: async (request: any) => {
          return window.electronAPI.aiComplete(request);
        }
      },

      traits: {
        register: (_trait: any) => {},
        unregister: (_traitId: string) => {}
      },
      
      ui,
      React,
      useAppStore,
      useAlephStore,

      // Legacy plugin API bridge: maps registerComponent(location, opts) to SlotRegistry
      registerComponent: (location: string, options: { id: string; component: React.ComponentType<any>; label?: string; icon?: any }) => {
        const registry = useSlotRegistry.getState();
        if (location.startsWith('sidebar:view:')) {
          // Register as a stage view
          registry.registerView(plugin.id, {
            id: options.id,
            name: options.label || options.id,
            icon: options.icon || (() => null),
            component: options.component,
          });
        } else if (location === 'sidebar:nav-item') {
          // Register a navigation slot registration
          registry.registerSlot('nav:rail-item' as any, plugin.id, {
            component: options.component as any,
            metadata: { id: options.id, label: options.label, icon: options.icon },
          });
        } else {
          // Generic slot registration fallback
          log(`registerComponent: unknown location "${location}" for plugin "${plugin.id}", registering as generic slot`);
          registry.registerSlot(location as any, plugin.id, {
            component: options.component as any,
            metadata: { id: options.id },
          });
        }
      },
      
      require: (id: string) => {
          switch(id) {
              case 'react': return React;
              case 'react/jsx-runtime': return JSXRuntime;
              case 'react-dom': return ReactDOM;
              case 'framer-motion': return FramerMotion;
              case 'lucide-react': return LucideReact;
              case 'alephnet': return { useAlephStore, useAppStore, useFenceStore, useSlotRegistry };
              default: throw new Error(`Module ${id} not found in plugin context`);
          }
      }
    };
  }
}
