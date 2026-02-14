/**
 * @notaclaw/core — Shared type definitions and utilities
 *
 * This package is the single source of truth for all platform-agnostic
 * types shared between the headless Node.js target (src/) and the
 * Electron client (client/src/).
 */

// ─── Core AI Types ───────────────────────────────────────────────────────
export * from './ai-types';

// ─── Agent Task Types ────────────────────────────────────────────────────
export * from './agent-types';

// ─── Error Classes ───────────────────────────────────────────────────────
export * from './errors';

// ─── Plugin Types ────────────────────────────────────────────────────────
export * from './plugin-types';

// ─── Secrets Types ───────────────────────────────────────────────────────
export * from './secrets-types';

// ─── Service Types ───────────────────────────────────────────────────────
export * from './service-types';

// ─── Slot Types (UI extension system) ────────────────────────────────────
export * from './slot-types';

// ─── Trait Types ─────────────────────────────────────────────────────────
export * from './trait-types';

// ─── Trust & Provenance Types ────────────────────────────────────────────
export * from './trust-types';

// ─── Common/Legacy Types ─────────────────────────────────────────────────
export * from './common-types';

// ─── UI Context Types ────────────────────────────────────────────────────
export * from './ui-context-types';

// ─── AlephNet Types (large, exported as namespace-style) ─────────────────
// These are re-exported individually to avoid name conflicts with the
// above modules. Import directly from '@notaclaw/core/alephnet-types'
// if you need the full set without conflicts.
export {
  // Enums / type aliases (not already exported above)
  type ExecutionContext,
  type MessageRole,
  type MemoryScope,
  type Visibility,
  type StakingTier,
  type ClaimStatus,
  type TaskType,
  type TaskStatus,
  type EdgeType,
  type AgentStatus,
  type RunStatus,
  type TransactionType,
  type CognitiveState,
  type ThinkDepth,

  // Core identity
  type PaginatedList,

  // Domain types
  type DomainVisibility,
  type DomainRole,
  type MembershipStatus,
  type DomainRules,
  type DomainDefinition,
  type DomainMembership,

  // DSN Node
  type DSNNodeConfig as AlephDSNNodeConfig,

  // Semantic computing results
  type ThinkResult,
  type CompareResult,
  type IntrospectionResult,
  type FocusResult,
  type ExploreResult,
  type RememberResult,
  type RecallResult,

  // Memory field types
  type MemoryField,
  type MemoryFragment,
  type MemoryFieldEntropy,
  type MemoryCheckpoint,
  type HolographicPattern,
  type CreateMemoryFieldOptions,
  type StoreMemoryOptions,
  type QueryMemoryOptions,
  type QueryGlobalOptions,

  // Social graph
  type Friend,
  type FriendRequest,
  type UserProfile,
  type ProfileLink,

  // Messaging
  type DirectMessage,
  type ChatRoom,
  type RoomMessage,
  type Conversation,
  type AIMessage,
  type AIConversation,

  // Scheduled tasks
  type ScheduledTaskStatus,
  type TaskInputField,
  type TaskOutputFormat,
  type TaskExecutionResult,
  type ScheduledTask,
  type CreateScheduledTaskOptions,
  type UpdateScheduledTaskOptions,
  type TaskParseRequest,
  type TaskParseResult,

  // Groups & Feed
  type Group,
  type GroupPost,
  type GroupComment,
  type FeedItemType,
  type FeedItem,

  // Coherence Network
  type Claim,
  type VerificationTask,
  type CoherenceEdge,
  type Synthesis,
  type VerifyClaimOptions,

  // Agent types (SRIA)
  type SRIAAgent,
  type AgentBelief,
  type AgentTemplate,
  type AgentStepResult,
  type AgentSession,
  type AgentRunHandle,

  // Agent teams
  type AgentTeam,
  type CollectiveStepResult,

  // Wallet & economics
  type WalletBalance,
  type Transaction,
  type StakeInfo,

  // Content store
  type StoredContent,
  type ContentListItem,

  // File system
  type FileSystemItem,

  // Node / Network
  type NodeStatus,

  // Marketplace
  type PluginRegistryEntry,
  type PluginLicense,

  // IPC map
  type AlephNetIPCMap,
  type IPCParams,
  type IPCResult,
  type AlephNetEvents,
} from './alephnet-types';

// ─── AlephNet API Interface ──────────────────────────────────────────────
export type { IAlephNetAPI } from './alephnet-api';

// ─── Resonant Agent Types ────────────────────────────────────────────────
export * from './resonant-agent-types';

// ─── Services (shared implementations) ──────────────────────────────────
export * from './services';
