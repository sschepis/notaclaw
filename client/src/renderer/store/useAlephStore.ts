// ═══════════════════════════════════════════════════════════════════════════
// useAlephStore — Unified Zustand store for ALL AlephNet feature state
// Uses slices pattern for organization while sharing a single store.
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type {
  Friend, FriendRequest, UserProfile,
  DirectMessage, Conversation, ChatRoom, RoomMessage,
  Group, GroupPost, GroupComment, FeedItem,
  MemoryField, MemoryFragment, MemoryFieldEntropy,
  Claim, VerificationTask, Synthesis,
  SRIAAgent, AgentTeam, AgentStepResult, AgentRunHandle,
  WalletBalance, Transaction,
  ContentListItem,
  NodeStatus, ThinkResult, IntrospectionResult,
  DomainDefinition
} from '../../shared/alephnet-types';

// ─── State Types ─────────────────────────────────────────────────────────

interface SocialState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  myProfile: UserProfile | null;
  blockedUsers: string[];
}

interface MessagingState {
  conversations: Conversation[];
  activeConversationPeerId: string | null;
  activeMessages: DirectMessage[];
  rooms: ChatRoom[];
  activeRoomId: string | null;
  activeRoomMessages: RoomMessage[];
  unreadDMCount: number;
}

interface GroupState {
  groups: Group[];
  activeGroupId: string | null;
  activeGroupPosts: GroupPost[];
  activePostComments: GroupComment[];
  activePostId: string | null;
  feed: FeedItem[];
  unreadFeedCount: number;
}

interface MemoryState {
  fields: MemoryField[];
  activeFieldId: string | null;
  queryResults: MemoryFragment[];
  activeFieldEntropy: MemoryFieldEntropy | null;
}

interface CoherenceState {
  claims: Claim[];
  verificationTasks: VerificationTask[];
  syntheses: Synthesis[];
  activeClaim: Claim | null;
}

interface AgentState {
  agents: SRIAAgent[];
  teams: AgentTeam[];
  activeAgentId: string | null;
  activeTeamId: string | null;
  stepLog: AgentStepResult[];
  runHandles: Record<string, AgentRunHandle>;
}

interface WalletState {
  balance: WalletBalance;
  transactions: Transaction[];
}

interface ContentState {
  items: ContentListItem[];
}

interface SemanticState {
  lastThinkResult: ThinkResult | null;
  lastIntrospection: IntrospectionResult | null;
}

interface NetworkState {
  nodeStatus: NodeStatus | null;
  connected: boolean;
}

interface DomainState {
  domains: DomainDefinition[];
  activeDomainId: string | null;
}

// ─── Combined Store ──────────────────────────────────────────────────────

interface AlephStore {
  // Loading / Error
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Feature state
  social: SocialState;
  messaging: MessagingState;
  groups: GroupState;
  memory: MemoryState;
  coherence: CoherenceState;
  agents: AgentState;
  wallet: WalletState;
  content: ContentState;
  semantic: SemanticState;
  network: NetworkState;
  domains: DomainState;

  // ─── Generic helpers ────────────────────────────────────────────
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;

  // ─── Social actions ─────────────────────────────────────────────
  loadFriends: () => Promise<void>;
  addFriend: (userId: string, message?: string) => Promise<void>;
  loadFriendRequests: () => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  loadProfile: (userId?: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>) => Promise<void>;

  // ─── Messaging actions ──────────────────────────────────────────
  loadInbox: () => Promise<void>;
  setActiveConversation: (peerId: string | null) => void;
  loadChatHistory: (userId: string) => Promise<void>;
  sendDirectMessage: (userId: string, message: string) => Promise<void>;
  loadRooms: () => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
  loadRoomMessages: (roomId: string) => Promise<void>;
  createRoom: (name: string, description?: string) => Promise<void>;
  sendRoomMessage: (roomId: string, message: string) => Promise<void>;
  inviteToRoom: (roomId: string, userId: string) => Promise<void>;

  // ─── Groups actions ─────────────────────────────────────────────
  loadGroups: () => Promise<void>;
  createGroup: (name: string, topic: string, visibility: 'public' | 'private' | 'restricted') => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  setActiveGroup: (groupId: string | null) => void;
  loadGroupPosts: (groupId: string) => Promise<void>;
  createGroupPost: (groupId: string, content: string) => Promise<void>;
  reactToPost: (groupId: string, postId: string, reaction: string) => Promise<void>;
  setActivePost: (postId: string | null) => void;
  loadPostComments: (groupId: string, postId: string) => Promise<void>;
  commentOnPost: (groupId: string, postId: string, content: string) => Promise<void>;
  loadFeed: () => Promise<void>;

  // ─── Memory actions ─────────────────────────────────────────────
  loadMemoryFields: (scope?: string) => Promise<void>;
  createMemoryField: (name: string, scope: string, description?: string) => Promise<void>;
  setActiveMemoryField: (fieldId: string | null) => void;
  storeMemory: (fieldId: string, content: string, significance?: number) => Promise<void>;
  queryMemoryField: (fieldId: string, query: string, threshold?: number) => Promise<void>;
  queryGlobalMemory: (query: string) => Promise<void>;
  loadFieldEntropy: (fieldId: string) => Promise<void>;
  deleteMemoryField: (fieldId: string) => Promise<void>;

  // ─── Coherence actions ──────────────────────────────────────────
  loadClaims: () => Promise<void>;
  submitClaim: (statement: string) => Promise<void>;
  verifyClaim: (claimId: string, result: 'VERIFIED' | 'REFUTED', evidence: Record<string, unknown>) => Promise<void>;
  loadVerificationTasks: () => Promise<void>;
  claimTask: (taskId: string) => Promise<void>;
  createCoherenceEdge: (fromId: string, toId: string, edgeType: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES') => Promise<void>;
  createSynthesis: (title: string, claimIds: string[]) => Promise<void>;
  setActiveClaim: (claim: Claim | null) => void;

  // ─── Agent actions ──────────────────────────────────────────────
  loadAgents: () => Promise<void>;
  createAgent: (name: string, templateId?: string) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  summonAgent: (agentId: string, context?: string) => Promise<void>;
  stepAgent: (agentId: string, observation: string) => Promise<void>;
  dismissAgent: (agentId: string) => Promise<void>;
  runAgent: (agentId: string, maxSteps?: number) => Promise<void>;
  setActiveAgent: (agentId: string | null) => void;
  loadTeams: () => Promise<void>;
  createTeam: (name: string, agentIds: string[]) => Promise<void>;
  summonTeam: (teamId: string) => Promise<void>;
  stepTeam: (teamId: string, observation: string) => Promise<void>;
  dismissTeam: (teamId: string) => Promise<void>;
  setActiveTeam: (teamId: string | null) => void;

  // ─── Wallet actions ─────────────────────────────────────────────
  loadWalletBalance: () => Promise<void>;
  sendTokens: (userId: string, amount: number, memo?: string) => Promise<void>;
  stakeTokens: (amount: number, lockDays: number) => Promise<void>;
  unstakeTokens: (amount: number) => Promise<void>;
  loadTransactionHistory: () => Promise<void>;

  // ─── Content actions ────────────────────────────────────────────
  loadContent: () => Promise<void>;
  storeContent: (data: string, visibility: 'public' | 'private') => Promise<void>;

  // ─── Semantic actions ───────────────────────────────────────────
  think: (text: string, depth?: string) => Promise<void>;
  introspect: () => Promise<void>;

  // ─── Network actions ────────────────────────────────────────────
  connectToNetwork: () => Promise<void>;
  loadNodeStatus: () => Promise<void>;

  // ─── Domain actions ─────────────────────────────────────────────
  loadDomains: () => Promise<void>;
  registerDomain: (handle: string, name: string, description: string, visibility: 'public' | 'private') => Promise<void>;
  joinDomain: (domainId: string) => Promise<void>;
  setActiveDomain: (domainId: string | null) => void;

  // ─── Event handlers (called from App.tsx subscription setup) ────
  handleIncomingDM: (dm: DirectMessage) => void;
  handleIncomingRoomMessage: (msg: RoomMessage) => void;
  handleIncomingFriendRequest: (req: FriendRequest) => void;
  handleIncomingGroupPost: (post: GroupPost) => void;
  handleAgentStepEvent: (result: AgentStepResult) => void;
  handleWalletTransaction: (tx: Transaction) => void;
}

// ─── Async wrapper with loading/error tracking ───────────────────────────

type SetState = (partial: Partial<AlephStore> | ((state: AlephStore) => Partial<AlephStore>)) => void;
type GetState = () => AlephStore;

async function withLoading(
  key: string,
  set: SetState,
  get: GetState,
  fn: () => Promise<void>
): Promise<void> {
  set({ loading: { ...get().loading, [key]: true }, errors: { ...get().errors, [key]: null } });
  try {
    await fn();
  } catch (err: any) {
    set({ errors: { ...get().errors, [key]: err.message ?? String(err) } });
    console.error(`[AlephStore] ${key} error:`, err);
  } finally {
    set({ loading: { ...get().loading, [key]: false } });
  }
}

// ─── Store Creation ──────────────────────────────────────────────────────

export const useAlephStore = create<AlephStore>((set, get) => ({
  loading: {},
  errors: {},

  // Initial state
  social: { friends: [], friendRequests: [], myProfile: null, blockedUsers: [] },
  messaging: { conversations: [], activeConversationPeerId: null, activeMessages: [], rooms: [], activeRoomId: null, activeRoomMessages: [], unreadDMCount: 0 },
  groups: { groups: [], activeGroupId: null, activeGroupPosts: [], activePostComments: [], activePostId: null, feed: [], unreadFeedCount: 0 },
  memory: { fields: [], activeFieldId: null, queryResults: [], activeFieldEntropy: null },
  coherence: { claims: [], verificationTasks: [], syntheses: [], activeClaim: null },
  agents: { agents: [], teams: [], activeAgentId: null, activeTeamId: null, stepLog: [], runHandles: {} },
  wallet: { balance: { balance: 0, staked: 0, tier: 'Neophyte', pendingRewards: 0 }, transactions: [] },
  content: { items: [] },
  semantic: { lastThinkResult: null, lastIntrospection: null },
  network: { nodeStatus: null, connected: false },
  domains: { domains: [], activeDomainId: null },

  // Generic helpers
  setLoading: (key, loading) => set({ loading: { ...get().loading, [key]: loading } }),
  setError: (key, error) => set({ errors: { ...get().errors, [key]: error } }),

  // ═══════════════════════════════════════════════════════════════════
  // Social
  // ═══════════════════════════════════════════════════════════════════
  loadFriends: () => withLoading('friends', set, get, async () => {
    const { friends } = await window.electronAPI.friendsList({ onlineFirst: true });
    set({ social: { ...get().social, friends } });
  }),
  addFriend: (userId, message) => withLoading('addFriend', set, get, async () => {
    await window.electronAPI.friendsAdd({ userId, message });
  }),
  loadFriendRequests: () => withLoading('friendRequests', set, get, async () => {
    const requests = await window.electronAPI.friendsRequests();
    set({ social: { ...get().social, friendRequests: requests } });
  }),
  acceptFriendRequest: (requestId) => withLoading('acceptFriend', set, get, async () => {
    await window.electronAPI.friendsAccept({ requestId });
    await get().loadFriendRequests();
    await get().loadFriends();
  }),
  rejectFriendRequest: (requestId) => withLoading('rejectFriend', set, get, async () => {
    await window.electronAPI.friendsReject({ requestId });
    await get().loadFriendRequests();
  }),
  blockUser: (userId) => withLoading('blockUser', set, get, async () => {
    await window.electronAPI.friendsBlock({ userId });
    set({ social: { ...get().social, blockedUsers: [...get().social.blockedUsers, userId] } });
    await get().loadFriends();
  }),
  loadProfile: (userId) => withLoading('profile', set, get, async () => {
    const profile = await window.electronAPI.profileGet(userId ? { userId } : undefined);
    if (!userId) set({ social: { ...get().social, myProfile: profile } });
  }),
  updateProfile: (data) => withLoading('updateProfile', set, get, async () => {
    const profile = await window.electronAPI.profileUpdate(data);
    set({ social: { ...get().social, myProfile: profile } });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Messaging
  // ═══════════════════════════════════════════════════════════════════
  loadInbox: () => withLoading('inbox', set, get, async () => {
    const conversations = await window.electronAPI.chatInbox();
    const unread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    set({ messaging: { ...get().messaging, conversations, unreadDMCount: unread } });
  }),
  setActiveConversation: (peerId) => {
    set({ messaging: { ...get().messaging, activeConversationPeerId: peerId, activeMessages: [] } });
    if (peerId) get().loadChatHistory(peerId);
  },
  loadChatHistory: (userId) => withLoading('chatHistory', set, get, async () => {
    const messages = await window.electronAPI.chatHistory({ userId });
    set({ messaging: { ...get().messaging, activeMessages: messages } });
  }),
  sendDirectMessage: (userId, message) => withLoading('sendDM', set, get, async () => {
    const dm = await window.electronAPI.chatSend({ userId, message });
    set({ messaging: { ...get().messaging, activeMessages: [...get().messaging.activeMessages, dm] } });
  }),
  loadRooms: () => withLoading('rooms', set, get, async () => {
    const rooms = await window.electronAPI.chatRoomsList();
    set({ messaging: { ...get().messaging, rooms } });
  }),
  setActiveRoom: (roomId) => {
    set({ messaging: { ...get().messaging, activeRoomId: roomId, activeRoomMessages: [] } });
  },
  loadRoomMessages: (_roomId) => withLoading('roomMessages', set, get, async () => {
    // Room messages are stored in bridge, fetch via chat history pattern
    // For now we just set empty — in production this would be a dedicated endpoint
    set({ messaging: { ...get().messaging, activeRoomMessages: [] } });
  }),
  createRoom: (name, description) => withLoading('createRoom', set, get, async () => {
    const room = await window.electronAPI.chatRoomsCreate({ name, description });
    set({ messaging: { ...get().messaging, rooms: [...get().messaging.rooms, room] } });
  }),
  sendRoomMessage: (roomId, message) => withLoading('sendRoomMsg', set, get, async () => {
    const msg = await window.electronAPI.chatRoomsSend({ roomId, message });
    set({ messaging: { ...get().messaging, activeRoomMessages: [...get().messaging.activeRoomMessages, msg] } });
  }),
  inviteToRoom: (roomId, userId) => withLoading('inviteRoom', set, get, async () => {
    await window.electronAPI.chatRoomsInvite({ roomId, userId });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Groups
  // ═══════════════════════════════════════════════════════════════════
  loadGroups: () => withLoading('groups', set, get, async () => {
    const groups = await window.electronAPI.groupsList();
    set({ groups: { ...get().groups, groups } });
  }),
  createGroup: (name, topic, visibility) => withLoading('createGroup', set, get, async () => {
    const group = await window.electronAPI.groupsCreate({ name, topic, visibility });
    set({ groups: { ...get().groups, groups: [...get().groups.groups, group] } });
  }),
  joinGroup: (groupId) => withLoading('joinGroup', set, get, async () => {
    await window.electronAPI.groupsJoin({ groupId });
    await get().loadGroups();
  }),
  leaveGroup: (groupId) => withLoading('leaveGroup', set, get, async () => {
    await window.electronAPI.groupsLeave({ groupId });
    await get().loadGroups();
  }),
  setActiveGroup: (groupId) => {
    set({ groups: { ...get().groups, activeGroupId: groupId, activeGroupPosts: [], activePostComments: [], activePostId: null } });
    if (groupId) get().loadGroupPosts(groupId);
  },
  loadGroupPosts: (groupId) => withLoading('groupPosts', set, get, async () => {
    const posts = await window.electronAPI.groupsPosts({ groupId });
    set({ groups: { ...get().groups, activeGroupPosts: posts } });
  }),
  createGroupPost: (groupId, content) => withLoading('createPost', set, get, async () => {
    const post = await window.electronAPI.groupsPost({ groupId, content });
    set({ groups: { ...get().groups, activeGroupPosts: [...get().groups.activeGroupPosts, post] } });
  }),
  reactToPost: (groupId, postId, reaction) => withLoading('react', set, get, async () => {
    await window.electronAPI.groupsReact({ groupId, postId, reaction });
    await get().loadGroupPosts(groupId);
  }),
  setActivePost: (postId) => {
    set({ groups: { ...get().groups, activePostId: postId, activePostComments: [] } });
  },
  loadPostComments: (groupId, postId) => withLoading('postComments', set, get, async () => {
    const comments = await window.electronAPI.groupsComments({ groupId, postId });
    set({ groups: { ...get().groups, activePostComments: comments } });
  }),
  commentOnPost: (groupId, postId, content) => withLoading('comment', set, get, async () => {
    const comment = await window.electronAPI.groupsComment({ groupId, postId, content });
    set({ groups: { ...get().groups, activePostComments: [...get().groups.activePostComments, comment] } });
  }),
  loadFeed: () => withLoading('feed', set, get, async () => {
    const feed = await window.electronAPI.feedGet();
    const unread = feed.filter(f => !f.read).length;
    set({ groups: { ...get().groups, feed, unreadFeedCount: unread } });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Memory Fields
  // ═══════════════════════════════════════════════════════════════════
  loadMemoryFields: (scope) => withLoading('memoryFields', set, get, async () => {
    const fields = await window.electronAPI.memoryList(scope ? { scope: scope as any } : undefined);
    set({ memory: { ...get().memory, fields } });
  }),
  createMemoryField: (name, scope, description) => withLoading('createField', set, get, async () => {
    const field = await window.electronAPI.memoryCreate({ name, scope: scope as any, description });
    set({ memory: { ...get().memory, fields: [...get().memory.fields, field] } });
  }),
  setActiveMemoryField: (fieldId) => {
    set({ memory: { ...get().memory, activeFieldId: fieldId, queryResults: [], activeFieldEntropy: null } });
    if (fieldId) get().loadFieldEntropy(fieldId);
  },
  storeMemory: (fieldId, content, significance) => withLoading('storeMemory', set, get, async () => {
    await window.electronAPI.memoryStore({ fieldId, content, significance });
  }),
  queryMemoryField: (fieldId, query, threshold) => withLoading('queryMemory', set, get, async () => {
    const { fragments } = await window.electronAPI.memoryQuery({ fieldId, query, threshold });
    set({ memory: { ...get().memory, queryResults: fragments } });
  }),
  queryGlobalMemory: (query) => withLoading('queryGlobal', set, get, async () => {
    const { fragments } = await window.electronAPI.memoryQueryGlobal({ query });
    set({ memory: { ...get().memory, queryResults: fragments } });
  }),
  loadFieldEntropy: (fieldId) => withLoading('fieldEntropy', set, get, async () => {
    const entropy = await window.electronAPI.memoryEntropy({ fieldId });
    set({ memory: { ...get().memory, activeFieldEntropy: entropy } });
  }),
  deleteMemoryField: (fieldId) => withLoading('deleteField', set, get, async () => {
    await window.electronAPI.memoryDelete({ fieldId });
    set({ memory: { ...get().memory, fields: get().memory.fields.filter(f => f.id !== fieldId), activeFieldId: null } });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Coherence
  // ═══════════════════════════════════════════════════════════════════
  loadClaims: () => withLoading('claims', set, get, async () => {
    // No direct "list claims" endpoint, but we can use listTasks to infer
    // For now, claims are accumulated locally
  }),
  submitClaim: (statement) => withLoading('submitClaim', set, get, async () => {
    const claim = await window.electronAPI.coherenceSubmitClaim({ statement });
    set({ coherence: { ...get().coherence, claims: [...get().coherence.claims, claim] } });
  }),
  verifyClaim: (claimId, result, evidence) => withLoading('verifyClaim', set, get, async () => {
    await window.electronAPI.coherenceVerifyClaim({ claimId, result, evidence });
  }),
  loadVerificationTasks: () => withLoading('verificationTasks', set, get, async () => {
    const tasks = await window.electronAPI.coherenceListTasks();
    set({ coherence: { ...get().coherence, verificationTasks: tasks } });
  }),
  claimTask: (taskId) => withLoading('claimTask', set, get, async () => {
    await window.electronAPI.coherenceClaimTask({ taskId });
    await get().loadVerificationTasks();
  }),
  createCoherenceEdge: (fromId, toId, edgeType) => withLoading('createEdge', set, get, async () => {
    await window.electronAPI.coherenceCreateEdge({ fromClaimId: fromId, toClaimId: toId, edgeType });
  }),
  createSynthesis: (title, claimIds) => withLoading('createSynthesis', set, get, async () => {
    const synth = await window.electronAPI.coherenceCreateSynthesis({ title, acceptedClaimIds: claimIds });
    set({ coherence: { ...get().coherence, syntheses: [...get().coherence.syntheses, synth] } });
  }),
  setActiveClaim: (claim) => set({ coherence: { ...get().coherence, activeClaim: claim } }),

  // ═══════════════════════════════════════════════════════════════════
  // Agents
  // ═══════════════════════════════════════════════════════════════════
  loadAgents: () => withLoading('agents', set, get, async () => {
    const agents = await window.electronAPI.agentList();
    set({ agents: { ...get().agents, agents } });
  }),
  createAgent: (name, templateId) => withLoading('createAgent', set, get, async () => {
    const agent = await window.electronAPI.agentCreate({ name, templateId });
    set({ agents: { ...get().agents, agents: [...get().agents.agents, agent] } });
  }),
  deleteAgent: (agentId) => withLoading('deleteAgent', set, get, async () => {
    await window.electronAPI.agentDelete({ agentId });
    set({ agents: { ...get().agents, agents: get().agents.agents.filter(a => a.id !== agentId) } });
  }),
  summonAgent: (agentId, context) => withLoading('summonAgent', set, get, async () => {
    await window.electronAPI.agentSummon({ agentId, context });
    await get().loadAgents();
  }),
  stepAgent: (agentId, observation) => withLoading('stepAgent', set, get, async () => {
    const result = await window.electronAPI.agentStep({ agentId, observation });
    set({ agents: { ...get().agents, stepLog: [...get().agents.stepLog, result] } });
  }),
  dismissAgent: (agentId) => withLoading('dismissAgent', set, get, async () => {
    await window.electronAPI.agentDismiss({ agentId });
    await get().loadAgents();
  }),
  runAgent: (agentId, maxSteps) => withLoading('runAgent', set, get, async () => {
    const handle = await window.electronAPI.agentRun({ agentId, maxSteps });
    set({ agents: { ...get().agents, runHandles: { ...get().agents.runHandles, [agentId]: handle } } });
  }),
  setActiveAgent: (agentId) => set({ agents: { ...get().agents, activeAgentId: agentId } }),
  loadTeams: () => withLoading('teams', set, get, async () => {
    const teams = await window.electronAPI.teamList();
    set({ agents: { ...get().agents, teams } });
  }),
  createTeam: (name, agentIds) => withLoading('createTeam', set, get, async () => {
    const team = await window.electronAPI.teamCreate({ name, agentIds });
    set({ agents: { ...get().agents, teams: [...get().agents.teams, team] } });
  }),
  summonTeam: (teamId) => withLoading('summonTeam', set, get, async () => {
    await window.electronAPI.teamSummon({ teamId });
  }),
  stepTeam: (teamId, observation) => withLoading('stepTeam', set, get, async () => {
    const result = await window.electronAPI.teamStep({ teamId, observation });
    // Store step results
    set({ agents: { ...get().agents, stepLog: [...get().agents.stepLog, ...result.agentResults] } });
  }),
  dismissTeam: (teamId) => withLoading('dismissTeam', set, get, async () => {
    await window.electronAPI.teamDismiss({ teamId });
  }),
  setActiveTeam: (teamId) => set({ agents: { ...get().agents, activeTeamId: teamId } }),

  // ═══════════════════════════════════════════════════════════════════
  // Wallet
  // ═══════════════════════════════════════════════════════════════════
  loadWalletBalance: () => withLoading('walletBalance', set, get, async () => {
    const balance = await window.electronAPI.walletBalance();
    set({ wallet: { ...get().wallet, balance } });
  }),
  sendTokens: (userId, amount, memo) => withLoading('sendTokens', set, get, async () => {
    const tx = await window.electronAPI.walletSend({ userId, amount, memo });
    set({ wallet: { ...get().wallet, transactions: [tx, ...get().wallet.transactions] } });
    await get().loadWalletBalance();
  }),
  stakeTokens: (amount, lockDays) => withLoading('stakeTokens', set, get, async () => {
    await window.electronAPI.walletStake({ amount, lockDays });
    await get().loadWalletBalance();
  }),
  unstakeTokens: (amount) => withLoading('unstakeTokens', set, get, async () => {
    const tx = await window.electronAPI.walletUnstake({ amount });
    set({ wallet: { ...get().wallet, transactions: [tx, ...get().wallet.transactions] } });
    await get().loadWalletBalance();
  }),
  loadTransactionHistory: () => withLoading('txHistory', set, get, async () => {
    const transactions = await window.electronAPI.walletHistory();
    set({ wallet: { ...get().wallet, transactions } });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Content
  // ═══════════════════════════════════════════════════════════════════
  loadContent: () => withLoading('content', set, get, async () => {
    const items = await window.electronAPI.contentList();
    set({ content: { items } });
  }),
  storeContent: (data, visibility) => withLoading('storeContent', set, get, async () => {
    await window.electronAPI.contentStore({ data, visibility });
    await get().loadContent();
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Semantic
  // ═══════════════════════════════════════════════════════════════════
  think: (text, depth) => withLoading('think', set, get, async () => {
    const result = await window.electronAPI.alephThink({ text, depth: depth as any });
    set({ semantic: { ...get().semantic, lastThinkResult: result } });
  }),
  introspect: () => withLoading('introspect', set, get, async () => {
    const result = await window.electronAPI.alephIntrospect();
    set({ semantic: { ...get().semantic, lastIntrospection: result } });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Network
  // ═══════════════════════════════════════════════════════════════════
  connectToNetwork: () => withLoading('connect', set, get, async () => {
    const { connected } = await window.electronAPI.alephConnect();
    set({ network: { ...get().network, connected } });
  }),
  loadNodeStatus: () => withLoading('nodeStatus', set, get, async () => {
    const status = await window.electronAPI.alephStatus();
    set({ network: { ...get().network, nodeStatus: status } });
  }),

  // ═══════════════════════════════════════════════════════════════════
  // Domains
  // ═══════════════════════════════════════════════════════════════════
  loadDomains: () => withLoading('domains', set, get, async () => {
    const domains = await window.electronAPI.domainList();
    set({ domains: { ...get().domains, domains } });
  }),
  registerDomain: (handle, name, description, visibility) => withLoading('registerDomain', set, get, async () => {
    await window.electronAPI.domainRegister({ handle, name, description, visibility });
    await get().loadDomains();
  }),
  joinDomain: (domainId) => withLoading('joinDomain', set, get, async () => {
    await window.electronAPI.domainJoin({ domainId });
    await get().loadDomains();
  }),
  setActiveDomain: (domainId) => set({ domains: { ...get().domains, activeDomainId: domainId } }),

  // ═══════════════════════════════════════════════════════════════════
  // Event Handlers (for real-time push events from main process)
  // ═══════════════════════════════════════════════════════════════════
  handleIncomingDM: (dm) => {
    const { messaging } = get();
    if (messaging.activeConversationPeerId === dm.fromUserId) {
      set({ messaging: { ...messaging, activeMessages: [...messaging.activeMessages, dm] } });
    }
    set({ messaging: { ...get().messaging, unreadDMCount: get().messaging.unreadDMCount + 1 } });
  },
  handleIncomingRoomMessage: (msg) => {
    const { messaging } = get();
    if (messaging.activeRoomId === msg.roomId) {
      set({ messaging: { ...messaging, activeRoomMessages: [...messaging.activeRoomMessages, msg] } });
    }
  },
  handleIncomingFriendRequest: (req) => {
    set({ social: { ...get().social, friendRequests: [...get().social.friendRequests, req] } });
  },
  handleIncomingGroupPost: (post) => {
    const { groups } = get();
    if (groups.activeGroupId === post.groupId) {
      set({ groups: { ...groups, activeGroupPosts: [...groups.activeGroupPosts, post] } });
    }
  },
  handleAgentStepEvent: (result) => {
    set({ agents: { ...get().agents, stepLog: [...get().agents.stepLog.slice(-99), result] } });
  },
  handleWalletTransaction: (tx) => {
    set({ wallet: { ...get().wallet, transactions: [tx, ...get().wallet.transactions] } });
  },
}));
