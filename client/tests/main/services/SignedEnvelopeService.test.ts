import crypto from 'crypto';
import { SignedEnvelopeService } from '../../../src/main/services/SignedEnvelopeService';
import { IdentityManager } from '../../../src/main/services/IdentityManager';
import type { SignedEnvelope } from '../../../src/shared/trust-types';

// ─── Real Ed25519 keypair for deterministic tests ────────────────────────

const testKeyPair = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function stripPem(pem: string): string {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s/g, '');
}

const testPub = stripPem(testKeyPair.publicKey);
const testPriv = stripPem(testKeyPair.privateKey);
const testFingerprint = crypto
  .createHash('sha256')
  .update(testPub)
  .digest('hex')
  .substring(0, 16);
const testResonance = Array.from({ length: 16 }, (_, i) => i * 0.0625);
const testBodyPrimes = [2, 3, 5, 7, 11, 13, 17, 19];

const mockStoredIdentity = {
  pub: testPub,
  priv: testPriv,
  fingerprint: testFingerprint,
  resonance: testResonance,
  bodyPrimes: testBodyPrimes,
};

// ─── Second keypair for endorsement tests ────────────────────────────────

const endorserKeyPair = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const endorserPub = stripPem(endorserKeyPair.publicKey);
const endorserPriv = stripPem(endorserKeyPair.privateKey);
const endorserFingerprint = crypto
  .createHash('sha256')
  .update(endorserPub)
  .digest('hex')
  .substring(0, 16);
const endorserResonance = Array.from({ length: 16 }, (_, i) => (i + 1) * 0.0625);

const mockEndorserIdentity = {
  pub: endorserPub,
  priv: endorserPriv,
  fingerprint: endorserFingerprint,
  resonance: endorserResonance,
  bodyPrimes: [2, 3, 5, 7, 11, 13, 17, 19],
};

// ─── Mock IdentityManager ────────────────────────────────────────────────

function createMockIdentityManager(identity: typeof mockStoredIdentity | null = mockStoredIdentity) {
  return {
    getIdentity: jest.fn().mockResolvedValue(identity),
    getPublicIdentity: jest.fn().mockResolvedValue(
      identity ? { pub: identity.pub, fingerprint: identity.fingerprint, resonance: identity.resonance } : null
    ),
    checkIdentity: jest.fn().mockResolvedValue(!!identity),
    createIdentity: jest.fn(),
    importIdentity: jest.fn(),
  } as unknown as IdentityManager;
}

// ─── Test payload ────────────────────────────────────────────────────────

interface TestPayload {
  name: string;
  description: string;
  value: number;
}

const testPayload: TestPayload = {
  name: 'test-artifact',
  description: 'A test artifact for unit testing',
  value: 42,
};

// ═════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════

describe('SignedEnvelopeService', () => {
  let service: SignedEnvelopeService;
  let mockIdentityManager: IdentityManager;

  beforeEach(() => {
    mockIdentityManager = createMockIdentityManager();
    service = new SignedEnvelopeService(mockIdentityManager);
  });

  // ─── computeContentHash ──────────────────────────────────────────────

  describe('computeContentHash', () => {
    it('should produce a deterministic SHA-256 hex hash', () => {
      const hash = service.computeContentHash(testPayload);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce the same hash for the same payload', () => {
      const hash1 = service.computeContentHash(testPayload);
      const hash2 = service.computeContentHash({ ...testPayload });

      expect(hash1).toBe(hash2);
    });

    it('should produce the same hash regardless of property order', () => {
      const payload1 = { a: 1, b: 2, c: 3 };
      const payload2 = { c: 3, a: 1, b: 2 };

      const hash1 = service.computeContentHash(payload1);
      const hash2 = service.computeContentHash(payload2);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different payloads', () => {
      const hash1 = service.computeContentHash({ value: 1 });
      const hash2 = service.computeContentHash({ value: 2 });

      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested objects with sorted keys', () => {
      const nested1 = { outer: { b: 2, a: 1 }, name: 'test' };
      const nested2 = { name: 'test', outer: { a: 1, b: 2 } };

      expect(service.computeContentHash(nested1)).toBe(
        service.computeContentHash(nested2)
      );
    });

    it('should handle arrays (order preserved)', () => {
      const arr1 = { items: [1, 2, 3] };
      const arr2 = { items: [3, 2, 1] };

      expect(service.computeContentHash(arr1)).not.toBe(
        service.computeContentHash(arr2)
      );
    });
  });

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a valid signed envelope', async () => {
      const envelope = await service.create(
        testPayload,
        'plugin',
        '1.0.0',
        ['network:http', 'store:read']
      );

      expect(envelope.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(envelope.payload).toEqual(testPayload);
      expect(envelope.artifactType).toBe('plugin');
      expect(envelope.version).toBe('1.0.0');
      expect(envelope.author.pub).toBe(testPub);
      expect(envelope.author.fingerprint).toBe(testFingerprint);
      expect(envelope.author.resonance).toEqual(testResonance);
      expect(envelope.signature).toBeTruthy();
      expect(envelope.resonanceProof.primes.length).toBeGreaterThan(0);
      expect(envelope.resonanceProof.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(envelope.endorsements).toEqual([]);
      expect(envelope.requestedCapabilities).toEqual(['network:http', 'store:read']);
      expect(envelope.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should set parentEnvelopeHash when provided', async () => {
      const parentHash = 'abc123def456';
      const envelope = await service.create(
        testPayload,
        'prompt',
        '1.0.0',
        [],
        parentHash
      );

      expect(envelope.parentEnvelopeHash).toBe(parentHash);
    });

    it('should not set parentEnvelopeHash when not provided', async () => {
      const envelope = await service.create(testPayload, 'prompt', '1.0.0', []);

      expect(envelope.parentEnvelopeHash).toBeUndefined();
    });

    it('should throw if no identity exists', async () => {
      const noIdentityManager = createMockIdentityManager(null);
      const noIdentityService = new SignedEnvelopeService(noIdentityManager);

      await expect(
        noIdentityService.create(testPayload, 'plugin', '1.0.0', [])
      ).rejects.toThrow('No identity available');
    });

    it('should produce a contentHash matching the payload', async () => {
      const envelope = await service.create(testPayload, 'skill', '2.0.0', []);
      const expectedHash = service.computeContentHash(testPayload);

      expect(envelope.contentHash).toBe(expectedHash);
    });

    it('should produce a valid Ed25519 signature', async () => {
      const envelope = await service.create(testPayload, 'plugin', '1.0.0', []);

      // Verify signature manually using Node.js crypto
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${testPub}\n-----END PUBLIC KEY-----`;
      const keyObject = crypto.createPublicKey({ key: pemKey, format: 'pem' });
      const isValid = crypto.verify(
        null,
        Buffer.from(envelope.contentHash, 'utf8'),
        keyObject,
        Buffer.from(envelope.signature, 'base64')
      );

      expect(isValid).toBe(true);
    });
  });

  // ─── verify ──────────────────────────────────────────────────────────

  describe('verify', () => {
    let validEnvelope: SignedEnvelope<TestPayload>;

    beforeEach(async () => {
      validEnvelope = await service.create(testPayload, 'plugin', '1.0.0', ['store:read']);
    });

    it('should verify a valid envelope', async () => {
      const result = await service.verify(validEnvelope);

      expect(result.valid).toBe(true);
      expect(result.ed25519Valid).toBe(true);
      expect(result.seaValid).toBe(true);
      expect(result.resonanceValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect payload tampering', async () => {
      const tampered = {
        ...validEnvelope,
        payload: { ...testPayload, value: 999 },
      };

      const result = await service.verify(tampered);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content hash mismatch');
    });

    it('should detect signature tampering', async () => {
      const tampered = {
        ...validEnvelope,
        signature: 'AAAA' + validEnvelope.signature.substring(4),
      };

      const result = await service.verify(tampered);

      expect(result.valid).toBe(false);
      expect(result.ed25519Valid).toBe(false);
      expect(result.error).toContain('Ed25519 signature verification failed');
    });

    it('should detect contentHash tampering', async () => {
      const tampered = {
        ...validEnvelope,
        contentHash: 'deadbeef'.repeat(8),
      };

      const result = await service.verify(tampered);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content hash mismatch');
    });

    it('should detect resonance proof tampering', async () => {
      const tampered = {
        ...validEnvelope,
        resonanceProof: {
          ...validEnvelope.resonanceProof,
          hash: 'deadbeef'.repeat(8),
        },
      };

      const result = await service.verify(tampered);

      expect(result.valid).toBe(false);
      expect(result.resonanceValid).toBe(false);
      expect(result.error).toContain('Resonance proof verification failed');
    });

    it('should detect author public key swap', async () => {
      // Swap to the endorser's pub key — signature won't match
      const tampered = {
        ...validEnvelope,
        author: {
          ...validEnvelope.author,
          pub: endorserPub,
        },
      };

      const result = await service.verify(tampered);

      expect(result.valid).toBe(false);
      expect(result.ed25519Valid).toBe(false);
    });

    it('should accept envelope with seaSignature present (stub)', async () => {
      const withSea = {
        ...validEnvelope,
        seaSignature: 'sea-stub-signature',
      };

      const result = await service.verify(withSea);

      expect(result.valid).toBe(true);
      expect(result.seaValid).toBe(true);
    });
  });

  // ─── endorse ─────────────────────────────────────────────────────────

  describe('endorse', () => {
    let validEnvelope: SignedEnvelope<TestPayload>;

    beforeEach(async () => {
      // Create envelope with main identity
      validEnvelope = await service.create(testPayload, 'plugin', '1.0.0', []);

      // Switch to endorser identity for endorsement
      mockIdentityManager = createMockIdentityManager(mockEndorserIdentity);
      service = new SignedEnvelopeService(mockIdentityManager);
    });

    it('should add an endorsement to the envelope', async () => {
      const endorsed = await service.endorse(validEnvelope, 'Looks good!');

      expect(endorsed.endorsements).toHaveLength(1);
      expect(endorsed.endorsements[0].endorser.pub).toBe(endorserPub);
      expect(endorsed.endorsements[0].endorser.fingerprint).toBe(endorserFingerprint);
      expect(endorsed.endorsements[0].signature).toBeTruthy();
      expect(endorsed.endorsements[0].comment).toBe('Looks good!');
      expect(endorsed.endorsements[0].timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should not modify the original envelope (immutability)', async () => {
      const originalEndorsementsLength = validEnvelope.endorsements.length;
      await service.endorse(validEnvelope);

      expect(validEnvelope.endorsements).toHaveLength(originalEndorsementsLength);
    });

    it('should preserve existing endorsements', async () => {
      const firstEndorsed = await service.endorse(validEnvelope);

      // Create a third keypair for a second endorsement
      const thirdKeyPair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const thirdPub = stripPem(thirdKeyPair.publicKey);
      const thirdPriv = stripPem(thirdKeyPair.privateKey);
      const thirdFingerprint = crypto
        .createHash('sha256')
        .update(thirdPub)
        .digest('hex')
        .substring(0, 16);

      const thirdIdentityManager = createMockIdentityManager({
        pub: thirdPub,
        priv: thirdPriv,
        fingerprint: thirdFingerprint,
        resonance: Array.from({ length: 16 }, () => 0.5),
        bodyPrimes: [2, 3, 5, 7],
      });
      const thirdService = new SignedEnvelopeService(thirdIdentityManager);
      const doubleEndorsed = await thirdService.endorse(firstEndorsed);

      expect(doubleEndorsed.endorsements).toHaveLength(2);
      expect(doubleEndorsed.endorsements[0].endorser.pub).toBe(endorserPub);
      expect(doubleEndorsed.endorsements[1].endorser.pub).toBe(thirdPub);
    });

    it('should reject endorsement of an invalid envelope', async () => {
      const tampered = {
        ...validEnvelope,
        payload: { ...testPayload, value: 999 },
      };

      await expect(service.endorse(tampered)).rejects.toThrow('Cannot endorse an invalid envelope');
    });

    it('should reject duplicate endorsement from the same identity', async () => {
      const endorsed = await service.endorse(validEnvelope);

      // Try to endorse again with the same identity
      await expect(service.endorse(endorsed)).rejects.toThrow(
        'Current user has already endorsed this envelope'
      );
    });

    it('should throw if no identity exists', async () => {
      const noIdentityManager = createMockIdentityManager(null);
      const noIdentityService = new SignedEnvelopeService(noIdentityManager);

      await expect(noIdentityService.endorse(validEnvelope)).rejects.toThrow(
        'No identity available'
      );
    });

    it('should produce a valid endorsement signature', async () => {
      const endorsed = await service.endorse(validEnvelope);
      const endorsement = endorsed.endorsements[0];

      // Verify the endorsement signature manually
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${endorserPub}\n-----END PUBLIC KEY-----`;
      const keyObject = crypto.createPublicKey({ key: pemKey, format: 'pem' });
      const isValid = crypto.verify(
        null,
        Buffer.from(validEnvelope.contentHash, 'utf8'),
        keyObject,
        Buffer.from(endorsement.signature, 'base64')
      );

      expect(isValid).toBe(true);
    });

    it('should omit comment when not provided', async () => {
      const endorsed = await service.endorse(validEnvelope);

      expect(endorsed.endorsements[0].comment).toBeUndefined();
    });
  });

  // ─── Round-trip: create → verify ─────────────────────────────────────

  describe('round-trip', () => {
    it('should create and then verify successfully', async () => {
      const envelope = await service.create(
        { message: 'Hello, AlephNet!' },
        'prompt',
        '0.1.0',
        ['ui:notification']
      );

      const result = await service.verify(envelope);

      expect(result.valid).toBe(true);
    });

    it('should create, endorse, and then verify the base envelope', async () => {
      // Create with main identity
      const mainService = new SignedEnvelopeService(createMockIdentityManager());
      const envelope = await mainService.create(testPayload, 'skill', '1.0.0', []);

      // Endorse with second identity
      const endorserService = new SignedEnvelopeService(
        createMockIdentityManager(mockEndorserIdentity)
      );
      const endorsed = await endorserService.endorse(envelope);

      // Verify the endorsed envelope (base signature should still be valid)
      const result = await mainService.verify(endorsed);
      expect(result.valid).toBe(true);
      expect(endorsed.endorsements).toHaveLength(1);
    });

    it('should handle all artifact types', async () => {
      const artifactTypes = [
        'prompt', 'plugin', 'skill', 'service',
        'agent-template', 'process', 'fence-handler', 'model-config',
      ] as const;

      for (const type of artifactTypes) {
        const envelope = await service.create({ type }, type, '1.0.0', []);
        const result = await service.verify(envelope);
        expect(result.valid).toBe(true);
      }
    });
  });
});
