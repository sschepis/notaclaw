// ═══════════════════════════════════════════════════════════════════════════
// AlephCoherenceClient — Coherence Network sub-module
// Extracted from AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

import { AlephClientContext, generateId, now } from './types';
import type {
  Claim, VerificationTask, CoherenceEdge, Synthesis, VerifyClaimOptions,
} from '../../../shared/alephnet-types';

// ─── AlephCoherenceClient ───────────────────────────────────────────────

export class AlephCoherenceClient {
  private ctx: AlephClientContext;

  // ── Domain-specific state ────────────────────────────────────────────
  claims = new Map<string, Claim>();
  verificationTasks = new Map<string, VerificationTask>();
  edges = new Map<string, CoherenceEdge>();
  syntheses = new Map<string, Synthesis>();

  constructor(ctx: AlephClientContext) {
    this.ctx = ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Coherence Network
  // ═══════════════════════════════════════════════════════════════════════

  async coherenceSubmitClaim(params: { statement: string }): Promise<Claim> {
    const claim: Claim = {
      id: generateId('claim'),
      statement: params.statement,
      authorId: this.ctx.nodeId,
      authorDisplayName: this.ctx.profile?.displayName,
      status: 'OPEN',
      verificationCount: 0,
      consensusScore: 0,
      timestamp: now(),
      edges: [],
    };
    this.claims.set(claim.id, claim);
    // Create a verification task
    const task: VerificationTask = {
      id: generateId('task'),
      claimId: claim.id,
      claimStatement: claim.statement,
      type: 'VERIFY',
      status: 'OPEN',
      reward: 10,
      createdAt: now(),
    };
    this.verificationTasks.set(task.id, task);
    await this.ctx.bridge.put(`coherence/claims/${claim.id}`, claim);
    this.ctx.emit('aleph:coherenceTask', task);
    return claim;
  }

  async coherenceVerifyClaim(params: VerifyClaimOptions): Promise<{ verified: boolean }> {
    const claim = this.claims.get(params.claimId);
    if (!claim) return { verified: false };
    claim.verificationCount++;
    if (params.result === 'VERIFIED') {
      claim.consensusScore = Math.min(1, claim.consensusScore + 0.2);
      if (claim.consensusScore >= 0.8) claim.status = 'VERIFIED';
    } else {
      claim.consensusScore = Math.max(0, claim.consensusScore - 0.2);
      if (claim.consensusScore <= 0.2) claim.status = 'REFUTED';
    }
    return { verified: true };
  }

  async coherenceGetClaimByStatement(statement: string): Promise<Claim | undefined> {
    for (const claim of this.claims.values()) {
      if (claim.statement === statement) return claim;
    }
    return undefined;
  }

  async coherenceListTasks(params: { type?: string; status?: string }): Promise<VerificationTask[]> {
    return [...this.verificationTasks.values()].filter(t => {
      if (params.type && t.type !== params.type) return false;
      if (params.status && t.status !== params.status) return false;
      return true;
    });
  }

  async coherenceClaimTask(params: { taskId: string }): Promise<{ claimed: boolean }> {
    const task = this.verificationTasks.get(params.taskId);
    if (!task || task.status !== 'OPEN') return { claimed: false };
    task.status = 'CLAIMED';
    task.assignedTo = this.ctx.nodeId;
    return { claimed: true };
  }

  async coherenceCreateEdge(params: { fromClaimId: string; toClaimId: string; edgeType: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES' }): Promise<CoherenceEdge> {
    const edge: CoherenceEdge = {
      id: generateId('edge'),
      fromClaimId: params.fromClaimId,
      toClaimId: params.toClaimId,
      edgeType: params.edgeType,
      authorId: this.ctx.nodeId,
      timestamp: now(),
    };
    this.edges.set(edge.id, edge);
    // Attach to claims
    const fromClaim = this.claims.get(params.fromClaimId);
    if (fromClaim) fromClaim.edges = [...(fromClaim.edges ?? []), edge];
    return edge;
  }

  async coherenceCreateSynthesis(params: { title: string; acceptedClaimIds: string[] }): Promise<Synthesis> {
    const synth: Synthesis = {
      id: generateId('synth'),
      title: params.title,
      acceptedClaimIds: params.acceptedClaimIds,
      authorId: this.ctx.nodeId,
      status: 'DRAFT',
      timestamp: now(),
    };
    this.syntheses.set(synth.id, synth);
    return synth;
  }

  async coherenceSecurityReview(_params: { synthesisId: string }): Promise<{ requestId: string }> {
    return { requestId: generateId('review') };
  }
}
