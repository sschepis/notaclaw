// =============================================================================
// ProjectManager — Core Coordinator
// =============================================================================
// Central service wiring together all subsystems. Provides the primary API for
// project lifecycle operations. See DESIGN.md §ProjectManager.

import {
  Project,
  Plan,
  PlanTask,
  ProjectGoal,
  ProjectSettings,
  ProjectHealthReport,
  TaskStatus,
  TaskNote,
  AgentTaskUpdateEvent,
  AgentTaskMessageEvent,
  computeCompletionPercentage,
  getReadyTasks,
  generateId,
} from './types';
import { ProjectStore } from './ProjectStore';
import { PlanEngine } from './PlanEngine';
import { ExecutionOrchestrator } from './ExecutionOrchestrator';
import { ProgressMonitor } from './ProgressMonitor';

const LOG_PREFIX = '[planman:manager]';

/** IPC adapter for broadcasting events to the renderer. */
interface IPCAdapter {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

export class ProjectManager {
  private store: ProjectStore;
  private engine: PlanEngine;
  private orchestrator: ExecutionOrchestrator;
  private monitor: ProgressMonitor;
  private ipc: IPCAdapter;

  constructor(
    store: ProjectStore,
    engine: PlanEngine,
    orchestrator: ExecutionOrchestrator,
    monitor: ProgressMonitor,
    ipc: IPCAdapter
  ) {
    this.store = store;
    this.engine = engine;
    this.orchestrator = orchestrator;
    this.monitor = monitor;
    this.ipc = ipc;

    // Wire up callbacks
    this.orchestrator.setStatusCallback(this.handleTaskStatusChange.bind(this));
    this.monitor.setHealthCheckCallback(this.handleHealthReport.bind(this));
    this.monitor.setReplanCallback(async (projectId, reason) => {
      await this.replanProject(projectId, reason);
    });
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    await this.store.initialize();

    // Resume monitoring for active projects
    const projects = await this.store.listProjects('active');
    for (const entry of projects) {
      const project = await this.store.loadProject(entry.id);
      if (project) {
        await this.monitor.startMonitoring(project);
      }
    }

    console.log(LOG_PREFIX, `Initialized with ${projects.length} active projects`);
  }

  // ---------------------------------------------------------------------------
  // Project Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Create a new project from name, description, and optional goals.
   */
  async createProject(
    name: string,
    description: string,
    goals?: string[]
  ): Promise<Project> {
    console.log(LOG_PREFIX, `Creating project "${name}"`);

    const project = this.store.createProject(name, description, goals);

    // Try to create a bound conversation
    try {
      const conv = await this.ipc.invoke('conversation:create', {
        title: `Project: ${name}`,
        metadata: { source: 'planman', projectId: project.id },
      });
      if (conv && conv.id) {
        project.conversationId = conv.id;
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Failed to create project conversation:', err);
    }

    await this.store.saveProject(project);
    console.log(LOG_PREFIX, `Project "${name}" created with ID ${project.id}`);

    return project;
  }

  /**
   * Get a project by ID.
   */
  async getProject(projectId: string): Promise<Project | null> {
    return this.store.loadProject(projectId);
  }

  /**
   * List all projects with optional status filter.
   */
  async listProjects(status?: string): Promise<Array<{ id: string; name: string; status: string; createdAt: number; updatedAt: number }>> {
    return this.store.listProjects(status);
  }

  /**
   * Delete (archive) a project.
   */
  async deleteProject(projectId: string): Promise<boolean> {
    await this.monitor.stopMonitoring(projectId);
    return this.store.deleteProject(projectId);
  }

  // ---------------------------------------------------------------------------
  // Planning
  // ---------------------------------------------------------------------------

  /**
   * Generate or regenerate the execution plan for a project.
   */
  async generatePlan(projectId: string, constraints?: string): Promise<Plan> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    console.log(LOG_PREFIX, `Generating plan for "${project.name}"`);

    const plan = await this.engine.decompose(
      project.name,
      project.description,
      project.goals,
      constraints
    );

    // Set the project ID on the plan
    plan.projectId = project.id;

    // Update milestones from the plan (if the engine produced them alongside tasks)
    // The plan engine builds milestones internally via buildPlan

    project.plan = plan;
    project.status = 'planning';
    project.updatedAt = Date.now();

    await this.store.saveProject(project);

    console.log(LOG_PREFIX, `Plan generated: ${plan.tasks.length} tasks, v${plan.version}`);
    return plan;
  }

  /**
   * Trigger AI re-planning for a project.
   */
  async replanProject(projectId: string, reason: string): Promise<Plan> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    console.log(LOG_PREFIX, `Re-planning "${project.name}": ${reason}`);

    const updatedPlan = await this.engine.replan(project.plan, reason, project.goals);
    project.plan = updatedPlan;
    project.updatedAt = Date.now();

    await this.store.saveProject(project);
    return updatedPlan;
  }

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  /**
   * Start executing ready tasks in a project.
   */
  async executePlan(projectId: string): Promise<{ started: boolean; dispatched: number }> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    // Transition project to active
    if (project.status === 'planning') {
      project.status = 'active';
      await this.store.saveProject(project);
      await this.monitor.startMonitoring(project);
    }

    // Configure orchestrator with project settings
    this.orchestrator.setMaxConcurrent(project.settings.maxConcurrentTasks);

    // Dispatch ready tasks
    const dispatched = await this.orchestrator.dispatchReadyTasks(project);

    // Save updated task statuses
    await this.store.saveProject(project);

    return { started: dispatched > 0, dispatched };
  }

  /**
   * Pause project execution (does not cancel in-progress agent tasks).
   */
  async pauseProject(projectId: string): Promise<boolean> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    project.status = 'paused';
    project.updatedAt = Date.now();

    await this.monitor.stopMonitoring(projectId);
    await this.store.saveProject(project);

    console.log(LOG_PREFIX, `Project "${project.name}" paused`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Task Operations
  // ---------------------------------------------------------------------------

  /**
   * Update a task's status and/or add a note.
   */
  async updateTask(
    projectId: string,
    taskId: string,
    updates: { status?: TaskStatus; notes?: string }
  ): Promise<PlanTask | null> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const task = this.findTask(project.plan.tasks, taskId);
    if (!task) throw new Error(`Task ${taskId} not found in project ${projectId}`);

    const oldStatus = task.status;

    if (updates.status && updates.status !== task.status) {
      task.status = updates.status;

      if (updates.status === 'in_progress' && !task.startedAt) {
        task.startedAt = Date.now();
      }
      if (updates.status === 'done') {
        task.completedAt = Date.now();
      }

      // Emit status change event
      this.ipc.send('planman:task:statusChanged', {
        projectId,
        taskId,
        oldStatus,
        newStatus: task.status,
      });
    }

    if (updates.notes) {
      task.notes.push({
        author: 'user',
        content: updates.notes,
        timestamp: Date.now(),
        type: 'comment',
      });
    }

    await this.store.saveProject(project);

    // If a task completed, try to dispatch newly-ready tasks
    if (updates.status === 'done' && project.status === 'active') {
      await this.orchestrator.dispatchReadyTasks(project);
      await this.store.saveProject(project);
    }

    return task;
  }

  /**
   * Assign a task to a specific agent.
   */
  async assignTask(projectId: string, taskId: string, agentId: string): Promise<PlanTask | null> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const task = this.findTask(project.plan.tasks, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.assignedAgentId = agentId;

    // If task is ready, dispatch it immediately
    if (task.status === 'ready') {
      await this.orchestrator.assignTask(project, taskId, agentId);
    }

    await this.store.saveProject(project);
    return task;
  }

  /**
   * Search tasks across all projects.
   */
  async searchTasks(query: string): Promise<Array<{ projectId: string; task: PlanTask }>> {
    // Load all projects into cache first
    const projectList = await this.store.listProjects();
    for (const entry of projectList) {
      await this.store.ensureLoaded(entry.id);
    }
    return this.store.searchTasksSemantic(query);
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  /**
   * Generate an AI-powered status report for a project.
   */
  async getProjectReport(projectId: string): Promise<ProjectHealthReport> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    return this.monitor.runHealthCheck(project);
  }

  /**
   * Get a quick status summary for a project.
   */
  async getProjectStatus(projectId: string): Promise<{
    id: string;
    name: string;
    status: string;
    completion: number;
    totalTasks: number;
    doneTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    readyTasks: number;
  }> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const tasks = project.plan.tasks;
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      completion: computeCompletionPercentage(tasks),
      totalTasks: tasks.length,
      doneTasks: tasks.filter(t => t.status === 'done').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      blockedTasks: tasks.filter(t => t.status === 'blocked').length,
      readyTasks: getReadyTasks(tasks).length,
    };
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(): Promise<ProjectSettings> {
    return this.store.getSettings();
  }

  async updateSettings(updates: Partial<ProjectSettings>): Promise<ProjectSettings> {
    const current = await this.store.getSettings();
    const merged = { ...current, ...updates };
    await this.store.saveSettings(merged);
    this.monitor.updateSettings(merged);
    return merged;
  }

  // ---------------------------------------------------------------------------
  // Event Handlers (wired in constructor)
  // ---------------------------------------------------------------------------

  /**
   * Handle task status change from ExecutionOrchestrator.
   */
  private async handleTaskStatusChange(
    projectId: string,
    taskId: string,
    oldStatus: string,
    newStatus: string,
    result?: string,
    error?: string
  ): Promise<void> {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) return;

    const task = this.findTask(project.plan.tasks, taskId);
    if (!task) return;

    task.status = newStatus as TaskStatus;

    if (newStatus === 'done') {
      task.completedAt = Date.now();
      if (result) {
        task.output = result;
        task.notes.push({
          author: 'ai',
          content: `Task completed. Output: ${result.substring(0, 500)}`,
          timestamp: Date.now(),
          type: 'observation',
        });
      }
    }

    if (newStatus === 'blocked' && error) {
      task.notes.push({
        author: 'ai',
        content: `Task blocked: ${error}`,
        timestamp: Date.now(),
        type: 'blocker',
      });
    }

    // Emit status change event
    this.ipc.send('planman:task:statusChanged', {
      projectId,
      taskId,
      oldStatus,
      newStatus,
    });

    await this.store.saveProject(project);

    // If a task completed, try to dispatch newly-ready tasks
    if (newStatus === 'done' && project.status === 'active') {
      await this.orchestrator.dispatchReadyTasks(project);
      await this.store.saveProject(project);

      // Check if all tasks are done
      const allDone = project.plan.tasks.every(
        t => t.status === 'done' || t.status === 'cancelled'
      );
      if (allDone) {
        project.status = 'completed';
        await this.store.saveProject(project);
        await this.monitor.stopMonitoring(projectId);
        console.log(LOG_PREFIX, `Project "${project.name}" completed!`);

        this.ipc.send('notify', {
          title: 'Project Completed',
          message: `All tasks in "${project.name}" are done!`,
          type: 'success',
          priority: 'high',
          category: 'planman',
          source: 'planman',
        });
      }
    }
  }

  /**
   * Handle health report from ProgressMonitor.
   */
  private async handleHealthReport(report: ProjectHealthReport): Promise<void> {
    // Report is already broadcast by ProgressMonitor
    // Additional processing can be added here (e.g., storing report history)
    console.log(
      LOG_PREFIX,
      `Health report for ${report.projectId}: ${report.overallHealth} (${report.completionPercentage}% complete)`
    );
  }

  // ---------------------------------------------------------------------------
  // Agent Event Forwarding
  // ---------------------------------------------------------------------------

  /**
   * Forward agent task update events to the orchestrator.
   */
  async handleAgentTaskUpdate(event: AgentTaskUpdateEvent): Promise<void> {
    await this.orchestrator.handleAgentTaskUpdate(event);
  }

  /**
   * Forward agent task message events to the orchestrator.
   */
  async handleAgentTaskMessage(event: AgentTaskMessageEvent): Promise<void> {
    await this.orchestrator.handleAgentTaskMessage(event);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private findTask(tasks: PlanTask[], taskId: string): PlanTask | null {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      const found = this.findTask(task.subtasks, taskId);
      if (found) return found;
    }
    return null;
  }
}
