/**
 * Resonant Agents — Unified Type Definitions
 *
 * Consolidates the previously-scattered agent type system:
 *   - SRIAAgent (from alephnet-types.ts) — beliefs, goalPriors, lifecycle
 *   - AgentTask (from agent-types.ts)   — local agentic task execution
 *   - ResonantAgentTeam                 — multi-agent teams
 *
 * This module is the single source of truth for all agent-related types.
 * Legacy types are re-exported with adapters for backward compatibility.
 */

import type { SemanticDomain, StakingTier, AgentBelief } from './alephnet-types';

// ═══════════════════════════════════════════════════════════════════════════
// Core Enums & Primitives
// ═══════════════════════════════════════════════════════════════════════════

/** Runtime state of a Resonant Agent */
export type ResonantAgentStatus = 'dormant' | 'active' | 'busy' | 'error';

/** Permission flags for tool access */
export type AgentPermission =
  | 'fs:read'
  | 'fs:write'
  | 'shell'
  | 'memory'
  | 'ui'
  | 'network';

/** Personality communication style */
export type AgentStyle = 'concise' | 'detailed' | 'technical' | 'creative';

/** Memory retention policy */
export type MemoryRetention = 'session' | 'persistent' | 'ephemeral';

/** Deployment mode */
export type DeploymentMode = 'local' | 'mesh' | 'hybrid';

// ═══════════════════════════════════════════════════════════════════════════
// ResonantAgent — Unified Agent Definition
// ═══════════════════════════════════════════════════════════════════════════

/** Personality configuration for an agent */
export interface AgentPersonality {
  /** Core system prompt that defines the agent's behavior */
  systemPrompt: string;
  /** Personality traits (e.g., 'analytical', 'creative') */
  traits: string[];
  /** Communication style */
  style: AgentStyle;
  /** Prime resonance signature for mesh routing (optional) */
  resonanceSignature?: number[];
}

/** Capability configuration for an agent */
export interface AgentCapabilities {
  /** Tool IDs this agent has access to (e.g., 'shell', 'read_file', 'memory_search_*') */
  tools: string[];
  /** Default prompt chain name (loaded from data/prompt-chains/) */
  promptChain?: string;
  /** Maximum AI call steps per task (default 50) */
  maxSteps: number;
  /** Maximum total duration per task in ms (default 30 min) */
  maxDurationMs: number;
  /** Permission flags */
  permissions: AgentPermission[];
}

/** Memory configuration for an agent */
export interface AgentMemoryConfig {
  /** Agent's personal memory field ID */
  personalFieldId?: string;
  /** Shared memory field IDs for inter-agent communication */
  sharedFieldIds: string[];
  /** How long memories persist */
  retentionPolicy: MemoryRetention;
}

/** Deployment configuration for an agent */
export interface AgentDeployment {
  /** Where this agent runs */
  mode: DeploymentMode;
  /** Specific mesh node ID (if deployed to a particular node) */
  meshNodeId?: string;
  /** Semantic domain for mesh routing */
  semanticDomain?: SemanticDomain;
  /** Required staking tier for mesh deployment */
  stakingTier?: StakingTier;
}

/** Script attachment to an agent */
export interface AgentScriptAttachment {
  /** RISA script ID */
  scriptId: string;
  /** When this script should trigger */
  trigger: string;
  /** Whether this script is currently active */
  active: boolean;
}

/** Runtime status of a Resonant Agent */
export interface AgentRuntimeStatus {
  /** Current lifecycle state */
  state: ResonantAgentStatus;
  /** ID of the currently executing AgentTask, if any */
  activeTaskId?: string;
  /** When the agent was last active */
  lastActiveAt?: number;
  /** Error message if state is 'error' */
  errorMessage?: string;
}

/**
 * ResonantAgent — The unified agent definition.
 *
 * Merges the identity/personality/beliefs of SRIAAgent with the
 * execution capabilities of AgentTask into a single coherent type.
 */
export interface ResonantAgent {
  /** Unique agent ID */
  id: string;
  /** Display name */
  name: string;
  /** Purpose description */
  description: string;
  /** Icon/avatar URI */
  avatar?: string;

  /** Personality definition */
  personality: AgentPersonality;
  /** Capability configuration */
  capabilities: AgentCapabilities;
  /** Memory configuration */
  memory: AgentMemoryConfig;
  /** Deployment configuration */
  deployment: AgentDeployment;

  /** Attached RISA scripts */
  scripts: AgentScriptAttachment[];

  /** Current runtime status */
  status: AgentRuntimeStatus;

  /** Active inference beliefs (from SRIA model) */
  beliefs: AgentBelief[];
  /** Goal weights (from SRIA model) */
  goalPriors: Record<string, number>;

  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** Who created this agent */
  createdBy: 'user' | 'system' | 'template';
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent Templates
// ═══════════════════════════════════════════════════════════════════════════

/** Template for creating new agents */
export interface ResonantAgentTemplate {
  id: string;
  name: string;
  description: string;
  personality: AgentPersonality;
  capabilities: Partial<AgentCapabilities>;
  memory?: Partial<AgentMemoryConfig>;
  deployment?: Partial<AgentDeployment>;
  goalPriors?: Record<string, number>;
}

/** Built-in agent templates */
export const BUILTIN_TEMPLATES: ResonantAgentTemplate[] = [
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Excels at finding, analyzing, and synthesizing information',
    personality: {
      systemPrompt: 'You are a meticulous research analyst who excels at finding, verifying, and synthesizing information. Always cite sources when possible. Be thorough but concise in your analysis.',
      traits: ['analytical', 'thorough', 'evidence-based'],
      style: 'detailed',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory', 'memory_search_conversation', 'memory_search_user', 'memory_search_global', 'memory_store', 'memory_recall'],
      permissions: ['fs:read', 'shell', 'memory'],
      maxSteps: 30,
      maxDurationMs: 30 * 60 * 1000,
    },
    goalPriors: {
      accuracy: 0.9,
      thoroughness: 0.8,
      efficiency: 0.6,
    },
  },
  {
    id: 'code-engineer',
    name: 'Code Engineer',
    description: 'Writes, reviews, and refactors code across languages',
    personality: {
      systemPrompt: 'You are an expert software engineer with deep knowledge across programming languages and frameworks. Write clean, well-documented code following best practices. Explain your reasoning clearly.',
      traits: ['precise', 'pragmatic', 'best-practices-aware'],
      style: 'technical',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      permissions: ['fs:read', 'fs:write', 'shell'],
      maxSteps: 50,
      maxDurationMs: 30 * 60 * 1000,
    },
    goalPriors: {
      correctness: 0.95,
      maintainability: 0.8,
      performance: 0.7,
    },
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Generates creative content, stories, and narratives',
    personality: {
      systemPrompt: 'You are a creative writer with a vivid imagination and mastery of narrative craft. You excel at generating engaging stories, evocative descriptions, and compelling dialogue. Embrace originality.',
      traits: ['imaginative', 'eloquent', 'narrative-driven'],
      style: 'creative',
    },
    capabilities: {
      tools: ['write_file', 'memory_store', 'memory_recall'],
      permissions: ['fs:write', 'memory'],
      maxSteps: 20,
      maxDurationMs: 15 * 60 * 1000,
    },
    goalPriors: {
      creativity: 0.95,
      engagement: 0.85,
      coherence: 0.7,
    },
  },
  {
    id: 'system-operator',
    name: 'System Operator',
    description: 'Manages system tasks, automation, and DevOps workflows',
    personality: {
      systemPrompt: 'You are a systems administrator and DevOps expert. You methodically automate tasks, manage infrastructure, and troubleshoot system issues. Always prioritize safety and idempotent operations.',
      traits: ['methodical', 'safety-conscious', 'automation-first'],
      style: 'concise',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      permissions: ['fs:read', 'fs:write', 'shell'],
      maxSteps: 50,
      maxDurationMs: 60 * 60 * 1000,
    },
    goalPriors: {
      reliability: 0.95,
      safety: 0.9,
      efficiency: 0.8,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Agent Teams
// ═══════════════════════════════════════════════════════════════════════════

/** Unified team definition (replaces dual AgentTeam types) */
export interface ResonantAgentTeam {
  id: string;
  name: string;
  description?: string;
  agentIds: string[];
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'inactive';
}

// ═══════════════════════════════════════════════════════════════════════════
// IPC Payloads
// ═══════════════════════════════════════════════════════════════════════════

/** Options for creating a new Resonant Agent */
export interface CreateResonantAgentOptions {
  name: string;
  description?: string;
  templateId?: string;
  personality?: Partial<AgentPersonality>;
  capabilities?: Partial<AgentCapabilities>;
  memory?: Partial<AgentMemoryConfig>;
  deployment?: Partial<AgentDeployment>;
  goalPriors?: Record<string, number>;
}

/** Options for updating an existing agent */
export interface UpdateResonantAgentOptions {
  name?: string;
  description?: string;
  avatar?: string;
  personality?: Partial<AgentPersonality>;
  capabilities?: Partial<AgentCapabilities>;
  memory?: Partial<AgentMemoryConfig>;
  deployment?: Partial<AgentDeployment>;
  goalPriors?: Record<string, number>;
  scripts?: AgentScriptAttachment[];
}

/** Context provided when summoning an agent */
export interface SummonContext {
  /** Optional conversation ID to bind the agent to */
  conversationId?: string;
  /** Initial context/instructions */
  context?: string;
}

/** Parameters for starting a task on a specific agent */
export interface AgentStartTaskParams {
  /** Agent ID to run the task on */
  agentId: string;
  /** Conversation ID for the task */
  conversationId: string;
  /** User message / task instruction */
  message: string;
  /** Additional metadata (provider, model, etc.) */
  metadata: {
    providerId?: string;
    model?: string;
    mode?: string;
    resonance?: number;
    [key: string]: any;
  };
}

/** Parameters for team orchestration */
export interface OrchestrateTeamParams {
  teamId: string;
  task: string;
  conversationId?: string;
  metadata?: Record<string, any>;
}

/** Result from team orchestration */
export interface OrchestrateResult {
  teamId: string;
  taskId: string;
  agentResults: Array<{
    agentId: string;
    agentName: string;
    subtask: string;
    output: string;
    status: 'success' | 'error';
    error?: string;
  }>;
  synthesizedOutput: string;
  coherenceScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool Registry Types
// ═══════════════════════════════════════════════════════════════════════════

/** A tool registration in the centralized registry */
export interface ToolRegistration {
  /** Unique tool ID */
  id: string;
  /** Tool function name (used in AI tool-calling) */
  name: string;
  /** Description for AI tool-calling */
  description: string;
  /** JSON Schema for parameters */
  parameters: Record<string, any>;
  /** Execution handler */
  handler: (args: any) => Promise<any>;
  /** Who registered this tool */
  source: 'core' | 'plugin' | 'agent';
  /** Required permissions to use this tool */
  permissions: AgentPermission[];
  /** Tool category for grouping */
  category: 'filesystem' | 'shell' | 'memory' | 'ui' | 'network' | 'control' | 'custom';
}

// ═══════════════════════════════════════════════════════════════════════════
// IPC Channel Map for Resonant Agents
// ═══════════════════════════════════════════════════════════════════════════

/** All Resonant Agent IPC channels */
export interface ResonantAgentIPCMap {
  // Agent CRUD
  'resonant:agent:list': { params: { filter?: Partial<ResonantAgent> }; result: ResonantAgent[] };
  'resonant:agent:get': { params: { id: string }; result: ResonantAgent | null };
  'resonant:agent:create': { params: CreateResonantAgentOptions; result: ResonantAgent };
  'resonant:agent:update': { params: { id: string; updates: UpdateResonantAgentOptions }; result: ResonantAgent };
  'resonant:agent:delete': { params: { id: string }; result: { deleted: boolean } };
  'resonant:agent:duplicate': { params: { id: string; newName: string }; result: ResonantAgent };
  'resonant:agent:export': { params: { id: string }; result: string };
  'resonant:agent:import': { params: { json: string }; result: ResonantAgent };

  // Agent Lifecycle
  'resonant:agent:summon': { params: { id: string; context?: SummonContext }; result: ResonantAgent };
  'resonant:agent:dismiss': { params: { id: string }; result: { dismissed: boolean } };

  // Agent Task Execution (delegates to AgentTaskRunner)
  'resonant:agent:startTask': { params: AgentStartTaskParams; result: string };
  'resonant:agent:stopTask': { params: { taskId: string }; result: void };
  'resonant:agent:respondToTask': { params: { taskId: string; response: string }; result: void };

  // Templates
  'resonant:templates:list': { params: void; result: ResonantAgentTemplate[] };

  // Teams
  'resonant:team:list': { params: void; result: ResonantAgentTeam[] };
  'resonant:team:create': { params: { name: string; agentIds: string[]; description?: string }; result: ResonantAgentTeam };
  'resonant:team:update': { params: { id: string; updates: Partial<ResonantAgentTeam> }; result: ResonantAgentTeam };
  'resonant:team:delete': { params: { id: string }; result: { deleted: boolean } };
  'resonant:team:orchestrate': { params: OrchestrateTeamParams; result: OrchestrateResult };

  // Tool Registry
  'resonant:tool:list': { params: void; result: Array<Omit<ToolRegistration, 'handler'>> };
}

// ═══════════════════════════════════════════════════════════════════════════
// Backward Compatibility — Adapter Functions
// ═══════════════════════════════════════════════════════════════════════════

import type { SRIAAgent, AgentTemplate, AgentTeam as AlephAgentTeam } from './alephnet-types';

/** Convert a legacy SRIAAgent to a ResonantAgent */
export function sriaAgentToResonant(sria: SRIAAgent): ResonantAgent {
  return {
    id: sria.id,
    name: sria.name,
    description: `SRIA Agent (template: ${sria.templateId || 'none'})`,
    personality: {
      systemPrompt: 'You are an autonomous agent.',
      traits: [],
      style: 'detailed',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      maxSteps: 50,
      maxDurationMs: 30 * 60 * 1000,
      permissions: ['fs:read', 'fs:write', 'shell'],
    },
    memory: {
      sharedFieldIds: [],
      retentionPolicy: 'persistent',
    },
    deployment: {
      mode: 'mesh',
    },
    scripts: [],
    status: {
      state: sria.status === 'active' ? 'active' : sria.status === 'dismissed' ? 'dormant' : 'dormant',
    },
    beliefs: sria.beliefs || [],
    goalPriors: sria.goalPriors || {},
    createdAt: sria.createdAt,
    updatedAt: sria.createdAt,
    createdBy: 'system',
  };
}

/** Convert a ResonantAgent back to SRIAAgent for AlephNet API compatibility */
export function resonantToSRIA(agent: ResonantAgent): SRIAAgent {
  return {
    id: agent.id,
    name: agent.name,
    templateId: undefined,
    status: agent.status.state === 'active' || agent.status.state === 'busy' ? 'active' : 'idle',
    goalPriors: agent.goalPriors,
    beliefs: agent.beliefs,
    createdAt: agent.createdAt,
    sessionId: undefined,
  };
}

/** Convert legacy AlephNet AgentTeam to ResonantAgentTeam */
export function alephTeamToResonant(team: AlephAgentTeam): ResonantAgentTeam {
  return {
    id: team.id,
    name: team.name,
    agentIds: team.agentIds,
    createdAt: team.createdAt,
    updatedAt: team.createdAt,
    status: 'active',
  };
}

/** Convert a legacy AgentTemplate to ResonantAgentTemplate */
export function agentTemplateToResonant(tmpl: AgentTemplate): ResonantAgentTemplate {
  return {
    id: tmpl.id,
    name: tmpl.name,
    description: tmpl.description,
    personality: {
      systemPrompt: `You are a ${tmpl.name.toLowerCase()}.`,
      traits: [],
      style: 'detailed',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      permissions: ['fs:read', 'fs:write', 'shell'],
    },
    goalPriors: tmpl.defaultGoalPriors,
  };
}

/** Default values for creating a new ResonantAgent */
export function createDefaultAgent(overrides: Partial<ResonantAgent> = {}): ResonantAgent {
  const now = Date.now();
  return {
    id: '',
    name: 'New Agent',
    description: '',
    personality: {
      systemPrompt: 'You are a helpful AI assistant.',
      traits: [],
      style: 'detailed',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      maxSteps: 50,
      maxDurationMs: 30 * 60 * 1000,
      permissions: ['fs:read', 'fs:write', 'shell', 'memory'],
    },
    memory: {
      sharedFieldIds: [],
      retentionPolicy: 'persistent',
    },
    deployment: {
      mode: 'local',
    },
    scripts: [],
    status: {
      state: 'dormant',
    },
    beliefs: [],
    goalPriors: {},
    createdAt: now,
    updatedAt: now,
    createdBy: 'user',
    ...overrides,
  };
}
