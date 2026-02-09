// ═══════════════════════════════════════════════════════════════════════════
// IAlephNetAPI — Type declarations for the AlephNet preload bridge
// Added to Window.electronAPI via contextBridge
// ═══════════════════════════════════════════════════════════════════════════

import type {
  ThinkResult, CompareResult, RememberResult, RecallResult,
  IntrospectionResult, FocusResult, ThinkDepth,
  MemoryField, MemoryFragment, MemoryFieldEntropy, MemoryCheckpoint,
  HolographicPattern, CreateMemoryFieldOptions, StoreMemoryOptions,
  QueryMemoryOptions, QueryGlobalOptions, MemoryScope,
  Friend, FriendRequest, UserProfile, ProfileLink,
  DirectMessage, ChatRoom, RoomMessage, Conversation,
  AIConversation, AIMessage,
  ScheduledTask, ScheduledTaskStatus, TaskExecutionResult,
  CreateScheduledTaskOptions, UpdateScheduledTaskOptions,
  TaskParseRequest, TaskParseResult,
  Group, GroupPost, GroupComment, FeedItem, Visibility,
  Claim, VerificationTask, CoherenceEdge, Synthesis,
  VerifyClaimOptions, TaskType, TaskStatus, EdgeType,
  SRIAAgent, AgentStepResult, AgentSession, AgentRunHandle,
  AgentTeam, CollectiveStepResult,
  WalletBalance, Transaction, StakeInfo, TransactionType,
  StoredContent, ContentListItem,
  NodeStatus,
  FileSystemItem,
  DomainDefinition, DomainVisibility, DomainMembership, DomainRules
} from './alephnet-types';

import type { RISAScript, RISATask, RISAEvent } from './risa/types';

export interface IAlephNetAPI {
  // ─── Semantic Computing ─────────────────────────────────────────
  alephThink: (params: { text: string; depth?: ThinkDepth }) => Promise<ThinkResult>;
  alephCompare: (params: { text1: string; text2: string }) => Promise<CompareResult>;
  alephRemember: (params: { content: string; importance?: number }) => Promise<RememberResult>;
  alephRecall: (params: { query: string; limit?: number }) => Promise<RecallResult>;
  alephIntrospect: (params?: void) => Promise<IntrospectionResult>;
  alephFocus: (params: { topics: string; duration?: number }) => Promise<FocusResult>;

  // ─── Memory Fields ─────────────────────────────────────────────
  memoryCreate: (params: CreateMemoryFieldOptions) => Promise<MemoryField>;
  memoryList: (params?: { scope?: MemoryScope; includePublic?: boolean }) => Promise<MemoryField[]>;
  memoryGet: (params: { fieldId: string }) => Promise<MemoryField>;
  memoryStore: (params: StoreMemoryOptions) => Promise<MemoryFragment>;
  memoryQuery: (params: QueryMemoryOptions) => Promise<{ fragments: MemoryFragment[] }>;
  memoryQueryGlobal: (params: QueryGlobalOptions) => Promise<{ fragments: MemoryFragment[] }>;
  memoryContribute: (params: { fieldId: string; content: string }) => Promise<{ contributionId: string; status: string }>;
  memorySync: (params: { conversationId: string; targetFieldId: string; verifiedOnly?: boolean }) => Promise<{ syncedCount: number; entropyDelta: number }>;
  memoryProject: (params: { text: string; gridSize?: number }) => Promise<HolographicPattern>;
  memoryReconstruct: (params: { pattern: HolographicPattern }) => Promise<{ amplitudes: number[]; phases: number[] }>;
  memorySimilarity: (params: { fragment1: string; fragment2: string }) => Promise<{ similarity: number; correlationPattern: number[] }>;
  memoryEntropy: (params: { fieldId: string }) => Promise<MemoryFieldEntropy>;
  memoryCheckpoint: (params: { fieldId: string }) => Promise<MemoryCheckpoint>;
  memoryRollback: (params: { fieldId: string; checkpointId: string }) => Promise<{ restored: boolean; verified: boolean }>;
  memoryJoin: (params: { fieldId: string }) => Promise<{ joined: boolean }>;
  memoryDelete: (params: { fieldId: string; force?: boolean }) => Promise<{ deleted: boolean }>;

  // ─── Social Graph ──────────────────────────────────────────────
  friendsList: (params?: { onlineFirst?: boolean }) => Promise<{ friends: Friend[]; total: number }>;
  friendsAdd: (params: { userId: string; message?: string }) => Promise<{ requestId: string }>;
  friendsRequests: (params?: void) => Promise<FriendRequest[]>;
  friendsAccept: (params: { requestId: string }) => Promise<{ accepted: boolean }>;
  friendsReject: (params: { requestId: string }) => Promise<{ rejected: boolean }>;
  friendsBlock: (params: { userId: string }) => Promise<{ blocked: boolean }>;
  friendsUnblock: (params: { userId: string }) => Promise<{ unblocked: boolean }>;
  profileGet: (params?: { userId?: string }) => Promise<UserProfile>;
  profileUpdate: (params: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>) => Promise<UserProfile>;
  profileLinks: (params: { action: 'add' | 'remove'; url: string; title?: string }) => Promise<ProfileLink[]>;

  // ─── Messaging ─────────────────────────────────────────────────
  chatSend: (params: { userId: string; message: string }) => Promise<DirectMessage>;
  chatInbox: (params?: { limit?: number }) => Promise<Conversation[]>;
  chatHistory: (params: { userId: string; limit?: number }) => Promise<DirectMessage[]>;
  chatRoomsCreate: (params: { name: string; description?: string }) => Promise<ChatRoom>;
  chatRoomsInvite: (params: { roomId: string; userId: string }) => Promise<{ invited: boolean }>;
  chatRoomsSend: (params: { roomId: string; message: string }) => Promise<RoomMessage>;
  chatRoomsList: (params?: void) => Promise<ChatRoom[]>;

  // ─── Groups & Feed ─────────────────────────────────────────────
  groupsCreate: (params: { name: string; topic: string; visibility: Visibility }) => Promise<Group>;
  groupsJoin: (params: { groupId: string }) => Promise<{ joined: boolean }>;
  groupsLeave: (params: { groupId: string }) => Promise<{ left: boolean }>;
  groupsList: (params?: void) => Promise<Group[]>;
  groupsPosts: (params: { groupId: string; limit?: number }) => Promise<GroupPost[]>;
  groupsPost: (params: { groupId: string; content: string }) => Promise<GroupPost>;
  groupsReact: (params: { groupId: string; postId: string; reaction: string }) => Promise<{ reacted: boolean }>;
  groupsComment: (params: { groupId: string; postId: string; content: string }) => Promise<GroupComment>;
  groupsComments: (params: { groupId: string; postId: string }) => Promise<GroupComment[]>;
  feedGet: (params?: { limit?: number }) => Promise<FeedItem[]>;
  feedMarkRead: (params: { itemIds: string[] }) => Promise<{ marked: number }>;

  // ─── Coherence Network ─────────────────────────────────────────
  coherenceSubmitClaim: (params: { statement: string }) => Promise<Claim>;
  coherenceVerifyClaim: (params: VerifyClaimOptions) => Promise<{ verified: boolean }>;
  coherenceListTasks: (params?: { type?: TaskType; status?: TaskStatus }) => Promise<VerificationTask[]>;
  coherenceClaimTask: (params: { taskId: string }) => Promise<{ claimed: boolean }>;
  coherenceCreateEdge: (params: { fromClaimId: string; toClaimId: string; edgeType: EdgeType }) => Promise<CoherenceEdge>;
  coherenceCreateSynthesis: (params: { title: string; acceptedClaimIds: string[] }) => Promise<Synthesis>;
  coherenceSecurityReview: (params: { synthesisId: string }) => Promise<{ requestId: string }>;

  // ─── AI Conversations ──────────────────────────────────────────
  aiConversationCreate: (params: { title?: string }) => Promise<AIConversation>;
  aiConversationList: (params?: void) => Promise<AIConversation[]>;
  aiConversationGet: (params: { id: string }) => Promise<AIConversation>;
  aiConversationDelete: (params: { id: string }) => Promise<{ deleted: boolean }>;
  aiConversationAddMessage: (params: { conversationId: string; message: AIMessage }) => Promise<AIMessage>;
  aiConversationUpdateMessage: (params: { conversationId: string; messageId: string; content: string }) => Promise<void>;
  aiConversationDeleteMessage: (params: { conversationId: string; messageId: string }) => Promise<void>;
  aiConversationUpdateTitle: (params: { id: string; title: string }) => Promise<AIConversation>;

  // ─── Scheduled Tasks ──────────────────────────────────────────
  taskCreate: (params: CreateScheduledTaskOptions) => Promise<ScheduledTask>;
  taskList: (params?: { status?: ScheduledTaskStatus; parentConversationId?: string }) => Promise<ScheduledTask[]>;
  taskGet: (params: { taskId: string }) => Promise<ScheduledTask>;
  taskUpdate: (params: { taskId: string; updates: UpdateScheduledTaskOptions }) => Promise<ScheduledTask>;
  taskDelete: (params: { taskId: string }) => Promise<{ deleted: boolean }>;
  taskPause: (params: { taskId: string }) => Promise<ScheduledTask>;
  taskResume: (params: { taskId: string }) => Promise<ScheduledTask>;
  taskExecute: (params: { taskId: string; inputValues?: Record<string, any> }) => Promise<TaskExecutionResult>;
  taskGetHistory: (params: { taskId: string; limit?: number }) => Promise<TaskExecutionResult[]>;
  taskParse: (params: TaskParseRequest) => Promise<TaskParseResult>;

  // ─── Agent Management ──────────────────────────────────────────
  agentCreate: (params: { name: string; templateId?: string }) => Promise<SRIAAgent>;
  agentList: (params?: { name?: string }) => Promise<SRIAAgent[]>;
  agentGet: (params: { agentId: string }) => Promise<SRIAAgent>;
  agentUpdate: (params: { agentId: string; goalPriors?: Record<string, number> }) => Promise<SRIAAgent>;
  agentDelete: (params: { agentId: string }) => Promise<{ deleted: boolean }>;
  agentSummon: (params: { agentId: string; context?: string }) => Promise<AgentSession>;
  agentStep: (params: { agentId: string; observation: string }) => Promise<AgentStepResult>;
  agentDismiss: (params: { agentId: string }) => Promise<{ beaconFingerprint: string }>;
  agentRun: (params: { agentId: string; maxSteps?: number }) => Promise<AgentRunHandle>;

  // ─── Agent Teams ───────────────────────────────────────────────
  teamCreate: (params: { name: string; agentIds: string[] }) => Promise<AgentTeam>;
  teamList: (params?: void) => Promise<AgentTeam[]>;
  teamGet: (params: { teamId: string }) => Promise<AgentTeam>;
  teamAddAgent: (params: { teamId: string; agentId: string }) => Promise<AgentTeam>;
  teamRemoveAgent: (params: { teamId: string; agentId: string }) => Promise<AgentTeam>;
  teamSummon: (params: { teamId: string }) => Promise<{ summoned: boolean }>;
  teamStep: (params: { teamId: string; observation: string }) => Promise<CollectiveStepResult>;
  teamDismiss: (params: { teamId: string }) => Promise<{ dismissed: boolean }>;

  // ─── Wallet & Economics ────────────────────────────────────────
  walletBalance: (params?: void) => Promise<WalletBalance>;
  walletSend: (params: { userId: string; amount: number; memo?: string }) => Promise<Transaction>;
  walletStake: (params: { amount: number; lockDays: number }) => Promise<StakeInfo>;
  walletUnstake: (params: { amount: number }) => Promise<Transaction>;
  walletHistory: (params?: { limit?: number; type?: TransactionType }) => Promise<Transaction[]>;

  // ─── Domains ───────────────────────────────────────────────────
  domainRegister: (params: { handle: string; name: string; description: string; visibility: DomainVisibility; rules?: Partial<DomainRules> }) => Promise<DomainDefinition>;
  domainGet: (params: { domainId?: string; handle?: string }) => Promise<DomainDefinition>;
  domainList: (params?: { limit?: number }) => Promise<DomainDefinition[]>;
  domainJoin: (params: { domainId: string }) => Promise<{ status: any }>;
  domainLeave: (params: { domainId: string }) => Promise<{ left: boolean }>;
  domainMembers: (params: { domainId: string; limit?: number }) => Promise<DomainMembership[]>;
  domainUpdateRules: (params: { domainId: string; rules: Partial<DomainRules> }) => Promise<DomainDefinition>;

  // ─── Content Store ─────────────────────────────────────────────
  contentStore: (params: { data: string; visibility: Visibility }) => Promise<StoredContent>;
  contentRetrieve: (params: { hash: string }) => Promise<StoredContent>;
  contentList: (params?: { visibility?: Visibility; limit?: number }) => Promise<ContentListItem[]>;

  // ─── Identity Extended ─────────────────────────────────────────
  identitySign: (params: { message: string }) => Promise<{ signature: string }>;
  identityVerify: (params: { message: string; signature: string; publicKey: string }) => Promise<{ valid: boolean }>;
  identityExport: (params?: void) => Promise<{ publicKey: string; fingerprint: string; resonance: number[] }>;

  // ─── File System ───────────────────────────────────────────────
  fsList: (params: { path: string }) => Promise<FileSystemItem[]>;
  fsRead: (params: { path: string }) => Promise<string>;
  fsHome: (params?: void) => Promise<string>;

  // ─── Network ───────────────────────────────────────────────────
  alephConnect: (params?: void) => Promise<{ connected: boolean }>;
  alephStatus: (params?: void) => Promise<NodeStatus>;

  // ─── Plugin Tooling ──────────────────────────────────────────────
  pluginRegisterTool: (pluginId: string, toolName: string) => void;
  pluginInvokeTool: (toolName: string, args: any) => Promise<any>;
  pluginInvokeRenderer: (pluginId: string, channel: string, data: any) => Promise<any>;

  // ─── RISA Services ─────────────────────────────────────────────
  risaInstallScript: (params: Omit<RISAScript, 'id' | 'installedAt' | 'updatedAt'>) => Promise<RISAScript>;
  risaUpdateScript: (params: { id: string; updates: Partial<RISAScript> }) => Promise<RISAScript>;
  risaUninstallScript: (params: string) => Promise<void>;
  risaGetScripts: (params?: void) => Promise<RISAScript[]>;
  risaStartTask: (params: { scriptId: string; triggerEvent?: RISAEvent }) => Promise<string>; // Returns taskId
  risaStopTask: (params: string) => Promise<void>;
  risaGetTasks: (params?: void) => Promise<RISATask[]>;

  // ─── Real-time Events ──────────────────────────────────────────
  onDirectMessage: (callback: (event: any, data: DirectMessage) => void) => () => void;
  onRoomMessage: (callback: (event: any, data: RoomMessage) => void) => () => void;
  onFriendRequest: (callback: (event: any, data: FriendRequest) => void) => () => void;
  onGroupPost: (callback: (event: any, data: GroupPost) => void) => () => void;
  onFeedUpdate: (callback: (event: any, data: FeedItem[]) => void) => () => void;
  onCoherenceTask: (callback: (event: any, data: VerificationTask) => void) => () => void;
  onAgentStep: (callback: (event: any, data: AgentStepResult) => void) => () => void;
  onTeamStep: (callback: (event: any, data: CollectiveStepResult) => void) => () => void;
  onMemoryFieldUpdate: (callback: (event: any, data: { fieldId: string; entropy: number }) => void) => () => void;
  onWalletTransaction: (callback: (event: any, data: Transaction) => void) => () => void;
  onTaskExecution: (callback: (event: any, data: TaskExecutionResult) => void) => () => void;
  onTaskStatusChange: (callback: (event: any, data: { taskId: string; status: ScheduledTaskStatus }) => void) => () => void;
  onRISAEvent: (callback: (event: any, data: { type: string; payload: any }) => void) => () => void;
}
