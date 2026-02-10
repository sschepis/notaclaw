import {
  TrustEvaluator as LibTrustEvaluator,
  ISocialGraphProvider,
  IReputationProvider
} from '@sschepis/alephnet-node';
import type {
  ITrustEvaluator,
  SignedEnvelope,
  TrustAssessment,
} from '../../shared/trust-types';
import type { SignedEnvelopeService } from './SignedEnvelopeService';
import type { IdentityManager } from './IdentityManager';
import type { DomainManager } from './DomainManager';

/**
 * Client-side TrustEvaluator.
 * Wraps the core Node evaluator but adds dynamic identity support.
 */
export class TrustEvaluator extends LibTrustEvaluator implements ITrustEvaluator {
  constructor(
    envelopeService: SignedEnvelopeService,
    private readonly identityManager: IdentityManager,
    socialGraph: ISocialGraphProvider,
    reputationProvider: IReputationProvider,
    domainManager: DomainManager
  ) {
    // Pass null for ownIdentity since we handle it dynamically
    // Cast domainManager to any if interfaces slightly differ
    super(envelopeService as any, null, socialGraph, reputationProvider, domainManager as any);
  }

  async evaluate<T>(envelope: SignedEnvelope<T>): Promise<TrustAssessment> {
    // 1. Dynamic Self Check
    const ownIdentity = await this.identityManager.getPublicIdentity();
    if (ownIdentity && envelope.author.pub === ownIdentity.pub) {
      return {
        score: 1.0,
        level: 'SELF',
        factors: {
          signatureValid: true,
          socialDistance: 1.0,
          authorReputation: 1.0,
          stakingTier: 1.0,
          endorsementQuality: 1.0,
          coherenceScore: 1.0,
        },
        evaluatedAt: Date.now(),
        ttlMs: Infinity,
      };
    }

    // 2. Delegate to core evaluator
    return super.evaluate(envelope as any);
  }
}
