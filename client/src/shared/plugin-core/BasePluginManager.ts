import { EventEmitter } from 'events';
import { LoadedPlugin, PluginManifest, PluginContext } from './types';

export abstract class BasePluginManager<TContext extends PluginContext = PluginContext> extends EventEmitter {
  protected plugins: Map<string, LoadedPlugin> = new Map();

  constructor() {
    super();
  }

  /**
   * Get all loaded plugins
   */
  public getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID
   */
  public getPlugin(id: string): LoadedPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Check if a plugin is loaded
   */
  public isPluginLoaded(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Core loading logic shared by both platforms
   */
  protected async loadPluginFromManifest(manifest: PluginManifest, path: string): Promise<boolean> {
    if (this.isPluginLoaded(manifest.id)) {
        console.warn(`[PluginManager] Plugin ${manifest.id} already loaded. Skipping.`);
        return true;
    }

    try {
        const context = this.createContext(manifest);
        const effectiveStatus = manifest.status || 'active';
        // Only execute and activate plugin code if the plugin is active
        const instance = effectiveStatus === 'active'
            ? await this.executePlugin(manifest, path, context)
            : null;

        if (instance && typeof instance.activate === 'function') {
            await instance.activate(context);
        }

        const loaded: LoadedPlugin = {
            manifest,
            path,
            context,
            instance,
            status: manifest.status || 'active',
            loadedAt: new Date()
        };

        this.registerPlugin(manifest.id, loaded);
        return true;
    } catch (e) {
        console.error(`[PluginManager] Failed to load plugin ${manifest.id}:`, e);
        return false;
    }
  }

  /**
   * Load a plugin
   * @param source Path or metadata to load the plugin from
   */
  abstract loadPlugin(source: string | any): Promise<void | boolean>;

  /**
   * Unload a plugin
   * @param id Plugin ID
   */
  abstract unloadPlugin(id: string): Promise<boolean>;

  /**
   * Create the execution context for a plugin
   */
  protected abstract createContext(manifest: PluginManifest): TContext;

  /**
   * Execute the plugin code
   */
  protected abstract executePlugin(manifest: PluginManifest, path: string, context: TContext): Promise<any>;

  protected registerPlugin(id: string, plugin: LoadedPlugin) {
    if (this.plugins.has(id)) {
      console.warn(`[PluginManager] Plugin ${id} is already loaded. Overwriting.`);
    }
    this.plugins.set(id, plugin);
    this.emit('plugin-loaded', plugin);
  }

  protected unregisterPlugin(id: string) {
    if (this.plugins.has(id)) {
      this.plugins.delete(id);
      this.emit('plugin-unloaded', id);
    }
  }
}
