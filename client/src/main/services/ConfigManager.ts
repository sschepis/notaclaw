import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

const CONFIG_FILE = 'config.json';

export interface WorkspaceConfig {
  path: string;
}

export interface NetworkConfig {
  peers: string[];
  bootstrapUrl: string;
  heartbeatIntervalMs: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
  outputFile?: string;
}

export interface AppConfig {
  network: NetworkConfig;
  logging: LoggingConfig;
  workspace?: WorkspaceConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  network: {
    peers: [
      'http://localhost:8765/gun',
      'https://gun-manhattan.herokuapp.com/gun',
      'https://gun-us.herokuapp.com/gun'
    ],
    bootstrapUrl: 'https://alephnet.io/bootstrap',
    heartbeatIntervalMs: 30000
  },
  logging: {
    level: 'info',
    format: 'json'
  }
};

export class ConfigManager {
  private configPath: string | null = null;
  private config: AppConfig = DEFAULT_CONFIG;

  constructor() {
    // Don't access app.getPath() here - Electron may not be ready yet
    // Path is resolved in initialize()
  }

  private getConfigPath(): string {
    if (!this.configPath) {
      this.configPath = path.join(app.getPath('userData'), CONFIG_FILE);
    }
    return this.configPath;
  }

  async initialize(): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      const data = await fs.readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(data);
      // Deep merge with defaults
      this.config = this.deepMerge(DEFAULT_CONFIG, userConfig);
    } catch {
      // Config doesn't exist, use defaults and create it
      this.config = DEFAULT_CONFIG;
      await this.save();
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getNetworkConfig(): NetworkConfig {
    return this.config.network;
  }

  getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  getWorkspacePath(): string | null {
    return this.config.workspace?.path || null;
  }

  async setWorkspacePath(workspacePath: string): Promise<void> {
    // Ensure the workspace directory exists
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      
      // Create .aleph directory inside workspace
      const alephPath = path.join(workspacePath, '.aleph');
      await fs.mkdir(alephPath, { recursive: true });
      
      this.config.workspace = { path: workspacePath };
      await this.save();
    } catch (error) {
      console.error('Failed to set workspace path:', error);
      throw error;
    }
  }

  async updateNetworkConfig(updates: Partial<NetworkConfig>): Promise<void> {
    this.config.network = { ...this.config.network, ...updates };
    await this.save();
  }

  async updateLoggingConfig(updates: Partial<LoggingConfig>): Promise<void> {
    this.config.logging = { ...this.config.logging, ...updates };
    await this.save();
  }

  async addPeer(peerUrl: string): Promise<void> {
    if (!this.config.network.peers.includes(peerUrl)) {
      this.config.network.peers.push(peerUrl);
      await this.save();
    }
  }

  async removePeer(peerUrl: string): Promise<void> {
    this.config.network.peers = this.config.network.peers.filter(p => p !== peerUrl);
    await this.save();
  }

  private async save(): Promise<void> {
    const data = JSON.stringify(this.config, null, 2);
    const configPath = this.getConfigPath();
    await fs.writeFile(configPath, data, { mode: 0o600 });
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key of Object.keys(source) as (keyof T)[]) {
      const sourceVal = source[key];
      const targetVal = target[key];
      if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
          targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)) {
        result[key] = this.deepMerge(targetVal, sourceVal as any);
      } else if (sourceVal !== undefined) {
        result[key] = sourceVal as T[keyof T];
      }
    }
    return result;
  }
}

// Singleton instance
export const configManager = new ConfigManager();
