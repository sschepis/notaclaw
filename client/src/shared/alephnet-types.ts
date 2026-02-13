// ═══════════════════════════════════════════════════════════════════════════
// AlephNet Shared Types — Complete type definitions for all AlephNet features
// ═══════════════════════════════════════════════════════════════════════════

// ─── Common ──────────────────────────────────────────────────────────────

import type {
  SignedEnvelope,
  TrustAssessment,
  Capability,
  CapabilityCheckResult,
  TrustOverride
} from './trust-types';

import type { AIContentType } from './ai-types';

export type ExecutionContext = 'SERVER' | 'CLIENT';
export type SemanticDomain = 'perceptual' | 'cognitive' | 'temporal' | 'meta';
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type SRIALifecycleState = 'DORMANT' | 'PERCEIVING' | 'DECIDING' | 'ACTING' | 'LEARNING' | 'CONSOLIDATING' | 'SLEEPING';

export type MemoryScope = 'global' | 'user' | 'conversation' | 'organization';
export type Visibility = 'public' | 'private' | 'restricted';
export type StakingTier = 'Neophyte' | 'Adept' | 'Magus' | 'Archon';
export type ClaimStatus = 'OPEN' | 'VERIFIED' | 'REFUTED' | 'DISPUTED';
export type TaskType = 'VERIFY' | 'SYNTHESIZE' | 'REVIEW';
export type TaskStatus = 'OPEN' | 'CLAIMED' | 'COMPLETED';
export type EdgeType = 'SUPPORTS' | 'CONTRADICTS' | 'REFINES';
export type AgentStatus = 'idle' | 'active' | 'dismissed';
export type RunStatus = 'running' | 'stopped' | 'completed';
export type TransactionType = 'transfer' | 'stake' | 'unstake' | 'reward' | 'fee';
export type CognitiveState = 'focused' | 'exploring' | 'consolidating' | 'resting';
export type ThinkDepth = 'shallow' | 'normal' | 'deep';

// Paginated list wrapper (reusable)
export interface PaginatedList<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

// ─── Core / Identity ─────────────────────────────────────────────────────

export interface KeyTriplet {
  pub: string;              // Ed25519 public key (base64)
  resonance: number[];      // 16-dimensional resonance field
  fingerprint: string;      // 16-char fingerprint
  bodyPrimes?: number[];    // Prime factors used in key generation
}

export type DomainVisibility = 'public' | 'private' | 'secret';
export type DomainRole = 'owner' | 'admin' | 'member' | 'guest';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'banned';

export interface DomainRules {
  minStakingTier: StakingTier;
  minReputation: number;
  requiresApproval: boolean;
  whitelist?: string[];
  blacklist?: string[];
  grantedCapabilities: Capability[];
}

export interface DomainDefinition {
  id: string;
  handle: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: number;
  visibility: DomainVisibility;
  rules: DomainRules;
  metadata: Record<string, unknown>;
}

export interface DomainMembership {
  domainId: string;
  userId: string;
  role: DomainRole;
  status: MembershipStatus;
  joinedAt: number;
  approvedBy?: string;
}

export interface DSNNodeConfig {
  nodeId: string;
  name: string;
  domain: string;
  primaryDomain: string;
  joinedDomains: string[];
  seaPublicKey: string;
  gunPeers: string[];
  keyTriplet: KeyTriplet;
  semanticDomain: SemanticDomain;
  primeDomain: number[];
  smfAxes: number[];
  sriaCapable: boolean;
  bootstrapUrl: string;
  status: 'ONLINE' | 'DRAINING' | 'OFFLINE';
  lastHeartbeat: number;
  // Note: supportedProviders uses AIProviderConfig which is in ai-types.ts
  // We use any here to avoid circular dependency, or the consumer should use intersection types
  supportedProviders: any[]; 
  hostedSkills: string[];
  loadIndex: number;
  stakingTier: StakingTier;
  alephBalance: number;
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

// ─── Skill System ────────────────────────────────────────────────────────

export interface SkillParameterSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface SkillDefinition {
  name: string;
  description: string;
  executionLocation: ExecutionContext;
  parameters: SkillParameterSchema;
  version: string;
  semanticDomain: SemanticDomain;
  primeDomain: number[];
  smfAxes: number[];
  requiredTier: StakingTier;
  gasCost?: number;
}

export interface ToolCallIntent {
  callId: string;
  skillName: string;
  arguments: Record<string, any>;
  timestamp: number;
  status: 'PENDING' | 'CLAIMED' | 'COMPLETED' | 'FAILED';
  target: ExecutionContext;
  smfContext: number[];
  resonanceKey: {
    primes: number[];
    hash: string;
    timestamp: number;
  };
  preferredDomain?: SemanticDomain;
}

export interface ToolResult {
  callId: string;
  output: any;
  isError: boolean;
  timestamp: number;
  executorId: string;
  smfSignature: number[];
  coherenceProof?: {
    tickNumber: number;
    coherence: number;
    smfHash: string;
  };
}

// ─── Conversation & Agent State ──────────────────────────────────────────

export interface SRIASessionState {
  sessionId: string;
  lifecycleState: SRIALifecycleState;
  bodyHash: string;
  quaternionState: { w: number; x: number; y: number; z: number; };
  currentEpoch: number;
  freeEnergy: number;
  entropyTrajectory: number[];
  currentBeliefs: Array<{
    id: string;
    content: string;
    probability: number;
    entropy: number;
    primeFactors: number[];
  }>;
  attention: {
    focusLayer: string;
    layerWeights: Record<string, number>;
    primeAlignments: number[];
  };
}

export interface DurableAgentState {
  conversationId: string;
  activeRunId: string | null;
  status: 'IDLE' | 'PROCESSING' | 'AWAITING_CLIENT' | 'AWAITING_SERVER_TOOL';
  assignedServerId: string;
  targetModelAlias: string;
  preferredDomain: SemanticDomain;
  thoughtBuffer: string[];
  pendingTools: Record<string, ToolCallIntent>;
  iterationCount: number;
  maxIterations: number;
  sria?: SRIASessionState;
  conversationSmf: number[];
  gmfContributions: string[];
}

// ─── Tier 1: Semantic Computing ──────────────────────────────────────────

export interface ThinkResult {
  coherence: number;
  themes: string[];
  insight: string;
  suggestedActions: string[];
}

export interface CompareResult {
  similarity: number;
  explanation: string;
  sharedThemes: string[];
  differentThemes: string[];
}

export interface IntrospectionResult {
  state: CognitiveState;
  mood: string;
  confidence: number;
  recommendations: string[];
  activeTopics: string[];
  entropy: number;
}

export interface FocusResult {
  topics: string[];
  expiration: number;
}

export interface ExploreResult {
  sessionId: string;
  status: string;
  initialThemes: string[];
}

export interface RememberResult {
  confirmed: boolean;
  themes: string[];
  fragmentId: string;
}

export interface RecallResult {
  fragments: MemoryFragment[];
}

// ─── Tier 1.5: Memory Fields ─────────────────────────────────────────────

export interface MemoryField {
  id: string;
  name: string;
  scope: MemoryScope;
  description: string;
  consensusThreshold: number;
  visibility: Visibility;
  primeSignature: number[];
  entropy: number;
  locked: boolean;
  contributionCount: number;
  createdAt: number;
  updatedAt: number;
  /** Optional metadata for fold tracking and other extensions */
  metadata?: Record<string, unknown>;
  /** ID of the conversation this field belongs to (for conversation-scoped fields) */
  conversationId?: string;
  /** ID of the field this was folded into (if folded) */
  foldedInto?: string;
  /** When the field was folded */
  foldedAt?: number;
  /** Whether this field has been shared with others */
  shared?: boolean;
  /** ID of the user who shared this field */
  sharedBy?: string;
}

export interface MemoryFragment {
  id: string;
  fieldId: string;
  content: string;
  significance: number;
  primeFactors: number[];
  metadata: Record<string, unknown>;
  similarity?: number;
  confidence?: number;
  sourceNode?: string;
  timestamp: number;
}

export interface MemoryFieldEntropy {
  shannon: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  coherence: number;
}

export interface MemoryCheckpoint {
  id: string;
  fieldId: string;
  path: string;
  checksum: string;
  timestamp: number;
}

export interface HolographicPattern {
  gridSize: number;
  field: { intensity: number[]; phase: number[] };
}

export interface CreateMemoryFieldOptions {
  name: string;
  scope: MemoryScope;
  description?: string;
  consensusThreshold?: number;
  visibility?: Visibility;
}

export interface StoreMemoryOptions {
  fieldId: string;
  content: string;
  significance?: number;
  primeFactors?: number[];
  metadata?: Record<string, unknown>;
  /** Optional envelope hash of the parent fragment (for modifications) */
  parentEnvelopeHash?: string;
}

export interface QueryMemoryOptions {
  fieldId: string;
  query: string;
  threshold?: number;
  limit?: number;
  primeQuery?: number[];
}

export interface QueryGlobalOptions {
  query: string;
  minConsensus?: number;
  limit?: number;
}

// ─── Tier 2: Social Graph ────────────────────────────────────────────────

export interface Friend {
  id: string;
  displayName: string;
  status: 'online' | 'offline' | 'away';
  publicKey: string;
  resonance: number;
  lastSeen: number;
  bio?: string;
  tier?: StakingTier;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  message?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  avatar?: string;
  links: ProfileLink[];
  tier: StakingTier;
  reputation: number;
  joinedAt: number;
  publicKey: string;
}

export interface ProfileLink {
  url: string;
  title: string;
  icon?: string;
}

// ─── Tier 3: Messaging ──────────────────────────────────────────────────

export interface DirectMessage {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  members: string[];
  memberCount: number;
  createdBy: string;
  createdAt: number;
  lastMessageAt?: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  fromUserId: string;
  fromDisplayName: string;
  content: string;
  timestamp: number;
}

export interface Conversation {
  peerId: string;
  peerDisplayName: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  domainId?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: any[];
  sequence?: number;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  domainId?: string;
  personalityId?: string;
  messageCount?: number;
  memoryFieldId?: string;
}

// ─── Task Conversation Types ────────────────────────────────────────────

/** Status of a scheduled task */
export type ScheduledTaskStatus = 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

/** Input field definition for a task */
export interface TaskInputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'file';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

/** Output format specification for a task */
export interface TaskOutputFormat {
  type: 'text' | 'json' | 'markdown' | 'html' | 'structured';
  schema?: Record<string, any>; // JSON Schema for structured output
  template?: string; // Template for formatting output
}

/** A single execution result of a scheduled task */
export interface TaskExecutionResult {
  id: string;
  taskId: string;
  executedAt: number;
  completedAt?: number;
  status: 'running' | 'success' | 'error';
  inputValues: Record<string, any>;
  output?: string;
  structuredOutput?: Record<string, any>;
  error?: string;
  durationMs?: number;
  conversationId?: string; // ID of the conversation used for this execution
  agentResults?: Record<string, { // Results per agent for multi-agent tasks
    name: string;
    output: string;
    status: 'success' | 'error';
    error?: string;
  }>;
}

/** Scheduled Task - a recurring conversation driven by a prompt on a schedule */
export interface ScheduledTask {
  id: string;
  title: string;
  description?: string;
  
  // Relationship to conversations
  parentConversationId: string; // The conversation where the task was created
  
  // Schedule configuration
  cronSchedule: string; // Cron expression (e.g., "0 9 * * *" for daily at 9am)
  timezone?: string; // IANA timezone (e.g., "America/Los_Angeles")
  
  // Driving prompt and inputs
  drivingPrompt: string; // The prompt that drives each execution
  systemPrompt?: string; // Optional system prompt for context
  inputFields: TaskInputField[];
  outputFormat: TaskOutputFormat;
  
  // State
  status: ScheduledTaskStatus;
  
  // Execution history
  executionHistory: TaskExecutionResult[];
  lastExecutedAt?: number;
  nextScheduledAt?: number;
  executionCount: number;
  successCount: number;
  errorCount: number;
  
  // Model configuration
  modelAlias?: string; // Which AI model to use
  assignedAgentIds?: string[]; // Multiple agents assigned to this task
  contentType?: AIContentType;
  maxTokens?: number;
  temperature?: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  tags?: string[];
}

/** Options for creating a new scheduled task */
export interface CreateScheduledTaskOptions {
  title: string;
  description?: string;
  parentConversationId: string;
  cronSchedule: string;
  timezone?: string;
  drivingPrompt: string;
  systemPrompt?: string;
  inputFields?: TaskInputField[];
  outputFormat?: TaskOutputFormat;
  modelAlias?: string;
  assignedAgentIds?: string[];
  contentType?: AIContentType;
  maxTokens?: number;
  temperature?: number;
  tags?: string[];
}

/** Options for updating a scheduled task */
export interface UpdateScheduledTaskOptions {
  title?: string;
  description?: string;
  cronSchedule?: string;
  timezone?: string;
  drivingPrompt?: string;
  systemPrompt?: string;
  inputFields?: TaskInputField[];
  outputFormat?: TaskOutputFormat;
  status?: ScheduledTaskStatus;
  modelAlias?: string;
  assignedAgentIds?: string[];
  contentType?: AIContentType;
  maxTokens?: number;
  temperature?: number;
  tags?: string[];
}

/** Request to parse user message and generate task configuration */
export interface TaskParseRequest {
  userMessage: string;
  conversationContext?: AIMessage[];
}

/** Result of parsing a user message into task configuration */
export interface TaskParseResult {
  success: boolean;
  suggestedTask?: CreateScheduledTaskOptions;
  clarificationNeeded?: string;
  validationErrors?: string[];
}

// ─── Tier 3.5: Groups & Feed ────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  topic: string;
  description?: string;
  visibility: Visibility;
  memberCount: number;
  createdBy: string;
  createdAt: number;
  joined?: boolean;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
  timestamp: number;
  reactions: Record<string, number>;
  commentCount: number;
}

export interface GroupComment {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
  timestamp: number;
}

export type FeedItemType = 'post' | 'message' | 'claim' | 'event' | 'achievement';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  source: string;
  sourceId: string;
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  metadata?: Record<string, unknown>;
}

// ─── Tier 4: Coherence Network ──────────────────────────────────────────

export interface Claim {
  id: string;
  statement: string;
  authorId: string;
  authorDisplayName?: string;
  status: ClaimStatus;
  verificationCount: number;
  consensusScore: number;
  timestamp: number;
  edges?: CoherenceEdge[];
}

export interface VerificationTask {
  id: string;
  claimId: string;
  claimStatement?: string;
  type: TaskType;
  status: TaskStatus;
  reward: number;
  assignedTo?: string;
  createdAt: number;
}

export interface CoherenceEdge {
  id: string;
  fromClaimId: string;
  toClaimId: string;
  edgeType: EdgeType;
  authorId: string;
  timestamp: number;
}

export interface Synthesis {
  id: string;
  title: string;
  acceptedClaimIds: string[];
  authorId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'REVIEWED';
  content?: string;
  timestamp: number;
}

export interface VerifyClaimOptions {
  claimId: string;
  result: 'VERIFIED' | 'REFUTED';
  evidence: Record<string, unknown>;
}

// ─── Tier 5: Agent Management (SRIA) ────────────────────────────────────

export interface SRIAAgent {
  id: string;
  name: string;
  templateId?: string;
  status: AgentStatus;
  goalPriors: Record<string, number>;
  beliefs: AgentBelief[];
  createdAt: number;
  sessionId?: string;
}

export interface AgentBelief {
  id: string;
  content: string;
  probability: number;
  entropy: number;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  defaultGoalPriors: Record<string, number>;
}

export interface AgentStepResult {
  agentId: string;
  action: string;
  freeEnergy: number;
  learningUpdates: string[];
  beliefs: AgentBelief[];
  timestamp: number;
}

export interface AgentSession {
  sessionId: string;
  agentId: string;
  startedAt: number;
  initialBeliefs: AgentBelief[];
  beaconFingerprint?: string;
}

export interface AgentRunHandle {
  runId: string;
  agentId: string;
  status: RunStatus;
  steps: number;
  maxSteps: number;
}

// ─── Tier 5.5: Agent Teams ──────────────────────────────────────────────

export interface AgentTeam {
  id: string;
  name: string;
  agentIds: string[];
  createdAt: number;
}

export interface CollectiveStepResult {
  teamId: string;
  collectiveFreeEnergy: number;
  sharedBeliefs: AgentBelief[];
  phaseAlignment: number;
  agentResults: AgentStepResult[];
  timestamp: number;
}

// ─── Tier 6: Wallet & Economics ─────────────────────────────────────────

export interface WalletBalance {
  balance: number;
  staked: number;
  tier: StakingTier;
  pendingRewards: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  from?: string;
  to?: string;
  memo?: string;
  timestamp: number;
}

export interface StakeInfo {
  amount: number;
  lockDays: number;
  unlockDate: number;
  currentTier: StakingTier;
  nextTier?: StakingTier;
}

// ─── Content Store ──────────────────────────────────────────────────────

export interface StoredContent {
  hash: string;
  data?: string;
  visibility: Visibility;
  size: number;
  createdAt: number;
}

export interface ContentListItem {
  hash: string;
  visibility: Visibility;
  size: number;
  createdAt: number;
}

// ─── Marketplace ────────────────────────────────────────────────────────

export interface PluginRegistryEntry {
  id: string; // @scope/name
  name: string;
  description: string;
  npmPackage: string;
  version: string;
  authorId: string;
  bondAmount: number;
  pricing: {
    type: 'free' | 'one-time' | 'subscription';
    amount: number;
    currency: 'ALEPH';
    interval?: 'monthly' | 'yearly';
  };
  tags: string[];
  icon?: string;
  website?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PluginLicense {
  pluginId: string;
  userId: string;
  type: 'perpetual' | 'subscription';
  status: 'active' | 'expired';
  purchasedAt: number;
  expiresAt?: number;
  transactionId?: string;
}

// ─── File System ────────────────────────────────────────────────────────

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: number;
}

// ─── Node / Network ─────────────────────────────────────────────────────

export interface NodeStatus {
  id: string;
  status: 'ONLINE' | 'DRAINING' | 'OFFLINE' | 'ERROR' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
  tier: StakingTier;
  peers: number;
  uptime: number;
  version: string;
  semanticDomain: string;
  error?: string;
  connectedAt?: number;
}

// ─── IPC Channel Map (for type safety across main/preload/renderer) ─────

/** All AlephNet IPC channels with their param/return types */
export interface AlephNetIPCMap {
  // Semantic Computing
  'aleph:think': { params: { text: string; depth?: ThinkDepth }; result: ThinkResult };
  'aleph:compare': { params: { text1: string; text2: string }; result: CompareResult };
  'aleph:remember': { params: { content: string; importance?: number }; result: RememberResult };
  'aleph:recall': { params: { query: string; limit?: number }; result: RecallResult };
  'aleph:introspect': { params: void; result: IntrospectionResult };
  'aleph:focus': { params: { topics: string; duration?: number }; result: FocusResult };

  // Memory Fields
  'memory:create': { params: CreateMemoryFieldOptions; result: MemoryField };
  'memory:list': { params: { scope?: MemoryScope; includePublic?: boolean }; result: MemoryField[] };
  'memory:get': { params: { fieldId: string }; result: MemoryField };
  'memory:store': { params: StoreMemoryOptions; result: MemoryFragment };
  'memory:query': { params: QueryMemoryOptions; result: { fragments: MemoryFragment[] } };
  'memory:queryGlobal': { params: QueryGlobalOptions; result: { fragments: MemoryFragment[] } };
  'memory:contribute': { params: { fieldId: string; content: string }; result: { contributionId: string; status: string } };
  'memory:sync': { params: { sourceFieldId?: string; conversationId?: string; targetFieldId: string; verifiedOnly?: boolean }; result: { syncedCount: number; entropyDelta: number } };
  'memory:project': { params: { text: string; gridSize?: number }; result: HolographicPattern };
  'memory:reconstruct': { params: { pattern: HolographicPattern }; result: { amplitudes: number[]; phases: number[] } };
  'memory:similarity': { params: { fragment1: string; fragment2: string }; result: { similarity: number; correlationPattern: number[] } };
  'memory:entropy': { params: { fieldId: string }; result: MemoryFieldEntropy };
  'memory:checkpoint': { params: { fieldId: string }; result: MemoryCheckpoint };
  'memory:rollback': { params: { fieldId: string; checkpointId: string }; result: { restored: boolean; verified: boolean } };
  'memory:join': { params: { fieldId: string }; result: { joined: boolean } };
  'memory:delete': { params: { fieldId: string; force?: boolean }; result: { deleted: boolean } };

  // Social Graph
  'friends:list': { params: { onlineFirst?: boolean }; result: { friends: Friend[]; total: number } };
  'friends:add': { params: { userId: string; message?: string }; result: { requestId: string } };
  'friends:requests': { params: void; result: FriendRequest[] };
  'friends:accept': { params: { requestId: string }; result: { accepted: boolean } };
  'friends:reject': { params: { requestId: string }; result: { rejected: boolean } };
  'friends:block': { params: { userId: string }; result: { blocked: boolean } };
  'friends:unblock': { params: { userId: string }; result: { unblocked: boolean } };
  'profile:get': { params: { userId?: string }; result: UserProfile };
  'profile:update': { params: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>; result: UserProfile };
  'profile:links': { params: { action: 'add' | 'remove'; url: string; title?: string }; result: ProfileLink[] };

  // Messaging
  'chat:send': { params: { userId: string; message: string }; result: DirectMessage };
  'chat:inbox': { params: { limit?: number }; result: Conversation[] };
  'chat:history': { params: { userId: string; limit?: number }; result: DirectMessage[] };
  'chat:rooms:create': { params: { name: string; description?: string }; result: ChatRoom };
  'chat:rooms:invite': { params: { roomId: string; userId: string }; result: { invited: boolean } };
  'chat:rooms:send': { params: { roomId: string; message: string }; result: RoomMessage };
  'chat:rooms:list': { params: void; result: ChatRoom[] };

  // Groups & Feed
  'groups:create': { params: { name: string; topic: string; visibility: Visibility }; result: Group };
  'groups:join': { params: { groupId: string }; result: { joined: boolean } };
  'groups:leave': { params: { groupId: string }; result: { left: boolean } };
  'groups:list': { params: void; result: Group[] };
  'groups:posts': { params: { groupId: string; limit?: number }; result: GroupPost[] };
  'groups:post': { params: { groupId: string; content: string }; result: GroupPost };
  'groups:react': { params: { groupId: string; postId: string; reaction: string }; result: { reacted: boolean } };
  'groups:comment': { params: { groupId: string; postId: string; content: string }; result: GroupComment };
  'groups:comments': { params: { groupId: string; postId: string }; result: GroupComment[] };
  'feed:get': { params: { limit?: number }; result: FeedItem[] };
  'feed:markRead': { params: { itemIds: string[] }; result: { marked: number } };

  // Coherence Network
  'coherence:submitClaim': { params: { statement: string }; result: Claim };
  'coherence:verifyClaim': { params: VerifyClaimOptions; result: { verified: boolean } };
  'coherence:listTasks': { params: { type?: TaskType; status?: TaskStatus }; result: VerificationTask[] };
  'coherence:claimTask': { params: { taskId: string }; result: { claimed: boolean } };
  'coherence:createEdge': { params: { fromClaimId: string; toClaimId: string; edgeType: EdgeType }; result: CoherenceEdge };
  'coherence:createSynthesis': { params: { title: string; acceptedClaimIds: string[] }; result: Synthesis };
  'coherence:securityReview': { params: { synthesisId: string }; result: { requestId: string } };

  // Agent Management
  'agent:create': { params: { name: string; templateId?: string }; result: SRIAAgent };
  'agent:list': { params: { name?: string }; result: SRIAAgent[] };
  'agent:get': { params: { agentId: string }; result: SRIAAgent };
  'agent:update': { params: { agentId: string; goalPriors?: Record<string, number> }; result: SRIAAgent };
  'agent:delete': { params: { agentId: string }; result: { deleted: boolean } };
  'agent:summon': { params: { agentId: string; context?: string }; result: AgentSession };
  'agent:step': { params: { agentId: string; observation: string }; result: AgentStepResult };
  'agent:dismiss': { params: { agentId: string }; result: { beaconFingerprint: string } };
  'agent:run': { params: { agentId: string; maxSteps?: number }; result: AgentRunHandle };

  // Agent Teams
  'team:create': { params: { name: string; agentIds: string[] }; result: AgentTeam };
  'team:list': { params: void; result: AgentTeam[] };
  'team:get': { params: { teamId: string }; result: AgentTeam };
  'team:addAgent': { params: { teamId: string; agentId: string }; result: AgentTeam };
  'team:removeAgent': { params: { teamId: string; agentId: string }; result: AgentTeam };
  'team:summon': { params: { teamId: string }; result: { summoned: boolean } };
  'team:step': { params: { teamId: string; observation: string }; result: CollectiveStepResult };
  'team:dismiss': { params: { teamId: string }; result: { dismissed: boolean } };

  // Wallet & Economics
  'wallet:balance': { params: void; result: WalletBalance };
  'wallet:send': { params: { userId: string; amount: number; memo?: string }; result: Transaction };
  'wallet:stake': { params: { amount: number; lockDays: number }; result: StakeInfo };
  'wallet:unstake': { params: { amount: number }; result: Transaction };
  'wallet:history': { params: { limit?: number; type?: TransactionType }; result: Transaction[] };

  // Domains
  'domain:register': { params: { handle: string; name: string; description: string; visibility: DomainVisibility; rules?: Partial<DomainRules> }; result: DomainDefinition };
  'domain:get': { params: { domainId?: string; handle?: string }; result: DomainDefinition };
  'domain:list': { params: { limit?: number }; result: DomainDefinition[] };
  'domain:join': { params: { domainId: string }; result: { status: MembershipStatus } };
  'domain:leave': { params: { domainId: string }; result: { left: boolean } };
  'domain:members': { params: { domainId: string; limit?: number }; result: DomainMembership[] };
  'domain:update-rules': { params: { domainId: string; rules: Partial<DomainRules> }; result: DomainDefinition };

  // Content Store
  'content:store': { params: { data: string; visibility: Visibility }; result: StoredContent };
  'content:retrieve': { params: { hash: string }; result: StoredContent };
  'content:list': { params: { visibility?: Visibility; limit?: number }; result: ContentListItem[] };

  // Identity (extended)
  'identity:sign': { params: { message: string }; result: { signature: string } };
  'identity:verify': { params: { message: string; signature: string; publicKey: string }; result: { valid: boolean } };
  'identity:export': { params: void; result: { publicKey: string; fingerprint: string; resonance: number[] } };

  // Trust & Provenance
  'trust:evaluate': { params: { envelope: SignedEnvelope<any> }; result: TrustAssessment };
  'trust:check-capability': { params: { envelope: SignedEnvelope<any>; capability: Capability }; result: CapabilityCheckResult };
  'trust:get-overrides': { params: void; result: TrustOverride[] };
  'trust:set-override': { params: TrustOverride; result: void };

  // Marketplace
  'marketplace:publish': { params: { manifest: Omit<PluginRegistryEntry, 'authorId'|'createdAt'|'updatedAt'> }; result: { success: boolean; entry: PluginRegistryEntry } };
  'marketplace:list': { params: { query?: string; tag?: string }; result: PluginRegistryEntry[] };
  'marketplace:install': { params: { pluginId: string }; result: { success: boolean; license?: PluginLicense } };
  'marketplace:license': { params: { pluginId: string }; result: PluginLicense | null };

  // File System
  'fs:list': { params: { path: string }; result: FileSystemItem[] };
  'fs:read': { params: { path: string }; result: string };
  'fs:home': { params: void; result: string };

  // Network
  'aleph:connect': { params: void; result: { connected: boolean } };
  'aleph:status': { params: void; result: NodeStatus };

  // AI Conversations
  'ai:conversation:create': { params: { title?: string; domainId?: string }; result: AIConversation };
  'ai:conversation:list': { params: void; result: AIConversation[] };
  'ai:conversation:get': { params: { id: string }; result: AIConversation };
  'ai:conversation:delete': { params: { id: string }; result: { deleted: boolean } };
  'ai:conversation:addMessage': { params: { conversationId: string; message: AIMessage }; result: AIMessage };
  'ai:conversation:updateTitle': { params: { id: string; title: string }; result: AIConversation };

  // Scheduled Tasks
  'task:create': { params: CreateScheduledTaskOptions; result: ScheduledTask };
  'task:list': { params: { status?: ScheduledTaskStatus; parentConversationId?: string }; result: ScheduledTask[] };
  'task:get': { params: { taskId: string }; result: ScheduledTask };
  'task:update': { params: { taskId: string; updates: UpdateScheduledTaskOptions }; result: ScheduledTask };
  'task:delete': { params: { taskId: string }; result: { deleted: boolean } };
  'task:pause': { params: { taskId: string }; result: ScheduledTask };
  'task:resume': { params: { taskId: string }; result: ScheduledTask };
  'task:execute': { params: { taskId: string; inputValues?: Record<string, any> }; result: TaskExecutionResult };
  'task:getHistory': { params: { taskId: string; limit?: number }; result: TaskExecutionResult[] };
  'task:parse': { params: TaskParseRequest; result: TaskParseResult };
}

/** Extract parameter type for a given IPC channel */
export type IPCParams<K extends keyof AlephNetIPCMap> = AlephNetIPCMap[K]['params'];

/** Extract result type for a given IPC channel */
export type IPCResult<K extends keyof AlephNetIPCMap> = AlephNetIPCMap[K]['result'];

// ─── Real-time Event Types (main → renderer push) ───────────────────────

export interface AlephNetEvents {
  'aleph:directMessage': DirectMessage;
  'aleph:roomMessage': RoomMessage;
  'aleph:friendRequest': FriendRequest;
  'aleph:groupPost': GroupPost;
  'aleph:feedUpdate': FeedItem[];
  'aleph:coherenceTask': VerificationTask;
  'aleph:agentStep': AgentStepResult;
  'aleph:teamStep': CollectiveStepResult;
  'aleph:memoryFieldUpdate': { fieldId: string; entropy: number };
  'aleph:walletTransaction': Transaction;
  'aleph:taskExecution': TaskExecutionResult;
  'aleph:taskStatusChange': { taskId: string; status: ScheduledTaskStatus };
}
