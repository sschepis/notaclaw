// Plugin Types
import type { SkillDefinition, KeyTriplet } from './types';
import type { ServiceDefinition, GatewayDefinition } from './service-types';
import type { TrustAssessment } from './trust-types';
import type { UIExtensionAPI } from './slot-types';
import type { TraitDefinition } from './trait-types';

export type PluginPermission = 
  | 'network:http'
  | 'fs:read'
  | 'fs:write'
  | 'store:read'
  | 'store:write'
  | 'dsn:register-tool'
  | 'dsn:register-service'
  | 'dsn:invoke-tool'
  | 'dsn:publish-observation'
  | 'exec:shell'
  | 'exec:spawn'
  | 'ai:complete';

export interface AlephSkillDefinition {
  name: string;
  description?: string;
  executionLocation: 'SERVER' | 'CLIENT';
}

export interface AlephExtension {
  $schema?: string;
  type?: 'aleph-extension';
  alephVersion?: string;
  capabilities?: {
    skillProvider: boolean;
    dsnEnabled: boolean;
    semanticDomain?: string;
  };
  skills?: AlephSkillDefinition[];
  tools?: AlephSkillDefinition[];
  permissions?: PluginPermission[];
  components?: any;
  actions?: any;
  /** Plugin configuration fields (canonical key) */
  configuration?: any[];
  /** Plugin settings fields (alias for configuration, used in some manifests) */
  settings?: any[];
}

export interface PluginManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  author?: string;
  main?: string; // Path to main process entry point
  renderer?: string; // Path to renderer process entry point
  icon?: string; // Base64 data URI or SVG string of the plugin icon
  permissions: PluginPermission[];
  semanticDomain?: string;
  // Runtime properties added by PluginManager
  path?: string;
  isAlephExtension?: boolean;
  alephConfig?: AlephExtension;
  trust?: TrustAssessment;
  status?: 'active' | 'error' | 'blocked' | 'pending-confirmation' | 'disabled';
  isCore?: boolean; // True for core bundled plugins that cannot be uninstalled
}

export interface SkillManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  author?: string;
  downloadUrl?: string;
  semanticDomain?: string;
  downloads?: number;
  stars?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Channel Gateway Interface
// Allows plugins (Discord, Slack) to normalize messages into the graph.
// ═══════════════════════════════════════════════════════════════════════════

export interface NormalizedMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  channelId: string;
  source: string; // 'discord', 'slack', etc.
  timestamp: number;
  raw?: any;
}

export interface ChannelGateway {
  id: string;
  sourceName: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(channelId: string, content: string): Promise<void>;
  onMessage(handler: (msg: NormalizedMessage) => void): void;
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: Sandbox Provider Interface
// Allows plugins (Code Interpreter) to request safe execution environments.
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxSession {
  id: string;
  exec(command: string, options?: { timeout?: number }): Promise<ExecutionResult>;
  write(path: string, content: string): Promise<void>;
  read(path: string): Promise<string>;
  close(): Promise<void>;
}

export interface SandboxProvider {
  createSession(type: 'node' | 'python' | 'bash'): Promise<SandboxSession>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Plugin Context
// ═══════════════════════════════════════════════════════════════════════════

export interface PluginContext {
  id: string;
  manifest: PluginManifest;
  
  // Lifecycle
  on(event: 'ready' | 'stop', callback: () => void): void;
  
  // Storage (Scoped)
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // Secrets (Scoped to plugin namespace)
  secrets: {
    set(key: string, value: string, label?: string): Promise<void>;
    get(key: string): Promise<string | null>;
    delete(key: string): Promise<boolean>;
    has(key: string): Promise<boolean>;
    list(options?: any): Promise<any[]>;
  };

  // IPC (Scoped)
  ipc: {
    send(channel: string, data: any): void;
    on(channel: string, handler: (data: any) => void): void;
    handle(channel: string, handler: (data: any) => Promise<any>): void; // Added handle for plugins providing services
    invoke(channel: string, data: any): Promise<any>;
  };

  // Service Registry (Access to other plugins/core capabilities)
  services: {
    tools: {
      register(tool: { 
        name: string; 
        description: string; 
        parameters: any; 
        handler: (args: any) => Promise<any> 
      }): void;
      list(): Promise<any[]>;
    };
    gateways: {
      register(gateway: GatewayDefinition): void;
    };
    sandbox: SandboxProvider; // Available if 'exec:spawn' permission granted
  };

  // AlephNet Extensions
  dsn: {
    registerTool(toolDefinition: SkillDefinition, handler: Function): void;
    registerService(serviceDef: ServiceDefinition, handler: Function): void;
    invokeTool(toolName: string, args: any): Promise<any>;
    publishObservation(content: string, smf: number[]): void;
    getIdentity(): Promise<KeyTriplet>;
  };

  // AI Access
  ai: {
    complete(request: any): Promise<{ text: string; raw?: any }>;
  };

  // Trait Registry
  traits: {
    register(trait: TraitDefinition): void;
    unregister(traitId: string): void;
  };
}

export interface RendererPluginContext extends PluginContext {
  // UI Extension API (new slot-based system)
  ui: UIExtensionAPI;

  // Legacy component registration bridge
  registerComponent: (location: string, options: { id: string; component: any; label?: string; icon?: any }) => void;
  
  // Libraries
  React: typeof import('react');
  
  // Stores
  useAppStore: any;
  useAlephStore: any;
}
