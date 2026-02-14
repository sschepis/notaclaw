// ═══════════════════════════════════════════════════════════════════════════
// AlephNet Client — Shared types and helper utilities
// Used by all sub-modules in the alephnet/ decomposition.
// ═══════════════════════════════════════════════════════════════════════════

import type { AlephGunBridge } from '@sschepis/alephnet-node';
import type { AIProviderManager } from '../AIProviderManager';
import type { IdentityManager } from '../IdentityManager';
import type { DomainManager } from '../DomainManager';
import type { MemorySecurityService } from '../MemorySecurityService';
import type { TrustGate } from '../TrustGate';
import type { TrustEvaluator } from '../TrustEvaluator';
import type { UserProfile, WalletBalance } from '../../../shared/alephnet-types';

// ─── Shared Context ──────────────────────────────────────────────────────

/**
 * Shared context object passed to every AlephNet sub-module.
 *
 * Instead of each module holding a reference to the monolithic AlephNetClient
 * class, they receive this lightweight context containing only the
 * cross-cutting dependencies and mutable state they need.
 *
 * The context is created once in AlephNetClient's constructor and handed to
 * each sub-module factory / init function.
 */
export interface AlephClientContext {
  /** The GunDB bridge for graph read/write operations. */
  bridge: AlephGunBridge;

  /** This node's identity fingerprint (set on connect). */
  nodeId: string;

  /** Whether the client is currently connected to the network. */
  connected: boolean;

  /** Cached user profile (null until first profileGet). */
  profile: UserProfile | null;

  /** Current wallet balance / tier state. */
  walletState: WalletBalance;

  // ── Injected Services ────────────────────────────────────────────────

  /** AI provider for semantic computing, embeddings, etc. */
  aiManager: AIProviderManager;

  /** Cryptographic identity management. */
  identityManager: IdentityManager;

  /** Domain registration and membership. */
  domainManager: DomainManager;

  /** Memory signing, encryption, and semantic validation (set post-construction). */
  memorySecurityService: MemorySecurityService | null;

  /** Capability-based access control gate (set post-construction). */
  trustGate: TrustGate | null;

  /** Trust score evaluator (set post-construction). */
  trustEvaluator: TrustEvaluator | null;

  // ── Event Bridge ─────────────────────────────────────────────────────

  /** Emit an event on the parent AlephNetClient EventEmitter. */
  emit: (event: string, ...args: any[]) => boolean;
}

// ─── Helper Utilities ────────────────────────────────────────────────────

/**
 * Generate a unique ID with an optional prefix.
 *
 * Format: `{prefix}_{base36-timestamp}_{random-6-chars}`
 * Without prefix: `{base36-timestamp}_{random-6-chars}`
 *
 * @example
 * generateId('frag')  // "frag_m1a2b3c_x4y5z6"
 * generateId()        // "m1a2b3c_x4y5z6"
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${prefix ? '_' : ''}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Return the current timestamp in milliseconds.
 * Thin wrapper around Date.now() for consistency and testability.
 */
export function now(): number {
  return Date.now();
}

/**
 * Sanitize data for Gun.js storage.
 *
 * Gun cannot store `undefined` values or native JS arrays.
 * This function recursively:
 * - Converts `undefined` → `null`
 * - Converts `null` → `null`
 * - Converts arrays to objects with numeric string keys
 * - Strips `undefined` values from plain objects
 *
 * @example
 * sanitizeForGun({ a: [1, 2], b: undefined })
 * // → { a: { "0": 1, "1": 2 }, b: null }
 */
export function sanitizeForGun(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;

  if (Array.isArray(data)) {
    const obj: any = {};
    data.forEach((val, idx) => {
      obj[idx] = sanitizeForGun(val);
    });
    return obj;
  }

  if (typeof data === 'object') {
    const obj: any = {};
    for (const key in data) {
      const val = sanitizeForGun(data[key]);
      if (val !== undefined) {
        obj[key] = val;
      }
    }
    return obj;
  }

  return data;
}
