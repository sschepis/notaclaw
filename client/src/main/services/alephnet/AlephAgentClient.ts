// ═══════════════════════════════════════════════════════════════════════════
// AlephAgentClient — Agents & Teams sub-module
// Extracted from AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

import { AlephClientContext, generateId, now } from './types';
import type {
  SRIAAgent, AgentStepResult, AgentSession, AgentRunHandle,
  AgentTeam, CollectiveStepResult,
} from '../../../shared/alephnet-types';

// ─── AlephAgentClient ───────────────────────────────────────────────────

export class AlephAgentClient {
  private ctx: AlephClientContext;

  // ── Domain-specific state ────────────────────────────────────────────
  agents = new Map<string, SRIAAgent>();
  agentRuns = new Map<string, AgentRunHandle>();
  teams = new Map<string, AgentTeam>();

  constructor(ctx: AlephClientContext) {
    this.ctx = ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Agent Management (SRIA)
  // ═══════════════════════════════════════════════════════════════════════

  async agentCreate(params: { name: string; templateId?: string }): Promise<SRIAAgent> {
    const agent: SRIAAgent = {
      id: generateId('agent'),
      name: params.name,
      templateId: params.templateId,
      status: 'idle',
      goalPriors: { accuracy: 0.8, speed: 0.5 },
      beliefs: [],
      createdAt: now(),
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async agentList(params: { name?: string }): Promise<SRIAAgent[]> {
    let list = [...this.agents.values()];
    if (params.name) {
      list = list.filter(a => a.name.toLowerCase().includes(params.name!.toLowerCase()));
    }
    return list;
  }

  async agentGet(params: { agentId: string }): Promise<SRIAAgent> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    return agent;
  }

  async agentUpdate(params: { agentId: string; goalPriors?: Record<string, number> }): Promise<SRIAAgent> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    if (params.goalPriors) agent.goalPriors = { ...agent.goalPriors, ...params.goalPriors };
    return agent;
  }

  async agentDelete(params: { agentId: string }): Promise<{ deleted: boolean }> {
    this.agents.delete(params.agentId);
    this.agentRuns.delete(params.agentId);
    return { deleted: true };
  }

  async agentSummon(params: { agentId: string; context?: string }): Promise<AgentSession> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    agent.status = 'active';
    const session: AgentSession = {
      sessionId: generateId('sess'),
      agentId: params.agentId,
      startedAt: now(),
      initialBeliefs: agent.beliefs,
    };
    agent.sessionId = session.sessionId;
    return session;
  }

  async agentStep(params: { agentId: string; observation: string }): Promise<AgentStepResult> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent ${params.agentId} not found`);
    const result: AgentStepResult = {
      agentId: params.agentId,
      action: `respond_to("${params.observation.substring(0, 30)}...")`,
      freeEnergy: Math.random() * 0.5,
      learningUpdates: ['Updated belief model'],
      beliefs: agent.beliefs,
      timestamp: now(),
    };
    this.ctx.emit('aleph:agentStep', result);
    return result;
  }

  async agentDismiss(params: { agentId: string }): Promise<{ beaconFingerprint: string }> {
    const agent = this.agents.get(params.agentId);
    if (agent) {
      agent.status = 'dismissed';
      agent.sessionId = undefined;
    }
    return { beaconFingerprint: generateId('beacon') };
  }

  async agentRun(params: { agentId: string; maxSteps?: number }): Promise<AgentRunHandle> {
    const handle: AgentRunHandle = {
      runId: generateId('run'),
      agentId: params.agentId,
      status: 'running',
      steps: 0,
      maxSteps: params.maxSteps ?? 100,
    };
    this.agentRuns.set(params.agentId, handle);
    return handle;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Agent Teams
  // ═══════════════════════════════════════════════════════════════════════

  async teamCreate(params: { name: string; agentIds: string[] }): Promise<AgentTeam> {
    const team: AgentTeam = {
      id: generateId('team'),
      name: params.name,
      agentIds: params.agentIds,
      createdAt: now(),
    };
    this.teams.set(team.id, team);
    return team;
  }

  async teamList(): Promise<AgentTeam[]> {
    return [...this.teams.values()];
  }

  async teamGet(params: { teamId: string }): Promise<AgentTeam> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    return team;
  }

  async teamAddAgent(params: { teamId: string; agentId: string }): Promise<AgentTeam> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    if (!team.agentIds.includes(params.agentId)) team.agentIds.push(params.agentId);
    return team;
  }

  async teamRemoveAgent(params: { teamId: string; agentId: string }): Promise<AgentTeam> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    team.agentIds = team.agentIds.filter(id => id !== params.agentId);
    return team;
  }

  async teamSummon(params: { teamId: string }): Promise<{ summoned: boolean }> {
    const team = this.teams.get(params.teamId);
    if (!team) return { summoned: false };
    for (const agentId of team.agentIds) {
      await this.agentSummon({ agentId });
    }
    return { summoned: true };
  }

  async teamStep(params: { teamId: string; observation: string }): Promise<CollectiveStepResult> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team ${params.teamId} not found`);
    const agentResults: AgentStepResult[] = [];
    for (const agentId of team.agentIds) {
      try {
        const result = await this.agentStep({ agentId, observation: params.observation });
        agentResults.push(result);
      } catch { /* agent may not exist */ }
    }
    const result: CollectiveStepResult = {
      teamId: params.teamId,
      collectiveFreeEnergy: agentResults.reduce((sum, r) => sum + r.freeEnergy, 0) / Math.max(1, agentResults.length),
      sharedBeliefs: [],
      phaseAlignment: 0.7 + Math.random() * 0.3,
      agentResults,
      timestamp: now(),
    };
    this.ctx.emit('aleph:teamStep', result);
    return result;
  }

  async teamDismiss(params: { teamId: string }): Promise<{ dismissed: boolean }> {
    const team = this.teams.get(params.teamId);
    if (!team) return { dismissed: false };
    for (const agentId of team.agentIds) {
      await this.agentDismiss({ agentId });
    }
    return { dismissed: true };
  }
}
