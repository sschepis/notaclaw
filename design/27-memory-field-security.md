# Memory Field Security Architecture

## Overview

This document specifies the provenance, validation, and security model for Memory Fields in the AlephNet Distributed Sentience Network. Memory Fields are semantic containers that store fragments of knowledge across scopes (global, user, conversation, organization). This architecture ensures:

1. **Provenance** - Every fragment has cryptographically verifiable origin
2. **Validation** - Content integrity and semantic coherence are enforced
3. **Security** - Access control, encryption, and capability gating protect sensitive memories

---

## 1. Provenance Model

### 1.1 Signed Memory Fragments

Every `MemoryFragment` must be wrapped in a `SignedEnvelope` to establish provenance:

```typescript
// New artifact type for memory content
export type ArtifactType = 
  | ... existing types ...
  | 'memory-fragment'
  | 'memory-field-definition';

// Extended MemoryFragment with provenance
export interface SignedMemoryFragment {
  fragment: MemoryFragment;
  envelope: SignedEnvelope<MemoryFragment>;
  provenanceChain: ProvenanceChainEntry[];
}

export interface ProvenanceChainEntry {
  operation: 'created' | 'modified' | 'folded' | 'endorsed' | 'verified';
  actorFingerprint: string;
  timestamp: number;
  previousHash?: string;
  signature: string;
}
```

### 1.2 Fragment Authorship

When a fragment is created:

1. Content is canonicalized (sorted-key JSON → UTF-8)
2. SHA-256 hash computed as `contentHash`
3. User's Ed25519 key signs the `contentHash`
4. Optional SEA co-signature for Gun.js verification
5. Resonance proof binds content to author's key material

```typescript
async function createFragment(
  fieldId: string, 
  content: string,
  significance: number,
  identityManager: IdentityManager,
  envelopeService: ISignedEnvelopeService
): Promise<SignedMemoryFragment> {
  const fragment: MemoryFragment = {
    id: generateId('frag'),
    fieldId,
    content,
    significance,
    primeFactors: computePrimeFactors(content),
    metadata: {},
    timestamp: Date.now()
  };
  
  const envelope = await envelopeService.create(
    fragment,
    'memory-fragment',
    '1.0.0',
    ['store:write'], // Required capabilities
    undefined // No parent for new fragments
  );
  
  return {
    fragment,
    envelope,
    provenanceChain: [{
      operation: 'created',
      actorFingerprint: envelope.author.fingerprint,
      timestamp: envelope.createdAt,
      signature: envelope.signature
    }]
  };
}
```

### 1.3 Fold Provenance

When conversation memory is folded into user memory:

1. Source fragments retain their original envelopes
2. New "fold" envelope wraps the sync operation
3. Target fragments reference source via `parentEnvelopeHash`
4. Provenance chain is appended, not replaced

```typescript
interface FoldOperation {
  sourceFieldId: string;
  targetFieldId: string;
  fragmentMappings: Array<{
    sourceEnvelopeHash: string;
    targetEnvelopeHash: string;
  }>;
  foldedBy: AuthorIdentity;
  foldedAt: number;
  signature: string;
}

async function foldFragment(
  sourceEnvelope: SignedEnvelope<MemoryFragment>,
  targetFieldId: string,
  foldingIdentity: AuthorIdentity
): Promise<SignedMemoryFragment> {
  // Create new fragment in target field
  const targetFragment = {
    ...sourceEnvelope.payload,
    id: generateId('frag'),
    fieldId: targetFieldId,
    metadata: {
      ...sourceEnvelope.payload.metadata,
      syncedFrom: sourceEnvelope.payload.fieldId,
      originalFragmentId: sourceEnvelope.payload.id,
      originalEnvelopeHash: sourceEnvelope.contentHash,
      syncedAt: Date.now()
    }
  };
  
  // New envelope references source as parent
  const targetEnvelope = await envelopeService.create(
    targetFragment,
    'memory-fragment',
    '1.0.0',
    ['store:write'],
    sourceEnvelope.contentHash // parentEnvelopeHash
  );
  
  // Merge provenance chains
  return {
    fragment: targetFragment,
    envelope: targetEnvelope,
    provenanceChain: [
      ...getProvenanceChain(sourceEnvelope),
      {
        operation: 'folded',
        actorFingerprint: foldingIdentity.fingerprint,
        timestamp: Date.now(),
        previousHash: sourceEnvelope.contentHash,
        signature: targetEnvelope.signature
      }
    ]
  };
}
```

### 1.4 Verification Workflows

| Scenario | Verification Required |
|----------|----------------------|
| Display fragment | Ed25519 signature check |
| Fold to user memory | Full envelope verification |
| Contribute to global | Resonance proof + endorsements |
| Share externally | Complete provenance chain validation |

---

## 2. Validation Model

### 2.1 Content Integrity

**Hash-based deduplication** prevents duplicate content but is insufficient for security:

```typescript
// Current: Simple hash
private hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Required: Cryptographic hash
function computeContentHash(content: string): string {
  return crypto.createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}
```

### 2.2 Semantic Validation

Fragments must pass semantic coherence checks:

```typescript
interface SemanticValidation {
  // Prime factors must align with field signature
  primeAlignment: number; // 0.0 - 1.0
  
  // Content must have minimum entropy (not spam)
  entropyScore: number; // bits per character
  
  // Significance claim must be justified
  significanceVerified: boolean;
  
  // Content must not be gibberish
  coherenceScore: number; // 0.0 - 1.0
}

async function validateFragment(
  fragment: MemoryFragment,
  field: MemoryField
): Promise<SemanticValidation> {
  // Prime alignment: dot product of fragment primes vs field signature
  const primeAlignment = computePrimeAlignment(
    fragment.primeFactors,
    field.primeSignature
  );
  
  // Entropy: Shannon entropy of content
  const entropyScore = computeShannonEntropy(fragment.content);
  
  // Significance: requires verification if > 0.7
  const significanceVerified = fragment.significance < 0.7 || 
    await verifySignificance(fragment);
  
  // Coherence: semantic similarity to field's existing content
  const coherenceScore = await computeCoherence(fragment, field);
  
  return { primeAlignment, entropyScore, significanceVerified, coherenceScore };
}
```

### 2.3 Consensus Validation for Global Fields

Global-scoped fields require multi-node verification:

```typescript
interface ConsensusValidation {
  // Number of nodes that verified
  verifierCount: number;
  
  // Agreement threshold (from field.consensusThreshold)
  threshold: number;
  
  // Actual agreement percentage
  agreement: number;
  
  // Verification task ID if created
  taskId?: string;
}

async function validateForGlobal(
  fragment: SignedMemoryFragment,
  field: MemoryField
): Promise<ConsensusValidation> {
  if (field.scope !== 'global') {
    throw new Error('Consensus validation only for global fields');
  }
  
  // Create verification task
  const task = await coherenceNetwork.submitClaim({
    statement: `Fragment ${fragment.envelope.contentHash} belongs in field ${field.id}`,
    evidence: {
      primeAlignment: fragment.primeFactors,
      significance: fragment.fragment.significance
    }
  });
  
  // Wait for consensus (async)
  return {
    verifierCount: 0,
    threshold: field.consensusThreshold,
    agreement: 0,
    taskId: task.id
  };
}
```

### 2.4 Validation Rules Matrix

| Scope | Signature | Prime Alignment | Entropy | Coherence | Consensus |
|-------|-----------|-----------------|---------|-----------|-----------|
| conversation | ✓ | Optional | > 1.0 | > 0.3 | — |
| user | ✓ | > 0.5 | > 2.0 | > 0.5 | — |
| organization | ✓ | > 0.7 | > 2.5 | > 0.6 | 3+ nodes |
| global | ✓ | > 0.8 | > 3.0 | > 0.7 | consensusThreshold |

---

## 3. Security Model

### 3.1 Memory Capabilities

Extend the capability system for memory operations:

```typescript
export type Capability =
  | ... existing capabilities ...
  | 'memory:read'           // Read any field user has access to
  | 'memory:write'          // Write to owned fields
  | 'memory:contribute'     // Contribute to shared/global fields
  | 'memory:fold'           // Fold conversation memory
  | 'memory:share'          // Share fields with others
  | 'memory:create-field'   // Create new memory fields
  | 'memory:delete-field'   // Delete owned fields
  | 'memory:admin';         // Full control (for organization admins)
```

### 3.2 Access Control by Scope

```typescript
interface MemoryAccessRules {
  scope: MemoryScope;
  visibility: Visibility;
  allowedOperations: Map<string, Capability[]>;
}

const ACCESS_RULES: Record<MemoryScope, MemoryAccessRules> = {
  global: {
    scope: 'global',
    visibility: 'public',
    allowedOperations: new Map([
      ['read', ['memory:read']],
      ['write', ['memory:contribute', 'memory:admin']],
      ['delete', ['memory:admin']]
    ])
  },
  user: {
    scope: 'user',
    visibility: 'private',
    allowedOperations: new Map([
      ['read', ['memory:read']],  // Owner only
      ['write', ['memory:write']],
      ['delete', ['memory:delete-field']]
    ])
  },
  conversation: {
    scope: 'conversation',
    visibility: 'private',
    allowedOperations: new Map([
      ['read', ['memory:read']],  // Conversation participants
      ['write', ['memory:write']],
      ['fold', ['memory:fold']],
      ['delete', ['memory:delete-field']]
    ])
  },
  organization: {
    scope: 'organization',
    visibility: 'restricted',
    allowedOperations: new Map([
      ['read', ['memory:read']],  // Organization members
      ['write', ['memory:contribute']],
      ['delete', ['memory:admin']]
    ])
  }
};
```

### 3.3 Trust-Gated Memory Operations

Integrate with TrustGate for capability enforcement:

```typescript
async function gatedMemoryOperation<T>(
  operation: () => Promise<T>,
  requiredCapability: Capability,
  envelope: SignedEnvelope<any>,
  trustGate: ITrustGate,
  trustEvaluator: ITrustEvaluator
): Promise<T> {
  // Evaluate trust of the requesting envelope
  const assessment = await trustEvaluator.evaluate(envelope);
  
  // Check capability
  const check = trustGate.check(requiredCapability, assessment);
  
  switch (check.decision) {
    case 'ALLOW':
      return operation();
    
    case 'CONFIRM':
      // Emit confirmation request to UI
      const confirmed = await requestUserConfirmation({
        capability: requiredCapability,
        reason: check.reason,
        trustLevel: assessment.level
      });
      if (confirmed) return operation();
      throw new Error('User denied capability');
    
    case 'DENY':
      throw new Error(`Capability ${requiredCapability} denied: ${check.reason}`);
  }
}
```

### 3.4 Encryption for Private Fields

Private memory fields use Gun.js SEA encryption:

```typescript
interface EncryptedFragment {
  // Encrypted payload (AES-256-GCM)
  ciphertext: string;
  
  // Nonce for decryption
  nonce: string;
  
  // Key wrapped for each authorized reader
  keyWraps: Array<{
    readerFingerprint: string;
    wrappedKey: string; // ECDH shared secret
  }>;
}

async function encryptFragment(
  fragment: MemoryFragment,
  authorizedReaders: AuthorIdentity[],
  authorSEAKeys: any
): Promise<EncryptedFragment> {
  // Generate symmetric key
  const symmetricKey = crypto.randomBytes(32);
  
  // Encrypt content
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(fragment), 'utf8'),
    cipher.final(),
    cipher.getAuthTag()
  ]).toString('base64');
  
  // Wrap key for each reader using ECDH
  const keyWraps = await Promise.all(
    authorizedReaders.map(async (reader) => ({
      readerFingerprint: reader.fingerprint,
      wrappedKey: await SEA.encrypt(
        symmetricKey.toString('base64'),
        await SEA.secret(reader.pub, authorSEAKeys)
      )
    }))
  );
  
  return { ciphertext, nonce: nonce.toString('base64'), keyWraps };
}
```

### 3.5 Sharing Security

When sharing a memory field:

1. Create access grant signed by owner
2. Add recipient to keyWraps for encrypted fields
3. Redact sensitive metadata (conversation origins)
4. Generate new envelope with sharing permissions

```typescript
interface MemoryShareGrant {
  fieldId: string;
  grantedTo: AuthorIdentity;
  grantedBy: AuthorIdentity;
  permissions: ('read' | 'write' | 'reshare')[];
  expiresAt?: number;
  signature: string;
}

async function shareField(
  field: MemoryField,
  recipient: AuthorIdentity,
  permissions: ('read' | 'write' | 'reshare')[],
  ownerIdentity: IdentityManager
): Promise<MemoryShareGrant> {
  const grant: MemoryShareGrant = {
    fieldId: field.id,
    grantedTo: recipient,
    grantedBy: await ownerIdentity.getPublicIdentity(),
    permissions,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days default
    signature: '' // Filled below
  };
  
  // Sign the grant
  grant.signature = await ownerIdentity.sign(
    JSON.stringify({ ...grant, signature: undefined })
  );
  
  // If encrypted field, re-wrap keys
  if (field.visibility === 'private') {
    await addReaderToField(field.id, recipient);
  }
  
  return grant;
}
```

---

## 4. Additional Security Considerations

### 4.1 Replay Attack Prevention

Fragments include monotonic epoch counters:

```typescript
interface ReplayProtection {
  epoch: number;           // Monotonically increasing
  nonce: string;           // One-time use
  expiresAt: number;       // Validity window
}

async function validateReplay(fragment: SignedMemoryFragment): Promise<boolean> {
  const protection = fragment.fragment.metadata.replayProtection as ReplayProtection;
  
  // Check expiry
  if (Date.now() > protection.expiresAt) {
    return false;
  }
  
  // Check nonce hasn't been used
  const nonceKey = `nonce:${fragment.envelope.contentHash}`;
  if (await nonceStore.has(nonceKey)) {
    return false;
  }
  
  // Check epoch is increasing
  const lastEpoch = await epochStore.get(fragment.envelope.author.fingerprint) || 0;
  if (protection.epoch <= lastEpoch) {
    return false;
  }
  
  // Store nonce and update epoch
  await nonceStore.set(nonceKey, Date.now());
  await epochStore.set(fragment.envelope.author.fingerprint, protection.epoch);
  
  return true;
}
```

### 4.2 Privacy-Preserving Fold

When folding, redact origin metadata:

```typescript
interface PrivacyConfig {
  redactConversationId: boolean;
  redactParticipants: boolean;
  redactTimestamps: boolean;
  preserveProvenance: boolean; // Keep signatures but not context
}

function sanitizeForFold(
  fragment: MemoryFragment,
  config: PrivacyConfig
): MemoryFragment {
  const sanitized = { ...fragment };
  
  if (config.redactConversationId) {
    delete sanitized.metadata.conversationId;
    delete sanitized.metadata.originalFieldId;
  }
  
  if (config.redactParticipants) {
    delete sanitized.metadata.participants;
  }
  
  if (config.redactTimestamps) {
    // Replace with epoch-day granularity
    sanitized.timestamp = Math.floor(fragment.timestamp / 86400000) * 86400000;
  }
  
  return sanitized;
}
```

### 4.3 Entropy Drift Control

Limit entropy accumulation during folds:

```typescript
interface EntropyBudget {
  maxFieldEntropy: number;       // Default: 0.9
  maxFragmentEntropy: number;    // Default: 0.1 per fragment
  coolingRate: number;           // Entropy reduction per hour
}

function computeEntropyDelta(
  syncedCount: number,
  targetField: MemoryField,
  budget: EntropyBudget
): number {
  // Base entropy per fragment
  const baseEntropy = syncedCount * 0.02;
  
  // Apply diminishing returns near max
  const headroom = budget.maxFieldEntropy - targetField.entropy;
  const scaledEntropy = baseEntropy * Math.min(1, headroom / 0.5);
  
  return Math.min(scaledEntropy, budget.maxFragmentEntropy * syncedCount);
}

async function applyEntropyCooling(field: MemoryField): Promise<void> {
  const hoursSinceUpdate = (Date.now() - field.updatedAt) / 3600000;
  const coolingAmount = hoursSinceUpdate * 0.01; // 1% per hour
  
  field.entropy = Math.max(0, field.entropy - coolingAmount);
}
```

### 4.4 Garbage Collection

Low-significance fragments are pruned:

```typescript
interface GCPolicy {
  minRetentionDays: number;      // Never delete younger than this
  significanceThreshold: number; // Below this, eligible for GC
  maxFragmentsPerField: number;  // Hard limit
  quotaBytes: number;            // Storage quota per user
}

async function garbageCollect(
  field: MemoryField,
  fragments: SignedMemoryFragment[],
  policy: GCPolicy
): Promise<string[]> {
  const now = Date.now();
  const minAge = policy.minRetentionDays * 24 * 60 * 60 * 1000;
  
  // Sort by significance (ascending)
  const sorted = fragments
    .filter(f => now - f.fragment.timestamp > minAge)
    .sort((a, b) => a.fragment.significance - b.fragment.significance);
  
  // Find fragments to delete
  const toDelete: string[] = [];
  let totalSize = fragments.reduce((sum, f) => sum + f.fragment.content.length, 0);
  
  for (const fragment of sorted) {
    if (fragments.length - toDelete.length <= policy.maxFragmentsPerField &&
        totalSize <= policy.quotaBytes) {
      break;
    }
    
    if (fragment.fragment.significance < policy.significanceThreshold) {
      toDelete.push(fragment.fragment.id);
      totalSize -= fragment.fragment.content.length;
    }
  }
  
  return toDelete;
}
```

---

## 5. Implementation Roadmap

### Phase 1: Provenance Foundation
- [ ] Add `memory-fragment` artifact type
- [ ] Wrap fragment creation in SignedEnvelopeService
- [ ] Store provenance chain in metadata
- [ ] Update fold operation to reference parent envelope

### Phase 2: Validation Integration
- [ ] Implement cryptographic content hash
- [ ] Add prime alignment calculation
- [ ] Integrate coherence scoring
- [ ] Create verification tasks for global contributions

### Phase 3: Security Hardening
- [ ] Add memory capabilities to trust-types
- [ ] Wire TrustGate to memory IPC handlers
- [ ] Implement SEA encryption for private fields
- [ ] Add share grant mechanism

### Phase 4: Advanced Security
- [ ] Replay attack prevention
- [ ] Privacy-preserving fold
- [ ] Entropy budget enforcement
- [ ] Garbage collection with provenance preservation

---

## 6. Migration Strategy

Existing memory fields created before this security model must be migrated:

1. **Inventory**: Catalog all existing fragments without envelopes
2. **Backfill**: Generate envelopes signed by system key with `MIGRATED` flag
3. **Validate**: Run semantic validation on all fragments
4. **Encrypt**: Re-encrypt private fields with SEA
5. **Audit**: Log migration for each field

```typescript
interface MigrationRecord {
  fieldId: string;
  fragmentCount: number;
  migratedAt: number;
  systemSignature: string;
  validationResult: SemanticValidation;
}
```

---

## References

- [design/23-provenance-trust.md](./23-provenance-trust.md) - Trust & Provenance spec
- [design/16-security.md](./16-security.md) - Security architecture
- [design/25-memory-field-ui.md](./25-memory-field-ui.md) - Memory Field UI spec
- [client/src/shared/trust-types.ts](../client/src/shared/trust-types.ts) - Trust type definitions
