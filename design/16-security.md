# Security Architecture

This document covers authentication, authorization, encryption, key management, and security best practices for the AlephNet-integrated Durable Agent Mesh.

## Identity & Authentication

### Dual-Layer Identity

```
┌─────────────────────────────────────────────────────────────────┐
│                    IDENTITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SEA LAYER (Gun.js)                        ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  • ECDSA/ECDH keypairs                                       ││
│  │  • Symmetric encryption (AES-GCM)                            ││
│  │  • Graph-level access control                                ││
│  │  • Session management                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 KEYTRIPLET LAYER (AlephNet)                  ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  • Ed25519 keypairs                                          ││
│  │  • 16-dim resonance field                                    ││
│  │  • Prime-based verification                                  ││
│  │  • Semantic trust scoring                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### User Registration Flow

```typescript
/**
 * Complete user registration flow
 */
export async function registerUser(
  gun: any,
  credentials: { username: string; password: string },
  options?: { displayName?: string }
): Promise<UserRegistration> {
  // 1. Generate SEA keypair
  const seaPair = await Gun.SEA.pair();
  
  // 2. Derive KeyTriplet from SEA
  const keyTriplet = await deriveKeyTriplet(seaPair);
  
  // 3. Create Gun user
  const user = await new Promise<any>((resolve, reject) => {
    gun.user().create(credentials.username, credentials.password, (ack: any) => {
      if (ack.err) reject(new Error(ack.err));
      else resolve(ack);
    });
  });
  
  // 4. Store user profile
  await gun.user().get('profile').put({
    alias: credentials.username,
    displayName: options?.displayName || credentials.username,
    createdAt: Date.now(),
    
    // AlephNet identity
    alephnet: {
      keyTriplet: {
        pub: keyTriplet.pub,
        resonance: keyTriplet.resonance,
        fingerprint: keyTriplet.fingerprint
      },
      stakingTier: 'Neophyte',
      alephBalance: 0,
      reputation: 0
    }
  });
  
  // 5. Register with AlephNet mesh
  await registerWithMesh(keyTriplet);
  
  return {
    userId: user.pub,
    keyTriplet,
    seaPair
  };
}

/**
 * Derive KeyTriplet from SEA keypair
 */
async function deriveKeyTriplet(seaPair: any): Promise<KeyTriplet> {
  // Use SEA private key as seed for Ed25519
  const seed = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(seaPair.priv)
  );
  
  // Generate Ed25519 keypair from seed
  const ed25519KeyPair = await generateEd25519FromSeed(new Uint8Array(seed));
  
  // Compute resonance field from public key
  const resonance = await computeResonanceField(ed25519KeyPair.publicKey);
  
  // Compute fingerprint
  const fingerprint = await computeFingerprint(ed25519KeyPair.publicKey);
  
  // Extract body primes from key material
  const bodyPrimes = extractBodyPrimes(new Uint8Array(seed));
  
  return {
    pub: base64Encode(ed25519KeyPair.publicKey),
    resonance,
    fingerprint,
    bodyPrimes
  };
}

/**
 * Compute 16-dimensional resonance field
 */
async function computeResonanceField(publicKey: Uint8Array): Promise<number[]> {
  const resonance = new Array(16).fill(0);
  
  // Use prime-based computation
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
  
  for (let i = 0; i < 16; i++) {
    let sum = 0;
    for (let j = 0; j < publicKey.length; j++) {
      sum += publicKey[j] * Math.sin(primes[i] * j / publicKey.length);
    }
    resonance[i] = Math.tanh(sum / publicKey.length);
  }
  
  return resonance;
}
```

### Session Management

```typescript
export interface Session {
  id: string;
  userId: string;
  keyTriplet: KeyTriplet;
  seaPair: any;
  createdAt: number;
  expiresAt: number;
  refreshToken: string;
  device: {
    id: string;
    type: 'BROWSER' | 'MOBILE' | 'SERVER';
    userAgent?: string;
  };
}

export interface SessionManager {
  /** Create new session */
  create(
    credentials: { username: string; password: string },
    device: Session['device']
  ): Promise<Session>;
  
  /** Validate and refresh session */
  validate(sessionId: string): Promise<Session | null>;
  
  /** Refresh session token */
  refresh(refreshToken: string): Promise<Session>;
  
  /** Revoke session */
  revoke(sessionId: string): Promise<void>;
  
  /** Revoke all sessions for user */
  revokeAll(userId: string): Promise<void>;
  
  /** List active sessions */
  listActive(userId: string): Promise<Session[]>;
}

class GunSessionManager implements SessionManager {
  private sessions = new Map<string, Session>();
  
  constructor(
    private gun: any,
    private config: {
      sessionTtlMs: number;
      refreshTtlMs: number;
    } = {
      sessionTtlMs: 24 * 60 * 60 * 1000,  // 24 hours
      refreshTtlMs: 30 * 24 * 60 * 60 * 1000  // 30 days
    }
  ) {}
  
  async create(
    credentials: { username: string; password: string },
    device: Session['device']
  ): Promise<Session> {
    // Authenticate with Gun
    const user = await new Promise<any>((resolve, reject) => {
      this.gun.user().auth(credentials.username, credentials.password, (ack: any) => {
        if (ack.err) reject(new AuthError('E_AUTH_INVALID', ack.err));
        else resolve(ack);
      });
    });
    
    // Get stored profile
    const profile = await new Promise<any>((resolve) => {
      this.gun.user().get('profile').once(resolve);
    });
    
    // Create session
    const session: Session = {
      id: generateSecureId(),
      userId: user.pub,
      keyTriplet: profile.alephnet.keyTriplet,
      seaPair: user.sea,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTtlMs,
      refreshToken: generateSecureId(),
      device
    };
    
    // Store session
    this.sessions.set(session.id, session);
    await this.persistSession(session);
    
    return session;
  }
  
  async validate(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId) || 
      await this.loadSession(sessionId);
    
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      await this.revoke(sessionId);
      return null;
    }
    
    return session;
  }
}
```

## Authorization

### Access Control Levels

```typescript
export type AccessLevel = 
  | 'PUBLIC'        // Anyone can access
  | 'AUTHENTICATED' // Logged in users
  | 'OWNER'         // Only the owner
  | 'FRIENDS'       // Owner and friends list
  | 'RESTRICTED'    // Specific allow list
  | 'TIER_GATED';   // Requires staking tier

export interface AccessPolicy {
  level: AccessLevel;
  allowList?: string[];  // For RESTRICTED
  requiredTier?: StakingTier;  // For TIER_GATED
  conditions?: AccessCondition[];
}

export interface AccessCondition {
  type: 'COHERENCE' | 'REPUTATION' | 'BALANCE' | 'CUSTOM';
  operator: '>' | '>=' | '=' | '<' | '<=' | 'IN';
  value: any;
}

/**
 * Check if user has access
 */
export async function checkAccess(
  policy: AccessPolicy,
  requester: {
    userId: string;
    keyTriplet: KeyTriplet;
    tier: StakingTier;
    reputation: number;
    balance: bigint;
  },
  resource: {
    ownerId: string;
    friendsList?: string[];
  }
): Promise<{ allowed: boolean; reason?: string }> {
  switch (policy.level) {
    case 'PUBLIC':
      return { allowed: true };
      
    case 'AUTHENTICATED':
      return { 
        allowed: !!requester.userId,
        reason: 'Authentication required'
      };
      
    case 'OWNER':
      return {
        allowed: requester.userId === resource.ownerId,
        reason: 'Owner access only'
      };
      
    case 'FRIENDS':
      const isFriend = resource.friendsList?.includes(requester.userId);
      return {
        allowed: requester.userId === resource.ownerId || isFriend,
        reason: 'Friends access only'
      };
      
    case 'RESTRICTED':
      return {
        allowed: policy.allowList?.includes(requester.userId) ?? false,
        reason: 'Not in allow list'
      };
      
    case 'TIER_GATED':
      const tierOrder = ['Neophyte', 'Adept', 'Magus', 'Archon'];
      const requiredIdx = tierOrder.indexOf(policy.requiredTier!);
      const userIdx = tierOrder.indexOf(requester.tier);
      return {
        allowed: userIdx >= requiredIdx,
        reason: `Requires ${policy.requiredTier} tier`
      };
  }
  
  // Check additional conditions
  if (policy.conditions) {
    for (const condition of policy.conditions) {
      const result = evaluateCondition(condition, requester);
      if (!result.allowed) return result;
    }
  }
  
  return { allowed: true };
}
```

### Resource-Level Permissions

```typescript
/**
 * Permission definitions for different resources
 */
export const RESOURCE_PERMISSIONS = {
  conversation: {
    read: ['OWNER', 'FRIENDS', 'ASSIGNED_SERVER'],
    write: ['OWNER', 'ASSIGNED_SERVER'],
    delete: ['OWNER']
  },
  content: {
    read: ['OWNER', 'VISIBILITY_MATCH'],
    write: ['OWNER'],
    delete: ['OWNER']
  },
  service: {
    call: ['AUTHENTICATED', 'ACCESS_MATCH'],
    register: ['ADEPT_OR_HIGHER'],
    update: ['OWNER'],
    delete: ['OWNER']
  },
  task: {
    execute: ['TRIGGER_MATCH'],
    define: ['ADEPT_OR_HIGHER'],
    update: ['OWNER'],
    delete: ['OWNER']
  },
  gmf: {
    query: ['AUTHENTICATED'],
    propose: ['ADEPT_OR_HIGHER'],
    vote: ['MAGUS_OR_HIGHER']
  }
};

/**
 * Middleware for checking permissions
 */
export function requirePermission(
  resource: keyof typeof RESOURCE_PERMISSIONS,
  action: string
): MiddlewareFunction {
  return async (context, next) => {
    const requiredRoles = RESOURCE_PERMISSIONS[resource][action];
    const hasPermission = await checkResourcePermission(
      context.user,
      context.resource,
      requiredRoles
    );
    
    if (!hasPermission.allowed) {
      throw new AuthError('E_AUTH_FORBIDDEN', hasPermission.reason);
    }
    
    return next();
  };
}
```

## Encryption

### Content Encryption

```typescript
/**
 * Encryption service for content
 */
export interface EncryptionService {
  /** Encrypt content for a single recipient */
  encrypt(
    content: string | Uint8Array,
    recipientPub: string
  ): Promise<EncryptedContent>;
  
  /** Encrypt content for multiple recipients */
  encryptForGroup(
    content: string | Uint8Array,
    recipientPubs: string[]
  ): Promise<GroupEncryptedContent>;
  
  /** Decrypt content */
  decrypt(
    encrypted: EncryptedContent | GroupEncryptedContent,
    privateKey: string
  ): Promise<Uint8Array>;
  
  /** Re-encrypt for new recipient */
  reEncrypt(
    encrypted: EncryptedContent,
    newRecipientPub: string,
    ownerPrivateKey: string
  ): Promise<EncryptedContent>;
}

export interface EncryptedContent {
  ciphertext: string;
  nonce: string;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  recipientPub: string;
  ephemeralPub: string;
  mac: string;
}

export interface GroupEncryptedContent {
  /** Encrypted content (same for all recipients) */
  ciphertext: string;
  nonce: string;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  
  /** Per-recipient encrypted content key */
  keys: Record<string, {
    encryptedKey: string;
    ephemeralPub: string;
  }>;
}

class AlephEncryptionService implements EncryptionService {
  constructor(private keyTriplet: KeyTriplet) {}
  
  async encrypt(
    content: string | Uint8Array,
    recipientPub: string
  ): Promise<EncryptedContent> {
    const contentBytes = typeof content === 'string' 
      ? new TextEncoder().encode(content) 
      : content;
    
    // Generate ephemeral key for ECDH
    const ephemeralKey = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    
    // Derive shared secret
    const recipientKey = await importPublicKey(recipientPub);
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientKey },
      ephemeralKey.privateKey,
      256
    );
    
    // Generate content key from shared secret
    const contentKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt content
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      contentKey,
      contentBytes
    );
    
    return {
      ciphertext: base64Encode(new Uint8Array(ciphertext)),
      nonce: base64Encode(nonce),
      algorithm: 'AES-256-GCM',
      recipientPub,
      ephemeralPub: await exportPublicKey(ephemeralKey.publicKey),
      mac: '' // Included in AES-GCM
    };
  }
  
  async encryptForGroup(
    content: string | Uint8Array,
    recipientPubs: string[]
  ): Promise<GroupEncryptedContent> {
    const contentBytes = typeof content === 'string'
      ? new TextEncoder().encode(content)
      : content;
    
    // Generate random content key
    const contentKey = crypto.getRandomValues(new Uint8Array(32));
    
    // Encrypt content with content key
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const importedKey = await crypto.subtle.importKey(
      'raw',
      contentKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      importedKey,
      contentBytes
    );
    
    // Encrypt content key for each recipient
    const keys: GroupEncryptedContent['keys'] = {};
    
    for (const recipientPub of recipientPubs) {
      const ephemeralKey = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
      );
      
      const recipientKey = await importPublicKey(recipientPub);
      const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: recipientKey },
        ephemeralKey.privateKey,
        256
      );
      
      const wrappingKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const keyNonce = crypto.getRandomValues(new Uint8Array(12));
      const encryptedKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: keyNonce },
        wrappingKey,
        contentKey
      );
      
      keys[recipientPub] = {
        encryptedKey: base64Encode(new Uint8Array(encryptedKey)) + ':' + base64Encode(keyNonce),
        ephemeralPub: await exportPublicKey(ephemeralKey.publicKey)
      };
    }
    
    return {
      ciphertext: base64Encode(new Uint8Array(ciphertext)),
      nonce: base64Encode(nonce),
      algorithm: 'AES-256-GCM',
      keys
    };
  }
}
```

### Key Management

```typescript
/**
 * Key derivation and management
 */
export interface KeyManager {
  /** Derive content encryption key */
  deriveContentKey(
    contentId: string,
    purpose: 'encrypt' | 'sign'
  ): Promise<CryptoKey>;
  
  /** Derive session key */
  deriveSessionKey(
    sessionId: string,
    counterpartyPub: string
  ): Promise<CryptoKey>;
  
  /** Rotate keys */
  rotateKeys(): Promise<KeyRotationResult>;
  
  /** Export keys for backup */
  exportKeys(password: string): Promise<EncryptedKeyBackup>;
  
  /** Import keys from backup */
  importKeys(backup: EncryptedKeyBackup, password: string): Promise<void>;
}

export interface KeyRotationResult {
  previousKeyId: string;
  newKeyId: string;
  rotatedAt: number;
  affectedResources: number;
}

/**
 * Hierarchical deterministic key derivation
 */
export class HDKeyManager implements KeyManager {
  private masterKey: CryptoKey;
  private derivationPath: string;
  
  constructor(
    private seed: Uint8Array,
    derivationPath: string = "m/44'/0'/0'"
  ) {
    this.derivationPath = derivationPath;
  }
  
  async initialize(): Promise<void> {
    // Derive master key from seed using HKDF
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.seed,
      'HKDF',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    this.masterKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('alephnet-master'),
        info: new TextEncoder().encode(this.derivationPath)
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  async deriveContentKey(
    contentId: string,
    purpose: 'encrypt' | 'sign'
  ): Promise<CryptoKey> {
    const masterBytes = await crypto.subtle.exportKey('raw', this.masterKey);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      masterBytes,
      'HKDF',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode(contentId),
        info: new TextEncoder().encode(`content-${purpose}`)
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      purpose === 'encrypt' ? ['encrypt', 'decrypt'] : ['sign', 'verify']
    );
  }
}
```

## Signature Verification

```typescript
/**
 * Dual signature verification (SEA + KeyTriplet)
 */
export interface SignatureVerifier {
  /** Verify SEA signature */
  verifySEA(
    data: any,
    signature: string,
    publicKey: string
  ): Promise<boolean>;
  
  /** Verify KeyTriplet signature */
  verifyKeyTriplet(
    data: any,
    signature: string,
    keyTriplet: KeyTriplet
  ): Promise<boolean>;
  
  /** Verify resonance (semantic trust) */
  verifyResonance(
    resonanceKey: { primes: number[]; hash: string; timestamp: number },
    keyTriplet: KeyTriplet,
    content: string
  ): Promise<boolean>;
}

class AlephSignatureVerifier implements SignatureVerifier {
  async verifySEA(
    data: any,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    return Gun.SEA.verify(data, publicKey) === signature;
  }
  
  async verifyKeyTriplet(
    data: any,
    signature: string,
    keyTriplet: KeyTriplet
  ): Promise<boolean> {
    const publicKey = await importEd25519PublicKey(keyTriplet.pub);
    const dataBytes = new TextEncoder().encode(JSON.stringify(data));
    const signatureBytes = base64Decode(signature);
    
    return crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      signatureBytes,
      dataBytes
    );
  }
  
  async verifyResonance(
    resonanceKey: { primes: number[]; hash: string; timestamp: number },
    keyTriplet: KeyTriplet,
    content: string
  ): Promise<boolean> {
    // 1. Verify timestamp is recent (within 5 minutes)
    if (Math.abs(Date.now() - resonanceKey.timestamp) > 5 * 60 * 1000) {
      return false;
    }
    
    // 2. Verify hash matches content + timestamp
    const expectedHash = await computeResonanceHash(
      content,
      resonanceKey.timestamp,
      resonanceKey.primes
    );
    if (expectedHash !== resonanceKey.hash) {
      return false;
    }
    
    // 3. Verify primes are consistent with KeyTriplet
    const expectedPrimes = keyTriplet.bodyPrimes || 
      await extractPrimesFromResonance(keyTriplet.resonance);
    
    const overlap = resonanceKey.primes.filter(p => expectedPrimes.includes(p));
    const overlapRatio = overlap.length / resonanceKey.primes.length;
    
    return overlapRatio >= 0.5;  // At least 50% overlap
  }
}
```

## Security Best Practices

### Input Validation

```typescript
/**
 * Input validation schemas
 */
export const ValidationSchemas = {
  username: {
    type: 'string',
    minLength: 3,
    maxLength: 32,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  
  password: {
    type: 'string',
    minLength: 12,
    maxLength: 128,
    // At least one uppercase, lowercase, number, special char
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
  },
  
  nodeId: {
    type: 'string',
    length: 32,
    pattern: /^[a-f0-9]+$/
  },
  
  smfVector: {
    type: 'array',
    length: 16,
    items: { type: 'number', min: -1, max: 1 }
  }
};

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string, context: 'text' | 'html' | 'json'): string {
  switch (context) {
    case 'text':
      // Remove control characters
      return input.replace(/[\x00-\x1F\x7F]/g, '');
      
    case 'html':
      // Escape HTML entities
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
        
    case 'json':
      // Ensure valid JSON string
      return JSON.stringify(input).slice(1, -1);
  }
}
```

### Rate Limiting

```typescript
/**
 * Distributed rate limiter
 */
export interface RateLimiter {
  /** Check if request is allowed */
  check(key: string, limit: RateLimit): Promise<RateLimitResult>;
  
  /** Consume a token */
  consume(key: string, cost?: number): Promise<boolean>;
  
  /** Reset limit for key */
  reset(key: string): Promise<void>;
  
  /** Get current state */
  getState(key: string): Promise<RateLimitState>;
}

export interface RateLimit {
  points: number;
  duration: number;  // seconds
  blockDuration?: number;  // seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Gun.js-backed rate limiter
 */
class GunRateLimiter implements RateLimiter {
  constructor(private gun: any) {}
  
  async check(key: string, limit: RateLimit): Promise<RateLimitResult> {
    const state = await this.getState(key);
    const now = Date.now();
    
    // Reset if window expired
    if (now > state.resetAt) {
      state.consumed = 0;
      state.resetAt = now + limit.duration * 1000;
    }
    
    const remaining = Math.max(0, limit.points - state.consumed);
    
    return {
      allowed: remaining > 0 && !state.blocked,
      remaining,
      resetAt: state.resetAt,
      retryAfter: state.blocked ? state.blockedUntil - now : undefined
    };
  }
  
  async consume(key: string, cost = 1): Promise<boolean> {
    const state = await this.getState(key);
    state.consumed += cost;
    await this.saveState(key, state);
    return true;
  }
  
  async getState(key: string): Promise<RateLimitState> {
    return new Promise((resolve) => {
      this.gun.get('ratelimits').get(key).once((data: any) => {
        resolve(data || {
          consumed: 0,
          resetAt: Date.now() + 60000,
          blocked: false,
          blockedUntil: 0
        });
      });
    });
  }
  
  private async saveState(key: string, state: RateLimitState): Promise<void> {
    await this.gun.get('ratelimits').get(key).put(state);
  }
}
```

### Audit Logging

```typescript
/**
 * Security audit log
 */
export interface AuditLog {
  /** Log security event */
  log(event: AuditEvent): Promise<void>;
  
  /** Query audit log */
  query(options: AuditQueryOptions): Promise<AuditEvent[]>;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  actor: {
    userId?: string;
    nodeId?: string;
    ip?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details?: Record<string, any>;
  riskScore?: number;
}

export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'DATA_READ'
  | 'DATA_WRITE'
  | 'DATA_DELETE'
  | 'KEY_GENERATED'
  | 'KEY_ROTATED'
  | 'RATE_LIMITED'
  | 'SUSPICIOUS_ACTIVITY';
```
