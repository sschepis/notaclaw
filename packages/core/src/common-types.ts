// Core Common Types
// Platform-agnostic types extracted from the original types.ts.
// Electron-specific types (IElectronAPI, Window augmentation) remain in
// client/src/shared/types.ts and are NOT part of @notaclaw/core.

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

import { AIProviderConfig } from './ai-types';

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
