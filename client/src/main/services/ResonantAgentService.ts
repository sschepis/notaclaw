/**
 * ResonantAgentService — Central service for managing Resonant Agents.
 *
 * Consolidates:
 *   - Agent CRUD (previously scattered between AlephNet SRIA and local stores)
 *   - Agent lifecycle (summon / dismiss)
 *   - Task delegation to AgentTaskRunner
 *   - Team management
 *   - Template management
 *
 * This is the single entry point for all agent operations.
 */

import { EventEmitter } from 'events';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

import {
  ResonantAgent,
  ResonantAgentTeam,
  ResonantAgentTemplate,
  CreateResonantAgentOptions,
  UpdateResonantAgentOptions,
  SummonContext,
  AgentStartTaskParams,
  OrchestrateTeamParams,
  OrchestrateResult,
  BUILTIN_TEMPLATES,
  createDefaultAgent,
} from '../../shared/resonant-agent-types';
import { AgentTaskRunner } from './agent-runner';
import { AgentToolRegistry } from './AgentToolRegistry';

const AGENTS_FILE = 'resonant-agents.json';
const TEAMS_FILE = 'resonant-teams.json';

export class ResonantAgentService extends EventEmitter {
  private agentTaskRunner: AgentTaskRunner;
  /** Exposed for AgentTaskRunner to delegate tool resolution */
  public readonly toolRegistry: AgentToolRegistry;

  private agents: Map<string, ResonantAgent> = new Map();
  private teams: Map<string, ResonantAgentTeam> = new Map();
  private agentsPath: string;
  private teamsPath: string;
  private initialized = false;

  constructor(
    agentTaskRunner: AgentTaskRunner,
    toolRegistry: AgentToolRegistry
  ) {
    super();
    this.agentTaskRunner = agentTaskRunner;
    this.toolRegistry = toolRegistry;
    this.agentsPath = path.join(app.getPath('userData'), AGENTS_FILE);
    this.teamsPath = path.join(app.getPath('userData'), TEAMS_FILE);
  }

  /**
   * Initialize — load persisted agents and teams from disk.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadAgents();
    await this.loadTeams();
    this.initialized = true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Agent CRUD
  // ═══════════════════════════════════════════════════════════════════════

  async listAgents(filter?: Partial<ResonantAgent>): Promise<ResonantAgent[]> {
    let result = Array.from(this.agents.values());
    if (filter) {
      if (filter.status?.state) {
        result = result.filter(a => a.status.state === filter.status!.state);
      }
      if (filter.deployment?.mode) {
        result = result.filter(a => a.deployment.mode === filter.deployment!.mode);
      }
    }
    return result;
  }

  async getAgent(id: string): Promise<ResonantAgent | null> {
    return this.agents.get(id) || null;
  }

  async createAgent(options: CreateResonantAgentOptions): Promise<ResonantAgent> {
    let agent: ResonantAgent;

    if (options.templateId) {
      const template = this.getTemplate(options.templateId);
      if (!template) {
        throw new Error(`Template "${options.templateId}" not found`);
      }
      agent = this.agentFromTemplate(template, options);
    } else {
      agent = createDefaultAgent({
        id: randomUUID(),
        name: options.name,
        description: options.description || '',
        personality: options.personality
          ? { ...createDefaultAgent().personality, ...options.personality }
          : createDefaultAgent().personality,
        capabilities: options.capabilities
          ? { ...createDefaultAgent().capabilities, ...options.capabilities }
          : createDefaultAgent().capabilities,
        memory: options.memory
          ? { ...createDefaultAgent().memory, ...options.memory }
          : createDefaultAgent().memory,
        deployment: options.deployment
          ? { ...createDefaultAgent().deployment, ...options.deployment }
          : createDefaultAgent().deployment,
        goalPriors: options.goalPriors || {},
      });
    }

    this.agents.set(agent.id, agent);
    await this.saveAgents();
    this.emit('agentCreated', agent);
    return agent;
  }

  async updateAgent(id: string, updates: UpdateResonantAgentOptions): Promise<ResonantAgent> {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent "${id}" not found`);

    // Apply partial updates
    if (updates.name !== undefined) agent.name = updates.name;
    if (updates.description !== undefined) agent.description = updates.description;
    if (updates.avatar !== undefined) agent.avatar = updates.avatar;
    if (updates.personality) {
      agent.personality = { ...agent.personality, ...updates.personality };
    }
    if (updates.capabilities) {
      agent.capabilities = { ...agent.capabilities, ...updates.capabilities };
    }
    if (updates.memory) {
      agent.memory = { ...agent.memory, ...updates.memory };
    }
    if (updates.deployment) {
      agent.deployment = { ...agent.deployment, ...updates.deployment };
    }
    if (updates.goalPriors) {
      agent.goalPriors = { ...agent.goalPriors, ...updates.goalPriors };
    }
    if (updates.scripts) {
      agent.scripts = updates.scripts;
    }

    agent.updatedAt = Date.now();
    await this.saveAgents();
    this.emit('agentUpdated', agent);
    return agent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id);
    if (!agent) return false;

    // Dismiss if active
    if (agent.status.state !== 'dormant') {
      await this.dismiss(id);
    }

    this.agents.delete(id);

    // Remove from any teams
    for (const team of this.teams.values()) {
      const idx = team.agentIds.indexOf(id);
      if (idx >= 0) {
        team.agentIds.splice(idx, 1);
      }
    }

    await this.saveAgents();
    await this.saveTeams();
    this.emit('agentDeleted', id);
    return true;
  }

  async duplicateAgent(id: string, newName: string): Promise<ResonantAgent> {
    const original = this.agents.get(id);
    if (!original) throw new Error(`Agent "${id}" not found`);

    const copy: ResonantAgent = {
      ...JSON.parse(JSON.stringify(original)),
      id: randomUUID(),
      name: newName,
      status: { state: 'dormant' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.agents.set(copy.id, copy);
    await this.saveAgents();
    this.emit('agentCreated', copy);
    return copy;
  }

  async exportAgent(id: string): Promise<string> {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent "${id}" not found`);
    // Strip runtime status before export
    const exported = { ...agent, status: { state: 'dormant' as const } };
    return JSON.stringify(exported, null, 2);
  }

  async importAgent(json: string): Promise<ResonantAgent> {
    const parsed = JSON.parse(json) as ResonantAgent;
    parsed.id = randomUUID();
    parsed.status = { state: 'dormant' };
    parsed.createdAt = Date.now();
    parsed.updatedAt = Date.now();
    parsed.createdBy = 'user';

    this.agents.set(parsed.id, parsed);
    await this.saveAgents();
    this.emit('agentCreated', parsed);
    return parsed;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Agent Lifecycle
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Summon an agent: DORMANT → ACTIVE
   */
  async summon(id: string, _context?: SummonContext): Promise<ResonantAgent> {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent "${id}" not found`);

    if (agent.status.state === 'active' || agent.status.state === 'busy') {
      return agent; // Already summoned
    }

    agent.status = {
      state: 'active',
      lastActiveAt: Date.now(),
    };
    agent.updatedAt = Date.now();

    await this.saveAgents();
    this.emit('agentSummoned', agent);
    return agent;
  }

  /**
   * Dismiss an agent: ACTIVE/BUSY → DORMANT
   */
  async dismiss(id: string): Promise<boolean> {
    const agent = this.agents.get(id);
    if (!agent) return false;

    // Stop any active task
    if (agent.status.activeTaskId) {
      try {
        this.agentTaskRunner.stopTask(agent.status.activeTaskId);
      } catch {
        // Task may already be stopped
      }
    }

    agent.status = { state: 'dormant' };
    agent.updatedAt = Date.now();

    await this.saveAgents();
    this.emit('agentDismissed', id);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Task Execution
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Start a task on a specific agent.
   * The agent must be summoned (active) first — if dormant, auto-summon.
   */
  async startTask(params: AgentStartTaskParams): Promise<string> {
    const agent = this.agents.get(params.agentId);
    if (!agent) throw new Error(`Agent "${params.agentId}" not found`);

    // Auto-summon if dormant
    if (agent.status.state === 'dormant') {
      await this.summon(params.agentId);
    }

    if (agent.status.state === 'busy') {
      throw new Error(`Agent "${agent.name}" is already busy with task ${agent.status.activeTaskId}`);
    }

    // Inject agent personality into metadata
    const metadata = {
      ...params.metadata,
      agentId: params.agentId,
      agentName: agent.name,
      agentPersonality: agent.personality,
    };

    // Start task via AgentTaskRunner
    const taskId = await this.agentTaskRunner.startTask(
      params.conversationId,
      params.message,
      metadata
    );

    // Mark agent as busy
    agent.status = {
      state: 'busy',
      activeTaskId: taskId,
      lastActiveAt: Date.now(),
    };
    agent.updatedAt = Date.now();
    await this.saveAgents();
    this.emit('agentBusy', agent);

    // Listen for task completion to transition back to active
    const onUpdate = (event: any) => {
      if (event.task?.id === taskId) {
        const status = event.task.status;
        if (status === 'completed' || status === 'cancelled' || status === 'error') {
          agent.status = {
            state: status === 'error' ? 'error' : 'active',
            lastActiveAt: Date.now(),
            errorMessage: status === 'error' ? event.task.errorMessage : undefined,
          };
          agent.updatedAt = Date.now();
          this.saveAgents().catch(() => {});
          this.emit('agentTaskCompleted', { agentId: params.agentId, taskId, status });
          this.agentTaskRunner.removeListener('taskUpdate', onUpdate);
        }
      }
    };
    this.agentTaskRunner.on('taskUpdate', onUpdate);

    return taskId;
  }

  /**
   * Stop a running task.
   */
  async stopTask(taskId: string): Promise<void> {
    this.agentTaskRunner.stopTask(taskId);
  }

  /**
   * Provide a user response to a waiting agent task.
   */
  async respondToTask(taskId: string, response: string): Promise<void> {
    this.agentTaskRunner.resolveUserResponse(taskId, response);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Templates
  // ═══════════════════════════════════════════════════════════════════════

  getTemplates(): ResonantAgentTemplate[] {
    return [...BUILTIN_TEMPLATES];
  }

  getTemplate(templateId: string): ResonantAgentTemplate | undefined {
    return BUILTIN_TEMPLATES.find(t => t.id === templateId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Teams
  // ═══════════════════════════════════════════════════════════════════════

  async listTeams(): Promise<ResonantAgentTeam[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: string): Promise<ResonantAgentTeam | null> {
    return this.teams.get(id) || null;
  }

  async createTeam(name: string, agentIds: string[], description?: string): Promise<ResonantAgentTeam> {
    const team: ResonantAgentTeam = {
      id: randomUUID(),
      name,
      description,
      agentIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
    };
    this.teams.set(team.id, team);
    await this.saveTeams();
    this.emit('teamCreated', team);
    return team;
  }

  async updateTeam(id: string, updates: Partial<ResonantAgentTeam>): Promise<ResonantAgentTeam> {
    const team = this.teams.get(id);
    if (!team) throw new Error(`Team "${id}" not found`);
    Object.assign(team, updates, { updatedAt: Date.now() });
    await this.saveTeams();
    this.emit('teamUpdated', team);
    return team;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const deleted = this.teams.delete(id);
    if (deleted) {
      await this.saveTeams();
      this.emit('teamDeleted', id);
    }
    return deleted;
  }

  /**
   * Orchestrate a team to work on a task.
   *
   * Sequential delegation: each agent in the team receives the full task.
   * Each agent's task runs through AgentTaskRunner (the real agentic loop).
   * If a conversationId is provided, all agents post to that conversation;
   * otherwise a new conversation-per-agent approach is used.
   *
   * For production parallel orchestration with task decomposition, integrate
   * an LLM-based decomposer that breaks the task into subtasks and assigns
   * them to specific agents based on their capabilities.
   */
  async orchestrateTeam(params: OrchestrateTeamParams): Promise<OrchestrateResult> {
    const team = this.teams.get(params.teamId);
    if (!team) throw new Error(`Team "${params.teamId}" not found`);

    const agentResults: OrchestrateResult['agentResults'] = [];
    const orchestrationId = randomUUID();

    for (const agentId of team.agentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        agentResults.push({
          agentId,
          agentName: 'Unknown',
          subtask: params.task,
          output: '',
          status: 'error',
          error: `Agent ${agentId} not found`,
        });
        continue;
      }

      try {
        // Auto-summon if dormant
        if (agent.status.state === 'dormant') {
          await this.summon(agentId);
        }

        // Skip agents that are currently busy
        if (agent.status.state === 'busy') {
          agentResults.push({
            agentId,
            agentName: agent.name,
            subtask: params.task,
            output: '',
            status: 'error',
            error: `Agent "${agent.name}" is already busy with another task`,
          });
          continue;
        }

        // Build subtask description incorporating the agent's specialty
        const subtask = `[Team Task from "${team.name}"] ${params.task}`;

        // Start the real agentic task via AgentTaskRunner
        const taskId = await this.startTask({
          agentId,
          conversationId: params.conversationId || `team-${orchestrationId}-${agentId}`,
          message: subtask,
          metadata: {
            ...params.metadata,
            teamId: params.teamId,
            orchestrationId,
          },
        });

        agentResults.push({
          agentId,
          agentName: agent.name,
          subtask,
          output: `Task ${taskId} started successfully for agent "${agent.name}"`,
          status: 'success',
        });
      } catch (err: any) {
        agentResults.push({
          agentId,
          agentName: agent.name,
          subtask: params.task,
          output: '',
          status: 'error',
          error: err.message,
        });
      }
    }

    const successCount = agentResults.filter(r => r.status === 'success').length;
    const totalCount = agentResults.length;

    return {
      teamId: params.teamId,
      taskId: orchestrationId,
      agentResults,
      synthesizedOutput: `Team "${team.name}" orchestration initiated: ${successCount}/${totalCount} agents successfully started tasks.`,
      coherenceScore: totalCount > 0 ? successCount / totalCount : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Persistence
  // ═══════════════════════════════════════════════════════════════════════

  private async loadAgents(): Promise<void> {
    try {
      const data = await fs.readFile(this.agentsPath, 'utf-8');
      const parsed: ResonantAgent[] = JSON.parse(data);
      for (const agent of parsed) {
        // Reset runtime state on load
        agent.status = { state: 'dormant' };
        this.agents.set(agent.id, agent);
      }
    } catch {
      // File doesn't exist or is invalid — start empty
    }
  }

  private async saveAgents(): Promise<void> {
    try {
      const data = Array.from(this.agents.values());
      await fs.writeFile(this.agentsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ResonantAgentService] Failed to save agents:', err);
    }
  }

  private async loadTeams(): Promise<void> {
    try {
      const data = await fs.readFile(this.teamsPath, 'utf-8');
      const parsed: ResonantAgentTeam[] = JSON.parse(data);
      for (const team of parsed) {
        this.teams.set(team.id, team);
      }
    } catch {
      // File doesn't exist or is invalid — start empty
    }
  }

  private async saveTeams(): Promise<void> {
    try {
      const data = Array.from(this.teams.values());
      await fs.writeFile(this.teamsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ResonantAgentService] Failed to save teams:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════

  private agentFromTemplate(template: ResonantAgentTemplate, options: CreateResonantAgentOptions): ResonantAgent {
    const now = Date.now();
    return {
      id: randomUUID(),
      name: options.name,
      description: options.description || template.description,
      personality: {
        ...template.personality,
        ...(options.personality || {}),
      },
      capabilities: {
        tools: template.capabilities.tools || ['shell', 'read_file', 'write_file', 'list_directory'],
        maxSteps: template.capabilities.maxSteps || 50,
        maxDurationMs: template.capabilities.maxDurationMs || 30 * 60 * 1000,
        permissions: template.capabilities.permissions || ['fs:read', 'fs:write', 'shell'],
        ...(options.capabilities || {}),
      },
      memory: {
        sharedFieldIds: [],
        retentionPolicy: 'persistent',
        ...(template.memory || {}),
        ...(options.memory || {}),
      },
      deployment: {
        mode: 'local',
        ...(template.deployment || {}),
        ...(options.deployment || {}),
      },
      scripts: [],
      status: { state: 'dormant' },
      beliefs: [],
      goalPriors: {
        ...(template.goalPriors || {}),
        ...(options.goalPriors || {}),
      },
      createdAt: now,
      updatedAt: now,
      createdBy: 'template',
    };
  }

  /**
   * Shutdown — dismiss all active agents.
   */
  async shutdown(): Promise<void> {
    for (const agent of this.agents.values()) {
      if (agent.status.state !== 'dormant') {
        await this.dismiss(agent.id).catch(() => {});
      }
    }
  }
}
