// TODO: REFACTOR: Consolidate PluginManager logic.
// There is duplication between this file, client/src/main/services/PluginManager.ts,
// and client/src/renderer/services/PluginLoader.ts. Consider creating a shared @alephnet/plugin-core package.

import fs from 'fs';
import path from 'path';
import { DSNNode } from '@sschepis/alephnet-node';
import { IAlephAI } from '../services/AlephAI';

export interface PluginContext {
    dsn: DSNNode;
    ai: IAlephAI;
}

export interface PluginManifest {
    name: string;
    version: string;
    description?: string;
    main?: string;
    permissions?: string[];
}

export interface AlephPlugin {
    activate(context: PluginContext): Promise<void>;
    deactivate?(): Promise<void>;
}

export class PluginManager {
    private plugins = new Map<string, AlephPlugin>();
    private baseDir: string;

    constructor(private context: PluginContext, baseDir?: string) {
        this.baseDir = baseDir || path.resolve(__dirname, '../../plugins');
    }

    /**
     * Load all plugins found in the plugins directory
     */
    async loadAll() {
        if (!fs.existsSync(this.baseDir)) {
            console.warn(`[PluginManager] Plugin directory not found: ${this.baseDir}`);
            return;
        }

        const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                await this.loadPlugin(entry.name);
            }
        }
    }

    /**
     * Load a specific plugin by name (directory name)
     */
    async loadPlugin(pluginName: string) {
        if (this.plugins.has(pluginName)) return;

        const pluginPath = path.join(this.baseDir, pluginName);
        const manifestPath = path.join(pluginPath, 'package.json');

        if (!fs.existsSync(manifestPath)) {
            // console.debug(`[PluginManager] Skipping ${pluginName} - no package.json`);
            return;
        }

        try {
            // Dynamic import of the plugin entry point
            // We assume the plugin is compiled or we are running in ts-node
            // For now, we try to require the directory which uses package.json main
            const pluginModule = require(pluginPath);
            
            // Check if it exports 'activate'
            if (typeof pluginModule.activate !== 'function') {
                console.error(`[PluginManager] Plugin ${pluginName} does not export 'activate' function.`);
                return;
            }

            console.log(`[PluginManager] Activating ${pluginName}...`);
            await pluginModule.activate(this.context);
            
            this.plugins.set(pluginName, pluginModule);
            console.log(`[PluginManager] Activated ${pluginName}`);

        } catch (error) {
            console.error(`[PluginManager] Failed to load ${pluginName}:`, error);
        }
    }
}
