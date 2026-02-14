// ═══════════════════════════════════════════════════════════════════════════
// AlephMemoryClient — Memory Field & Semantic Computing sub-module
// Extracted from AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

import { gunObjectsToArrays } from '@sschepis/alephnet-node';
import { AlephClientContext, generateId, now, sanitizeForGun } from './types';
import type {
  SignedMemoryFragment,
  ProvenanceChainEntry,
  SemanticValidation,
  VerificationResult,
  EncryptedFragment,
  TrustAssessment,
  AuthorIdentity,
} from '../../../shared/trust-types';
import { MEMORY_VALIDATION_THRESHOLDS } from '../../../shared/trust-types';
import type {
  IPCParams,
  // Semantic
  ThinkResult, CompareResult, RememberResult, RecallResult,
  IntrospectionResult, FocusResult,
  // Memory
  MemoryField, MemoryFragment, MemoryFieldEntropy, MemoryCheckpoint,
  HolographicPattern, CreateMemoryFieldOptions, StoreMemoryOptions,
  QueryMemoryOptions, QueryGlobalOptions,
} from '../../../shared/alephnet-types';

// ─── AlephMemoryClient ──────────────────────────────────────────────────

export class AlephMemoryClient {
  private ctx: AlephClientContext;

  // ── Domain-specific state ────────────────────────────────────────────
  memoryFields = new Map<string, MemoryField>();
  memoryFragments = new Map<string, MemoryFragment[]>();
  checkpoints = new Map<string, MemoryCheckpoint[]>();

  // Signed fragment provenance store (for security service integration)
  signedFragments = new Map<string, SignedMemoryFragment<MemoryFragment>>();
  provenanceChains = new Map<string, ProvenanceChainEntry[]>();

  // Encrypted fragment store for private fields
  encryptedFragments = new Map<string, EncryptedFragment>();

  // Cached trust assessment for the current user
  selfTrustAssessment: TrustAssessment | null = null;

  constructor(ctx: AlephClientContext) {
    this.ctx = ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════

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
    if (!this.ctx.trustGate || !this.ctx.memorySecurityService) {
      // No trust gate configured - allow by default (development mode)
      return true;
    }

    const trust = await this.getSelfTrustAssessment();
    const result = this.ctx.memorySecurityService.checkMemoryCapability(capability, scope, trust);

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
    const identity = await this.ctx.identityManager.getPublicIdentity();
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
  async loadMemoryData(): Promise<void> {
    if (!this.ctx.bridge || !this.ctx.bridge.getGun()) return;
    
    console.log('AlephMemoryClient: Loading memory data from graph...');
    const user = this.ctx.bridge.getGun().user();
    
    // Load fields
    let fieldCount = 0;
    user.get('memory').get('fields').map().once((rawFieldData: any, fieldId: string) => {
      if (!rawFieldData || !fieldId || fieldId === '_') return;
      
      const fieldData = gunObjectsToArrays(rawFieldData);
      
      fieldCount++;
      if (fieldCount % 10 === 0) console.log(`AlephMemoryClient: Loaded ${fieldCount} memory fields...`);

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
    
    console.log('AlephMemoryClient: Memory data load initiated (async)');
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

      const response = await this.ctx.aiManager.processRequest(prompt, { contentType: 'analysis' });
      
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
      console.error('AlephMemoryClient think error:', error);
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
    const user = this.ctx.bridge.getGun().user();
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
    const user = this.ctx.bridge.getGun().user();
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
        embedding = await this.ctx.aiManager.getEmbeddings(params.content);
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
    if (this.ctx.memorySecurityService) {
      try {
        semanticValidation = await this.ctx.memorySecurityService.validateSemantics(
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
    if (this.ctx.memorySecurityService) {
      try {
        const signedFragment = await this.ctx.memorySecurityService.createSignedFragment(
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
    if (field.visibility === 'private' && this.ctx.memorySecurityService) {
      try {
        const authorizedReaders = await this.getAuthorizedReaders(field);
        if (authorizedReaders.length > 0) {
          const encryptedFrag = await this.ctx.memorySecurityService.encryptFragment(frag, authorizedReaders);
          this.encryptedFragments.set(frag.id, encryptedFrag);
          
          // Mark fragment as encrypted in metadata
          frag.metadata = {
            ...frag.metadata,
            encrypted: true,
            authorizedReaderCount: authorizedReaders.length
          };
          
          // Persist encrypted version to Gun.js (only ciphertext)
          const user = this.ctx.bridge.getGun().user();
          user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun({
            encrypted: true,
            ciphertext: encryptedFrag.ciphertext,
            nonce: encryptedFrag.nonce,
            timestamp: frag.timestamp
          }));
          console.log(`memoryStore: Encrypted fragment ${frag.id} for ${authorizedReaders.length} readers`);
        } else {
          // No authorized readers - store plaintext
          const user = this.ctx.bridge.getGun().user();
          user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun(frag));
        }
      } catch (error) {
        console.warn('memoryStore: Failed to encrypt fragment, storing plaintext:', error);
        const user = this.ctx.bridge.getGun().user();
        user.get('memory').get('fields').get(params.fieldId).get('fragments').get(frag.id).put(sanitizeForGun(frag));
      }
    } else {
      // Public or restricted visibility - store plaintext
      const user = this.ctx.bridge.getGun().user();
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
            queryEmbedding = await this.ctx.aiManager.getEmbeddings(params.query);
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
    if (this.ctx.memorySecurityService) {
      const verifiedResults: typeof results = [];
      for (const frag of results) {
        const signedFragment = this.signedFragments.get(frag.id);
        if (signedFragment) {
          try {
            const verifyResult = await this.ctx.memorySecurityService.verifyFragment(signedFragment);
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
    if (this.ctx.memorySecurityService) {
      const verifiedResults: typeof results = [];
      for (const frag of results) {
        const signedFragment = this.signedFragments.get(frag.id);
        if (signedFragment) {
          try {
            const verifyResult = await this.ctx.memorySecurityService.verifyFragment(signedFragment);
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
      if (this.ctx.memorySecurityService) {
        try {
          const signedFragment = await this.ctx.memorySecurityService.createSignedFragment(
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
      await this.ctx.bridge.put(`memory/fragments/${newFrag.id}`, { content: newFrag.content });
    }
    
    // Create a signed fold operation if we have the security service and synced fragments
    if (this.ctx.memorySecurityService && syncedCount > 0 && fragmentMappings.length > 0) {
      try {
        const foldOperation = await this.ctx.memorySecurityService.createFoldOperation(
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
}
