"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// Code Provenance & Web of Trust — Type Definitions
// See design/23-provenance-trust.md for full specification
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMORY_VALIDATION_THRESHOLDS = exports.MEMORY_ACCESS_RULES = exports.TRUST_THRESHOLDS = exports.STAKING_TIER_SCORES = exports.SOCIAL_DISTANCE_SCORES = exports.TRUST_WEIGHTS = exports.TRUST_CACHE_TTL = void 0;
// ─── Constants ───────────────────────────────────────────────────────────
/** TTL values for trust assessment cache per trust level (ms) */
exports.TRUST_CACHE_TTL = {
    SELF: Infinity,
    VOUCHED: 60 * 60 * 1000, // 1 hour
    COMMUNITY: 15 * 60 * 1000, // 15 minutes
    UNKNOWN: 5 * 60 * 1000, // 5 minutes
    REVOKED: 24 * 60 * 60 * 1000, // 24 hours
};
/** Weight factors for trust score computation */
exports.TRUST_WEIGHTS = {
    socialDistance: 0.30,
    authorReputation: 0.20,
    stakingTier: 0.15,
    endorsementQuality: 0.20,
    coherenceScore: 0.15,
};
/** Social graph distance → normalized score mapping */
exports.SOCIAL_DISTANCE_SCORES = {
    0: 1.0, // Self
    1: 0.8, // Direct friend
    2: 0.5, // Friend-of-friend
    3: 0.2, // Distance 3
    // Distance 4+ → 0.0
};
/** StakingTier → normalized score mapping */
exports.STAKING_TIER_SCORES = {
    Archon: 1.0,
    Magus: 0.75,
    Adept: 0.5,
    Neophyte: 0.25,
};
/** Trust level score thresholds */
exports.TRUST_THRESHOLDS = {
    SELF: 1.0,
    VOUCHED: 0.7,
    COMMUNITY: 0.4,
    UNKNOWN: 0.0,
    // Anything below 0.0 is REVOKED
};
/** Default access rules by scope */
exports.MEMORY_ACCESS_RULES = {
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
exports.MEMORY_VALIDATION_THRESHOLDS = {
    conversation: {
        primeAlignment: 0, // Optional
        entropyMin: 1.0,
        coherenceMin: 0.3,
        significanceMin: 0.0, // Any significance allowed
        requiresConsensus: false
    },
    user: {
        primeAlignment: 0.5,
        entropyMin: 2.0,
        coherenceMin: 0.5,
        significanceMin: 0.3, // Moderate significance required
        requiresConsensus: false
    },
    organization: {
        primeAlignment: 0.7,
        entropyMin: 2.5,
        coherenceMin: 0.6,
        significanceMin: 0.5, // Higher significance for org memory
        requiresConsensus: true,
        minVerifiers: 3
    },
    global: {
        primeAlignment: 0.8,
        entropyMin: 3.0,
        coherenceMin: 0.7,
        significanceMin: 0.7, // High significance required for global
        requiresConsensus: true
        // Uses field.consensusThreshold
    }
};
