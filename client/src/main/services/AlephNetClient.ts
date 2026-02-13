// ═══════════════════════════════════════════════════════════════════════════
// AlephNetClient — Central wrapper for the AlephNet Node SDK
// Provides a unified interface for all AlephNet operations and manages
// the connection lifecycle. All IPC handlers delegate to this service.
// ═══════════════════════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { AlephGunBridge, gunObjectsToArrays } from '@sschepis/alephnet-node';
import { AIProviderManager } from './AIProviderManager';
import { IdentityManager } from './IdentityManager';
import { DomainManager } from './DomainManager';
import type { MemorySecurityService } from './MemorySecurityService';
import type { TrustGate } from './TrustGate';
import type { TrustEvaluator } from './TrustEvaluator';
import type { SignedMemoryFragment, ProvenanceChainEntry, SemanticValidation, VerificationResult, EncryptedFragment, TrustAssessment, AuthorIdentity } from '../../shared/trust-types';
import { MEMORY_VALIDATION_THRESHOLDS } from '../../shared/trust-types';
import type {
  IPCParams,
  // Semantic
  ThinkResult, CompareResult, RememberResult, RecallResult,
  IntrospectionResult, FocusResult,
  // Memory
  MemoryField, MemoryFragment, MemoryFieldEntropy, MemoryCheckpoint,
  HolographicPattern, CreateMemoryFieldOptions, StoreMemoryOptions,
  QueryMemoryOptions, QueryGlobalOptions,
  // Social
  Friend, FriendRequest, UserProfile, ProfileLink,
  // Messaging
  DirectMessage, ChatRoom, RoomMessage, Conversation,
  // Groups
  Group, GroupPost, GroupComment, FeedItem,
  // Coherence
  Claim, VerificationTask, CoherenceEdge, Synthesis, VerifyClaimOptions,
  // Agents
  SRIAAgent, AgentStepResult, AgentSession, AgentRunHandle,
  AgentTeam, CollectiveStepResult,
  // Wallet
  WalletBalance, Transaction, StakeInfo,
  // Domains
  DomainDefinition, DomainRules, DomainMembership, DomainVisibility,
  // Content
  StoredContent, ContentListItem,
  // File System
  FileSystemItem,
  // Marketplace
  PluginRegistryEntry, PluginLicense,
  // Network
  NodeStatus,
} from '../../shared/alephnet-types';

const INITIAL_GROUPS: Partial<Group>[] = [
  { name: 'AlephNet General', topic: 'General discussion about the AlephNet ecosystem', visibility: 'public' },
  { name: 'Prompt Engineering', topic: 'Share and refine your prompt crafting skills', visibility: 'public' },
  { name: 'Agent Development', topic: 'Building and deploying SRIA agents', visibility: 'public' },
  { name: 'Coherence & Truth', topic: 'Verifying claims and building the truth graph', visibility: 'public' },
  { name: 'Marketplace', topic: 'Trading plugins, skills, and resources', visibility: 'public' },
  { name: 'Developers', topic: 'Technical discussion and SDK support', visibility: 'public' },
  { name: 'Off-Topic', topic: 'Everything else', visibility: 'public' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function generateId(prefix: string = ''): string {
  return `${prefix}${prefix ? '_' : ''}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): number {
  return Date.now();
}

/**
 * Sanitize data for Gun.js storage.
 * Converts arrays to objects with numeric keys.
 * Removes undefined values.
 */
function sanitizeForGun(data: any): any {
    if (data === undefined) return null;
    if (data === null) return null;
    
    if (Array.isArray(data)) {
        const obj: any = {};
        data.forEach((val, idx) => {
            obj[idx] = sanitizeForGun(val);
        });
        return obj;
    }
    
    if (typeof data === 'object') {
        const obj: any = {};
        for (const key in data) {
            const val = sanitizeForGun(data[key]);
            if (val !== undefined) {
                obj[key] = val;
            }
        }
        return obj;
    }
    
    return data;
}

// ─── AlephNetClient ──────────────────────────────────────────────────────

export class AlephNetClient extends EventEmitter {
  private bridge: AlephGunBridge;
  private aiManager: AIProviderManager;
  private identityManager: IdentityManager;
  private domainManager: DomainManager;
  private memorySecurityService: MemorySecurityService | null = null;
  private trustGate: TrustGate | null = null;
  // private _trustEvaluator: TrustEvaluator | null = null; // Reserved for future trust evaluation
  private connected = false;
  private nodeId: string = '';
  
  // Cached trust assessment for the current user
  private selfTrustAssessment: TrustAssessment | null = null;
  
  // Encrypted fragment store for private fields
  private encryptedFragments = new Map<string, EncryptedFragment>();

  // In-memory stores (will be backed by Gun.js in production)
  private memoryFields = new Map<string, MemoryField>();
  private memoryFragments = new Map<string, MemoryFragment[]>();
  private friends = new Map<string, Friend>();
  private friendRequests = new Map<string, FriendRequest>();
  private blockedUsers = new Set<string>();
  private profile: UserProfile | null = null;
  private conversations = new Map<string, DirectMessage[]>();
  private rooms = new Map<string, ChatRoom>();
  private roomMessages = new Map<string, RoomMessage[]>();
  private groups = new Map<string, Group>();
  private groupPosts = new Map<string, GroupPost[]>();
  private postComments = new Map<string, GroupComment[]>();
  private feedItems: FeedItem[] = [];
  private claims = new Map<string, Claim>();
  private verificationTasks = new Map<string, VerificationTask>();
  private edges = new Map<string, CoherenceEdge>();
  private syntheses = new Map<string, Synthesis>();
  private agents = new Map<string, SRIAAgent>();
  private agentRuns = new Map<string, AgentRunHandle>();
  private teams = new Map<string, AgentTeam>();
  private walletState: WalletBalance = { balance: 1000, staked: 0, tier: 'Neophyte', pendingRewards: 0 };
  private transactions: Transaction[] = [];
  private contentStore = new Map<string, StoredContent>();
  private checkpoints = new Map<string, MemoryCheckpoint[]>();
  
  // Signed fragment provenance store (for security service integration)
  private signedFragments = new Map<string, SignedMemoryFragment<MemoryFragment>>();
  private provenanceChains = new Map<string, ProvenanceChainEntry[]>();

  constructor(
    bridge: AlephGunBridge,
    aiManager: AIProviderManager,
    identityManager: IdentityManager,
    domainManager: DomainManager
  ) {
    super();
    this.bridge = bridge;
    this.aiManager = aiManager;
    this.identityManager = identityManager;
    this.domainManager = domainManager;
  }

  /**
   * Inject the MemorySecurityService for signed fragment operations.
   * This is set after construction to avoid circular dependencies.
   */
  setMemorySecurityService(service: MemorySecurityService): void {
    this.memorySecurityService = service;
    console.log('AlephNetClient: MemorySecurityService injected');
  }

  /**
   * Inject the TrustGate for capability checking.
   */
  setTrustGate(gate: TrustGate): void {
    this.trustGate = gate;
    console.log('AlephNetClient: TrustGate injected');
  }

  /**
   * Inject the TrustEvaluator for trust assessment.
   */
  setTrustEvaluator(_evaluator: TrustEvaluator): void {
    // this._trustEvaluator = evaluator;
    console.log('AlephNetClient: TrustEvaluator injected');
  }

  /**
   * Get or create a trust assessment for the current user.
   * Used for capability checking on memory operations.
   */
  private async getSelfTrustAssessment(): Promise<TrustAssessment> {
    // Cache the self trust assessment (always high trust for self)
    if (!this.selfTrustAssessment) {
      this.selfTrustAssessment = {
        score: 1.0,
        level: 'SELF',
        factors: {
          signatureValid: true,
          socialDistance: 1.0,
          authorReputation: 1.0,
          stakingTier: 1.0,
          endorsementQuality: 1.0,
          coherenceScore: 1.0
        },
        evaluatedAt: now(),
        ttlMs: Infinity
      };
    }
    return this.selfTrustAssessment;
  }

  /**
   * Check if a capability is allowed for a memory operation.
   * Returns true if allowed, throws error if denied.
   */
  private async checkMemoryCapability(
    capability: 'memory:read' | 'memory:write' | 'memory:contribute' | 'memory:fold' | 'memory:share' | 'memory:create-field' | 'memory:delete-field' | 'memory:admin',
    scope: string
  ): Promise<boolean> {
    if (!this.trustGate || !this.memorySecurityService) {
      // No trust gate configured - allow by default (development mode)
      return true;
    }

    const trust = await this.getSelfTrustAssessment();
    const result = this.memorySecurityService.checkMemoryCapability(capability, scope, trust);

    if (result.decision === 'DENY') {
      throw new Error(`Memory operation denied: ${result.reason || 'Insufficient permissions'}`);
    }

    if (result.decision === 'CONFIRM') {
      console.warn(`Memory operation requires confirmation: ${result.reason}`);
      // In a full implementation, this would prompt the user
      // For now, allow after logging
    }

    return true;
  }

  /**
   * Get authorized readers for a field based on visibility and share grants.
   * Used for encryption.
   */
  private async getAuthorizedReaders(_field: MemoryField): Promise<AuthorIdentity[]> {
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) {
      return [];
    }

    // Self is always authorized
    const readers: AuthorIdentity[] = [identity];

    // For restricted visibility, add share grant recipients based on field
    // (In a full implementation, this would look up share grants for _field.id)

    return readers;
  }

  /**
   * Load memory fields and fragments from GunDB into in-memory cache.
   */
  private async loadMemoryData(): Promise<void> {
    if (!this.bridge || !this.bridge.getGun()) return;
    
    console.log('AlephNetClient: Loading memory data from graph...');
    const user = this.bridge.getGun().user();
    
    // Load fields
    let fieldCount = 0;
    user.get('memory').get('fields').map().once((rawFieldData: any, fieldId: string) => {
      if (!rawFieldData || !fieldId || fieldId === '_') return;
      
      const fieldData = gunObjectsToArrays(rawFieldData);
      
      fieldCount++;
      if (fieldCount % 10 === 0) console.log(`AlephNetClient: Loaded ${fieldCount} memory fields...`);

      // Check if this is a valid field object
      if (typeof fieldData === 'object' && fieldData.name) {
        const field: MemoryField = {
            id: fieldId,
            name: fieldData.name,
            scope: fieldData.scope,
            description: fieldData.description || '',
            consensusThreshold: fieldData.consensusThreshold || 0.85,
            visibility: fieldData.visibility || 'private',
            primeSignature: fieldData.primeSignature || [],
            entropy: fieldData.entropy || 0,
            locked: fieldData.locked || false,
            contributionCount: fieldData.contributionCount || 0,
            createdAt: fieldData.createdAt || Date.now(),
            updatedAt: fieldData.updatedAt || Date.now(),
            metadata: fieldData.metadata || {}
        };
        
        this.memoryFields.set(fieldId, field);
        
        // Initialize fragments array if not exists
        if (!this.memoryFragments.has(fieldId)) {
            this.memoryFragments.set(fieldId, []);
        }
        
        // Load fragments for this field
        user.get('memory').get('fields').get(fieldId).get('fragments').map().once((rawFragData: any, fragId: string) => {
             if (!rawFragData || !fragId || fragId === '_') return;
             
             const fragData = gunObjectsToArrays(rawFragData);
             
             // Handle encrypted fragments
             if (fragData.encrypted) {
                 this.encryptedFragments.set(fragId, {
                     ciphertext: fragData.ciphertext,
                     nonce: fragData.nonce,
                     keyWraps: [] 
                 });
                 return;
             }
             
             if (fragData.content) {
                 const frag: MemoryFragment = {
                     id: fragId,
                     fieldId: fieldId,
                     content: fragData.content,
                     significance: fragData.significance || 0.5,
                     primeFactors: fragData.primeFactors || [],
                     metadata: fragData.metadata || {},
                     timestamp: fragData.timestamp || Date.now()
                 };
                 
                 const frags = this.memoryFragments.get(fieldId) || [];
                 if (!frags.find(f => f.id === frag.id)) {
                     frags.push(frag);
                     // Sort by timestamp descending
                     frags.sort((a, b) => b.timestamp - a.timestamp);
                     this.memoryFragments.set(fieldId, frags);
                 }
             }
        });
      }
    });
    
    console.log('AlephNetClient: Memory data load initiated (async)');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Connection
  // ═══════════════════════════════════════════════════════════════════════

  private async initializeDefaultGroups() {
    if (this.groups.size > 0) return;

    console.log('AlephNetClient: Initializing default groups...');
    for (const g of INITIAL_GROUPS) {
        const exists = [...this.groups.values()].some(existing => existing.name === g.name);
        if (!exists) {
            await this.groupsCreate({
                name: g.name!,
                topic: g.topic!,
                visibility: g.visibility as 'public' | 'private'
            });
        }
    }
  }

  private connectionError: string | null = null;
  private connectedAt: number = 0;

  async connect(): Promise<{ connected: boolean; error?: string }> {
    this.emit('aleph:connectionStatus', { status: 'CONNECTING' });
    try {
      const identity = await this.identityManager.getPublicIdentity();
      if (identity) {
        this.nodeId = identity.fingerprint;
        this.connected = true;
        this.connectionError = null;
        this.connectedAt = now();
        console.log(`AlephNetClient connected as ${this.nodeId}`);
        
        // Load persistent data
        this.loadMemoryData();
        this.initializeDefaultGroups();
      } else {
        console.warn('AlephNetClient: No identity found, generating temporary ID');
        this.nodeId = generateId('node');
        this.connected = true;
        this.connectionError = null;
        this.connectedAt = now();
      }
      this.emit('aleph:connectionStatus', {
        status: 'ONLINE',
        nodeId: this.nodeId,
        connectedAt: this.connectedAt
      });
      return { connected: true };
    } catch (err: any) {
      this.connected = false;
      this.connectionError = err.message ?? String(err);
      console.error('AlephNetClient: Connection failed:', this.connectionError);
      this.emit('aleph:connectionStatus', {
        status: 'ERROR',
        error: this.connectionError
      });
      return { connected: false, error: this.connectionError ?? undefined };
    }
  }

  async getStatus(): Promise<NodeStatus> {
    return {
      id: this.nodeId,
      status: this.connected ? 'ONLINE' : (this.connectionError ? 'ERROR' : 'OFFLINE'),
      tier: this.walletState.tier,
      peers: 3, // stub
      uptime: this.connectedAt ? now() - this.connectedAt : 0,
      version: '1.3.3',
      semanticDomain: 'cognitive',
      error: this.connectionError ?? undefined,
      connectedAt: this.connectedAt || undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 1: Semantic Computing
  // ═══════════════════════════════════════════════════════════════════════

  async think(params: IPCParams<'aleph:think'>): Promise<ThinkResult> {
    const text = params.text;
    const depth = params.depth || 'normal';
    
    try {
      const prompt = `Analyze the following text and identify key themes and insights. 
      Depth: ${depth}
      
      Return ONLY a JSON object in the following format:
      {
          "themes": ["theme1", "theme2"],
          "insight": "A brief insight about the text",
          "coherence": 0.0 to 1.0,
          "suggestedActions": ["action1", "action2"]
      }
      
      Text: "${text}"`;

      const response = await this.aiManager.processRequest(prompt, { contentType: 'analysis' });
      
      // Try to parse JSON from response
      let jsonStr = response.content;
      // Extract JSON from code blocks if present
      const match = jsonStr.match(/```json\n([\s\S]*?)\n```/) || jsonStr.match(/```\n([\s\S]*?)\n```/);
      if (match) {
          jsonStr = match[1];
      }
      
      const result = JSON.parse(jsonStr);
      return {
          coherence: typeof result.coherence === 'number' ? result.coherence : 0.5,
          themes: Array.isArray(result.themes) ? result.themes : [],
          insight: typeof result.insight === 'string' ? result.insight : "Analysis complete.",
          suggestedActions: Array.isArray(result.suggestedActions) ? result.suggestedActions : []
      };
    } catch (error) {
      console.error('AlephNetClient think error:', error);
      // Fallback to simple analysis
      const words = text.toLowerCase().split(/\s+/);
      const themes = [...new Set(words.filter(w => w.length > 4))].slice(0, 5);
      return {
        coherence: 0.5 + Math.random() * 0.5,
        themes,
        insight: `Analysis of "${text.substring(0, 50)}..." reveals ${themes.length} themes.`,
        suggestedActions: ['explore', 'remember', 'compare'],
      };
    }
  }

  async compare(params: IPCParams<'aleph:compare'>): Promise<CompareResult> {
    const w1 = new Set(params.text1.toLowerCase().split(/\s+/));
    const w2 = new Set(params.text2.toLowerCase().split(/\s+/));
    const shared = [...w1].filter(w => w2.has(w));
    const sim = shared.length / Math.max(w1.size, w2.size);
    return {
      similarity: Math.min(1, sim + Math.random() * 0.3),
      explanation: `Found ${shared.length} shared tokens.`,
      sharedThemes: shared.slice(0, 5),
      differentThemes: [...w1].filter(w => !w2.has(w)).slice(0, 3),
    };
  }

  async remember(params: IPCParams<'aleph:remember'>): Promise<RememberResult> {
    const fragId = generateId('frag');
    const themes = params.content.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    // Store as a fragment in a default user field
    return { confirmed: true, themes, fragmentId: fragId };
  }

  async recall(params: IPCParams<'aleph:recall'>): Promise<RecallResult> {
    // Search across all memory fragments
    const allFrags: MemoryFragment[] = [];
    for (const frags of this.memoryFragments.values()) {
      allFrags.push(...frags);
    }
    const query = params.query.toLowerCase();
    const matched = allFrags
      .map(f => ({ ...f, similarity: f.content.toLowerCase().includes(query) ? 0.8 + Math.random() * 0.2 : Math.random() * 0.3 }))
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, params.limit ?? 5);
    return { fragments: matched };
  }

  async introspect(): Promise<IntrospectionResult> {
    return {
      state: 'focused',
      mood: 'engaged',
      confidence: 0.85,
      recommendations: ['Continue current exploration', 'Consider storing recent insights'],
      activeTopics: ['semantic computing', 'distributed systems'],
      entropy: 0.42,
    };
  }

  async focus(params: IPCParams<'aleph:focus'>): Promise<FocusResult> {
    const topics = params.topics.split(',').map(t => t.trim());
    return { topics, expiration: now() + (params.duration ?? 60000) };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 1.5: Memory Fields
  // ═══════════════════════════════════════════════════════════════════════

  async memoryCreate(params: CreateMemoryFieldOptions): Promise<MemoryField> {
    // Phase 3: Check capability for creating fields
    await this.checkMemoryCapability('memory:create-field', params.scope);
    
    const field: MemoryField = {
      id: generateId('field'),
      name: params.name,
      scope: params.scope,
      description: params.description ?? '',
      consensusThreshold: params.consensusThreshold ?? 0.85,
      visibility: params.visibility ?? 'private',
      primeSignature: Array.from({ length: 8 }, () => Math.floor(Math.random() * 100)),
      entropy: 0,
      locked: false,
      contributionCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    this.memoryFields.set(field.id, field);
    this.memoryFragments.set(field.id, []);
    this.checkpoints.set(field.id, []);
    
    // Persist to GunDB graph
    // We store the full object so it can be rehydrated
    const user = this.bridge.getGun().user();
    user.get('memory').get('fields').get(field.id).put(sanitizeForGun(field));
    
    return field;
  }

  async memoryList(params: { scope?: string; includePublic?: boolean }): Promise<MemoryField[]> {
    return [...this.memoryFields.values()].filter(f => {
      if (params.scope && f.scope !== params.scope) return false;
      if (params.includePublic && f.visibility === 'public') return true;
      return true;
    });
  }

  async memoryGet(params: { fieldId: string }): Promise<MemoryField> {
    const field = this.memoryFields.get(params.fieldId);
    if (!field) throw new Error(`Memory field ${params.fieldId} not found`);
    return field;
  }

  async memoryUpdate(params: { fieldId: string; updates: Partial<MemoryField> }): Promise<MemoryField> {
    const field = this.memoryFields.get(params.fieldId);
    if (!field) throw new Error(`Memory field ${params.fieldId} not found`);

    // Phase 3: Check capability for updating fields
    await this.checkMemoryCapability('memory:admin', field.scope);

    // Apply updates
    if (params.updates.name !== undefined) field.name = params.updates.name;
    if (params.updates.description !== undefined) field.description = params.updates.description;
    if (params.updates.locked !== undefined) field.locked = params.updates.locked;
    if (params.updates.visibility !== undefined) field.visibility = params.updates.visibility;
    
    field.updatedAt = now();
    
    // Persist to GunDB
    const user = this.bridge.getGun().user();
    user.get('memory').get('fields').get(field.id).put(sanitizeForGun(field));
    
    return field;
  }

  async memoryStore(params: StoreMemoryOptions): Promise<MemoryFragment> {
    const frags = this.memoryFragments.get(params.fieldId);
    if (!frags) throw new Error(`Memory field ${params.fieldId} not found`);
    
    const field = this.memoryFields.get(params.fieldId)!;
    
    // Phase 3: Check capability based on scope
    const capability = field.scope === 'global' ? 'memory:contribute' : 'memory:write';
    await this.checkMemoryCapability(capability, field.scope);
    
    // Generate embedding for semantic search
    let embedding: number[] = [];
    try {
        // Use AI Manager to generate embeddings
        embedding = await this.aiManager.getEmbeddings(params.content);
    } catch (err) {
        console.warn('memoryStore: Failed to generate embedding:', err);
    }

    const frag: MemoryFragment = {
      id: generateId('frag'),
      fieldId: params.fieldId,
      content: params.content,
      significance: params.significance ?? 0.5,
      primeFactors: params.primeFactors ?? [],
      metadata: {
          ...params.metadata,
          embedding // Store embedding in metadata
      },
      timestamp: now(),
    };
    
    // Phase 2: Semantic validation before storing
    let semanticValidation: SemanticValidation | null = null;
    if (this.memorySecurityService) {
      try {
        semanticValidation = await this.memorySecurityService.validateSemantics(
          frag,
          field.primeSignature ?? [],
          field.scope
        );
        
        // Get thresholds for this scope
        const thresholds = MEMORY_VALIDATION_THRESHOLDS[field.scope as keyof typeof MEMORY_VALIDATION_THRESHOLDS]
          || MEMORY_VALIDATION_THRESHOLDS.user;
        
        // Reject if significance is too low for this scope
        if (frag.significance < thresholds.significanceMin) {
          console.warn(`memoryStore: Fragment significance ${frag.significance} below minimum ${thresholds.significanceMin} for scope ${field.scope}`);
          // For global scope, reject outright
          if (field.scope === 'global') {
            throw new Error(`Fragment significance ${frag.significance} below minimum ${thresholds.significanceMin} required for global memory`);
          }
        }
        
        // Warn if prime alignment is very low (fragment doesn't match field semantics)
        if (semanticValidation.primeAlignment < 0.2) {
          console.warn(`memoryStore: Low prime alignment ${semanticValidation.primeAlignment} - fragment may not belong in this field`);
        }
        
        // Store validation results in metadata
        frag.metadata = {
          ...frag.metadata,
          semanticValidation: {
            primeAlignment: semanticValidation.primeAlignment,
            entropyScore: semanticValidation.entropyScore,
            coherenceScore: semanticValidation.coherenceScore,
            significanceVerified: semanticValidation.significanceVerified,
            validatedAt: now()
          }
        };
        
        console.log(`memoryStore: Semantic validation passed - alignment: ${semanticValidation.primeAlignment.toFixed(3)}, coherence: ${semanticValidation.coherenceScore.toFixed(3)}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('below minimum')) {
          throw error; // Re-throw significance errors
        }
        console.warn('memoryStore: Failed to validate semantics:', error);
      }
    }
    
    // If security service is available, create a signed fragment with provenance
    if (this.memorySecurityService) {
      try {
        const signedFragment = await this.memorySecurityService.createSignedFragment(
          frag,
          params.fieldId,
          params.parentEnvelopeHash // Optional: for fragment modifications
        );
        
        // Store the signed fragment with provenance
        this.signedFragments.set(frag.id, signedFragment);
        this.provenanceChains.set(frag.id, signedFragment.provenanceChain);
        
        // Add envelope hash to fragment metadata for future reference
        frag.metadata = {
          ...frag.metadata,
          envelopeHash: signedFragment.envelope.contentHash,
          signature: signedFragment.envelope.signature
        };
        
        console.log(`memoryStore: Created signed fragment ${frag.id} with provenance chain`);
      } catch (error) {
        console.warn('memoryStore: Failed to sign fragment, storing unsigned:', error);
      }
    }
    
    frags.push(frag);
    field.contributionCount++;
    field.updatedAt = now();
    field.entropy = Math.min(1, field.entropy + 0.05);
    
    // Phase 3: Encrypt private fields before persisting
    if (field.visibility === 'private' && this.memorySecurityService) {
      try {
        const authorizedReaders = await this.getAuthorizedReaders(field);
        if (authorizedReaders.length > 0) {
          const encryptedFrag = await this.memorySecurityService.encryptFragment(frag, authorizedReaders);
          this.encryptedFragments.set(frag.id, encryptedFrag);
          
          // Mark fragment as encrypted in metadata
          frag.metadata = {
            ...frag.metadata,
            encrypted: true,
            authorizedReaderCount: authorizedReaders.length
          };
          
          // Persist encrypted version to Gun.js (only ciphertext)
          const user = this.bridge.getGun().user();
          user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun({
            encrypted: true,
            ciphertext: encryptedFrag.ciphertext,
            nonce: encryptedFrag.nonce,
            timestamp: frag.timestamp
          }));
          console.log(`memoryStore: Encrypted fragment ${frag.id} for ${authorizedReaders.length} readers`);
        } else {
          // No authorized readers - store plaintext
          const user = this.bridge.getGun().user();
          user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun(frag));
        }
      } catch (error) {
        console.warn('memoryStore: Failed to encrypt fragment, storing plaintext:', error);
        const user = this.bridge.getGun().user();
        user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun(frag));
      }
    } else {
      // Public or restricted visibility - store plaintext
      const user = this.bridge.getGun().user();
      user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun(frag));
    }
    
    return frag;
  }

  async memoryQuery(params: QueryMemoryOptions): Promise<{ fragments: MemoryFragment[]; verificationResults?: Map<string, VerificationResult> }> {
    const frags = this.memoryFragments.get(params.fieldId) ?? [];
    const query = params.query.toLowerCase();
    const threshold = params.threshold ?? 0.3;
    const limit = params.limit ?? 10;
    
    // Generate query embedding
    let queryEmbedding: number[] = [];
    if (query) {
        try {
            queryEmbedding = await this.aiManager.getEmbeddings(params.query);
        } catch (err) {
            console.warn('memoryQuery: Failed to generate embedding:', err);
        }
    }
    
    // Cosine similarity helper
    const cosineSimilarity = (a: number[], b: number[]) => {
        if (!a || !b || a.length !== b.length) return 0;
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    };

    let results = frags
      .map(f => {
        let similarity = 0;
        
        // Use vector similarity if available
        if (queryEmbedding.length > 0 && f.metadata?.embedding && Array.isArray(f.metadata.embedding)) {
            similarity = cosineSimilarity(queryEmbedding, f.metadata.embedding as number[]);
        } else {
            // Fallback to keyword matching
            // Boost if exact match, otherwise low score
            const contentLower = f.content.toLowerCase();
            if (contentLower.includes(query)) {
                similarity = 0.7 + (contentLower === query ? 0.3 : 0);
            } else {
                similarity = 0.1;
            }
        }
        
        return { ...f, similarity };
      })
      .filter(f => f.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    // Phase 2: Verify signed fragments on retrieval
    const verificationResults = new Map<string, VerificationResult>();
    if (this.memorySecurityService) {
      const verifiedResults: typeof results = [];
      for (const frag of results) {
        const signedFragment = this.signedFragments.get(frag.id);
        if (signedFragment) {
          try {
            const verifyResult = await this.memorySecurityService.verifyFragment(signedFragment);
            verificationResults.set(frag.id, verifyResult);
            
            if (verifyResult.valid) {
              // Add verification status to metadata
              frag.metadata = {
                ...frag.metadata,
                verified: true,
                verifiedAt: now()
              };
              verifiedResults.push(frag);
            } else {
              console.warn(`memoryQuery: Fragment ${frag.id} failed verification: ${verifyResult.error}`);
              // Mark as unverified but still include (with warning metadata)
              frag.metadata = {
                ...frag.metadata,
                verified: false,
                verificationError: verifyResult.error
              };
              verifiedResults.push(frag);
            }
          } catch (error) {
            console.warn(`memoryQuery: Failed to verify fragment ${frag.id}:`, error);
            verifiedResults.push(frag);
          }
        } else {
          // No signed fragment exists - include with unsigned flag
          frag.metadata = {
            ...frag.metadata,
            unsigned: true
          };
          verifiedResults.push(frag);
        }
      }
      results = verifiedResults;
    }
    
    return { fragments: results, verificationResults };
  }

  async memoryQueryGlobal(params: QueryGlobalOptions): Promise<{ fragments: MemoryFragment[]; verificationResults?: Map<string, VerificationResult> }> {
    // Query across all global-scoped fields
    const allFrags: MemoryFragment[] = [];
    for (const [fid, field] of this.memoryFields) {
      if (field.scope === 'global') {
        allFrags.push(...(this.memoryFragments.get(fid) ?? []));
      }
    }
    const query = params.query.toLowerCase();
    let results = allFrags
      .map(f => ({ ...f, similarity: f.content.toLowerCase().includes(query) ? 0.7 + Math.random() * 0.3 : Math.random() * 0.3, confidence: 0.8 }))
      .filter(f => (f.similarity ?? 0) >= (params.minConsensus ?? 0.5))
      .slice(0, params.limit ?? 10);
    
    // Phase 2: Verify signed fragments on retrieval (stricter for global scope)
    const verificationResults = new Map<string, VerificationResult>();
    if (this.memorySecurityService) {
      const verifiedResults: typeof results = [];
      for (const frag of results) {
        const signedFragment = this.signedFragments.get(frag.id);
        if (signedFragment) {
          try {
            const verifyResult = await this.memorySecurityService.verifyFragment(signedFragment);
            verificationResults.set(frag.id, verifyResult);
            
            if (verifyResult.valid) {
              frag.metadata = {
                ...frag.metadata,
                verified: true,
                verifiedAt: now()
              };
              verifiedResults.push(frag);
            } else {
              // For global scope, reject invalid fragments entirely
              console.warn(`memoryQueryGlobal: Fragment ${frag.id} failed verification and will be excluded: ${verifyResult.error}`);
            }
          } catch (error) {
            console.warn(`memoryQueryGlobal: Failed to verify fragment ${frag.id}:`, error);
            // For global scope, exclude fragments that can't be verified
          }
        } else {
          // For global scope, reject unsigned fragments
          console.warn(`memoryQueryGlobal: Fragment ${frag.id} is unsigned and will be excluded from global query`);
        }
      }
      results = verifiedResults;
    }
    
    return { fragments: results, verificationResults };
  }

  async memoryContribute(params: { fieldId: string; content: string }): Promise<{ contributionId: string; status: string }> {
    const frag = await this.memoryStore({ fieldId: params.fieldId, content: params.content });
    return { contributionId: frag.id, status: 'pending' };
  }

  /**
   * Sync (fold) fragments from a source memory field (typically conversation-scoped)
   * into a target memory field (typically user-scoped).
   *
   * This implements the "fold" operation where conversation memory gets
   * consolidated into the user's persistent memory field.
   *
   * @param params.sourceFieldId - The memory field to copy fragments FROM
   * @param params.targetFieldId - The memory field to copy fragments TO
   * @param params.verifiedOnly - Only sync fragments with significance >= 0.7
   * @returns Count of synced fragments and entropy delta
   */
  async memorySync(params: {
    sourceFieldId?: string;  // If provided, use this instead of conversationId lookup
    conversationId?: string; // Legacy: lookup conversation's memory field
    targetFieldId: string;
    verifiedOnly?: boolean
  }): Promise<{ syncedCount: number; entropyDelta: number }> {
    // Phase 3: Check capability for fold operations
    await this.checkMemoryCapability('memory:fold', 'conversation');
    
    // Determine the source field ID
    let sourceFieldId = params.sourceFieldId;
    
    if (!sourceFieldId && params.conversationId) {
      // Look up the conversation's memory field (would need conversation-to-field mapping)
      // For now, try to find a conversation-scoped field matching the conversation ID
      for (const [fieldId, field] of this.memoryFields) {
        if (field.scope === 'conversation' && field.description?.includes(params.conversationId)) {
          sourceFieldId = fieldId;
          break;
        }
      }
    }
    
    if (!sourceFieldId) {
      console.warn('memorySync: No source field found');
      return { syncedCount: 0, entropyDelta: 0 };
    }
    
    const sourceFragments = this.memoryFragments.get(sourceFieldId);
    const targetFragments = this.memoryFragments.get(params.targetFieldId);
    const targetField = this.memoryFields.get(params.targetFieldId);
    const sourceField = this.memoryFields.get(sourceFieldId);
    
    if (!sourceFragments || !targetFragments || !targetField || !sourceField) {
      console.warn('memorySync: Source or target field not found', { sourceFieldId, targetFieldId: params.targetFieldId });
      return { syncedCount: 0, entropyDelta: 0 };
    }
    
    // Filter fragments based on verifiedOnly flag
    const fragmentsToSync = params.verifiedOnly
      ? sourceFragments.filter(f => f.significance >= 0.7)
      : sourceFragments;
    
    // Create a Set of existing content hashes in target to dedupe
    const existingContentHashes = new Set(
      targetFragments.map(f => this.hashContent(f.content))
    );
    
    let syncedCount = 0;
    let entropyDelta = 0;
    const fragmentMappings: Array<{ sourceEnvelopeHash: string; targetEnvelopeHash: string }> = [];
    
    for (const frag of fragmentsToSync) {
      const contentHash = this.hashContent(frag.content);
      
      // Skip if already exists in target
      if (existingContentHashes.has(contentHash)) {
        continue;
      }
      
      // Get source envelope hash if available
      const sourceEnvelopeHash = (frag.metadata?.envelopeHash as string) || '';
      
      // Create a new fragment in the target field
      const newFrag: MemoryFragment = {
        id: generateId('frag'),
        fieldId: params.targetFieldId,
        content: frag.content,
        significance: frag.significance,
        primeFactors: frag.primeFactors ?? [],
        metadata: {
          ...frag.metadata,
          syncedFrom: sourceFieldId,
          originalFragmentId: frag.id,
          syncedAt: now()
        },
        timestamp: now(),
      };
      
      // If security service is available, create signed fragment with fold provenance
      let targetEnvelopeHash = '';
      if (this.memorySecurityService) {
        try {
          const signedFragment = await this.memorySecurityService.createSignedFragment(
            newFrag,
            params.targetFieldId,
            sourceEnvelopeHash || undefined // Link to original fragment's envelope
          );
          
          // Store the signed fragment with provenance
          this.signedFragments.set(newFrag.id, signedFragment);
          this.provenanceChains.set(newFrag.id, signedFragment.provenanceChain);
          
          // Add envelope hash to fragment metadata
          targetEnvelopeHash = signedFragment.envelope.contentHash;
          newFrag.metadata = {
            ...newFrag.metadata,
            envelopeHash: targetEnvelopeHash,
            signature: signedFragment.envelope.signature,
            provenanceDepth: signedFragment.provenanceChain.length
          };
          
          // Track mapping for fold operation
          if (sourceEnvelopeHash) {
            fragmentMappings.push({
              sourceEnvelopeHash,
              targetEnvelopeHash
            });
          }
        } catch (error) {
          console.warn('memorySync: Failed to sign synced fragment:', error);
        }
      }
      
      targetFragments.push(newFrag);
      existingContentHashes.add(contentHash);
      syncedCount++;
      entropyDelta += 0.02; // Small entropy increase per fragment
      
      // Persist to Gun.js
      await this.bridge.put(`memory/fragments/${newFrag.id}`, { content: newFrag.content });
    }
    
    // Create a signed fold operation if we have the security service and synced fragments
    if (this.memorySecurityService && syncedCount > 0 && fragmentMappings.length > 0) {
      try {
        const foldOperation = await this.memorySecurityService.createFoldOperation(
          sourceFieldId,
          params.targetFieldId,
          fragmentMappings,
          {
            redactConversationId: true,
            redactParticipants: true,
            redactTimestamps: false,
            preserveProvenance: true
          }
        );
        
        console.log(`memorySync: Created signed fold operation ${foldOperation.contentHash}`);
        
        // Store fold operation reference in source field metadata
        if (sourceField.scope === 'conversation') {
          sourceField.metadata = {
            ...(sourceField.metadata ?? {}),
            foldOperationHash: foldOperation.contentHash,
            foldOperationSignature: foldOperation.signature
          };
        }
      } catch (error) {
        console.warn('memorySync: Failed to create fold operation:', error);
      }
    }
    
    // Update target field metadata
    targetField.contributionCount += syncedCount;
    targetField.updatedAt = now();
    targetField.entropy = Math.min(1, targetField.entropy + entropyDelta);
    
    // Optionally mark source field as "folded"
    if (sourceField.scope === 'conversation' && syncedCount > 0) {
      sourceField.metadata = {
        ...(sourceField.metadata ?? {}),
        foldedInto: params.targetFieldId,
        foldedAt: now()
      };
    }
    
    console.log(`memorySync: Synced ${syncedCount} fragments from ${sourceFieldId} to ${params.targetFieldId}`);
    
    return { syncedCount, entropyDelta };
  }
  
  /**
   * Simple hash function for content deduplication
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  async memoryProject(params: { text: string; gridSize?: number }): Promise<HolographicPattern> {
    const size = params.gridSize ?? 64;
    return {
      gridSize: size,
      field: {
        intensity: Array.from({ length: size * size }, () => Math.random()),
        phase: Array.from({ length: size * size }, () => Math.random() * 2 * Math.PI),
      },
    };
  }

  async memoryReconstruct(_params: { pattern: HolographicPattern }): Promise<{ amplitudes: number[]; phases: number[] }> {
    const len = 16;
    return {
      amplitudes: Array.from({ length: len }, () => Math.random()),
      phases: Array.from({ length: len }, () => Math.random() * 2 * Math.PI),
    };
  }

  async memorySimilarity(_params: { fragment1: string; fragment2: string }): Promise<{ similarity: number; correlationPattern: number[] }> {
    return {
      similarity: 0.5 + Math.random() * 0.5,
      correlationPattern: Array.from({ length: 8 }, () => Math.random()),
    };
  }

  async memoryEntropy(params: { fieldId: string }): Promise<MemoryFieldEntropy> {
    const field = this.memoryFields.get(params.fieldId);
    return {
      shannon: field?.entropy ?? 0,
      trend: 'stable',
      coherence: 0.85,
    };
  }

  async memoryCheckpoint(params: { fieldId: string }): Promise<MemoryCheckpoint> {
    const cp: MemoryCheckpoint = {
      id: generateId('cp'),
      fieldId: params.fieldId,
      path: `/checkpoints/${params.fieldId}/${Date.now()}.bin`,
      checksum: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      timestamp: now(),
    };
    const cps = this.checkpoints.get(params.fieldId) ?? [];
    cps.push(cp);
    this.checkpoints.set(params.fieldId, cps);
    return cp;
  }

  async memoryRollback(_params: { fieldId: string; checkpointId: string }): Promise<{ restored: boolean; verified: boolean }> {
    return { restored: true, verified: true };
  }

  async memoryJoin(_params: { fieldId: string }): Promise<{ joined: boolean }> {
    return { joined: true };
  }

  async memoryDelete(params: { fieldId: string; force?: boolean }): Promise<{ deleted: boolean }> {
    const field = this.memoryFields.get(params.fieldId);
    if (!field) {
      return { deleted: false };
    }
    
    // Phase 3: Check capability for deleting fields
    await this.checkMemoryCapability('memory:delete-field', field.scope);
    
    // Clean up encrypted fragments if any
    const frags = this.memoryFragments.get(params.fieldId) ?? [];
    for (const frag of frags) {
      this.signedFragments.delete(frag.id);
      this.provenanceChains.delete(frag.id);
      this.encryptedFragments.delete(frag.id);
    }
    
    this.memoryFields.delete(params.fieldId);
    this.memoryFragments.delete(params.fieldId);
    this.checkpoints.delete(params.fieldId);
    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 2: Social Graph
  // ═══════════════════════════════════════════════════════════════════════

  async friendsList(params: { onlineFirst?: boolean }): Promise<{ friends: Friend[]; total: number }> {
    let list = [...this.friends.values()];
    if (params.onlineFirst) {
      list.sort((a, b) => (a.status === 'online' ? -1 : 1) - (b.status === 'online' ? -1 : 1));
    }
    return { friends: list, total: list.length };
  }

  async friendsAdd(params: { userId: string; message?: string }): Promise<{ requestId: string }> {
    const req: FriendRequest = {
      id: generateId('freq'),
      fromUserId: this.nodeId,
      fromDisplayName: this.profile?.displayName ?? 'Me',
      message: params.message,
      timestamp: now(),
      status: 'pending',
    };
    this.friendRequests.set(req.id, req);
    await this.bridge.put(`friends/requests/${params.userId}/${req.id}`, req);
    return { requestId: req.id };
  }

  async friendsRequests(): Promise<FriendRequest[]> {
    return [...this.friendRequests.values()].filter(r => r.status === 'pending');
  }

  async friendsAccept(params: { requestId: string }): Promise<{ accepted: boolean }> {
    const req = this.friendRequests.get(params.requestId);
    if (!req) return { accepted: false };
    req.status = 'accepted';
    const friend: Friend = {
      id: req.fromUserId,
      displayName: req.fromDisplayName,
      status: 'online',
      publicKey: '',
      resonance: 0.5,
      lastSeen: now(),
    };
    this.friends.set(friend.id, friend);
    return { accepted: true };
  }

  async friendsReject(params: { requestId: string }): Promise<{ rejected: boolean }> {
    const req = this.friendRequests.get(params.requestId);
    if (!req) return { rejected: false };
    req.status = 'rejected';
    return { rejected: true };
  }

  async friendsBlock(params: { userId: string }): Promise<{ blocked: boolean }> {
    this.blockedUsers.add(params.userId);
    this.friends.delete(params.userId);
    return { blocked: true };
  }

  async friendsUnblock(params: { userId: string }): Promise<{ unblocked: boolean }> {
    this.blockedUsers.delete(params.userId);
    return { unblocked: true };
  }

  async profileGet(params: { userId?: string }): Promise<UserProfile> {
    if (!params.userId || params.userId === this.nodeId) {
      if (!this.profile) {
        this.profile = {
          id: this.nodeId,
          displayName: `Node-${this.nodeId.substring(0, 6)}`,
          bio: '',
          links: [],
          tier: this.walletState.tier,
          reputation: 0,
          joinedAt: now(),
          publicKey: '',
        };
      }
      return this.profile;
    }
    // Look up friend profile
    const friend = this.friends.get(params.userId);
    return {
      id: params.userId,
      displayName: friend?.displayName ?? 'Unknown',
      bio: friend?.bio ?? '',
      links: [],
      tier: friend?.tier ?? 'Neophyte',
      reputation: 0,
      joinedAt: now(),
      publicKey: friend?.publicKey ?? '',
    };
  }

  async profileUpdate(params: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>): Promise<UserProfile> {
    const profile = await this.profileGet({});
    if (params.displayName) profile.displayName = params.displayName;
    if (params.bio) profile.bio = params.bio;
    if (params.avatar) profile.avatar = params.avatar;
    this.profile = profile;
    await this.bridge.put(`profiles/${this.nodeId}`, { displayName: profile.displayName, bio: profile.bio });
    return profile;
  }

  async profileLinks(params: { action: 'add' | 'remove'; url: string; title?: string }): Promise<ProfileLink[]> {
    const profile = await this.profileGet({});
    if (params.action === 'add') {
      profile.links.push({ url: params.url, title: params.title ?? params.url });
    } else {
      profile.links = profile.links.filter(l => l.url !== params.url);
    }
    this.profile = profile;
    return profile.links;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 3: Messaging
  // ═══════════════════════════════════════════════════════════════════════

  async chatSend(params: { userId: string; message: string }): Promise<DirectMessage> {
    const dm: DirectMessage = {
      id: generateId('dm'),
      fromUserId: this.nodeId,
      fromDisplayName: this.profile?.displayName ?? 'Me',
      toUserId: params.userId,
      content: params.message,
      timestamp: now(),
      read: false,
    };
    const convKey = params.userId;
    const conv = this.conversations.get(convKey) ?? [];
    conv.push(dm);
    this.conversations.set(convKey, conv);
    await this.bridge.put(`messages/dm/${params.userId}/${dm.id}`, dm);
    return dm;
  }

  async chatInbox(params: { limit?: number }): Promise<Conversation[]> {
    const convos: Conversation[] = [];
    for (const [peerId, msgs] of this.conversations) {
      if (msgs.length === 0) continue;
      const last = msgs[msgs.length - 1];
      const friend = this.friends.get(peerId);
      convos.push({
        peerId,
        peerDisplayName: friend?.displayName ?? peerId.substring(0, 12),
        lastMessage: last.content,
        lastMessageAt: last.timestamp,
        unreadCount: msgs.filter(m => !m.read && m.fromUserId !== this.nodeId).length,
      });
    }
    convos.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return convos.slice(0, params.limit ?? 50);
  }

  async chatHistory(params: { userId: string; limit?: number }): Promise<DirectMessage[]> {
    const msgs = this.conversations.get(params.userId) ?? [];
    return msgs.slice(-(params.limit ?? 50));
  }

  async chatRoomsCreate(params: { name: string; description?: string }): Promise<ChatRoom> {
    const room: ChatRoom = {
      id: generateId('room'),
      name: params.name,
      description: params.description ?? '',
      members: [this.nodeId],
      memberCount: 1,
      createdBy: this.nodeId,
      createdAt: now(),
    };
    this.rooms.set(room.id, room);
    this.roomMessages.set(room.id, []);
    await this.bridge.put(`rooms/${room.id}`, { name: room.name });
    return room;
  }

  async chatRoomsInvite(params: { roomId: string; userId: string }): Promise<{ invited: boolean }> {
    const room = this.rooms.get(params.roomId);
    if (!room) return { invited: false };
    if (!room.members.includes(params.userId)) {
      room.members.push(params.userId);
      room.memberCount = room.members.length;
    }
    return { invited: true };
  }

  async chatRoomsSend(params: { roomId: string; message: string }): Promise<RoomMessage> {
    const msg: RoomMessage = {
      id: generateId('rmsg'),
      roomId: params.roomId,
      fromUserId: this.nodeId,
      fromDisplayName: this.profile?.displayName ?? 'Me',
      content: params.message,
      timestamp: now(),
    };
    const msgs = this.roomMessages.get(params.roomId) ?? [];
    msgs.push(msg);
    this.roomMessages.set(params.roomId, msgs);
    const room = this.rooms.get(params.roomId);
    if (room) room.lastMessageAt = msg.timestamp;
    await this.bridge.put(`rooms/${params.roomId}/messages/${msg.id}`, msg);
    this.emit('aleph:roomMessage', msg);
    return msg;
  }

  async chatRoomsList(): Promise<ChatRoom[]> {
    return [...this.rooms.values()];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 3.5: Groups & Feed
  // ═══════════════════════════════════════════════════════════════════════

  async groupsCreate(params: { name: string; topic: string; visibility: 'public' | 'private' }): Promise<Group> {
    const group: Group = {
      id: generateId('grp'),
      name: params.name,
      topic: params.topic,
      visibility: params.visibility,
      memberCount: 1,
      createdBy: this.nodeId,
      createdAt: now(),
      joined: true,
    };
    this.groups.set(group.id, group);
    this.groupPosts.set(group.id, []);
    await this.bridge.put(`groups/${group.id}`, { name: group.name, topic: group.topic });
    return group;
  }

  async groupsJoin(params: { groupId: string }): Promise<{ joined: boolean }> {
    const group = this.groups.get(params.groupId);
    if (!group) return { joined: false };
    group.joined = true;
    group.memberCount++;
    return { joined: true };
  }

  async groupsLeave(params: { groupId: string }): Promise<{ left: boolean }> {
    const group = this.groups.get(params.groupId);
    if (!group) return { left: false };
    group.joined = false;
    group.memberCount = Math.max(0, group.memberCount - 1);
    return { left: true };
  }

  async groupsList(): Promise<Group[]> {
    return [...this.groups.values()];
  }

  async groupsPosts(params: { groupId: string; limit?: number }): Promise<GroupPost[]> {
    const posts = this.groupPosts.get(params.groupId) ?? [];
    return posts.slice(-(params.limit ?? 50));
  }

  async groupsPost(params: { groupId: string; content: string }): Promise<GroupPost> {
    const post: GroupPost = {
      id: generateId('post'),
      groupId: params.groupId,
      authorId: this.nodeId,
      authorDisplayName: this.profile?.displayName ?? 'Me',
      content: params.content,
      timestamp: now(),
      reactions: {},
      commentCount: 0,
    };
    const posts = this.groupPosts.get(params.groupId) ?? [];
    posts.push(post);
    this.groupPosts.set(params.groupId, posts);
    await this.bridge.put(`groups/${params.groupId}/posts/${post.id}`, post);
    this.emit('aleph:groupPost', post);
    return post;
  }

  async groupsReact(params: { groupId: string; postId: string; reaction: string }): Promise<{ reacted: boolean }> {
    const posts = this.groupPosts.get(params.groupId) ?? [];
    const post = posts.find(p => p.id === params.postId);
    if (!post) return { reacted: false };
    post.reactions[params.reaction] = (post.reactions[params.reaction] ?? 0) + 1;
    return { reacted: true };
  }

  async groupsComment(params: { groupId: string; postId: string; content: string }): Promise<GroupComment> {
    const comment: GroupComment = {
      id: generateId('cmt'),
      postId: params.postId,
      authorId: this.nodeId,
      authorDisplayName: this.profile?.displayName ?? 'Me',
      content: params.content,
      timestamp: now(),
    };
    const comments = this.postComments.get(params.postId) ?? [];
    comments.push(comment);
    this.postComments.set(params.postId, comments);
    // Update post comment count
    const posts = this.groupPosts.get(params.groupId) ?? [];
    const post = posts.find(p => p.id === params.postId);
    if (post) post.commentCount++;
    return comment;
  }

  async groupsComments(params: { groupId: string; postId: string }): Promise<GroupComment[]> {
    return this.postComments.get(params.postId) ?? [];
  }

  async feedGet(params: { limit?: number }): Promise<FeedItem[]> {
    return this.feedItems.slice(-(params.limit ?? 50));
  }

  async feedMarkRead(params: { itemIds: string[] }): Promise<{ marked: number }> {
    let count = 0;
    for (const item of this.feedItems) {
      if (params.itemIds.includes(item.id)) {
        item.read = true;
        count++;
      }
    }
    return { marked: count };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 4: Coherence Network
  // ═══════════════════════════════════════════════════════════════════════

  async coherenceSubmitClaim(params: { statement: string }): Promise<Claim> {
    const claim: Claim = {
      id: generateId('claim'),
      statement: params.statement,
      authorId: this.nodeId,
      authorDisplayName: this.profile?.displayName,
      status: 'OPEN',
      verificationCount: 0,
      consensusScore: 0,
      timestamp: now(),
      edges: [],
    };
    this.claims.set(claim.id, claim);
    // Create a verification task
    const task: VerificationTask = {
      id: generateId('task'),
      claimId: claim.id,
      claimStatement: claim.statement,
      type: 'VERIFY',
      status: 'OPEN',
      reward: 10,
      createdAt: now(),
    };
    this.verificationTasks.set(task.id, task);
    await this.bridge.put(`coherence/claims/${claim.id}`, claim);
    this.emit('aleph:coherenceTask', task);
    return claim;
  }

  async coherenceVerifyClaim(params: VerifyClaimOptions): Promise<{ verified: boolean }> {
    const claim = this.claims.get(params.claimId);
    if (!claim) return { verified: false };
    claim.verificationCount++;
    if (params.result === 'VERIFIED') {
      claim.consensusScore = Math.min(1, claim.consensusScore + 0.2);
      if (claim.consensusScore >= 0.8) claim.status = 'VERIFIED';
    } else {
      claim.consensusScore = Math.max(0, claim.consensusScore - 0.2);
      if (claim.consensusScore <= 0.2) claim.status = 'REFUTED';
    }
    return { verified: true };
  }

  async coherenceGetClaimByStatement(statement: string): Promise<Claim | undefined> {
    for (const claim of this.claims.values()) {
      if (claim.statement === statement) return claim;
    }
    return undefined;
  }

  async coherenceListTasks(params: { type?: string; status?: string }): Promise<VerificationTask[]> {
    return [...this.verificationTasks.values()].filter(t => {
      if (params.type && t.type !== params.type) return false;
      if (params.status && t.status !== params.status) return false;
      return true;
    });
  }

  async coherenceClaimTask(params: { taskId: string }): Promise<{ claimed: boolean }> {
    const task = this.verificationTasks.get(params.taskId);
    if (!task || task.status !== 'OPEN') return { claimed: false };
    task.status = 'CLAIMED';
    task.assignedTo = this.nodeId;
    return { claimed: true };
  }

  async coherenceCreateEdge(params: { fromClaimId: string; toClaimId: string; edgeType: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES' }): Promise<CoherenceEdge> {
    const edge: CoherenceEdge = {
      id: generateId('edge'),
      fromClaimId: params.fromClaimId,
      toClaimId: params.toClaimId,
      edgeType: params.edgeType,
      authorId: this.nodeId,
      timestamp: now(),
    };
    this.edges.set(edge.id, edge);
    // Attach to claims
    const fromClaim = this.claims.get(params.fromClaimId);
    if (fromClaim) fromClaim.edges = [...(fromClaim.edges ?? []), edge];
    return edge;
  }

  async coherenceCreateSynthesis(params: { title: string; acceptedClaimIds: string[] }): Promise<Synthesis> {
    const synth: Synthesis = {
      id: generateId('synth'),
      title: params.title,
      acceptedClaimIds: params.acceptedClaimIds,
      authorId: this.nodeId,
      status: 'DRAFT',
      timestamp: now(),
    };
    this.syntheses.set(synth.id, synth);
    return synth;
  }

  async coherenceSecurityReview(_params: { synthesisId: string }): Promise<{ requestId: string }> {
    return { requestId: generateId('review') };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 5: Agent Management (SRIA)
  // ═══════════════════════════════════════════════════════════════════════

  async agentCreate(params: { name: string; templateId?: string }): Promise<SRIAAgent> {
    const agent: SRIAAgent = {
      id: generateId('agent'),
      name: params.name,
      templateId: params.templateId,
      status: 'idle',
      goalPriors: { accuracy: 0.8, speed: 0.5 },
      beliefs: [],
      createdAt: now(),
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async agentList(params: { name?: string }): Promise<SRIAAgent[]> {
    let list = [...this.agents.values()];
    if (params.name) {
      list = list.filter(a => a.name.toLowerCase().includes(params.name!.toLowerCase()));
    }
    return list;
  }

  async agentGet(params: { agentId: string }): Promise<SRIAAgent> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    return agent;
  }

  async agentUpdate(params: { agentId: string; goalPriors?: Record<string, number> }): Promise<SRIAAgent> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    if (params.goalPriors) agent.goalPriors = { ...agent.goalPriors, ...params.goalPriors };
    return agent;
  }

  async agentDelete(params: { agentId: string }): Promise<{ deleted: boolean }> {
    this.agents.delete(params.agentId);
    this.agentRuns.delete(params.agentId);
    return { deleted: true };
  }

  async agentSummon(params: { agentId: string; context?: string }): Promise<AgentSession> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    agent.status = 'active';
    const session: AgentSession = {
      sessionId: generateId('sess'),
      agentId: params.agentId,
      startedAt: now(),
      initialBeliefs: agent.beliefs,
    };
    agent.sessionId = session.sessionId;
    return session;
  }

  async agentStep(params: { agentId: string; observation: string }): Promise<AgentStepResult> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    const result: AgentStepResult = {
      agentId: params.agentId,
      action: `respond_to("${params.observation.substring(0, 30)}...")`,
      freeEnergy: Math.random() * 0.5,
      learningUpdates: ['Updated belief model'],
      beliefs: agent.beliefs,
      timestamp: now(),
    };
    this.emit('aleph:agentStep', result);
    return result;
  }

  async agentDismiss(params: { agentId: string }): Promise<{ beaconFingerprint: string }> {
    const agent = this.agents.get(params.agentId);
    if (agent) {
      agent.status = 'dismissed';
      agent.sessionId = undefined;
    }
    return { beaconFingerprint: generateId('beacon') };
  }

  async agentRun(params: { agentId: string; maxSteps?: number }): Promise<AgentRunHandle> {
    const handle: AgentRunHandle = {
      runId: generateId('run'),
      agentId: params.agentId,
      status: 'running',
      steps: 0,
      maxSteps: params.maxSteps ?? 100,
    };
    this.agentRuns.set(params.agentId, handle);
    return handle;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 5.5: Agent Teams
  // ═══════════════════════════════════════════════════════════════════════

  async teamCreate(params: { name: string; agentIds: string[] }): Promise<AgentTeam> {
    const team: AgentTeam = {
      id: generateId('team'),
      name: params.name,
      agentIds: params.agentIds,
      createdAt: now(),
    };
    this.teams.set(team.id, team);
    return team;
  }

  async teamList(): Promise<AgentTeam[]> {
    return [...this.teams.values()];
  }

  async teamGet(params: { teamId: string }): Promise<AgentTeam> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    return team;
  }

  async teamAddAgent(params: { teamId: string; agentId: string }): Promise<AgentTeam> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    if (!team.agentIds.includes(params.agentId)) team.agentIds.push(params.agentId);
    return team;
  }

  async teamRemoveAgent(params: { teamId: string; agentId: string }): Promise<AgentTeam> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    team.agentIds = team.agentIds.filter(id => id !== params.agentId);
    return team;
  }

  async teamSummon(params: { teamId: string }): Promise<{ summoned: boolean }> {
    const team = this.teams.get(params.teamId);
    if (!team) return { summoned: false };
    for (const agentId of team.agentIds) {
      await this.agentSummon({ agentId });
    }
    return { summoned: true };
  }

  async teamStep(params: { teamId: string; observation: string }): Promise<CollectiveStepResult> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    const agentResults: AgentStepResult[] = [];
    for (const agentId of team.agentIds) {
      try {
        const result = await this.agentStep({ agentId, observation: params.observation });
        agentResults.push(result);
      } catch { /* agent may not exist */ }
    }
    const result: CollectiveStepResult = {
      teamId: params.teamId,
      collectiveFreeEnergy: agentResults.reduce((sum, r) => sum + r.freeEnergy, 0) / Math.max(1, agentResults.length),
      sharedBeliefs: [],
      phaseAlignment: 0.7 + Math.random() * 0.3,
      agentResults,
      timestamp: now(),
    };
    this.emit('aleph:teamStep', result);
    return result;
  }

  async teamDismiss(params: { teamId: string }): Promise<{ dismissed: boolean }> {
    const team = this.teams.get(params.teamId);
    if (!team) return { dismissed: false };
    for (const agentId of team.agentIds) {
      await this.agentDismiss({ agentId });
    }
    return { dismissed: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 6: Wallet & Economics
  // ═══════════════════════════════════════════════════════════════════════

  async walletBalance(): Promise<WalletBalance> {
    return { ...this.walletState };
  }

  async walletSend(params: { userId: string; amount: number; memo?: string }): Promise<Transaction> {
    if (this.walletState.balance < params.amount) throw new Error('Insufficient balance');
    this.walletState.balance -= params.amount;
    const tx: Transaction = {
      id: generateId('tx'),
      type: 'transfer',
      amount: params.amount,
      from: this.nodeId,
      to: params.userId,
      memo: params.memo,
      timestamp: now(),
    };
    this.transactions.push(tx);
    this.emit('aleph:walletTransaction', tx);
    return tx;
  }

  async walletStake(params: { amount: number; lockDays: number }): Promise<StakeInfo> {
    if (this.walletState.balance < params.amount) throw new Error('Insufficient balance');
    this.walletState.balance -= params.amount;
    this.walletState.staked += params.amount;
    // Determine tier
    if (this.walletState.staked >= 10000) this.walletState.tier = 'Archon';
    else if (this.walletState.staked >= 1000) this.walletState.tier = 'Magus';
    else if (this.walletState.staked >= 100) this.walletState.tier = 'Adept';
    else this.walletState.tier = 'Neophyte';
    const tx: Transaction = { id: generateId('tx'), type: 'stake', amount: params.amount, timestamp: now() };
    this.transactions.push(tx);
    return {
      amount: params.amount,
      lockDays: params.lockDays,
      unlockDate: now() + params.lockDays * 86400000,
      currentTier: this.walletState.tier,
    };
  }

  async walletUnstake(params: { amount: number }): Promise<Transaction> {
    if (this.walletState.staked < params.amount) throw new Error('Insufficient staked amount');
    this.walletState.staked -= params.amount;
    this.walletState.balance += params.amount;
    // Recalculate tier
    if (this.walletState.staked >= 10000) this.walletState.tier = 'Archon';
    else if (this.walletState.staked >= 1000) this.walletState.tier = 'Magus';
    else if (this.walletState.staked >= 100) this.walletState.tier = 'Adept';
    else this.walletState.tier = 'Neophyte';
    const tx: Transaction = { id: generateId('tx'), type: 'unstake', amount: params.amount, timestamp: now() };
    this.transactions.push(tx);
    return tx;
  }

  async walletHistory(params: { limit?: number; type?: string }): Promise<Transaction[]> {
    let list = [...this.transactions];
    if (params.type) list = list.filter(t => t.type === params.type);
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list.slice(0, params.limit ?? 20);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Tier 6.5: Domains
  // ═══════════════════════════════════════════════════════════════════════

  async domainRegister(params: { handle: string; name: string; description: string; visibility: DomainVisibility; rules?: Partial<DomainRules> }): Promise<DomainDefinition> {
    return this.domainManager.registerDomain(params.handle, params.name, params.description, params.visibility, params.rules);
  }

  async domainGet(params: { domainId?: string; handle?: string }): Promise<DomainDefinition> {
    if (params.domainId) {
      const domain = await this.domainManager.getDomain(params.domainId);
      if (!domain) throw new Error("Domain not found");
      return domain;
    }
    if (params.handle) {
      const domain = await this.domainManager.getDomainByHandle(params.handle);
      if (!domain) throw new Error("Domain not found");
      return domain;
    }
    throw new Error("Either domainId or handle must be provided");
  }

  async domainList(params: { limit?: number }): Promise<DomainDefinition[]> {
    return this.domainManager.listDomains(params.limit);
  }

  async domainJoin(params: { domainId: string }): Promise<{ status: any }> {
    return this.domainManager.joinDomain(params.domainId);
  }

  async domainLeave(params: { domainId: string }): Promise<{ left: boolean }> {
    return { left: await this.domainManager.leaveDomain(params.domainId) };
  }

  async domainMembers(params: { domainId: string; limit?: number }): Promise<DomainMembership[]> {
    return this.domainManager.getMembers(params.domainId, params.limit);
  }

  async domainUpdateRules(_params: { domainId: string; rules: Partial<DomainRules> }): Promise<DomainDefinition> {
    // TODO: Implement update rules in DomainManager
    throw new Error("Not implemented");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Content Store
  // ═══════════════════════════════════════════════════════════════════════

  async contentStoreData(params: { data: string; visibility: 'public' | 'private' }): Promise<StoredContent> {
    const hash = 'Qm' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    const content: StoredContent = {
      hash,
      data: params.data,
      visibility: params.visibility,
      size: params.data.length,
      createdAt: now(),
    };
    this.contentStore.set(hash, content);
    return content;
  }

  async contentRetrieve(params: { hash: string }): Promise<StoredContent> {
    const content = this.contentStore.get(params.hash);
    if (!content) throw new Error(`Content ${params.hash} not found`);
    return content;
  }

  async contentList(params: { visibility?: string; limit?: number }): Promise<ContentListItem[]> {
    let list = [...this.contentStore.values()];
    if (params.visibility) list = list.filter(c => c.visibility === params.visibility);
    return list.slice(0, params.limit ?? 20).map(({ hash, visibility, size, createdAt }) => ({ hash, visibility, size, createdAt }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Identity (extended)
  // ═══════════════════════════════════════════════════════════════════════

  async identitySign(_params: { message: string }): Promise<{ signature: string }> {
    return { signature: 'sig_' + Math.random().toString(36).slice(2, 20) };
  }

  async identityVerify(params: { message: string; signature: string; publicKey: string }): Promise<{ valid: boolean }> {
    return { valid: params.signature.startsWith('sig_') };
  }

  async identityExport(): Promise<{ publicKey: string; fingerprint: string; resonance: number[] }> {
    return {
      publicKey: 'pk_' + this.nodeId,
      fingerprint: this.nodeId.substring(0, 16),
      resonance: Array.from({ length: 16 }, () => Math.random()),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Marketplace
  // ═══════════════════════════════════════════════════════════════════════

  async marketplacePublish(params: { manifest: Omit<PluginRegistryEntry, 'authorId'|'createdAt'|'updatedAt'> }): Promise<{ success: boolean; entry: PluginRegistryEntry }> {
    const MARKETPLACE_FIELD_ID = 'global-marketplace-registry';
    
    if (this.walletState.balance < params.manifest.bondAmount) {
        throw new Error(`Insufficient balance for bond. Required: ${params.manifest.bondAmount}, Available: ${this.walletState.balance}`);
    }

    await this.walletStake({ amount: params.manifest.bondAmount, lockDays: 30 });

    const entry: PluginRegistryEntry = {
        ...params.manifest,
        authorId: this.nodeId,
        createdAt: now(),
        updatedAt: now()
    };

    if (!this.memoryFields.has(MARKETPLACE_FIELD_ID)) {
        await this.memoryCreate({ 
            name: 'Marketplace Registry', 
            scope: 'global', 
            visibility: 'public', 
            description: 'Registry of published plugins' 
        });
        // Find the created field and rename ID (hack for MVP)
        for (const [id, f] of this.memoryFields) {
            if (f.name === 'Marketplace Registry' && f.id !== MARKETPLACE_FIELD_ID) {
                this.memoryFields.delete(id);
                f.id = MARKETPLACE_FIELD_ID;
                this.memoryFields.set(MARKETPLACE_FIELD_ID, f);
                this.memoryFragments.set(MARKETPLACE_FIELD_ID, []);
                break;
            }
        }
    }

    await this.memoryStore({
        fieldId: MARKETPLACE_FIELD_ID,
        content: JSON.stringify(entry),
        metadata: { type: 'plugin-manifest', pluginId: entry.id }
    });

    return { success: true, entry };
  }

  async marketplaceList(params: { query?: string; tag?: string }): Promise<PluginRegistryEntry[]> {
    const MARKETPLACE_FIELD_ID = 'global-marketplace-registry';
    const frags = this.memoryFragments.get(MARKETPLACE_FIELD_ID) ?? [];
    
    let entries = frags
        .filter(f => f.metadata.type === 'plugin-manifest')
        .map(f => {
            try { return JSON.parse(f.content) as PluginRegistryEntry; }
            catch { return null; }
        })
        .filter((e): e is PluginRegistryEntry => e !== null);

    if (params.query) {
        const q = params.query.toLowerCase();
        entries = entries.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    if (params.tag) {
        entries = entries.filter(e => e.tags.includes(params.tag!));
    }

    return entries;
  }

  async marketplaceInstall(params: { pluginId: string }): Promise<{ success: boolean; license?: PluginLicense }> {
    const entries = await this.marketplaceList({});
    const plugin = entries.find(e => e.id === params.pluginId);
    if (!plugin) throw new Error('Plugin not found');

    if (plugin.pricing.type === 'free') {
        const license: PluginLicense = {
            pluginId: plugin.id,
            userId: this.nodeId,
            type: 'perpetual',
            status: 'active',
            purchasedAt: now(),
            transactionId: 'free-' + generateId()
        };
        return { success: true, license };
    } else {
        if (this.walletState.balance < plugin.pricing.amount) {
            throw new Error('Insufficient balance');
        }
        
        const tx = await this.walletSend({ 
            userId: plugin.authorId, 
            amount: plugin.pricing.amount, 
            memo: `License for ${plugin.id}` 
        });

        const license: PluginLicense = {
            pluginId: plugin.id,
            userId: this.nodeId,
            type: plugin.pricing.type === 'subscription' ? 'subscription' : 'perpetual',
            status: 'active',
            purchasedAt: now(),
            transactionId: tx.id
        };
        
        return { success: true, license };
    }
  }

  async marketplaceLicense(_params: { pluginId: string }): Promise<PluginLicense | null> {
      return null; 
  }

  // ═══════════════════════════════════════════════════════════════════════
  // File System
  // ═══════════════════════════════════════════════════════════════════════

  async fsList(params: { path: string }): Promise<FileSystemItem[]> {
    try {
      const entries = await fs.readdir(params.path, { withFileTypes: true });
      return Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(params.path, entry.name);
        let size = 0;
        let lastModified = 0;
        try {
          const stats = await fs.stat(fullPath);
          size = stats.size;
          lastModified = stats.mtimeMs;
        } catch (e) {
          // Ignore stat errors (e.g. permission denied)
        }
        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size,
          lastModified
        };
      }));
    } catch (error) {
      console.error(`fsList error for ${params.path}:`, error);
      throw error;
    }
  }

  async fsRead(params: { path: string }): Promise<string> {
    return fs.readFile(params.path, 'utf-8');
  }

  async fsWrite(params: { path: string; content: string }): Promise<{ success: boolean }> {
    await fs.writeFile(params.path, params.content, 'utf-8');
    return { success: true };
  }

  async fsHome(): Promise<string> {
    return app.getPath('home');
  }
}
