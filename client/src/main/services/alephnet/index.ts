// ═══════════════════════════════════════════════════════════════════════════
// AlephNet Client — Barrel export
// Sub-modules extracted from the AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

export { generateId, now, sanitizeForGun } from './types';
export type { AlephClientContext } from './types';

export { AlephMemoryClient } from './AlephMemoryClient';
export { AlephSocialClient } from './AlephSocialClient';
export { AlephGroupsClient } from './AlephGroupsClient';
export { AlephCoherenceClient } from './AlephCoherenceClient';
export { AlephAgentClient } from './AlephAgentClient';
export { AlephEconomicsClient } from './AlephEconomicsClient';
