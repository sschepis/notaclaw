import { AlephGunBridge, SignedEnvelopeService as LibSignedEnvelopeService } from '@sschepis/alephnet-node';
import type { IdentityManager } from './IdentityManager';
import type {
  ArtifactType,
  Capability,
  SignedEnvelope,
  VerificationResult,
} from '../../shared/trust-types';

/**
 * Client-side SignedEnvelopeService.
 * Extends the core Node service with SEA (Gun.js) integration for the client.
 */
export class SignedEnvelopeService extends LibSignedEnvelopeService {
  private bridge: AlephGunBridge | null = null;

  constructor(private readonly identityManager: IdentityManager) {
    // IdentityManager matches ICryptoProvider interface (getIdentity)
    // Cast to any to avoid strict tuple length check on resonance array
    super(identityManager as any);
  }

  /**
   * Set the AlephGunBridge instance for SEA verification.
   * This is called after the bridge is initialized.
   */
  setBridge(bridge: AlephGunBridge) {
    this.bridge = bridge;
  }

  /**
   * Create a signed envelope.
   * Overrides core method to add SEA signature.
   */
  // @ts-ignore - Override signature mismatch due to extended ArtifactType
  async create<T>(
    payload: T,
    artifactType: ArtifactType,
    version: string,
    capabilities: Capability[],
    parentEnvelopeHash?: string
  ): Promise<SignedEnvelope<T>> {
    // 1. Call super to get standard Ed25519 envelope
    // Cast artifactType to any to support client-specific types not yet in node
    const envelope = await super.create(payload, artifactType as any, version, capabilities as any, parentEnvelopeHash) as unknown as SignedEnvelope<T>;

    // 2. Add SEA signature if bridge is available
    const identity = await this.identityManager.getIdentity();
    if (this.bridge && identity && identity.sea) {
      try {
        const gun = this.bridge.getGun();
        if (gun && gun.SEA) {
          // Sign the content hash with SEA key pair
          const seaSignature = await gun.SEA.sign(envelope.contentHash, identity.sea);
          envelope.seaSignature = seaSignature;
        }
      } catch (err) {
        console.warn('Failed to add SEA signature:', err);
      }
    }

    return envelope;
  }

  /**
   * Verify a signed envelope.
   * Overrides core method to add SEA verification.
   */
  async verify<T>(envelope: SignedEnvelope<T>): Promise<VerificationResult> {
    // 1. Standard verification (Ed25519, Resonance, Content Hash)
    const result = await super.verify(envelope as any);
    if (!result.valid) return result as VerificationResult;

    // 2. SEA verification (if present)
    if (envelope.seaSignature) {
      if (this.bridge) {
        try {
          const gun = this.bridge.getGun();
          if (gun && gun.SEA) {
            const verifiedData = await gun.SEA.verify(envelope.seaSignature, envelope.author.pub);
            
            // If verifiedData matches contentHash, it's valid.
            // Note: In AlephNet, we treat Ed25519 pub key as the SEA pub key for simple identity mapping in Phase 1.
            if (verifiedData === envelope.contentHash) {
                result.seaValid = true;
            } else {
                 // Soft failure for now as explained in original code
                 console.warn('SEA signature verification failed or key mismatch');
            }
          }
        } catch (err) {
          console.warn('SEA verification error:', err);
        }
      } else {
         console.warn('AlephGunBridge not available for SEA verification');
      }
    }

    return result as VerificationResult;
  }
}
