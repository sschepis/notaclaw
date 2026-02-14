// =============================================================================
// ExecutionOrchestrator — Agent Dispatch & Tracking
// =============================================================================
// Bridges the plan to actual agent execution using ResonantAgentService and
// AgentTaskRunner via IPC. See DESIGN.md §ExecutionOrchestrator.

import {
  Project,
  Plan,
  PlanTask,
  TaskNote,
  AgentTaskUpdateEvent,
  AgentTaskMessageEvent,
  getReadyTasks,
} from './types';

const LOG_PREFIX = '[planman:orchestrator]';

/** IPC adapter for communicating with core services. */
interface IPCAdapter {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
}

/** Callback for notifying the ProjectManager of task status changes. */
export type TaskStatusCallback = (
  projectId: string,
  taskId: string,
  oldStatus: string,
  newStatus: string,
  result?: string,
  error?: string
) => Promise<void>;

/** Map from AgentTask ID → { projectId, taskId } for tracking dispatched work. */
interface TrackedTask {
  projectId: string;
  taskId: string;
  agentId: string;
  dispatchedAt: number;
}

export class ExecutionOrchestrator {
  private ipc: IPCAdapter;
  private trackedTasks: Map<string, TrackedTask> = new Map();
  private onStatusChange?: TaskStatusCallback;
  private maxConcurrent: number = 3;

  constructor(ipc: IPCAdapter) {
    this.ipc = ipc;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  setStatusCallback(callback: TaskStatusCallback): void {
    this.onStatusChange = callback;
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  /**
   * Find and dispatch ready tasks in a project, up to the concurrency limit.
   * Returns the number of tasks dispatched.
   */
  async dispatchReadyTasks(project: Project): Promise<number> {
    const plan = project.plan;
    const readyTasks = getReadyTasks(plan.tasks);

    if (readyTasks.length === 0) {
      console.log(LOG_PREFIX, `No ready tasks for project "${project.name}"`);
      return 0;
    }

    // Count currently in-progress tasks for this project
    const activeCount = this.getActiveTaskCount(project.id);
    const slotsAvailable = Math.max(0, this.maxConcurrent - activeCount);

    if (slotsAvailable === 0) {
      console.log(LOG_PREFIX, `Concurrency limit reached for "${project.name}" (${activeCount}/${this.maxConcurrent})`);
      return 0;
    }

    const toDispatch = readyTasks.slice(0, slotsAvailable);
    let dispatched = 0;

    for (const task of toDispatch) {
      const agentId = task.assignedAgentId || await this.selectAgent(task, project);
      if (agentId) {
        const success = await this.assignAndDispatch(project, task, agentId);
        if (success) dispatched++;
      } else {
        console.warn(LOG_PREFIX, `No agent available for task "${task.title}"`);
        this.addTaskNote(task, 'ai', 'No suitable agent found for automatic assignment.', 'observation');
      }
    }

    console.log(LOG_PREFIX, `Dispatched ${dispatched}/${toDispatch.length} tasks for "${project.name}"`);
    return dispatched;
  }

  /**
   * Assign a specific task to a specific agent and start execution.
   */
  async assignTask(project: Project, taskId: string, agentId: string): Promise<boolean> {
    const task = project.plan.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(LOG_PREFIX, `Task ${taskId} not found in project ${project.id}`);
      return false;
    }
    return this.assignAndDispatch(project, task, agentId);
  }

  /**
   * Cancel a running agent task.
   */
  async cancelTask(agentTaskId: string): Promise<boolean> {
    const tracked = this.trackedTasks.get(agentTaskId);
    if (!tracked) {
      console.warn(LOG_PREFIX, `No tracked task for agent task ${agentTaskId}`);
      return false;
    }

    try {
      await this.ipc.invoke('resonant:agent:cancelTask', { taskId: agentTaskId });
      this.trackedTasks.delete(agentTaskId);
      return true;
    } catch (err) {
      console.error(LOG_PREFIX, `Failed to cancel agent task ${agentTaskId}:`, err);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers (called by ProjectManager from IPC subscriptions)
  // ---------------------------------------------------------------------------

  /**
   * Handle agent task update events from AgentTaskRunner.
   */
  async handleAgentTaskUpdate(event: AgentTaskUpdateEvent): Promise<void> {
    const tracked = this.trackedTasks.get(event.taskId);
    if (!tracked) return; // Not one of our tasks

    console.log(
      LOG_PREFIX,
      `Agent task ${event.taskId} status: ${event.status} (project: ${tracked.projectId}, task: ${tracked.taskId})`
    );

    switch (event.status) {
      case 'completed':
        this.trackedTasks.delete(event.taskId);
        if (this.onStatusChange) {
          await this.onStatusChange(
            tracked.projectId,
            tracked.taskId,
            'in_progress',
            'done',
            event.result
          );
        }
        break;

      case 'error':
      case 'failed':
        this.trackedTasks.delete(event.taskId);
        if (this.onStatusChange) {
          await this.onStatusChange(
            tracked.projectId,
            tracked.taskId,
            'in_progress',
            'blocked',
            undefined,
            event.error
          );
        }
        break;

      case 'cancelled':
        this.trackedTasks.delete(event.taskId);
        if (this.onStatusChange) {
          await this.onStatusChange(
            tracked.projectId,
            tracked.taskId,
            'in_progress',
            'pending'
          );
        }
        break;

      case 'running':
        // Already in_progress; nothing to do
        break;

      default:
        console.log(LOG_PREFIX, `Unknown agent task status: ${event.status}`);
    }
  }

  /**
   * Handle agent task message events (progress/log messages from the agent).
   */
  async handleAgentTaskMessage(event: AgentTaskMessageEvent): Promise<void> {
    const tracked = this.trackedTasks.get(event.taskId);
    if (!tracked) return;

    // Optionally store interesting messages as task notes
    // (We don't store every message to avoid noise, just key ones)
    console.log(
      LOG_PREFIX,
      `Agent message [${tracked.taskId}]: ${event.message.substring(0, 100)}`
    );
  }

  // ---------------------------------------------------------------------------
  // Status Queries
  // ---------------------------------------------------------------------------

  /** Get count of currently active (dispatched) tasks for a project. */
  getActiveTaskCount(projectId: string): number {
    let count = 0;
    for (const tracked of this.trackedTasks.values()) {
      if (tracked.projectId === projectId) count++;
    }
    return count;
  }

  /** Get all tracked (active) tasks. */
  getTrackedTasks(): Map<string, TrackedTask> {
    return new Map(this.trackedTasks);
  }

  /** Check if a specific plan task is currently being executed by an agent. */
  isTaskActive(projectId: string, taskId: string): boolean {
    for (const tracked of this.trackedTasks.values()) {
      if (tracked.projectId === projectId && tracked.taskId === taskId) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async assignAndDispatch(
    project: Project,
    task: PlanTask,
    agentId: string
  ): Promise<boolean> {
    try {
      // Build the task prompt for the agent
      const taskPrompt = this.buildTaskPrompt(project, task);

      // Dispatch via ResonantAgentService IPC
      const result = await this.ipc.invoke('resonant:agent:startTask', {
        agentId,
        conversationId: project.conversationId,
        message: taskPrompt,
        metadata: {
          source: 'planman',
          projectId: project.id,
          taskId: task.id,
          taskTitle: task.title,
        },
      });

      if (result && result.taskId) {
        // Track the agent task
        this.trackedTasks.set(result.taskId, {
          projectId: project.id,
          taskId: task.id,
          agentId,
          dispatchedAt: Date.now(),
        });

        // Update plan task
        task.assignedAgentId = agentId;
        task.assignedAgentTaskId = result.taskId;
        task.status = 'in_progress';
        task.startedAt = Date.now();

        this.addTaskNote(task, 'ai', `Dispatched to agent ${agentId}`, 'observation');

        console.log(
          LOG_PREFIX,
          `Task "${task.title}" dispatched to agent ${agentId} (agentTask: ${result.taskId})`
        );

        // Notify status change
        if (this.onStatusChange) {
          await this.onStatusChange(project.id, task.id, 'ready', 'in_progress');
        }

        return true;
      } else {
        console.error(LOG_PREFIX, `Agent dispatch returned no taskId for "${task.title}"`);
        return false;
      }
    } catch (err) {
      console.error(LOG_PREFIX, `Failed to dispatch task "${task.title}":`, err);
      this.addTaskNote(task, 'ai', `Dispatch failed: ${err}`, 'blocker');
      return false;
    }
  }

  /**
   * Build the prompt sent to an agent for executing a task.
   */
  private buildTaskPrompt(project: Project, task: PlanTask): string {
    // Gather completed dependency outputs for context
    const depContext = task.dependsOn
      .map(depId => {
        const depTask = project.plan.tasks.find(t => t.id === depId);
        if (depTask && depTask.status === 'done' && depTask.output) {
          return `- [${depTask.title}]: ${depTask.output}`;
        }
        return depTask ? `- [${depTask.title}]: completed` : null;
      })
      .filter(Boolean)
      .join('\n');

    const criteriaText = task.acceptanceCriteria.length > 0
      ? task.acceptanceCriteria.map(c => `- ${c}`).join('\n')
      : '- Complete the task as described';

    return `You are working on project: "${project.name}"

## Your Task
**${task.title}**
${task.description}

## Acceptance Criteria
${criteriaText}

## Context
${depContext ? `This task depends on completed work:\n${depContext}\n` : ''}
Project description: ${project.description}

## Instructions
Complete this task according to the acceptance criteria above.
When finished, provide a clear summary of what you accomplished and any artifacts produced.
If you encounter blockers, describe them clearly so the project can be re-planned.`;
  }

  /**
   * Select the best agent for a task using the project's default agent pool.
   */
  private async selectAgent(task: PlanTask, project: Project): Promise<string | null> {
    // If the project has default agents, use the first available
    if (project.settings.defaultAgentIds.length > 0) {
      // Simple round-robin or first-available selection
      for (const agentId of project.settings.defaultAgentIds) {
        // Check if this agent is already at capacity
        let agentTaskCount = 0;
        for (const tracked of this.trackedTasks.values()) {
          if (tracked.agentId === agentId) agentTaskCount++;
        }
        if (agentTaskCount < 2) { // Allow max 2 tasks per agent
          return agentId;
        }
      }
    }

    // If no default agents or all busy, try to query available agents
    try {
      const agents = await this.ipc.invoke('resonant:agent:list', {});
      if (Array.isArray(agents) && agents.length > 0) {
        return agents[0].id;
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Failed to list agents:', err);
    }

    return null;
  }

  private addTaskNote(task: PlanTask, author: string, content: string, type: TaskNote['type']): void {
    task.notes.push({
      author,
      content,
      timestamp: Date.now(),
      type,
    });
  }
}
