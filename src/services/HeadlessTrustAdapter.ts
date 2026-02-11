import type { StakingTier } from '../shared/alephnet-types';
import type { ISocialGraphProvider, IReputationProvider } from './TrustEvaluator';
import type { AlephGunBridge } from '@sschepis/alephnet-node';
import type { IdentityManager } from './IdentityManager';

/**
 * Headless-mode trust adapter that reads social graph, reputation,
 * staking, and coherence data from the Gun bridge instead of returning
 * hardcoded stubs.
 *
 * Falls back to conservative defaults when data is unavailable.
 */
export class HeadlessTrustAdapter implements ISocialGraphProvider, IReputationProvider {
    constructor(
        private bridge: AlephGunBridge,
        private identityManager: IdentityManager
    ) {}

    // ── ISocialGraphProvider ─────────────────────────────────────────

    async getFriends(): Promise<Array<{ id: string; publicKey: string }>> {
        try {
            const identity = await this.identityManager.getPublicIdentity();
            if (!identity) return [];

            const friendsData = await this.bridge.get(`social/${identity.fingerprint}/friends`);
            if (!friendsData || typeof friendsData !== 'object') return [];

            const friends: Array<{ id: string; publicKey: string }> = [];
            for (const [id, entry] of Object.entries(friendsData)) {
                if (id === '_' || !entry) continue; // Skip Gun metadata
                const record = entry as any;
                if (record.publicKey) {
                    friends.push({ id, publicKey: record.publicKey });
                }
            }
            return friends;
        } catch (error) {
            console.warn('[HeadlessTrustAdapter] Failed to fetch friends:', error);
            return [];
        }
    }

    async getFriendsOfFriend(friendPub: string): Promise<Array<{ id: string; publicKey: string }>> {
        try {
            // Look up the friend's fingerprint from their public key
            const friendData = await this.bridge.get(`identities/byPub/${friendPub}`);
            const fingerprint = (friendData as any)?.fingerprint;
            if (!fingerprint) return [];

            const fofData = await this.bridge.get(`social/${fingerprint}/friends`);
            if (!fofData || typeof fofData !== 'object') return [];

            const fofs: Array<{ id: string; publicKey: string }> = [];
            for (const [id, entry] of Object.entries(fofData)) {
                if (id === '_' || !entry) continue;
                const record = entry as any;
                if (record.publicKey) {
                    fofs.push({ id, publicKey: record.publicKey });
                }
            }
            return fofs;
        } catch (error) {
            console.warn('[HeadlessTrustAdapter] Failed to fetch friends-of-friend:', error);
            return [];
        }
    }

    // ── IReputationProvider ──────────────────────────────────────────

    async getReputation(publicKey: string): Promise<number> {
        try {
            const reputationData = await this.bridge.get(`reputation/${publicKey}`);
            if (reputationData && typeof (reputationData as any).score === 'number') {
                return Math.max(0, Math.min(1, (reputationData as any).score));
            }
            // No reputation data → conservative default
            return 0.3;
        } catch (error) {
            console.warn('[HeadlessTrustAdapter] Failed to fetch reputation:', error);
            return 0.3;
        }
    }

    async getStakingTier(publicKey: string): Promise<StakingTier> {
        try {
            const stakingData = await this.bridge.get(`staking/${publicKey}`);
            const tier = (stakingData as any)?.tier;
            if (tier && ['Neophyte', 'Adept', 'Magus', 'Archon'].includes(tier)) {
                return tier as StakingTier;
            }
            return 'Neophyte';
        } catch (error) {
            console.warn('[HeadlessTrustAdapter] Failed to fetch staking tier:', error);
            return 'Neophyte';
        }
    }

    async getCoherenceScore(contentHash: string): Promise<number> {
        try {
            const coherenceData = await this.bridge.get(`coherence/${contentHash}`);
            if (coherenceData && typeof (coherenceData as any).score === 'number') {
                return Math.max(0, Math.min(1, (coherenceData as any).score));
            }
            // No coherence data yet → neutral default
            return 0.5;
        } catch (error) {
            console.warn('[HeadlessTrustAdapter] Failed to fetch coherence score:', error);
            return 0.5;
        }
    }
}
