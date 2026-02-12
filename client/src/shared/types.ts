// Core AlephNet Types
// Most types have been moved to ./alephnet-types.ts
// This file retains legacy types and the main Electron API interface definition.

import {
  SemanticDomain,
  SRIALifecycleState,
  SkillDefinition,
  SkillParameterSchema,
  ToolCallIntent,
  ToolResult,
  KeyTriplet,
  DSNNodeConfig as AlephDSNNodeConfig,
  SRIASessionState,
  DurableAgentState
} from './alephnet-types';

import { AIProviderConfig, AISettings } from './ai-types';
import { PluginManifest, SkillManifest } from './plugin-types';
import { 
  AgentStartTaskPayload, 
  AgentStopTaskPayload, 
  AgentUserResponsePayload, 
  AgentTask, 
  AgentTaskUpdateEvent, 
  AgentTaskMessageEvent 
} from './agent-types';
import { 
  SetSecretOptions, 
  GetSecretOptions, 
  DeleteSecretOptions, 
  ListSecretsOptions, 
  SecretEntryRedacted, 
  SecretNamespace, 
  VaultStatus 
} from './secrets-types';
import { IAlephNetAPI } from './alephnet-api';

// Re-export common types for backward compatibility
export type { 
  SemanticDomain, 
  SRIALifecycleState,
  SkillDefinition,
  SkillParameterSchema,
  ToolCallIntent,
  ToolResult,
  KeyTriplet,
  SRIASessionState,
  DurableAgentState
};

// 2. Identity & Node Configuration
// Extending or re-defining DSNNodeConfig if needed, but preferably using the one from alephnet-types
export interface DSNNodeConfig extends Omit<AlephDSNNodeConfig, 'status' | 'stakingTier' | 'supportedProviders'> {
  status: 'ONLINE' | 'DRAINING' | 'OFFLINE';
  stakingTier: 'Neophyte' | 'Adept' | 'Magus' | 'Archon';
  supportedProviders: AIProviderConfig[];
  hostedSkills: string[];
  loadIndex: number;
  alephBalance: number;
}

// Legacy / Compatibility Types
export interface MessagePayload {
  content: string;
  mode: 'Chat' | 'Task' | 'Proposal';
  resonance: number;
  model?: string;
  attachments?: Array<{
    name: string;
    type: 'image' | 'document' | 'file';
    content?: string;
    dataUrl?: string;
  }>;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  title: string;
  message: string;
  data?: any;
}

export interface IElectronAPI {
  sendMessage: (payload: MessagePayload) => Promise<void>;
  onMessage: (callback: (event: any, message: any) => void) => () => void;
  
  approveTool: (toolId: string) => Promise<boolean>;
  summonAgent: (agentId: string) => Promise<void>;
  
  stakeTokens: (amount: number) => Promise<boolean>;
  
  // State Subscriptions
  onWalletUpdate: (callback: (event: any, wallet: any) => void) => () => void;
  onAgentStateUpdate: (callback: (event: any, state: any) => void) => () => void;
  onSMFUpdate: (callback: (event: any, smf: any) => void) => () => void;
  onNetworkUpdate: (callback: (event: any, network: any) => void) => () => void;

  // Configuration
  configGet: () => Promise<any>;
  configGetNetwork: () => Promise<any>;
  configUpdateNetwork: (updates: any) => Promise<void>;
  configAddPeer: (peerUrl: string) => Promise<void>;
  configRemovePeer: (peerUrl: string) => Promise<void>;
  configGetLogging: () => Promise<any>;
  configUpdateLogging: (updates: any) => Promise<void>;

  // AI Provider Management
  getAISettings: () => Promise<AISettings>;
  saveAISettings: (settings: AISettings) => Promise<boolean>;
  testAIProvider: (config: AIProviderConfig) => Promise<boolean>;
  fetchProviderModels: (config: AIProviderConfig, forceRefresh?: boolean) => Promise<string[]>;
  aiComplete: (request: any) => Promise<{ text: string; raw?: any }>;
  selectFile: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>;

  // WebLLM Delegate
  onRequestLocalInference: (callback: (event: any, data: { content: string, model: string }) => void) => () => void;
  submitLocalAIResponse: (content: string) => Promise<void>;

  // Identity Management
  checkIdentity: () => Promise<boolean>;
  createIdentity: () => Promise<KeyTriplet>;
  importIdentity: (json: string) => Promise<KeyTriplet>;

  // Plugin Management
  getPlugins: () => Promise<PluginManifest[]>;
  getOpenClawSkills: () => Promise<SkillManifest[]>;
  readPluginFile: (path: string) => Promise<string>;
  pluginDisable: (id: string) => Promise<boolean>;
  pluginEnable: (id: string) => Promise<boolean>;
  pluginUninstall: (id: string) => Promise<boolean>;
  sendPluginMessage: (pluginId: string, channel: string, data: any) => Promise<void>;
  onPluginMessage: (pluginId: string, channel: string, callback: (data: any) => void) => () => void;
  
  // Plugin Storage
  pluginStorageGet: (pluginId: string, key: string) => Promise<any>;
  pluginStorageSet: (pluginId: string, key: string, value: any) => Promise<void>;
  pluginStorageDelete: (pluginId: string, key: string) => Promise<void>;

  // Logging
  getLogs: (limit?: number) => Promise<LogEntry[]>;
  getLogsByCategory: (category: string, limit?: number) => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
  onLogEntry: (callback: (event: any, entry: LogEntry) => void) => () => void;

  // Secrets
  secretsSet: (options: SetSecretOptions) => Promise<void>;
  secretsGet: (options: GetSecretOptions) => Promise<string | null>;
  secretsDelete: (options: DeleteSecretOptions) => Promise<boolean>;
  secretsHas: (options: GetSecretOptions) => Promise<boolean>;
  secretsList: (options?: ListSecretsOptions) => Promise<SecretEntryRedacted[]>;
  secretsClearNamespace: (namespace: SecretNamespace) => Promise<number>;
  secretsStatus: () => Promise<VaultStatus>;
  secretsLock: () => Promise<void>;
  secretsUnlock: () => Promise<void>;

  // ─── Agent Task Runner ──────────────────────────────────────────
  agentStartTask: (params: AgentStartTaskPayload) => Promise<string>;
  agentStopTask: (params: AgentStopTaskPayload) => Promise<void>;
  agentUserResponse: (params: AgentUserResponsePayload) => Promise<void>;
  agentGetTask: (params: { taskId: string }) => Promise<AgentTask | null>;
  agentGetActiveTask: (params: { conversationId: string }) => Promise<AgentTask | null>;
  onAgentTaskUpdate: (callback: (event: any, data: AgentTaskUpdateEvent) => void) => () => void;
  onAgentTaskMessage: (callback: (event: any, data: AgentTaskMessageEvent) => void) => () => void;

  // App-level Command Invocation
  onAppInvoke: (callback: (event: any, payload: { requestId: string, channel: string, data: any }) => void) => () => void;
  sendAppResponse: (requestId: string, response: any) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI & IAlephNetAPI;
  }
}
