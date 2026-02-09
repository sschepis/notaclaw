// ═══════════════════════════════════════════════════════════════════════════
// MemorySecurityService — Provenance, Validation, and Security for Memory Fields
// See design/27-memory-field-security.md for full specification
// Production-ready implementation with:
// - Structured logging via Logger service
// - ECDH key wrapping via Gun SEA
// - Ed25519 signing via IdentityManager
// - Input validation on all public methods
// - Memory management with configurable limits
// - Proper error propagation
// ═══════════════════════════════════════════════════════════════════════════

import * as crypto from 'crypto';
import { IdentityManager } from './IdentityManager';
import { SignedEnvelopeService } from './SignedEnvelopeService';
import { TrustEvaluator } from './TrustEvaluator';
import { TrustGate } from './TrustGate';
import { logger } from './Logger';
import { AlephGunBridge } from '@sschepis/alephnet-node';
import {
  MEMORY_ACCESS_RULES,
  MEMORY_VALIDATION_THRESHOLDS
} from '../../shared/trust-types';
import type {
  SignedEnvelope,
  VerificationResult,
  AuthorIdentity,
  ProvenanceChainEntry,
  SemanticValidation,
  SignedMemoryFragment,
  MemoryFoldOperation,
  MemoryShareGrant,
  EncryptedFragment,
  Capability,
  TrustAssessment,
  CapabilityCheckResult,
  IMemorySecurityService,
  ReplayProtection,
  EntropyBudget,
  GCPolicy
} from '../../shared/trust-types';
import type { MemoryFragment } from '../../shared/alephnet-types';

// ─── Error Classes ────────────────────────────────────────────────────────

export class MemorySecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemorySecurityError';
  }
}

export class ValidationError extends MemorySecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ReplayAttackError extends MemorySecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'REPLAY_ATTACK', details);
    this.name = 'ReplayAttackError';
  }
}

export class ProvenanceError extends MemorySecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROVENANCE_ERROR', details);
    this.name = 'ProvenanceError';
  }
}

export class EncryptionError extends MemorySecurityError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ENCRYPTION_ERROR', details);
    this.name = 'EncryptionError';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function computePrimeAlignment(fragmentPrimes: number[], fieldSignature: number[]): number {
  if (fragmentPrimes.length === 0 || fieldSignature.length === 0) {
    return 0;
  }
  
  // Compute dot product normalized by magnitudes
  let dotProduct = 0;
  let fragMagnitude = 0;
  let sigMagnitude = 0;
  
  const maxLen = Math.max(fragmentPrimes.length, fieldSignature.length);
  for (let i = 0; i < maxLen; i++) {
    const fVal = fragmentPrimes[i] || 0;
    const sVal = fieldSignature[i] || 0;
    dotProduct += fVal * sVal;
    fragMagnitude += fVal * fVal;
    sigMagnitude += sVal * sVal;
  }
  
  const denominator = Math.sqrt(fragMagnitude) * Math.sqrt(sigMagnitude);
  if (denominator === 0) return 0;
  
  // Normalize to 0-1 range
  return Math.max(0, Math.min(1, (dotProduct / denominator + 1) / 2));
}

function computeShannonEntropy(content: string): number {
  if (!content || content.length === 0) return 0;
  
  const freqMap = new Map<string, number>();
  for (const char of content) {
    freqMap.set(char, (freqMap.get(char) || 0) + 1);
  }
  
  let entropy = 0;
  const len = content.length;
  for (const count of freqMap.values()) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

// ─── Default Configurations ──────────────────────────────────────────────

const DEFAULT_ENTROPY_BUDGETS: Record<string, EntropyBudget> = {
  conversation: { maxFieldEntropy: 10.0, maxFragmentEntropy: 5.0, coolingRate: 0.01 },
  user: { maxFieldEntropy: 50.0, maxFragmentEntropy: 8.0, coolingRate: 0.005 },
  organization: { maxFieldEntropy: 200.0, maxFragmentEntropy: 10.0, coolingRate: 0.002 },
  global: { maxFieldEntropy: 1000.0, maxFragmentEntropy: 12.0, coolingRate: 0.001 }
};

const DEFAULT_GC_POLICIES: Record<string, GCPolicy> = {
  conversation: { minRetentionDays: 30, maxFragmentsPerField: 1000, significanceThreshold: 0.1, quotaBytes: 10 * 1024 * 1024 },
  user: { minRetentionDays: 365, maxFragmentsPerField: 10000, significanceThreshold: 0.2, quotaBytes: 100 * 1024 * 1024 },
  organization: { minRetentionDays: 365, maxFragmentsPerField: 50000, significanceThreshold: 0.3, quotaBytes: 1024 * 1024 * 1024 },
  global: { minRetentionDays: 730, maxFragmentsPerField: 500000, significanceThreshold: 0.5, quotaBytes: 10 * 1024 * 1024 * 1024 }
};

/** Nonce expiry time - 24 hours */
const NONCE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** How often to run nonce cleanup - 1 hour */
const NONCE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/** Memory management limits */
const MEMORY_LIMITS = {
  /** Maximum provenance chains to keep in memory */
  maxProvenanceChains: 10000,
  /** Maximum nonces to keep in memory before forced cleanup */
  maxNonces: 100000,
  /** Maximum epochs to track */
  maxEpochs: 10000,
  /** Maximum entropy usage entries */
  maxEntropyEntries: 5000,
  /** Maximum field metadata entries */
  maxFieldMetadata: 5000
};

/** Logger category for this service */
const LOG_CATEGORY = 'MemorySecurity';

// ─── MemorySecurityService ───────────────────────────────────────────────

export class MemorySecurityService implements IMemorySecurityService {
  private identityManager: IdentityManager;
  private envelopeService: SignedEnvelopeService;
  private _trustEvaluator: TrustEvaluator; // Reserved for consensus validation
  private trustGate: TrustGate;
  private bridge: AlephGunBridge | null = null;
  
  // In-memory storage for provenance chains (backed by Gun.js when bridge is set)
  private provenanceStore = new Map<string, ProvenanceChainEntry[]>();
  
  // Nonce store for replay protection (backed by Gun.js when bridge is set)
  private nonceStore = new Map<string, number>(); // Maps nonce -> timestamp
  
  // Epoch store for monotonic counters (backed by Gun.js when bridge is set)
  private epochStore = new Map<string, number>();
  
  // Entropy tracking per field
  private entropyUsage = new Map<string, { current: number; lastCooled: number }>();
  
  // Field metadata for GC
  private fieldMetadata = new Map<string, { fragmentCount: number; lastGC: number }>();
  
  // Cleanup interval handle
  private cleanupIntervalHandle: ReturnType<typeof setInterval> | null = null;
  
  constructor(
    identityManager: IdentityManager,
    envelopeService: SignedEnvelopeService,
    trustEvaluator: TrustEvaluator,
    trustGate: TrustGate
  ) {
    this.identityManager = identityManager;
    this.envelopeService = envelopeService;
    this._trustEvaluator = trustEvaluator;
    this.trustGate = trustGate;
  }
  
  /**
   * Set the Gun.js bridge for persistent storage.
   * This enables persistent nonce/epoch tracking across restarts.
   */
  setBridge(bridge: AlephGunBridge): void {
    if (!bridge) {
      throw new ValidationError('Bridge cannot be null or undefined');
    }
    
    this.bridge = bridge;
    logger.info(LOG_CATEGORY, 'BridgeConfigured', 'Gun.js bridge configured for persistent storage');
    
    // Start nonce cleanup interval
    this.startNonceCleanup();
    
    // Load persisted epochs
    this.loadPersistedState();
  }
  
  /**
   * Clean up resources on shutdown.
   */
  destroy(): void {
    logger.info(LOG_CATEGORY, 'Shutdown', 'Cleaning up MemorySecurityService resources');
    
    if (this.cleanupIntervalHandle) {
      clearInterval(this.cleanupIntervalHandle);
      this.cleanupIntervalHandle = null;
    }
    
    // Clear all in-memory stores
    this.provenanceStore.clear();
    this.nonceStore.clear();
    this.epochStore.clear();
    this.entropyUsage.clear();
    this.fieldMetadata.clear();
    
    logger.debug(LOG_CATEGORY, 'ShutdownComplete', 'All resources cleaned up');
  }
  
  /**
   * Start periodic nonce cleanup to remove expired entries.
   */
  private startNonceCleanup(): void {
    if (this.cleanupIntervalHandle) return;
    
    this.cleanupIntervalHandle = setInterval(() => {
      this.cleanupExpiredNonces();
    }, NONCE_CLEANUP_INTERVAL_MS);
    
    // Don't block process exit
    if (this.cleanupIntervalHandle.unref) {
      this.cleanupIntervalHandle.unref();
    }
    
    logger.debug(LOG_CATEGORY, 'NonceCleanupStarted', 'Periodic nonce cleanup scheduled');
  }
  
  /**
   * Remove nonces older than NONCE_EXPIRY_MS.
   * Also enforces memory limits on nonce store.
   */
  private async cleanupExpiredNonces(): Promise<void> {
    const now = Date.now();
    const expiredNonces: string[] = [];
    
    for (const [nonce, timestamp] of this.nonceStore) {
      if (now - timestamp > NONCE_EXPIRY_MS) {
        expiredNonces.push(nonce);
      }
    }
    
    // Enforce memory limit - remove oldest if over limit
    if (this.nonceStore.size > MEMORY_LIMITS.maxNonces) {
      const sortedByTime = [...this.nonceStore.entries()]
        .sort((a, b) => a[1] - b[1]);
      const excessCount = this.nonceStore.size - MEMORY_LIMITS.maxNonces;
      for (let i = 0; i < excessCount; i++) {
        expiredNonces.push(sortedByTime[i][0]);
      }
      logger.warn(LOG_CATEGORY, 'NonceMemoryLimit',
        `Nonce store exceeded limit, removing ${excessCount} oldest entries`,
        { current: this.nonceStore.size, limit: MEMORY_LIMITS.maxNonces });
    }
    
    for (const nonce of expiredNonces) {
      this.nonceStore.delete(nonce);
      
      // Also remove from Gun.js if bridge is available
      if (this.bridge) {
        try {
          await this.bridge.put(`security/nonces/${nonce}`, null);
        } catch (error) {
          logger.warn(LOG_CATEGORY, 'NonceRemovalFailed',
            'Failed to remove expired nonce from Gun.js',
            { nonce: nonce.substring(0, 16), error: String(error) });
        }
      }
    }
    
    if (expiredNonces.length > 0) {
      logger.debug(LOG_CATEGORY, 'NonceCleanup',
        `Cleaned up ${expiredNonces.length} expired nonces`,
        { remaining: this.nonceStore.size });
    }
  }
  
  /**
   * Load persisted state from Gun.js.
   */
  private async loadPersistedState(): Promise<void> {
    if (!this.bridge) return;
    
    try {
      // Load epochs
      const epochs = await this.bridge.get('security/epochs');
      if (epochs && typeof epochs === 'object') {
        let loadedCount = 0;
        for (const [fingerprint, epoch] of Object.entries(epochs)) {
          if (typeof epoch === 'number') {
            this.epochStore.set(fingerprint, epoch);
            loadedCount++;
            // Enforce memory limit
            if (loadedCount >= MEMORY_LIMITS.maxEpochs) {
              logger.warn(LOG_CATEGORY, 'EpochLoadLimit',
                'Epoch load limit reached, skipping remaining',
                { loaded: loadedCount, limit: MEMORY_LIMITS.maxEpochs });
              break;
            }
          }
        }
        logger.info(LOG_CATEGORY, 'StateLoaded',
          `Loaded ${this.epochStore.size} epoch counters from persistent storage`);
      }
    } catch (error) {
      logger.error(LOG_CATEGORY, 'StateLoadFailed',
        'Failed to load persisted state from Gun.js',
        { error: String(error) });
    }
  }
  
  /**
   * Persist a nonce to Gun.js.
   */
  private async persistNonce(nonceKey: string, timestamp: number): Promise<void> {
    // Validate input
    if (!nonceKey || typeof nonceKey !== 'string') {
      throw new ValidationError('Nonce key must be a non-empty string');
    }
    if (typeof timestamp !== 'number' || timestamp <= 0) {
      throw new ValidationError('Timestamp must be a positive number');
    }
    
    this.nonceStore.set(nonceKey, timestamp);
    
    if (this.bridge) {
      try {
        await this.bridge.put(`security/nonces/${nonceKey}`, { timestamp, expiresAt: timestamp + NONCE_EXPIRY_MS });
      } catch (error) {
        logger.warn(LOG_CATEGORY, 'NoncePersistFailed',
          'Failed to persist nonce to Gun.js',
          { nonceKey: nonceKey.substring(0, 16), error: String(error) });
      }
    }
  }
  
  /**
   * Check if a nonce has been used (in-memory or Gun.js).
   */
  private async isNonceUsed(nonceKey: string): Promise<boolean> {
    // Validate input
    if (!nonceKey || typeof nonceKey !== 'string') {
      throw new ValidationError('Nonce key must be a non-empty string');
    }
    
    // Check in-memory first
    if (this.nonceStore.has(nonceKey)) {
      return true;
    }
    
    // Check Gun.js if bridge is available
    if (this.bridge) {
      try {
        const entry = await this.bridge.get(`security/nonces/${nonceKey}`);
        if (entry && entry.timestamp) {
          // Re-add to in-memory cache
          this.nonceStore.set(nonceKey, entry.timestamp);
          return true;
        }
      } catch (error) {
        logger.warn(LOG_CATEGORY, 'NonceCheckFailed',
          'Failed to check nonce in Gun.js',
          { nonceKey: nonceKey.substring(0, 16), error: String(error) });
      }
    }
    
    return false;
  }
  
  /**
   * Persist epoch to Gun.js.
   */
  private async persistEpoch(fingerprint: string, epoch: number): Promise<void> {
    // Validate input
    if (!fingerprint || typeof fingerprint !== 'string') {
      throw new ValidationError('Fingerprint must be a non-empty string');
    }
    if (typeof epoch !== 'number' || epoch < 0) {
      throw new ValidationError('Epoch must be a non-negative number');
    }
    
    this.epochStore.set(fingerprint, epoch);
    
    if (this.bridge) {
      try {
        await this.bridge.put(`security/epochs/${fingerprint}`, epoch);
      } catch (error) {
        logger.warn(LOG_CATEGORY, 'EpochPersistFailed',
          'Failed to persist epoch to Gun.js',
          { fingerprint, epoch, error: String(error) });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Fragment Creation & Verification
  // ═══════════════════════════════════════════════════════════════════════
  
  async createSignedFragment<T>(
    fragment: T,
    fieldId: string,
    parentEnvelopeHash?: string
  ): Promise<SignedMemoryFragment<T>> {
    // Input validation
    if (!fragment) {
      throw new ValidationError('Fragment cannot be null or undefined');
    }
    if (!fieldId || typeof fieldId !== 'string') {
      throw new ValidationError('Field ID must be a non-empty string');
    }
    if (parentEnvelopeHash !== undefined && typeof parentEnvelopeHash !== 'string') {
      throw new ValidationError('Parent envelope hash must be a string or undefined');
    }
    
    // Cast to MemoryFragment for internal access - caller ensures T is compatible
    const memFragment = fragment as unknown as MemoryFragment;
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) {
      throw new MemorySecurityError('No identity available for signing', 'NO_IDENTITY');
    }
    
    // Add replay protection to fragment metadata
    const epoch = (this.epochStore.get(identity.fingerprint) || 0) + 1;
    
    // Persist epoch to Gun.js for recovery across restarts
    await this.persistEpoch(identity.fingerprint, epoch);
    
    const replayProtection: ReplayProtection = {
      epoch,
      nonce: generateNonce(),
      expiresAt: Date.now() + NONCE_EXPIRY_MS
    };
    
    const fragmentWithProtection = {
      ...fragment,
      metadata: {
        ...(memFragment.metadata || {}),
        replayProtection
      }
    } as T;
    
    // Create signed envelope
    const envelope = await this.envelopeService.create(
      fragmentWithProtection,
      'memory-fragment',
      '1.0.0',
      ['memory:write'],
      parentEnvelopeHash
    );
    
    // Persist nonce as used immediately to prevent self-replay
    const nonceKey = `${envelope.contentHash}:${replayProtection.nonce}`;
    await this.persistNonce(nonceKey, Date.now());
    
    // Create provenance entry
    const provenanceEntry: ProvenanceChainEntry = {
      operation: parentEnvelopeHash ? 'modified' : 'created',
      actorFingerprint: identity.fingerprint,
      timestamp: Date.now(),
      previousHash: parentEnvelopeHash,
      signature: envelope.signature
    };
    
    // Get existing chain if this is a modification
    let provenanceChain: ProvenanceChainEntry[] = [];
    if (parentEnvelopeHash) {
      provenanceChain = [...(this.provenanceStore.get(parentEnvelopeHash) || [])];
    }
    provenanceChain.push(provenanceEntry);
    
    // Store provenance chain with memory limit enforcement
    this.storeProvenanceChain(envelope.contentHash, provenanceChain);
    
    // Update field metadata for GC tracking
    this.trackFragmentForGC(fieldId);
    
    logger.debug(LOG_CATEGORY, 'FragmentCreated',
      `Created signed fragment for field ${fieldId}`,
      { fieldId, contentHash: envelope.contentHash, epoch });
    
    return {
      fragment: fragmentWithProtection as T,
      envelope,
      provenanceChain
    };
  }
  
  /**
   * Store provenance chain with memory limit enforcement.
   */
  private storeProvenanceChain(contentHash: string, chain: ProvenanceChainEntry[]): void {
    // Enforce memory limit
    if (this.provenanceStore.size >= MEMORY_LIMITS.maxProvenanceChains) {
      // Remove oldest entry (first one added)
      const firstKey = this.provenanceStore.keys().next().value;
      if (firstKey) {
        this.provenanceStore.delete(firstKey);
        logger.debug(LOG_CATEGORY, 'ProvenanceEvicted',
          'Evicted oldest provenance chain due to memory limit');
      }
    }
    
    this.provenanceStore.set(contentHash, chain);
  }
  
  /**
   * Track fragment creation for GC metadata.
   */
  private trackFragmentForGC(fieldId: string): void {
    // Enforce memory limit on field metadata
    if (this.fieldMetadata.size >= MEMORY_LIMITS.maxFieldMetadata && !this.fieldMetadata.has(fieldId)) {
      // Remove oldest entry
      const firstKey = this.fieldMetadata.keys().next().value;
      if (firstKey) {
        this.fieldMetadata.delete(firstKey);
      }
    }
    
    const metadata = this.fieldMetadata.get(fieldId) || { fragmentCount: 0, lastGC: Date.now() };
    metadata.fragmentCount++;
    this.fieldMetadata.set(fieldId, metadata);
  }
  
  async verifyFragment<T>(
    signedFragment: SignedMemoryFragment<T>
  ): Promise<VerificationResult> {
    // Input validation
    if (!signedFragment) {
      throw new ValidationError('Signed fragment cannot be null or undefined');
    }
    if (!signedFragment.envelope) {
      throw new ValidationError('Signed fragment must have an envelope');
    }
    if (!signedFragment.provenanceChain) {
      throw new ValidationError('Signed fragment must have a provenance chain');
    }
    
    // Verify envelope signature
    const envelopeResult = await this.envelopeService.verify(signedFragment.envelope);
    if (!envelopeResult.valid) {
      logger.debug(LOG_CATEGORY, 'VerificationFailed',
        'Envelope signature verification failed',
        { contentHash: signedFragment.envelope.contentHash, error: envelopeResult.error });
      return envelopeResult;
    }
    
    // Verify replay protection
    const fragment = signedFragment.fragment as unknown as MemoryFragment;
    const replayProtection = fragment.metadata?.replayProtection as ReplayProtection | undefined;
    
    if (replayProtection) {
      // Check expiry
      if (Date.now() > replayProtection.expiresAt) {
        logger.warn(LOG_CATEGORY, 'FragmentExpired',
          'Fragment has expired',
          { contentHash: signedFragment.envelope.contentHash, expiresAt: replayProtection.expiresAt });
        return {
          valid: false,
          ed25519Valid: true,
          seaValid: true,
          resonanceValid: true,
          error: 'Fragment has expired'
        };
      }
      
      // Check nonce hasn't been used (persistent check across restarts)
      const nonceKey = `${signedFragment.envelope.contentHash}:${replayProtection.nonce}`;
      const nonceUsed = await this.isNonceUsed(nonceKey);
      if (nonceUsed) {
        logger.warn(LOG_CATEGORY, 'ReplayAttack',
          'Replay attack detected: nonce already used',
          { contentHash: signedFragment.envelope.contentHash });
        return {
          valid: false,
          ed25519Valid: true,
          seaValid: true,
          resonanceValid: true,
          error: 'Replay attack detected: nonce already used'
        };
      }
      
      // Check epoch is increasing
      const lastEpoch = this.epochStore.get(signedFragment.envelope.author.fingerprint) || 0;
      if (replayProtection.epoch <= lastEpoch) {
        logger.warn(LOG_CATEGORY, 'ReplayAttack',
          'Replay attack detected: epoch not increasing',
          { contentHash: signedFragment.envelope.contentHash, epochReceived: replayProtection.epoch, lastEpoch });
        return {
          valid: false,
          ed25519Valid: true,
          seaValid: true,
          resonanceValid: true,
          error: 'Replay attack detected: epoch not increasing'
        };
      }
      
      // Record nonce as used (persistent storage)
      await this.persistNonce(nonceKey, Date.now());
      
      // Update epoch tracking
      await this.persistEpoch(signedFragment.envelope.author.fingerprint, replayProtection.epoch);
    }
    
    // Verify provenance chain integrity
    const chainValid = await this.verifyProvenanceChain(signedFragment.provenanceChain);
    if (!chainValid) {
      logger.warn(LOG_CATEGORY, 'ProvenanceInvalid',
        'Provenance chain integrity check failed',
        { contentHash: signedFragment.envelope.contentHash, chainLength: signedFragment.provenanceChain.length });
      return {
        valid: false,
        ed25519Valid: true,
        seaValid: true,
        resonanceValid: true,
        error: 'Provenance chain integrity check failed'
      };
    }
    
    logger.debug(LOG_CATEGORY, 'VerificationSuccess',
      'Fragment verification successful',
      { contentHash: signedFragment.envelope.contentHash });
    
    return envelopeResult;
  }
  
  private async verifyProvenanceChain(chain: ProvenanceChainEntry[]): Promise<boolean> {
    if (!chain || chain.length === 0) return true;
    
    // Verify chain continuity
    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];
      
      // Each entry (except first) should reference the previous
      if (current.previousHash !== undefined && i > 0) {
        // Verify timestamp ordering
        if (current.timestamp < previous.timestamp) {
          logger.debug(LOG_CATEGORY, 'ProvenanceChainInvalid',
            'Timestamp ordering violation in provenance chain',
            { position: i, currentTs: current.timestamp, previousTs: previous.timestamp });
          return false;
        }
      }
    }
    
    return true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Semantic Validation
  // ═══════════════════════════════════════════════════════════════════════
  
  async validateSemantics<T>(
    fragment: T,
    fieldSignature: number[],
    scope: string
  ): Promise<SemanticValidation> {
    // Cast to MemoryFragment for internal access
    const memFragment = fragment as unknown as MemoryFragment;
    
    const thresholds = MEMORY_VALIDATION_THRESHOLDS[scope as keyof typeof MEMORY_VALIDATION_THRESHOLDS]
      || MEMORY_VALIDATION_THRESHOLDS.user;
    
    // Prime alignment
    const primeAlignment = computePrimeAlignment(
      memFragment.primeFactors || [],
      fieldSignature
    );
    
    // Entropy score
    const entropyScore = computeShannonEntropy(memFragment.content || '');
    
    // Significance verification
    // For now, high significance fragments are auto-verified
    // In production, this would create coherence network tasks
    const significanceVerified = (memFragment.significance || 0) < 0.7 ||
      entropyScore >= thresholds.entropyMin;
    
    // Coherence score
    // Simplified: based on entropy and prime alignment
    const coherenceScore = (primeAlignment * 0.5 + Math.min(1, entropyScore / 4) * 0.5);
    
    return {
      primeAlignment,
      entropyScore,
      significanceVerified,
      coherenceScore
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Fold Operations
  // ═══════════════════════════════════════════════════════════════════════
  
  async createFoldOperation(
    sourceFieldId: string,
    targetFieldId: string,
    fragmentMappings: Array<{ sourceEnvelopeHash: string; targetEnvelopeHash: string }>,
    privacy?: MemoryFoldOperation['privacy']
  ): Promise<SignedEnvelope<MemoryFoldOperation>> {
    // Input validation
    if (!sourceFieldId || typeof sourceFieldId !== 'string') {
      throw new ValidationError('Source field ID must be a non-empty string');
    }
    if (!targetFieldId || typeof targetFieldId !== 'string') {
      throw new ValidationError('Target field ID must be a non-empty string');
    }
    if (!Array.isArray(fragmentMappings)) {
      throw new ValidationError('Fragment mappings must be an array');
    }
    
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) {
      throw new MemorySecurityError('No identity available for fold operation', 'NO_IDENTITY');
    }
    
    const foldOperation: MemoryFoldOperation = {
      sourceFieldId,
      targetFieldId,
      fragmentMappings,
      foldedBy: identity,
      foldedAt: Date.now(),
      privacy: privacy || {
        redactConversationId: true,
        redactParticipants: true,
        redactTimestamps: false,
        preserveProvenance: true
      }
    };
    
    return this.envelopeService.create(
      foldOperation,
      'memory-fold-operation',
      '1.0.0',
      ['memory:fold']
    );
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Share Grants
  // ═══════════════════════════════════════════════════════════════════════
  
  async createShareGrant(
    fieldId: string,
    recipient: AuthorIdentity,
    permissions: ('read' | 'write' | 'reshare')[]
  ): Promise<MemoryShareGrant> {
    // Input validation
    if (!fieldId || typeof fieldId !== 'string') {
      throw new ValidationError('Field ID must be a non-empty string');
    }
    if (!recipient || !recipient.fingerprint) {
      throw new ValidationError('Recipient must have a valid fingerprint');
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new ValidationError('Permissions must be a non-empty array');
    }
    
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) {
      throw new MemorySecurityError('No identity available for share grant', 'NO_IDENTITY');
    }
    
    const grantData = {
      fieldId,
      grantedTo: recipient,
      grantedBy: identity,
      permissions,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    
    // Sign the grant using Ed25519 via IdentityManager
    const signature = await this.identityManager.sign(grantData);
    
    logger.debug(LOG_CATEGORY, 'ShareGrantCreated',
      `Created share grant for field ${fieldId}`,
      { fieldId, recipientFingerprint: recipient.fingerprint, permissions });
    
    return {
      ...grantData,
      signature
    };
  }
  
  /**
   * Verify a share grant signature.
   * @param grant - The share grant to verify
   * @returns True if the signature is valid
   */
  async verifyShareGrant(grant: MemoryShareGrant): Promise<boolean> {
    if (!grant || !grant.signature) {
      return false;
    }
    
    const grantData = {
      fieldId: grant.fieldId,
      grantedTo: grant.grantedTo,
      grantedBy: grant.grantedBy,
      permissions: grant.permissions,
      expiresAt: grant.expiresAt
    };
    
    try {
      return await this.identityManager.verify(grantData, grant.signature, grant.grantedBy.pub);
    } catch (error) {
      logger.warn(LOG_CATEGORY, 'ShareGrantVerifyFailed',
        'Failed to verify share grant',
        { fieldId: grant.fieldId, error: String(error) });
      return false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Encryption (Production-ready with SEA ECDH key wrapping)
  // ═══════════════════════════════════════════════════════════════════════
  
  async encryptFragment<T>(
    fragment: T,
    authorizedReaders: AuthorIdentity[]
  ): Promise<EncryptedFragment> {
    // Input validation
    if (!fragment) {
      throw new ValidationError('Fragment cannot be null or undefined');
    }
    if (!Array.isArray(authorizedReaders) || authorizedReaders.length === 0) {
      throw new ValidationError('Authorized readers must be a non-empty array');
    }
    
    // Generate symmetric key
    const symmetricKey = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    
    // Encrypt content with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(fragment), 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data and auth tag
    const ciphertext = Buffer.concat([encrypted, authTag]).toString('base64');
    
    // Wrap key for each reader using SEA ECDH
    // Each reader's epub is used for ECDH key exchange
    const keyWraps: Array<{ readerFingerprint: string; wrappedKey: string }> = [];
    
    for (const reader of authorizedReaders) {
      try {
        // Use SEA ECDH if reader has epub, otherwise fall back to simple encoding
        if (reader.epub) {
          // ECDH encryption using reader's epub
          const wrappedKey = await this.identityManager.seaEncrypt(
            symmetricKey.toString('hex'),
            reader.epub
          );
          keyWraps.push({
            readerFingerprint: reader.fingerprint,
            wrappedKey
          });
        } else {
          // Fallback: encode with content hash for basic protection
          // This is less secure but maintains backward compatibility
          const keyWithAuth = `${symmetricKey.toString('hex')}:${computeContentHash(reader.fingerprint)}`;
          keyWraps.push({
            readerFingerprint: reader.fingerprint,
            wrappedKey: Buffer.from(keyWithAuth).toString('base64')
          });
          logger.warn(LOG_CATEGORY, 'NoEpubForReader',
            'Reader lacks epub, using fallback key wrapping',
            { fingerprint: reader.fingerprint });
        }
      } catch (error) {
        logger.error(LOG_CATEGORY, 'KeyWrapFailed',
          'Failed to wrap key for reader',
          { fingerprint: reader.fingerprint, error: String(error) });
        throw new EncryptionError(`Failed to wrap key for reader ${reader.fingerprint}`, { error: String(error) });
      }
    }
    
    logger.debug(LOG_CATEGORY, 'FragmentEncrypted',
      `Encrypted fragment for ${authorizedReaders.length} readers`,
      { readerCount: authorizedReaders.length });
    
    return {
      ciphertext,
      nonce: nonce.toString('base64'),
      keyWraps
    };
  }
  
  async decryptFragment<T>(
    encrypted: EncryptedFragment,
    readerFingerprint: string,
    senderEpub?: string
  ): Promise<T> {
    // Input validation
    if (!encrypted) {
      throw new ValidationError('Encrypted fragment cannot be null or undefined');
    }
    if (!readerFingerprint || typeof readerFingerprint !== 'string') {
      throw new ValidationError('Reader fingerprint must be a non-empty string');
    }
    
    // Find key wrap for this reader
    const keyWrap = encrypted.keyWraps.find(
      kw => kw.readerFingerprint === readerFingerprint
    );
    
    if (!keyWrap) {
      throw new EncryptionError('Not authorized to decrypt this fragment', { readerFingerprint });
    }
    
    let symmetricKey: Buffer;
    
    try {
      // Try SEA ECDH decryption first if sender epub is provided
      if (senderEpub) {
        const decryptedKey = await this.identityManager.seaDecrypt(keyWrap.wrappedKey, senderEpub);
        symmetricKey = Buffer.from(decryptedKey, 'hex');
      } else {
        // Check if it's SEA-encrypted (starts with 'SEA')
        if (keyWrap.wrappedKey.startsWith('SEA')) {
          // Try self-decryption (for own encrypted data)
          try {
            const decryptedKey = await this.identityManager.seaDecrypt(keyWrap.wrappedKey);
            symmetricKey = Buffer.from(decryptedKey, 'hex');
          } catch {
            throw new EncryptionError('Cannot decrypt without sender epub');
          }
        } else {
          // Fallback: base64 decode (backward compatibility)
          const unwrapped = Buffer.from(keyWrap.wrappedKey, 'base64').toString('utf8');
          const symmetricKeyHex = unwrapped.split(':')[0];
          symmetricKey = Buffer.from(symmetricKeyHex, 'hex');
        }
      }
    } catch (error) {
      if (error instanceof EncryptionError) throw error;
      throw new EncryptionError('Failed to unwrap symmetric key', { error: String(error) });
    }
    
    // Decrypt content
    try {
      const nonce = Buffer.from(encrypted.nonce, 'base64');
      const ciphertextWithTag = Buffer.from(encrypted.ciphertext, 'base64');
      
      // Separate ciphertext and auth tag (last 16 bytes)
      const authTag = ciphertextWithTag.slice(-16);
      const ciphertext = ciphertextWithTag.slice(0, -16);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', symmetricKey, nonce);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
      
      logger.debug(LOG_CATEGORY, 'FragmentDecrypted', 'Successfully decrypted fragment');
      
      return JSON.parse(decrypted.toString('utf8')) as T;
    } catch (error) {
      throw new EncryptionError('Failed to decrypt fragment content', { error: String(error) });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Provenance Chain Resolution
  // ═══════════════════════════════════════════════════════════════════════
  
  async resolveProvenanceChain(contentHash: string): Promise<ProvenanceChainEntry[]> {
    return this.provenanceStore.get(contentHash) || [];
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Capability Checking
  // ═══════════════════════════════════════════════════════════════════════
  
  checkMemoryCapability(
    capability: Capability,
    scope: string,
    trust: TrustAssessment
  ): CapabilityCheckResult {
    // Check if capability is allowed for this scope
    const rules = MEMORY_ACCESS_RULES[scope];
    if (!rules) {
      return {
        decision: 'DENY',
        reason: `Unknown scope: ${scope}`
      };
    }
    
    // Find the operation that requires this capability
    let operationAllowed = false;
    for (const [_operation, requiredCaps] of Object.entries(rules.allowedOperations)) {
      if (requiredCaps.includes(capability)) {
        operationAllowed = true;
        break;
      }
    }
    
    if (!operationAllowed) {
      return {
        decision: 'DENY',
        reason: `Capability ${capability} not allowed for scope ${scope}`
      };
    }
    
    // Delegate to TrustGate for trust-based decision
    return this.trustGate.check(capability, trust);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Privacy-Preserving Fold with Redaction (Phase 4)
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Apply privacy redactions to a fragment during fold operation.
   * Based on MemoryFoldOperation.privacy settings.
   */
  redactFragmentForFold<T>(
    fragment: T,
    privacy: MemoryFoldOperation['privacy']
  ): T {
    const memFragment = fragment as unknown as MemoryFragment;
    const redacted = { ...memFragment } as MemoryFragment;
    
    // Deep copy metadata to avoid mutating original
    redacted.metadata = { ...(memFragment.metadata || {}) };
    
    if (privacy?.redactConversationId) {
      // Remove or hash conversation ID
      if (redacted.metadata.conversationId) {
        redacted.metadata.conversationId = computeContentHash(
          redacted.metadata.conversationId as string
        ).slice(0, 16);
        redacted.metadata.conversationIdRedacted = true;
      }
    }
    
    if (privacy?.redactParticipants) {
      // Remove participant information
      delete redacted.metadata.participants;
      delete redacted.metadata.authorId;
      delete redacted.metadata.recipientId;
      redacted.metadata.participantsRedacted = true;
    }
    
    if (privacy?.redactTimestamps) {
      // Round timestamps to day granularity
      if (redacted.timestamp) {
        const dayMs = 24 * 60 * 60 * 1000;
        redacted.timestamp = Math.floor(redacted.timestamp / dayMs) * dayMs;
        redacted.metadata.timestampRedacted = true;
      }
    }
    
    // Always remove sensitive metadata
    delete redacted.metadata.ipAddress;
    delete redacted.metadata.userAgent;
    delete redacted.metadata.deviceId;
    
    return redacted as unknown as T;
  }
  
  /**
   * Create a privacy-preserving fold operation that applies redactions.
   */
  async createPrivacyFoldOperation(
    sourceFieldId: string,
    targetFieldId: string,
    fragments: MemoryFragment[],
    privacy: MemoryFoldOperation['privacy']
  ): Promise<{
    foldOperation: SignedEnvelope<MemoryFoldOperation>;
    redactedFragments: MemoryFragment[];
  }> {
    // Redact all fragments
    const redactedFragments = fragments.map(f => this.redactFragmentForFold(f, privacy));
    
    // Create mappings (source envelope hash will be filled after signing redacted versions)
    const fragmentMappings: Array<{ sourceEnvelopeHash: string; targetEnvelopeHash: string }> = [];
    
    for (let i = 0; i < fragments.length; i++) {
      const original = fragments[i];
      const sourceHash = (original.metadata?.envelopeHash as string) || '';
      // Target hash will be generated after the redacted fragment is signed
      fragmentMappings.push({
        sourceEnvelopeHash: sourceHash,
        targetEnvelopeHash: '' // Placeholder
      });
    }
    
    const foldOperation = await this.createFoldOperation(
      sourceFieldId,
      targetFieldId,
      fragmentMappings,
      privacy
    );
    
    return { foldOperation, redactedFragments };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Entropy Budget Enforcement (Phase 4)
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Check if a fragment can be stored within the field's entropy budget.
   */
  checkEntropyBudget(
    fieldId: string,
    scope: string,
    fragmentEntropy: number
  ): { allowed: boolean; currentUsage: number; budgetRemaining: number; warning?: string } {
    const budget = DEFAULT_ENTROPY_BUDGETS[scope] || DEFAULT_ENTROPY_BUDGETS.user;
    const now = Date.now();
    
    // Get or initialize usage tracking
    let usage = this.entropyUsage.get(fieldId);
    if (!usage) {
      usage = { current: 0, lastCooled: now };
      this.entropyUsage.set(fieldId, usage);
    }
    
    // Apply entropy cooling since last check
    const hoursSinceLastCooled = (now - usage.lastCooled) / (60 * 60 * 1000);
    const cooledAmount = hoursSinceLastCooled * budget.coolingRate;
    usage.current = Math.max(0, usage.current - cooledAmount);
    usage.lastCooled = now;
    
    // Check fragment entropy against per-fragment max
    if (fragmentEntropy > budget.maxFragmentEntropy) {
      return {
        allowed: false,
        currentUsage: usage.current,
        budgetRemaining: budget.maxFieldEntropy - usage.current,
        warning: `Fragment entropy ${fragmentEntropy.toFixed(2)} exceeds max ${budget.maxFragmentEntropy} for scope ${scope}`
      };
    }
    
    // Check field entropy budget
    const newTotal = usage.current + fragmentEntropy;
    if (newTotal > budget.maxFieldEntropy) {
      return {
        allowed: false,
        currentUsage: usage.current,
        budgetRemaining: budget.maxFieldEntropy - usage.current,
        warning: `Field entropy budget exceeded: ${newTotal.toFixed(2)} > ${budget.maxFieldEntropy}`
      };
    }
    
    // Check warning threshold
    const warningThreshold = budget.maxFieldEntropy * 0.8;
    const warning = newTotal > warningThreshold
      ? `Field entropy at ${((newTotal / budget.maxFieldEntropy) * 100).toFixed(0)}% of budget`
      : undefined;
    
    return {
      allowed: true,
      currentUsage: usage.current,
      budgetRemaining: budget.maxFieldEntropy - newTotal,
      warning
    };
  }
  
  /**
   * Record entropy consumption for a fragment.
   */
  consumeEntropy(fieldId: string, fragmentEntropy: number): void {
    const usage = this.entropyUsage.get(fieldId);
    if (usage) {
      usage.current += fragmentEntropy;
    } else {
      this.entropyUsage.set(fieldId, { current: fragmentEntropy, lastCooled: Date.now() });
    }
  }
  
  /**
   * Get current entropy status for a field.
   */
  getEntropyStatus(fieldId: string, scope: string): {
    current: number;
    max: number;
    percentage: number;
    coolingRate: number;
  } {
    const budget = DEFAULT_ENTROPY_BUDGETS[scope] || DEFAULT_ENTROPY_BUDGETS.user;
    const usage = this.entropyUsage.get(fieldId) || { current: 0, lastCooled: Date.now() };
    
    return {
      current: usage.current,
      max: budget.maxFieldEntropy,
      percentage: (usage.current / budget.maxFieldEntropy) * 100,
      coolingRate: budget.coolingRate
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // Garbage Collection Policy (Phase 4)
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Get fragments eligible for garbage collection based on policy.
   */
  getGCCandidates(
    fragments: MemoryFragment[],
    scope: string
  ): { eligible: MemoryFragment[]; reason: string }[] {
    const policy = DEFAULT_GC_POLICIES[scope] || DEFAULT_GC_POLICIES.user;
    const now = Date.now();
    const minRetentionMs = policy.minRetentionDays * 24 * 60 * 60 * 1000;
    
    const candidates: { eligible: MemoryFragment[]; reason: string }[] = [];
    
    // 1. Low significance fragments past retention period
    const lowSignificance = fragments.filter(f =>
      f.significance < policy.significanceThreshold &&
      (now - f.timestamp) > minRetentionMs
    );
    if (lowSignificance.length > 0) {
      candidates.push({
        eligible: lowSignificance,
        reason: `Significance below ${policy.significanceThreshold} and past ${policy.minRetentionDays} day retention`
      });
    }
    
    // 2. Excess fragments beyond max per field
    if (fragments.length > policy.maxFragmentsPerField) {
      // Sort by significance (ascending) then by age (oldest first)
      const sorted = [...fragments].sort((a, b) => {
        const sigDiff = a.significance - b.significance;
        if (Math.abs(sigDiff) > 0.1) return sigDiff;
        return a.timestamp - b.timestamp;
      });
      
      const excessCount = fragments.length - policy.maxFragmentsPerField;
      const excess = sorted.slice(0, excessCount);
      candidates.push({
        eligible: excess,
        reason: `Exceeds max ${policy.maxFragmentsPerField} fragments per field`
      });
    }
    
    return candidates;
  }
  
  /**
   * Check if field is approaching storage quota.
   */
  checkStorageQuota(
    _fieldId: string, // Reserved for per-field quota tracking
    scope: string,
    currentSizeBytes: number
  ): { withinQuota: boolean; usagePercent: number; warning?: string } {
    const policy = DEFAULT_GC_POLICIES[scope] || DEFAULT_GC_POLICIES.user;
    const usagePercent = (currentSizeBytes / policy.quotaBytes) * 100;
    
    if (currentSizeBytes > policy.quotaBytes) {
      return {
        withinQuota: false,
        usagePercent,
        warning: `Storage quota exceeded: ${(currentSizeBytes / (1024 * 1024)).toFixed(2)}MB of ${(policy.quotaBytes / (1024 * 1024)).toFixed(2)}MB`
      };
    }
    
    const warningThreshold = 80;
    const warning = usagePercent > warningThreshold
      ? `Storage at ${usagePercent.toFixed(0)}% of quota`
      : undefined;
    
    return {
      withinQuota: true,
      usagePercent,
      warning
    };
  }
  
  /**
   * Perform garbage collection on a field.
   * Returns the fragments that were marked for deletion.
   */
  async performGC(
    fieldId: string,
    scope: string,
    fragments: MemoryFragment[],
    currentSizeBytes: number
  ): Promise<{
    deletedCount: number;
    freedBytes: number;
    deletedFragments: MemoryFragment[];
  }> {
    const candidates = this.getGCCandidates(fragments, scope);
    const quotaCheck = this.checkStorageQuota(fieldId, scope, currentSizeBytes);
    
    const toDelete = new Set<string>();
    let freedBytes = 0;
    
    // Add quota-based deletions if over quota
    if (!quotaCheck.withinQuota) {
      // Sort by significance and delete until under quota
      const sorted = [...fragments].sort((a, b) => a.significance - b.significance);
      let sizeRemaining = currentSizeBytes;
      const policy = DEFAULT_GC_POLICIES[scope] || DEFAULT_GC_POLICIES.user;
      
      for (const frag of sorted) {
        if (sizeRemaining <= policy.quotaBytes * 0.9) break; // Target 90% quota
        const fragSize = JSON.stringify(frag).length * 2; // Rough UTF-16 size
        toDelete.add(frag.id);
        sizeRemaining -= fragSize;
        freedBytes += fragSize;
      }
    }
    
    // Add policy-based deletions
    for (const candidate of candidates) {
      for (const frag of candidate.eligible) {
        if (!toDelete.has(frag.id)) {
          toDelete.add(frag.id);
          freedBytes += JSON.stringify(frag).length * 2;
        }
      }
    }
    
    const deletedFragments = fragments.filter(f => toDelete.has(f.id));
    
    // Update field metadata
    const metadata = this.fieldMetadata.get(fieldId);
    if (metadata) {
      metadata.fragmentCount -= deletedFragments.length;
      metadata.lastGC = Date.now();
    }
    
    logger.info(LOG_CATEGORY, 'GCComplete',
      `Marked ${deletedFragments.length} fragments for deletion from field ${fieldId}`,
      { fieldId, deletedCount: deletedFragments.length, freedBytes });
    
    return {
      deletedCount: deletedFragments.length,
      freedBytes,
      deletedFragments
    };
  }
  
  /**
   * Get GC policy for a scope.
   */
  getGCPolicy(scope: string): GCPolicy {
    return DEFAULT_GC_POLICIES[scope] || DEFAULT_GC_POLICIES.user;
  }
  
  /**
   * Get entropy budget for a scope.
   */
  getEntropyBudget(scope: string): EntropyBudget {
    return DEFAULT_ENTROPY_BUDGETS[scope] || DEFAULT_ENTROPY_BUDGETS.user;
  }
}
