import path from 'path';
import fs from 'fs/promises';

const CONFIG_FILE = 'config.json';

// ---------------------------------------------------------------------------
// ENV var prefix — e.g. NOTACLAW_NETWORK__PEERS='["http://..."]'
// Nested keys use double-underscore: NOTACLAW_NETWORK__HEARTBEAT_INTERVAL_MS=60000
// ---------------------------------------------------------------------------
const ENV_PREFIX = 'NOTACLAW_';

export interface NetworkConfig {
  peers: string[];
  bootstrapUrl: string;
  heartbeatIntervalMs: number;
}

export interface TurnConfig {
  enabled: boolean;
  port: number;
  listeningPort: number;
  authMechanism: 'long-term' | 'short-term';
  realm: string;
  debugLevel: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
  outputFile?: string;
}

export interface AppConfig {
  network: NetworkConfig;
  turn: TurnConfig;
  logging: LoggingConfig;
}

// ---------------------------------------------------------------------------
// Validation schema (2.5.1)
// ---------------------------------------------------------------------------

interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: readonly unknown[];
  itemType?: 'string';
  pattern?: RegExp;
}

type SchemaMap = { [key: string]: FieldRule | SchemaMap };

const CONFIG_SCHEMA: SchemaMap = {
  network: {
    peers: { type: 'array', required: true, itemType: 'string' },
    bootstrapUrl: { type: 'string', required: true, pattern: /^https?:\/\// },
    heartbeatIntervalMs: { type: 'number', required: true, min: 1000, max: 300_000 },
  },
  turn: {
    enabled: { type: 'boolean', required: true },
    port: { type: 'number', required: true, min: 1, max: 65535 },
    listeningPort: { type: 'number', required: true, min: 1, max: 65535 },
    authMechanism: { type: 'string', required: true, enum: ['long-term', 'short-term'] as const },
    realm: { type: 'string', required: true },
    debugLevel: { type: 'string', required: true },
  },
  logging: {
    level: { type: 'string', required: true, enum: ['debug', 'info', 'warn', 'error'] as const },
    format: { type: 'string', required: true, enum: ['json', 'pretty'] as const },
    outputFile: { type: 'string', required: false },
  },
};

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
  turn: {
    enabled: true,
    port: 3478,
    listeningPort: 3478,
    authMechanism: 'long-term',
    realm: 'alephnet.local',
    debugLevel: 'ALL'
  },
  logging: {
    level: 'info',
    format: 'json'
  }
};

export interface ValidationError {
  path: string;
  message: string;
}

export class ConfigManager {
  private configPath: string | null = null;
  private config: AppConfig = DEFAULT_CONFIG;
  private loaded = false;

  constructor() {
    // Path is resolved in initialize()
  }

  private getConfigPath(): string {
    if (!this.configPath) {
      // Use 'data' directory in current working directory for headless node
      const dataDir = path.join(process.cwd(), 'data');
      this.configPath = path.join(dataDir, CONFIG_FILE);
    }
    return this.configPath;
  }

  async initialize(): Promise<void> {
    let userConfig: Partial<AppConfig> = {};

    try {
      const configPath = this.getConfigPath();
      // Ensure directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      
      const data = await fs.readFile(configPath, 'utf-8');
      userConfig = JSON.parse(data);
    } catch {
      // Config doesn't exist — will use defaults
    }

    // Apply env var overrides on top of file config (2.5.2)
    const envOverrides = this.readEnvOverrides();
    const merged = this.deepMerge(DEFAULT_CONFIG, userConfig);
    this.config = this.deepMerge(merged, envOverrides);

    // Validate final config (2.5.1)
    const errors = this.validate(this.config);
    if (errors.length > 0) {
      console.warn('Config validation warnings:');
      for (const err of errors) {
        console.warn(`  [${err.path}] ${err.message}`);
      }
      // Fall back to defaults for invalid sections (2.5.3)
      this.config = this.applyDefaults(this.config, errors);
    }

    this.loaded = true;
    await this.save();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getConfig(): AppConfig {
    return this.config;
  }

  getNetworkConfig(): NetworkConfig {
    return this.config.network;
  }

  getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  // ---------------------------------------------------------------------------
  // Updaters (validate before accepting)
  // ---------------------------------------------------------------------------

  async updateNetworkConfig(updates: Partial<NetworkConfig>): Promise<ValidationError[]> {
    const candidate = { ...this.config, network: { ...this.config.network, ...updates } };
    const errors = this.validate(candidate);
    if (errors.length > 0) return errors;
    this.config = candidate;
    await this.save();
    return [];
  }

  async updateLoggingConfig(updates: Partial<LoggingConfig>): Promise<ValidationError[]> {
    const candidate = { ...this.config, logging: { ...this.config.logging, ...updates } };
    const errors = this.validate(candidate);
    if (errors.length > 0) return errors;
    this.config = candidate;
    await this.save();
    return [];
  }

  async addPeer(peerUrl: string): Promise<ValidationError[]> {
    if (!/^https?:\/\//.test(peerUrl)) {
      return [{ path: 'network.peers', message: `Invalid peer URL: ${peerUrl}` }];
    }
    if (!this.config.network.peers.includes(peerUrl)) {
      this.config.network.peers.push(peerUrl);
      await this.save();
    }
    return [];
  }

  async removePeer(peerUrl: string): Promise<void> {
    this.config.network.peers = this.config.network.peers.filter(p => p !== peerUrl);
    await this.save();
  }

  // ---------------------------------------------------------------------------
  // Validation (2.5.1)
  // ---------------------------------------------------------------------------

  validate(config: AppConfig): ValidationError[] {
    const errors: ValidationError[] = [];
    this.validateObject(config, CONFIG_SCHEMA, '', errors);
    return errors;
  }

  private validateObject(obj: any, schema: SchemaMap, prefix: string, errors: ValidationError[]): void {
    for (const [key, rule] of Object.entries(schema)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const value = obj?.[key];

      // Check if rule is a nested schema or a field rule
      if (!('type' in rule)) {
        // Nested schema
        this.validateObject(value, rule as SchemaMap, fullPath, errors);
        continue;
      }

      const fieldRule = rule as FieldRule;

      // Required check
      if (fieldRule.required && (value === undefined || value === null)) {
        errors.push({ path: fullPath, message: 'Required field is missing' });
        continue;
      }
      if (value === undefined || value === null) continue;

      // Type check
      if (fieldRule.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push({ path: fullPath, message: `Expected array, got ${typeof value}` });
          continue;
        }
        if (fieldRule.itemType === 'string') {
          for (let i = 0; i < value.length; i++) {
            if (typeof value[i] !== 'string') {
              errors.push({ path: `${fullPath}[${i}]`, message: `Expected string item, got ${typeof value[i]}` });
            }
          }
        }
      } else if (typeof value !== fieldRule.type) {
        errors.push({ path: fullPath, message: `Expected ${fieldRule.type}, got ${typeof value}` });
        continue;
      }

      // Range check
      if (fieldRule.type === 'number') {
        if (fieldRule.min !== undefined && value < fieldRule.min) {
          errors.push({ path: fullPath, message: `Value ${value} is below minimum ${fieldRule.min}` });
        }
        if (fieldRule.max !== undefined && value > fieldRule.max) {
          errors.push({ path: fullPath, message: `Value ${value} exceeds maximum ${fieldRule.max}` });
        }
      }

      // Enum check
      if (fieldRule.enum && !fieldRule.enum.includes(value)) {
        errors.push({ path: fullPath, message: `Value '${value}' not in allowed values: ${fieldRule.enum.join(', ')}` });
      }

      // Pattern check
      if (fieldRule.pattern && typeof value === 'string' && !fieldRule.pattern.test(value)) {
        errors.push({ path: fullPath, message: `Value '${value}' does not match required pattern` });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ENV var overrides (2.5.2)
  // ---------------------------------------------------------------------------

  /**
   * Read NOTACLAW_* environment variables and map them to config paths.
   * 
   * Naming convention:
   *   NOTACLAW_NETWORK__HEARTBEAT_INTERVAL_MS=60000
   *   NOTACLAW_NETWORK__BOOTSTRAP_URL="https://..."
   *   NOTACLAW_NETWORK__PEERS='["http://..."]'
   *   NOTACLAW_LOGGING__LEVEL=debug
   * 
   * Double-underscore (__) separates nested keys.
   * camelCase field names should be written in UPPER_SNAKE_CASE.
   */
  private readEnvOverrides(): Partial<AppConfig> {
    const overrides: Record<string, any> = {};

    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (!envKey.startsWith(ENV_PREFIX) || envValue === undefined) continue;

      const stripped = envKey.slice(ENV_PREFIX.length); // e.g. "NETWORK__HEARTBEAT_INTERVAL_MS"
      const parts = stripped.split('__').map(p => this.snakeToCamel(p.toLowerCase()));

      // Walk into the overrides object
      let current = overrides;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }

      const leafKey = parts[parts.length - 1];
      current[leafKey] = this.parseEnvValue(envValue);
    }

    return overrides as Partial<AppConfig>;
  }

  /**
   * Convert UPPER_SNAKE_CASE to camelCase.
   */
  private snakeToCamel(s: string): string {
    return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  /**
   * Parse an env var value into its appropriate JS type.
   */
  private parseEnvValue(value: string): any {
    // Try JSON parse for arrays/objects/booleans/numbers
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch {
      // Return as string
      return value;
    }
  }

  // ---------------------------------------------------------------------------
  // Default fallback for invalid sections (2.5.3)
  // ---------------------------------------------------------------------------

  private applyDefaults(config: AppConfig, errors: ValidationError[]): AppConfig {
    const result = { ...config };
    const invalidSections = new Set<string>();

    for (const err of errors) {
      // Extract the top-level section (e.g. "network" from "network.peers")
      const section = err.path.split('.')[0];
      invalidSections.add(section);
    }

    if (invalidSections.has('network')) {
      console.warn('Reverting network config to defaults due to validation errors');
      result.network = { ...DEFAULT_CONFIG.network };
    }
    if (invalidSections.has('logging')) {
      console.warn('Reverting logging config to defaults due to validation errors');
      result.logging = { ...DEFAULT_CONFIG.logging };
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

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
