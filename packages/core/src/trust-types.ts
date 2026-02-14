// ═══════════════════════════════════════════════════════════════════════════
// Code Provenance & Web of Trust — Type Definitions
// See design/23-provenance-trust.md for full specification
// ═══════════════════════════════════════════════════════════════════════════

// ─── Artifact Types ──────────────────────────────────────────────────────

/**
 * Artifact types that can be wrapped in a SignedEnvelope.
 */
export type ArtifactType =
  | 'prompt'
  | 'plugin'
  | 'skill'
  | 'service'
  | 'agent-template'
  | 'process'
  | 'fence-handler'
  | 'model-config'
  | 'domain-definition'
  | 'memory-fragment'
  | 'memory-field-definition'
  | 'memory-fold-operation'
  | 'memory-share-grant';

// ─── Author Identity ─────────────────────────────────────────────────────

/**
 * Public portion of the author's identity, sufficient for verification
 * without exposing private key material.
 */
export interface AuthorIdentity {
  /** Ed25519 public key (base64) — from KeyTriplet.pub */
  pub: string;
  /** 16-char fingerprint — from KeyTriplet.fingerprint */
  fingerprint: string;
  /** 16-dimensional resonance field — from KeyTriplet.resonance */
  resonance: number[];
  /** Gun SEA ephemeral public key (for ECDH key exchange) — optional for backward compatibility */
  epub?: string;
}

// ─── Endorsement ─────────────────────────────────────────────────────────

/**
 * An endorsement from a co-signer who vouches for an artifact.
 */
export interface Endorsement {
  /** Public identity of the endorser */
  endorser: AuthorIdentity;
  /** Ed25519 signature over the envelope's contentHash */
  signature: string;
  /** Optional SEA co-signature */
  seaSignature?: string;
  /** Timestamp of endorsement (epoch ms) */
  timestamp: number;
  /** Free-text reason or review summary */
  comment?: string;
}

// ─── Resonance Proof ─────────────────────────────────────────────────────

/**
 * Resonance proof: prime-based semantic verification tying the artifact
 * content to the author's key material.
 */
export interface ResonanceProof {
  /** Prime factors used in the proof computation */
  primes: number[];
  /** Hash of (contentHash + primes + author.resonance + timestamp) */
  hash: string;
  /** When the proof was generated (epoch ms) */
  timestamp: number;
}

// ─── Capabilities ────────────────────────────────────────────────────────

/**
 * Capabilities an artifact may request at runtime.
 * Superset of PluginPermission from plugin-types.ts.
 */
export type Capability =
  | 'network:http'
  | 'fs:read'
  | 'fs:write'
  | 'store:read'
  | 'store:write'
  | 'dsn:identity'
  | 'dsn:register-tool'
  | 'dsn:register-service'
  | 'dsn:invoke-tool'
  | 'dsn:publish-observation'
  | 'gateway:register'
  | 'dsn:gmf-write'
  | 'gateway:register'
  | 'crypto:sign'
  | 'crypto:encrypt'
  | 'wallet:read'
  | 'wallet:transfer'
  | 'system:shell'
  | 'ui:notification'
  | 'ui:overlay'
  | 'ai:complete'
  // Memory capabilities
  | 'memory:read'           // Read any field user has access to
  | 'memory:write'          // Write to owned fields
  | 'memory:contribute'     // Contribute to shared/global fields
  | 'memory:fold'           // Fold conversation memory
  | 'memory:share'          // Share fields with others
  | 'memory:create-field'   // Create new memory fields
  | 'memory:delete-field'   // Delete owned fields
  | 'memory:admin'          // Full control (for organization admins)
  // Workflow capabilities
  | 'workflow:create'       // Create workflow runners
  | 'workflow:execute';     // Execute workflow steps

// ─── Signed Envelope ─────────────────────────────────────────────────────

/**
 * SignedEnvelope<T> — the universal provenance wrapper.
 *
 * Every executable artifact in AlephNet is distributed inside one of these.
 * The envelope is immutable once signed; modifications produce a new envelope
 * with parentEnvelopeHash pointing to the original.
 */
export interface SignedEnvelope<T> {
  /** SHA-256 of the canonicalized JSON of `payload` (lowercase hex) */
  contentHash: string;

  /** The actual artifact content */
  payload: T;

  /** What kind of artifact this is */
  artifactType: ArtifactType;

  /** Public portion of the author's KeyTriplet */
  author: AuthorIdentity;

  /** Creation timestamp (epoch ms) */
  createdAt: number;

  /** Semver version string */
  version: string;

  /** Ed25519 signature over contentHash by author's private key */
  signature: string;

  /** Optional Gun.js SEA co-signature for dual-layer verification */
  seaSignature?: string;

  /** Prime-based semantic verification binding content to author */
  resonanceProof: ResonanceProof;

  /**
   * For forks or modifications: the contentHash of the parent envelope.
   * Forms a Merkle-like provenance chain.
   */
  parentEnvelopeHash?: string;

  /** Co-signer endorsements from other identities */
  endorsements: Endorsement[];

  /** Capabilities the artifact needs to function */
  requestedCapabilities: Capability[];
}

// ─── Trust Levels ────────────────────────────────────────────────────────

/**
 * Trust levels mapped from a computed numeric score.
 *
 * | Level     | Score Range | Meaning                          |
 * |-----------|-------------|----------------------------------|
 * | SELF      | ≥ 1.0       | User's own code                  |
 * | VOUCHED   | ≥ 0.7       | Endorsed by friends              |
 * | COMMUNITY | ≥ 0.4       | Verified by the network          |
 * | UNKNOWN   | ≥ 0.0       | Unverified or external           |
 * | REVOKED   | < 0.0       | Known-bad or revoked             |
 */
export type TrustLevel = 'SELF' | 'VOUCHED' | 'COMMUNITY' | 'UNKNOWN' | 'REVOKED';

/**
 * Breakdown of contributing trust factors.
 */
export interface TrustFactors {
  /** Whether Ed25519 + SEA + resonance signatures all passed */
  signatureValid: boolean;
  /** Normalized social graph distance (0.0–1.0) */
  socialDistance: number;
  /** Normalized author reputation (0.0–1.0) */
  authorReputation: number;
  /** Normalized staking tier score (0.0–1.0) */
  stakingTier: number;
  /** Normalized endorsement quality (0.0–1.0) */
  endorsementQuality: number;
  /** Coherence network consensus score (0.0–1.0) */
  coherenceScore: number;
}

/**
 * Complete trust assessment for an artifact.
 */
export interface TrustAssessment {
  /** Computed numeric score (-1.0 to 1.0) */
  score: number;
  /** Mapped trust level */
  level: TrustLevel;
  /** Breakdown of contributing factors */
  factors: TrustFactors;
  /** When this assessment was computed (epoch ms) */
  evaluatedAt: number;
  /** How long this assessment is valid (ms) */
  ttlMs: number;
}

// ─── Capability Gating ───────────────────────────────────────────────────

/** Decision outcome for a single capability check. */
export type CapabilityDecision = 'ALLOW' | 'CONFIRM' | 'DENY';

/** Result of checking a single capability against trust. */
export interface CapabilityCheckResult {
  decision: CapabilityDecision;
  reason?: string;
}

// ─── Trust Overrides ─────────────────────────────────────────────────────

/**
 * User-defined trust override, stored locally and never propagated to network.
 */
export interface TrustOverride {
  /** Target: specific author fingerprint or envelope contentHash */
  target:
    | { type: 'author'; fingerprint: string }
    | { type: 'artifact'; contentHash: string };
  /** Override trust level (bypasses computed score) */
  trustLevel?: TrustLevel;
  /** Per-capability overrides */
  capabilityOverrides?: Partial<Record<Capability, CapabilityDecision>>;
  /** When this override was set (epoch ms) */
  createdAt: number;
  /** Optional expiry (epoch ms) */
  expiresAt?: number;
}

// ─── Verification Result ─────────────────────────────────────────────────

/**
 * Result of verifying a SignedEnvelope's cryptographic integrity.
 */
export interface VerificationResult {
  /** Whether all signature checks passed */
  valid: boolean;
  /** Ed25519 signature check passed */
  ed25519Valid: boolean;
  /** SEA co-signature check passed (true if not present) */
  seaValid: boolean;
  /** Resonance proof check passed */
  resonanceValid: boolean;
  /** If invalid, human-readable description of what failed */
  error?: string;
}

// ─── Audit Events ────────────────────────────────────────────────────────

/**
 * Provenance-specific audit event types, compatible with the existing
 * AuditEvent infrastructure (see design/16-security.md).
 */
export type ProvenanceAuditEventType =
  | 'PROVENANCE_SIGNED'
  | 'PROVENANCE_VERIFIED'
  | 'PROVENANCE_FAILED'
  | 'PROVENANCE_SELF'
  | 'PROVENANCE_VOUCHED'
  | 'PROVENANCE_COMMUNITY'
  | 'PROVENANCE_UNKNOWN'
  | 'PROVENANCE_REVOKED'
  | 'PROVENANCE_ENDORSED'
  | 'TRUST_OVERRIDE_SET'
  | 'CAPABILITY_CONFIRMED'
  | 'CAPABILITY_DENIED'
  | 'CAPABILITY_BLOCKED';

// ─── Service Interfaces ──────────────────────────────────────────────────

/**
 * Service for creating, verifying, and endorsing signed envelopes.
 */
export interface ISignedEnvelopeService {
  /**
   * Create a signed envelope wrapping the given payload.
   * Signs with the current user's KeyTriplet.
   */
  create<T>(
    payload: T,
    artifactType: ArtifactType,
    version: string,
    capabilities: Capability[],
    parentEnvelopeHash?: string
  ): Promise<SignedEnvelope<T>>;

  /**
   * Verify a signed envelope's cryptographic integrity.
   * Checks Ed25519 signature, optional SEA co-signature, and resonance proof.
   */
  verify<T>(envelope: SignedEnvelope<T>): Promise<VerificationResult>;

  /**
   * Add the current user's endorsement to an envelope.
   * Returns a new envelope with the endorsement appended.
   */
  endorse<T>(envelope: SignedEnvelope<T>, comment?: string): Promise<SignedEnvelope<T>>;

  /**
   * Compute the deterministic canonical content hash for a payload.
   * Uses sorted-key JSON serialization → UTF-8 → SHA-256 → lowercase hex.
   */
  computeContentHash<T>(payload: T): string;
}

/**
 * Service for evaluating trust levels of signed envelopes.
 */
export interface ITrustEvaluator {
  /**
   * Evaluate the trust level of a signed envelope.
   * Returns a TrustAssessment with score, level, and factor breakdown.
   */
  evaluate<T>(envelope: SignedEnvelope<T>): Promise<TrustAssessment>;
}

/**
 * Service for gating capabilities based on trust assessment.
 */
export interface ITrustGate {
  /**
   * Check whether a capability is allowed for a given trust assessment.
   * Returns the decision and, for CONFIRM, a human-readable reason.
   */
  check(
    capability: Capability,
    trust: TrustAssessment
  ): CapabilityCheckResult;

  /**
   * Check all requested capabilities for an envelope.
   * Returns a map of capability → decision.
   */
  checkAll(
    envelope: SignedEnvelope<unknown>,
    trust: TrustAssessment
  ): Map<Capability, CapabilityCheckResult>;
}

/**
 * Service for resolving provenance chains via parentEnvelopeHash links.
 */
export interface IProvenanceChainResolver {
  /**
   * Walk the provenance chain from an envelope back to its root.
   * Returns the chain in order [root, ..., current].
   */
  resolve(contentHash: string): Promise<SignedEnvelope<unknown>[]>;

  /**
   * Get all forks of an envelope (envelopes that reference it as parent).
   */
  getForks(contentHash: string): Promise<SignedEnvelope<unknown>[]>;
}

// ─── Trust Cache Entry ───────────────────────────────────────────────────

/**
 * Internal cache entry for trust assessments.
 */
export interface TrustCacheEntry {
  assessment: TrustAssessment;
  /** Cache key: SHA-256(envelope.contentHash + currentUser.pub) */
  cacheKey: string;
  /** Absolute expiry time (epoch ms) */
  expiresAt: number;
}

// ─── Constants ───────────────────────────────────────────────────────────

/** TTL values for trust assessment cache per trust level (ms) */
export const TRUST_CACHE_TTL: Record<TrustLevel, number> = {
  SELF: Infinity,
  VOUCHED: 60 * 60 * 1000,         // 1 hour
  COMMUNITY: 15 * 60 * 1000,       // 15 minutes
  UNKNOWN: 5 * 60 * 1000,          // 5 minutes
  REVOKED: 24 * 60 * 60 * 1000,    // 24 hours
};

/** Weight factors for trust score computation */
export const TRUST_WEIGHTS = {
  socialDistance: 0.30,
  authorReputation: 0.20,
  stakingTier: 0.15,
  endorsementQuality: 0.20,
  coherenceScore: 0.15,
} as const;

/** Social graph distance → normalized score mapping */
export const SOCIAL_DISTANCE_SCORES: Record<number, number> = {
  0: 1.0,   // Self
  1: 0.8,   // Direct friend
  2: 0.5,   // Friend-of-friend
  3: 0.2,   // Distance 3
  // Distance 4+ → 0.0
};

/** StakingTier → normalized score mapping */
export const STAKING_TIER_SCORES: Record<string, number> = {
  Archon: 1.0,
  Magus: 0.75,
  Adept: 0.5,
  Neophyte: 0.25,
};

/** Trust level score thresholds */
export const TRUST_THRESHOLDS = {
  SELF: 1.0,
  VOUCHED: 0.7,
  COMMUNITY: 0.4,
  UNKNOWN: 0.0,
  // Anything below 0.0 is REVOKED
} as const;

// ─── Memory Security Types ───────────────────────────────────────────────

/**
 * Provenance chain entry tracking the history of a memory fragment.
 */
export interface ProvenanceChainEntry {
  /** Operation type */
  operation: 'created' | 'modified' | 'folded' | 'endorsed' | 'verified' | 'migrated';
  /** Fingerprint of the actor who performed the operation */
  actorFingerprint: string;
  /** When the operation occurred (epoch ms) */
  timestamp: number;
  /** Content hash of the previous version (for modified/folded) */
  previousHash?: string;
  /** Ed25519 signature over the operation data */
  signature: string;
}

/**
 * Replay protection metadata for memory fragments.
 */
export interface ReplayProtection {
  /** Monotonically increasing epoch counter */
  epoch: number;
  /** One-time use nonce */
  nonce: string;
  /** Expiry timestamp for this fragment version (epoch ms) */
  expiresAt: number;
}

/**
 * Semantic validation result for a memory fragment.
 */
export interface SemanticValidation {
  /** Prime factors alignment with field signature (0.0-1.0) */
  primeAlignment: number;
  /** Shannon entropy of content (bits per character) */
  entropyScore: number;
  /** Whether claimed significance is verified */
  significanceVerified: boolean;
  /** Semantic coherence with field content (0.0-1.0) */
  coherenceScore: number;
}

/**
 * Consensus validation result for global field contributions.
 */
export interface ConsensusValidation {
  /** Number of nodes that verified */
  verifierCount: number;
  /** Required threshold (from field.consensusThreshold) */
  threshold: number;
  /** Actual agreement percentage */
  agreement: number;
  /** Verification task ID if created */
  taskId?: string;
  /** Current status */
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * A memory fragment wrapped with provenance information.
 * Import MemoryFragment from alephnet-types to avoid circular dependency.
 */
export interface SignedMemoryFragment<T = unknown> {
  /** The original fragment data */
  fragment: T;
  /** The signed envelope containing the fragment */
  envelope: SignedEnvelope<T>;
  /** Full provenance chain from creation to current state */
  provenanceChain: ProvenanceChainEntry[];
  /** Semantic validation results (if validated) */
  validation?: SemanticValidation;
  /** Consensus validation results (for global scope) */
  consensus?: ConsensusValidation;
}

/**
 * Memory fold operation payload for SignedEnvelope.
 */
export interface MemoryFoldOperation {
  /** Source memory field ID */
  sourceFieldId: string;
  /** Target memory field ID */
  targetFieldId: string;
  /** Mapping of source to target envelope hashes */
  fragmentMappings: Array<{
    sourceEnvelopeHash: string;
    targetEnvelopeHash: string;
  }>;
  /** Author who performed the fold */
  foldedBy: AuthorIdentity;
  /** When the fold occurred (epoch ms) */
  foldedAt: number;
  /** Privacy settings for the fold */
  privacy?: {
    redactConversationId: boolean;
    redactParticipants: boolean;
    redactTimestamps: boolean;
    preserveProvenance: boolean;
  };
}

/**
 * Memory share grant for sharing fields with other users.
 */
export interface MemoryShareGrant {
  /** Field being shared */
  fieldId: string;
  /** Recipient of the share */
  grantedTo: AuthorIdentity;
  /** Owner granting access */
  grantedBy: AuthorIdentity;
  /** Permissions granted */
  permissions: ('read' | 'write' | 'reshare')[];
  /** When the grant expires (epoch ms) */
  expiresAt?: number;
  /** Ed25519 signature over the grant */
  signature: string;
}

/**
 * Encrypted memory fragment for private fields.
 */
export interface EncryptedFragment {
  /** AES-256-GCM encrypted payload */
  ciphertext: string;
  /** Nonce for decryption */
  nonce: string;
  /** Key wrapped for each authorized reader */
  keyWraps: Array<{
    readerFingerprint: string;
    wrappedKey: string; // ECDH shared secret encrypted key
  }>;
}

/**
 * Entropy budget configuration for memory fields.
 */
export interface EntropyBudget {
  /** Maximum entropy for the field */
  maxFieldEntropy: number;
  /** Maximum entropy per fragment */
  maxFragmentEntropy: number;
  /** Entropy reduction rate per hour */
  coolingRate: number;
}

/**
 * Garbage collection policy for memory fields.
 */
export interface GCPolicy {
  /** Minimum retention period in days */
  minRetentionDays: number;
  /** Significance threshold below which fragments are eligible for GC */
  significanceThreshold: number;
  /** Maximum fragments per field */
  maxFragmentsPerField: number;
  /** Storage quota in bytes */
  quotaBytes: number;
}

/**
 * Memory scope access rules.
 */
export interface MemoryAccessRules {
  /** Scope this rule applies to */
  scope: 'global' | 'user' | 'conversation' | 'organization';
  /** Default visibility */
  visibility: 'public' | 'private' | 'restricted';
  /** Allowed operations mapped to required capabilities */
  allowedOperations: Record<string, Capability[]>;
}

/** Default access rules by scope */
export const MEMORY_ACCESS_RULES: Record<string, MemoryAccessRules> = {
  global: {
    scope: 'global',
    visibility: 'public',
    allowedOperations: {
      read: ['memory:read'],
      write: ['memory:contribute', 'memory:admin'],
      delete: ['memory:admin']
    }
  },
  user: {
    scope: 'user',
    visibility: 'private',
    allowedOperations: {
      create: ['memory:create-field'],
      read: ['memory:read'],
      write: ['memory:write'],
      delete: ['memory:delete-field']
    }
  },
  conversation: {
    scope: 'conversation',
    visibility: 'private',
    allowedOperations: {
      create: ['memory:create-field'],
      read: ['memory:read'],
      write: ['memory:write'],
      fold: ['memory:fold'],
      delete: ['memory:delete-field']
    }
  },
  organization: {
    scope: 'organization',
    visibility: 'restricted',
    allowedOperations: {
      read: ['memory:read'],
      write: ['memory:contribute'],
      delete: ['memory:admin']
    }
  }
};

/** Validation thresholds by scope */
export const MEMORY_VALIDATION_THRESHOLDS = {
  conversation: {
    primeAlignment: 0,       // Optional
    entropyMin: 1.0,
    coherenceMin: 0.3,
    significanceMin: 0.0,    // Any significance allowed
    requiresConsensus: false
  },
  user: {
    primeAlignment: 0.5,
    entropyMin: 2.0,
    coherenceMin: 0.5,
    significanceMin: 0.3,    // Moderate significance required
    requiresConsensus: false
  },
  organization: {
    primeAlignment: 0.7,
    entropyMin: 2.5,
    coherenceMin: 0.6,
    significanceMin: 0.5,    // Higher significance for org memory
    requiresConsensus: true,
    minVerifiers: 3
  },
  global: {
    primeAlignment: 0.8,
    entropyMin: 3.0,
    coherenceMin: 0.7,
    significanceMin: 0.7,    // High significance required for global
    requiresConsensus: true
    // Uses field.consensusThreshold
  }
} as const;

/**
 * Service interface for memory security operations.
 */
export interface IMemorySecurityService {
  /**
   * Create a signed memory fragment with provenance.
   */
  createSignedFragment<T>(
    fragment: T,
    fieldId: string,
    parentEnvelopeHash?: string
  ): Promise<SignedMemoryFragment<T>>;

  /**
   * Verify a signed memory fragment.
   */
  verifyFragment<T>(
    signedFragment: SignedMemoryFragment<T>
  ): Promise<VerificationResult>;

  /**
   * Validate fragment semantically against its field.
   */
  validateSemantics<T>(
    fragment: T,
    fieldSignature: number[],
    scope: string
  ): Promise<SemanticValidation>;

  /**
   * Create a fold operation between fields.
   */
  createFoldOperation(
    sourceFieldId: string,
    targetFieldId: string,
    fragmentMappings: Array<{ sourceEnvelopeHash: string; targetEnvelopeHash: string }>,
    privacy?: MemoryFoldOperation['privacy']
  ): Promise<SignedEnvelope<MemoryFoldOperation>>;

  /**
   * Create a share grant for a field.
   */
  createShareGrant(
    fieldId: string,
    recipient: AuthorIdentity,
    permissions: ('read' | 'write' | 'reshare')[]
  ): Promise<MemoryShareGrant>;

  /**
   * Encrypt a fragment for private storage.
   */
  encryptFragment<T>(
    fragment: T,
    authorizedReaders: AuthorIdentity[]
  ): Promise<EncryptedFragment>;

  /**
   * Decrypt a fragment for an authorized reader.
   */
  decryptFragment<T>(
    encrypted: EncryptedFragment,
    readerFingerprint: string
  ): Promise<T>;

  /**
   * Resolve the full provenance chain for a fragment.
   */
  resolveProvenanceChain(
    contentHash: string
  ): Promise<ProvenanceChainEntry[]>;

  /**
   * Check if a capability is allowed for a memory operation.
   */
  checkMemoryCapability(
    capability: Capability,
    scope: string,
    trust: TrustAssessment
  ): CapabilityCheckResult;
}
