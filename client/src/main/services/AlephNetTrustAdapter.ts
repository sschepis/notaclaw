import crypto from 'crypto';
import { AlephNetClient } from './AlephNetClient';
import { ISocialGraphProvider, IReputationProvider } from './TrustEvaluator';
import { StakingTier } from '../../shared/alephnet-types';

export class AlephNetTrustAdapter implements ISocialGraphProvider, IReputationProvider {
  constructor(private client: AlephNetClient) {}

  async getFriends(): Promise<Array<{ id: string; publicKey: string }>> {
    const { friends } = await this.client.friendsList({});
    return friends.map(f => ({ id: f.id, publicKey: f.publicKey }));
  }

  async getFriendsOfFriend(_friendPub: string): Promise<Array<{ id: string; publicKey: string }>> {
    // In a full implementation, we would query the DSN for friends of friends.
    // For now, we return an empty array as we don't have access to the full graph.
    return [];
  }

  async getReputation(publicKey: string): Promise<number> {
    // Use fingerprint as userId for lookup
    const fingerprint = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16);
    const profile = await this.client.profileGet({ userId: fingerprint });
    // Normalize 0-100 to 0.0-1.0
    return Math.min(Math.max(profile.reputation / 100, 0), 1);
  }

  async getStakingTier(publicKey: string): Promise<StakingTier> {
    const fingerprint = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16);
    const profile = await this.client.profileGet({ userId: fingerprint });
    return profile.tier;
  }

  async getCoherenceScore(contentHash: string): Promise<number> {
    // Look for a claim where the statement matches the contentHash
    const claim = await this.client.coherenceGetClaimByStatement(contentHash);
    return claim ? claim.consensusScore : 0;
  }
}
