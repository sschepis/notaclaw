import { TrustGate } from '../../../src/main/services/TrustGate';
import type {
  Capability,
  ITrustEvaluator,
  SignedEnvelope,
  TrustAssessment,
  TrustLevel,
} from '../../../src/shared/trust-types';

// Mock implementation of ITrustEvaluator
class MockTrustEvaluator implements ITrustEvaluator {
  private level: TrustLevel = 'UNKNOWN';

  setTrustLevel(level: TrustLevel) {
    this.level = level;
  }

  async evaluate<T>(envelope: SignedEnvelope<T>): Promise<TrustAssessment> {
    return {
      score: 0,
      level: this.level,
      factors: {
        signatureValid: true,
        socialDistance: 0,
        authorReputation: 0,
        stakingTier: 0,
        endorsementQuality: 0,
        coherenceScore: 0,
      },
      evaluatedAt: Date.now(),
      ttlMs: 1000,
    };
  }
}

describe('TrustGate', () => {
  let evaluator: MockTrustEvaluator;
  let gate: TrustGate;
  // Minimal envelope mock - we only need it to be passed through
  const mockEnvelope = {} as SignedEnvelope<any>;

  beforeEach(() => {
    evaluator = new MockTrustEvaluator();
    gate = new TrustGate(evaluator);
  });

  describe('SELF Trust', () => {
    beforeEach(() => evaluator.setTrustLevel('SELF'));

    it('allows network:http', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'network:http');
      expect(result.decision).toBe('ALLOW');
    });

    it('confirms wallet:transfer (high risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'wallet:transfer');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('high risk');
    });

    it('confirms system:shell (medium risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'system:shell');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('medium risk');
    });
  });

  describe('VOUCHED Trust', () => {
    beforeEach(() => evaluator.setTrustLevel('VOUCHED'));

    it('allows network:http', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'network:http');
      expect(result.decision).toBe('ALLOW');
    });

    it('confirms fs:write (medium risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'fs:write');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('medium risk');
    });

    it('denies system:shell', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'system:shell');
      expect(result.decision).toBe('DENY');
    });
  });

  describe('COMMUNITY Trust', () => {
    beforeEach(() => evaluator.setTrustLevel('COMMUNITY'));

    it('confirms network:http (medium risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'network:http');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('medium risk');
    });

    it('denies dsn:identity', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'dsn:identity');
      expect(result.decision).toBe('DENY');
    });
  });

  describe('UNKNOWN Trust', () => {
    beforeEach(() => evaluator.setTrustLevel('UNKNOWN'));

    it('confirms ui:notification (low risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'ui:notification');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('low risk');
    });

    it('confirms network:http (high risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'network:http');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('high risk');
    });

    it('confirms fs:read (high risk)', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'fs:read');
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('high risk');
    });

    it('denies dsn:register-tool', async () => {
      const result = await gate.checkCapability(mockEnvelope, 'dsn:register-tool');
      expect(result.decision).toBe('DENY');
    });
  });

  describe('REVOKED Trust', () => {
    beforeEach(() => evaluator.setTrustLevel('REVOKED'));

    it('denies everything regardless of matrix', async () => {
      const caps: Capability[] = ['network:http', 'ui:notification', 'wallet:transfer'];
      for (const cap of caps) {
        const result = await gate.checkCapability(mockEnvelope, cap);
        expect(result.decision).toBe('DENY');
        expect(result.reason).toBe('Trust revoked');
      }
    });
  });

  describe('Unknown Capability (Default Behavior)', () => {
    // We cast a string to Capability to simulate an unknown capability
    const unknownCap = 'unknown:capability' as Capability;

    it('allows for SELF', async () => {
      evaluator.setTrustLevel('SELF');
      const result = await gate.checkCapability(mockEnvelope, unknownCap);
      expect(result.decision).toBe('ALLOW');
    });

    it('confirms (medium) for VOUCHED', async () => {
      evaluator.setTrustLevel('VOUCHED');
      const result = await gate.checkCapability(mockEnvelope, unknownCap);
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('medium risk');
    });

    it('confirms (high) for COMMUNITY', async () => {
      evaluator.setTrustLevel('COMMUNITY');
      const result = await gate.checkCapability(mockEnvelope, unknownCap);
      expect(result.decision).toBe('CONFIRM');
      expect(result.reason).toContain('high risk');
    });

    it('denies for UNKNOWN', async () => {
      evaluator.setTrustLevel('UNKNOWN');
      const result = await gate.checkCapability(mockEnvelope, unknownCap);
      expect(result.decision).toBe('DENY');
    });
  });
});
