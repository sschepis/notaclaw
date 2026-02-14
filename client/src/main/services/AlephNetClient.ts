// ═══════════════════════════════════════════════════════════════════════════
// AlephNetClient — Thin facade over 6 extracted sub-modules
//
// This file used to be a ~2100-line monolith. All business logic now lives
// in client/src/main/services/alephnet/. This class constructs a shared
// AlephClientContext, instantiates each sub-module, and delegates every
// public method call to the appropriate module.
// ═══════════════════════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import type { AlephGunBridge } from '@sschepis/alephnet-node';
import type { AIProviderManager } from './AIProviderManager';
import type { IdentityManager } from './IdentityManager';
import type { DomainManager } from './DomainManager';
import type { MemorySecurityService } from './MemorySecurityService';
import type { TrustGate } from './TrustGate';
import type { TrustEvaluator } from './TrustEvaluator';
import type {
  IPCParams,
  ThinkResult, CompareResult, RememberResult, RecallResult,
  IntrospectionResult, FocusResult,
  MemoryField, MemoryFragment, MemoryFieldEntropy, MemoryCheckpoint,
  HolographicPattern, CreateMemoryFieldOptions, StoreMemoryOptions,
  QueryMemoryOptions, QueryGlobalOptions,
  Friend, FriendRequest, UserProfile, ProfileLink,
  DirectMessage, ChatRoom, RoomMessage, Conversation,
  Group, GroupPost, GroupComment, FeedItem,
  Claim, VerificationTask, CoherenceEdge, Synthesis, VerifyClaimOptions,
  SRIAAgent, AgentStepResult, AgentSession, AgentRunHandle,
  AgentTeam, CollectiveStepResult,
  WalletBalance, Transaction, StakeInfo,
  DomainDefinition, DomainRules, DomainMembership, DomainVisibility,
  StoredContent, ContentListItem,
  FileSystemItem,
  PluginRegistryEntry, PluginLicense,
  NodeStatus,
} from '../../shared/alephnet-types';
import type { VerificationResult } from '../../shared/trust-types';

import type { AlephClientContext } from './alephnet/types';
import { generateId, now } from './alephnet/types';
import { AlephMemoryClient } from './alephnet/AlephMemoryClient';
import { AlephSocialClient } from './alephnet/AlephSocialClient';
import { AlephGroupsClient } from './alephnet/AlephGroupsClient';
import { AlephCoherenceClient } from './alephnet/AlephCoherenceClient';
import { AlephAgentClient } from './alephnet/AlephAgentClient';
import { AlephEconomicsClient } from './alephnet/AlephEconomicsClient';

// ─── AlephNetClient (Facade) ─────────────────────────────────────────────

export class AlephNetClient extends EventEmitter {
  // ── Shared context (mutable, passed by reference to all sub-modules) ──
  private ctx: AlephClientContext;

  // ── Sub-modules ───────────────────────────────────────────────────────
  private memoryModule: AlephMemoryClient;
  private social: AlephSocialClient;
  private groupsModule: AlephGroupsClient;
  private coherence: AlephCoherenceClient;
  private agentModule: AlephAgentClient;
  private economics: AlephEconomicsClient;

  // ── Connection state (kept on facade for getStatus) ───────────────────
  private connectionError: string | null = null;
  private connectedAt: number = 0;

  constructor(
    bridge: AlephGunBridge,
    aiManager: AIProviderManager,
    identityManager: IdentityManager,
    domainManager: DomainManager
  ) {
    super();

    // Build shared context — a plain object so mutations are visible everywhere
    this.ctx = {
      bridge,
      nodeId: '',
      connected: false,
      profile: null,
      walletState: { balance: 1000, staked: 0, tier: 'Neophyte', pendingRewards: 0 },
      aiManager,
      identityManager,
      domainManager,
      memorySecurityService: null,
      trustGate: null,
      trustEvaluator: null,
      emit: this.emit.bind(this),
    };

    // Instantiate sub-modules
    this.memoryModule = new AlephMemoryClient(this.ctx);
    this.social = new AlephSocialClient(this.ctx);
    this.groupsModule = new AlephGroupsClient(this.ctx);
    this.coherence = new AlephCoherenceClient(this.ctx);
    this.agentModule = new AlephAgentClient(this.ctx);
    this.economics = new AlephEconomicsClient(this.ctx);

    // Wire cross-module dependency: economics needs memory for marketplace
    this.economics.setMemoryClient(this.memoryModule);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Service Injection (post-construction, avoids circular deps)
  // ═══════════════════════════════════════════════════════════════════════

  setMemorySecurityService(service: MemorySecurityService): void {
    this.ctx.memorySecurityService = service;
    console.log('AlephNetClient: MemorySecurityService injected');
  }

  setTrustGate(gate: TrustGate): void {
    this.ctx.trustGate = gate;
    console.log('AlephNetClient: TrustGate injected');
  }

  setTrustEvaluator(evaluator: TrustEvaluator): void {
    this.ctx.trustEvaluator = evaluator;
    console.log('AlephNetClient: TrustEvaluator injected');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Connection (stays in facade — orchestrates sub-module initialization)
  // ═══════════════════════════════════════════════════════════════════════

  async connect(): Promise<{ connected: boolean; error?: string }> {
    this.emit('aleph:connectionStatus', { status: 'CONNECTING' });
    try {
      const identity = await this.ctx.identityManager.getPublicIdentity();
      if (identity) {
        this.ctx.nodeId = identity.fingerprint;
        this.ctx.connected = true;
        this.connectionError = null;
        this.connectedAt = now();
        console.log(`AlephNetClient connected as ${this.ctx.nodeId}`);

        // Load persistent data via sub-modules
        this.memoryModule.loadMemoryData();
        this.groupsModule.initializeDefaultGroups();
      } else {
        console.warn('AlephNetClient: No identity found, generating temporary ID');
        this.ctx.nodeId = generateId('node');
        this.ctx.connected = true;
        this.connectionError = null;
        this.connectedAt = now();
      }
      this.emit('aleph:connectionStatus', {
        status: 'ONLINE',
        nodeId: this.ctx.nodeId,
        connectedAt: this.connectedAt,
      });
      return { connected: true };
    } catch (err: any) {
      this.ctx.connected = false;
      this.connectionError = err.message ?? String(err);
      console.error('AlephNetClient: Connection failed:', this.connectionError);
      this.emit('aleph:connectionStatus', {
        status: 'ERROR',
        error: this.connectionError,
      });
      return { connected: false, error: this.connectionError ?? undefined };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Status (stays in facade — aggregates cross-module state)
  // ═══════════════════════════════════════════════════════════════════════

  async getStatus(): Promise<NodeStatus> {
    return {
      id: this.ctx.nodeId,
      status: this.ctx.connected ? 'ONLINE' : (this.connectionError ? 'ERROR' : 'OFFLINE'),
      tier: this.ctx.walletState.tier,
      peers: 3, // stub
      uptime: this.connectedAt ? now() - this.connectedAt : 0,
      version: '1.3.3',
      semanticDomain: 'cognitive',
      error: this.connectionError ?? undefined,
      connectedAt: this.connectedAt || undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 1: Semantic Computing → AlephMemoryClient
  // ═══════════════════════════════════════════════════════════════════════

  think(params: IPCParams<'aleph:think'>): Promise<ThinkResult> { return this.memoryModule.think(params); }
  compare(params: IPCParams<'aleph:compare'>): Promise<CompareResult> { return this.memoryModule.compare(params); }
  remember(params: IPCParams<'aleph:remember'>): Promise<RememberResult> { return this.memoryModule.remember(params); }
  recall(params: IPCParams<'aleph:recall'>): Promise<RecallResult> { return this.memoryModule.recall(params); }
  introspect(): Promise<IntrospectionResult> { return this.memoryModule.introspect(); }
  focus(params: IPCParams<'aleph:focus'>): Promise<FocusResult> { return this.memoryModule.focus(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 1.5: Memory Fields → AlephMemoryClient
  // ═══════════════════════════════════════════════════════════════════════

  memoryCreate(params: CreateMemoryFieldOptions): Promise<MemoryField> { return this.memoryModule.memoryCreate(params); }
  memoryList(params: { scope?: string; includePublic?: boolean }): Promise<MemoryField[]> { return this.memoryModule.memoryList(params); }
  memoryGet(params: { fieldId: string }): Promise<MemoryField> { return this.memoryModule.memoryGet(params); }
  memoryUpdate(params: { fieldId: string; updates: Partial<MemoryField> }): Promise<MemoryField> { return this.memoryModule.memoryUpdate(params); }
  memoryStore(params: StoreMemoryOptions): Promise<MemoryFragment> { return this.memoryModule.memoryStore(params); }
  memoryQuery(params: QueryMemoryOptions): Promise<{ fragments: MemoryFragment[]; verificationResults?: Map<string, VerificationResult> }> { return this.memoryModule.memoryQuery(params); }
  memoryQueryGlobal(params: QueryGlobalOptions): Promise<{ fragments: MemoryFragment[]; verificationResults?: Map<string, VerificationResult> }> { return this.memoryModule.memoryQueryGlobal(params); }
  memoryContribute(params: { fieldId: string; content: string }): Promise<{ contributionId: string; status: string }> { return this.memoryModule.memoryContribute(params); }
  memorySync(params: { sourceFieldId?: string; conversationId?: string; targetFieldId: string; verifiedOnly?: boolean }): Promise<{ syncedCount: number; entropyDelta: number }> { return this.memoryModule.memorySync(params); }
  memoryProject(params: { text: string; gridSize?: number }): Promise<HolographicPattern> { return this.memoryModule.memoryProject(params); }
  memoryReconstruct(params: { pattern: HolographicPattern }): Promise<{ amplitudes: number[]; phases: number[] }> { return this.memoryModule.memoryReconstruct(params); }
  memorySimilarity(params: { fragment1: string; fragment2: string }): Promise<{ similarity: number; correlationPattern: number[] }> { return this.memoryModule.memorySimilarity(params); }
  memoryEntropy(params: { fieldId: string }): Promise<MemoryFieldEntropy> { return this.memoryModule.memoryEntropy(params); }
  memoryCheckpoint(params: { fieldId: string }): Promise<MemoryCheckpoint> { return this.memoryModule.memoryCheckpoint(params); }
  memoryRollback(params: { fieldId: string; checkpointId: string }): Promise<{ restored: boolean; verified: boolean }> { return this.memoryModule.memoryRollback(params); }
  memoryJoin(params: { fieldId: string }): Promise<{ joined: boolean }> { return this.memoryModule.memoryJoin(params); }
  memoryDelete(params: { fieldId: string; force?: boolean }): Promise<{ deleted: boolean }> { return this.memoryModule.memoryDelete(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 2: Social Graph → AlephSocialClient
  // ═══════════════════════════════════════════════════════════════════════

  friendsList(params: { onlineFirst?: boolean }): Promise<{ friends: Friend[]; total: number }> { return this.social.friendsList(params); }
  friendsAdd(params: { userId: string; message?: string }): Promise<{ requestId: string }> { return this.social.friendsAdd(params); }
  friendsRequests(): Promise<FriendRequest[]> { return this.social.friendsRequests(); }
  friendsAccept(params: { requestId: string }): Promise<{ accepted: boolean }> { return this.social.friendsAccept(params); }
  friendsReject(params: { requestId: string }): Promise<{ rejected: boolean }> { return this.social.friendsReject(params); }
  friendsBlock(params: { userId: string }): Promise<{ blocked: boolean }> { return this.social.friendsBlock(params); }
  friendsUnblock(params: { userId: string }): Promise<{ unblocked: boolean }> { return this.social.friendsUnblock(params); }
  profileGet(params: { userId?: string }): Promise<UserProfile> { return this.social.profileGet(params); }
  profileUpdate(params: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>): Promise<UserProfile> { return this.social.profileUpdate(params); }
  profileLinks(params: { action: 'add' | 'remove'; url: string; title?: string }): Promise<ProfileLink[]> { return this.social.profileLinks(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 3: Messaging → AlephSocialClient
  // ═══════════════════════════════════════════════════════════════════════

  chatSend(params: { userId: string; message: string }): Promise<DirectMessage> { return this.social.chatSend(params); }
  chatInbox(params: { limit?: number }): Promise<Conversation[]> { return this.social.chatInbox(params); }
  chatHistory(params: { userId: string; limit?: number }): Promise<DirectMessage[]> { return this.social.chatHistory(params); }
  chatRoomsCreate(params: { name: string; description?: string }): Promise<ChatRoom> { return this.social.chatRoomsCreate(params); }
  chatRoomsInvite(params: { roomId: string; userId: string }): Promise<{ invited: boolean }> { return this.social.chatRoomsInvite(params); }
  chatRoomsSend(params: { roomId: string; message: string }): Promise<RoomMessage> { return this.social.chatRoomsSend(params); }
  chatRoomsList(): Promise<ChatRoom[]> { return this.social.chatRoomsList(); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 3.5: Groups & Feed → AlephGroupsClient
  // ═══════════════════════════════════════════════════════════════════════

  groupsCreate(params: { name: string; topic: string; visibility: 'public' | 'private' }): Promise<Group> { return this.groupsModule.groupsCreate(params); }
  groupsJoin(params: { groupId: string }): Promise<{ joined: boolean }> { return this.groupsModule.groupsJoin(params); }
  groupsLeave(params: { groupId: string }): Promise<{ left: boolean }> { return this.groupsModule.groupsLeave(params); }
  groupsList(): Promise<Group[]> { return this.groupsModule.groupsList(); }
  groupsPosts(params: { groupId: string; limit?: number }): Promise<GroupPost[]> { return this.groupsModule.groupsPosts(params); }
  groupsPost(params: { groupId: string; content: string }): Promise<GroupPost> { return this.groupsModule.groupsPost(params); }
  groupsReact(params: { groupId: string; postId: string; reaction: string }): Promise<{ reacted: boolean }> { return this.groupsModule.groupsReact(params); }
  groupsComment(params: { groupId: string; postId: string; content: string }): Promise<GroupComment> { return this.groupsModule.groupsComment(params); }
  groupsComments(params: { groupId: string; postId: string }): Promise<GroupComment[]> { return this.groupsModule.groupsComments(params); }
  feedGet(params: { limit?: number }): Promise<FeedItem[]> { return this.groupsModule.feedGet(params); }
  feedMarkRead(params: { itemIds: string[] }): Promise<{ marked: number }> { return this.groupsModule.feedMarkRead(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 4: Coherence Network → AlephCoherenceClient
  // ═══════════════════════════════════════════════════════════════════════

  coherenceSubmitClaim(params: { statement: string }): Promise<Claim> { return this.coherence.coherenceSubmitClaim(params); }
  coherenceVerifyClaim(params: VerifyClaimOptions): Promise<{ verified: boolean }> { return this.coherence.coherenceVerifyClaim(params); }
  coherenceGetClaimByStatement(statement: string): Promise<Claim | undefined> { return this.coherence.coherenceGetClaimByStatement(statement); }
  coherenceListTasks(params: { type?: string; status?: string }): Promise<VerificationTask[]> { return this.coherence.coherenceListTasks(params); }
  coherenceClaimTask(params: { taskId: string }): Promise<{ claimed: boolean }> { return this.coherence.coherenceClaimTask(params); }
  coherenceCreateEdge(params: { fromClaimId: string; toClaimId: string; edgeType: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES' }): Promise<CoherenceEdge> { return this.coherence.coherenceCreateEdge(params); }
  coherenceCreateSynthesis(params: { title: string; acceptedClaimIds: string[] }): Promise<Synthesis> { return this.coherence.coherenceCreateSynthesis(params); }
  coherenceSecurityReview(params: { synthesisId: string }): Promise<{ requestId: string }> { return this.coherence.coherenceSecurityReview(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 5: Agent Management → AlephAgentClient
  // ═══════════════════════════════════════════════════════════════════════

  agentCreate(params: { name: string; templateId?: string }): Promise<SRIAAgent> { return this.agentModule.agentCreate(params); }
  agentList(params: { name?: string }): Promise<SRIAAgent[]> { return this.agentModule.agentList(params); }
  agentGet(params: { agentId: string }): Promise<SRIAAgent> { return this.agentModule.agentGet(params); }
  agentUpdate(params: { agentId: string; goalPriors?: Record<string, number> }): Promise<SRIAAgent> { return this.agentModule.agentUpdate(params); }
  agentDelete(params: { agentId: string }): Promise<{ deleted: boolean }> { return this.agentModule.agentDelete(params); }
  agentSummon(params: { agentId: string; context?: string }): Promise<AgentSession> { return this.agentModule.agentSummon(params); }
  agentStep(params: { agentId: string; observation: string }): Promise<AgentStepResult> { return this.agentModule.agentStep(params); }
  agentDismiss(params: { agentId: string }): Promise<{ beaconFingerprint: string }> { return this.agentModule.agentDismiss(params); }
  agentRun(params: { agentId: string; maxSteps?: number }): Promise<AgentRunHandle> { return this.agentModule.agentRun(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 5.5: Agent Teams → AlephAgentClient
  // ═══════════════════════════════════════════════════════════════════════

  teamCreate(params: { name: string; agentIds: string[] }): Promise<AgentTeam> { return this.agentModule.teamCreate(params); }
  teamList(): Promise<AgentTeam[]> { return this.agentModule.teamList(); }
  teamGet(params: { teamId: string }): Promise<AgentTeam> { return this.agentModule.teamGet(params); }
  teamAddAgent(params: { teamId: string; agentId: string }): Promise<AgentTeam> { return this.agentModule.teamAddAgent(params); }
  teamRemoveAgent(params: { teamId: string; agentId: string }): Promise<AgentTeam> { return this.agentModule.teamRemoveAgent(params); }
  teamSummon(params: { teamId: string }): Promise<{ summoned: boolean }> { return this.agentModule.teamSummon(params); }
  teamStep(params: { teamId: string; observation: string }): Promise<CollectiveStepResult> { return this.agentModule.teamStep(params); }
  teamDismiss(params: { teamId: string }): Promise<{ dismissed: boolean }> { return this.agentModule.teamDismiss(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 6: Wallet & Economics → AlephEconomicsClient
  // ═══════════════════════════════════════════════════════════════════════

  walletBalance(): Promise<WalletBalance> { return this.economics.walletBalance(); }
  walletSend(params: { userId: string; amount: number; memo?: string }): Promise<Transaction> { return this.economics.walletSend(params); }
  walletStake(params: { amount: number; lockDays: number }): Promise<StakeInfo> { return this.economics.walletStake(params); }
  walletUnstake(params: { amount: number }): Promise<Transaction> { return this.economics.walletUnstake(params); }
  walletHistory(params: { limit?: number; type?: string }): Promise<Transaction[]> { return this.economics.walletHistory(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 6.5: Domains → AlephEconomicsClient
  // ═══════════════════════════════════════════════════════════════════════

  domainRegister(params: { handle: string; name: string; description: string; visibility: DomainVisibility; rules?: Partial<DomainRules> }): Promise<DomainDefinition> { return this.economics.domainRegister(params); }
  domainGet(params: { domainId?: string; handle?: string }): Promise<DomainDefinition> { return this.economics.domainGet(params); }
  domainList(params: { limit?: number }): Promise<DomainDefinition[]> { return this.economics.domainList(params); }
  domainJoin(params: { domainId: string }): Promise<{ status: any }> { return this.economics.domainJoin(params); }
  domainLeave(params: { domainId: string }): Promise<{ left: boolean }> { return this.economics.domainLeave(params); }
  domainMembers(params: { domainId: string; limit?: number }): Promise<DomainMembership[]> { return this.economics.domainMembers(params); }
  domainUpdateRules(params: { domainId: string; rules: Partial<DomainRules> }): Promise<DomainDefinition> { return this.economics.domainUpdateRules(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Content Store → AlephEconomicsClient
  // ═══════════════════════════════════════════════════════════════════════

  contentStoreData(params: { data: string; visibility: 'public' | 'private' }): Promise<StoredContent> { return this.economics.contentStoreData(params); }
  contentRetrieve(params: { hash: string }): Promise<StoredContent> { return this.economics.contentRetrieve(params); }
  contentList(params: { visibility?: string; limit?: number }): Promise<ContentListItem[]> { return this.economics.contentList(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // Identity (extended) → AlephEconomicsClient
  // ═══════════════════════════════════════════════════════════════════════

  identitySign(params: { message: string }): Promise<{ signature: string }> { return this.economics.identitySign(params); }
  identityVerify(params: { message: string; signature: string; publicKey: string }): Promise<{ valid: boolean }> { return this.economics.identityVerify(params); }
  identityExport(): Promise<{ publicKey: string; fingerprint: string; resonance: number[] }> { return this.economics.identityExport(); }

  // ═══════════════════════════════════════════════════════════════════════
  // Marketplace → AlephEconomicsClient
  // ═══════════════════════════════════════════════════════════════════════

  marketplacePublish(params: { manifest: Omit<PluginRegistryEntry, 'authorId'|'createdAt'|'updatedAt'> }): Promise<{ success: boolean; entry: PluginRegistryEntry }> { return this.economics.marketplacePublish(params); }
  marketplaceList(params: { query?: string; tag?: string }): Promise<PluginRegistryEntry[]> { return this.economics.marketplaceList(params); }
  marketplaceInstall(params: { pluginId: string }): Promise<{ success: boolean; license?: PluginLicense }> { return this.economics.marketplaceInstall(params); }
  marketplaceLicense(params: { pluginId: string }): Promise<PluginLicense | null> { return this.economics.marketplaceLicense(params); }

  // ═══════════════════════════════════════════════════════════════════════
  // File System → AlephEconomicsClient
  // ═══════════════════════════════════════════════════════════════════════

  fsList(params: { path: string }): Promise<FileSystemItem[]> { return this.economics.fsList(params); }
  fsRead(params: { path: string }): Promise<string> { return this.economics.fsRead(params); }
  fsWrite(params: { path: string; content: string }): Promise<{ success: boolean }> { return this.economics.fsWrite(params); }
  fsHome(): Promise<string> { return this.economics.fsHome(); }
}
