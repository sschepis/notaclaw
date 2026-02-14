// =============================================================================
// ProjectStore — Persistence Layer
// =============================================================================
// Persists project data via PluginContext.storage (key-value) and optionally
// AlephNet memory fields for semantic search. See DESIGN.md §ProjectStore.

import {
  Project,
  ProjectGoal,
  Plan,
  PlanTask,
  ProjectSettings,
  DEFAULT_PROJECT_SETTINGS,
  createEmptyPlan,
  generateId,
} from './types';

const LOG_PREFIX = '[planman:store]';

/** Lightweight project index entry stored in plugin storage. */
interface ProjectIndexEntry {
  id: string;
  name: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

/** Storage adapter matching PluginContext.storage */
interface StorageAdapter {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
}

/** Optional IPC adapter for AlephNet memory field operations. */
interface IPCAdapter {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

export class ProjectStore {
  private storage: StorageAdapter;
  private ipc?: IPCAdapter;
  private projectIndex: ProjectIndexEntry[] = [];
  private projectCache: Map<string, Project> = new Map();

  constructor(storage: StorageAdapter, ipc?: IPCAdapter) {
    this.storage = storage;
    this.ipc = ipc;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    try {
      const index = await this.storage.get('planman:index');
      if (Array.isArray(index)) {
        this.projectIndex = index;
      }
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to load project index:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  async saveProject(project: Project): Promise<void> {
    project.updatedAt = Date.now();

    // Update cache
    this.projectCache.set(project.id, project);

    // Persist full project
    await this.storage.set(`planman:project:${project.id}`, project);

    // Update index
    const indexEntry: ProjectIndexEntry = {
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    const existingIdx = this.projectIndex.findIndex(e => e.id === project.id);
    if (existingIdx >= 0) {
      this.projectIndex[existingIdx] = indexEntry;
    } else {
      this.projectIndex.push(indexEntry);
    }
    await this.storage.set('planman:index', this.projectIndex);

    // Optionally sync to AlephNet memory field
    await this.syncToMemory(project);
  }

  async loadProject(id: string): Promise<Project | null> {
    // Check cache first
    if (this.projectCache.has(id)) {
      return this.projectCache.get(id)!;
    }

    try {
      const project = await this.storage.get(`planman:project:${id}`);
      if (project) {
        this.projectCache.set(id, project);
        return project;
      }
    } catch (err) {
      console.error(LOG_PREFIX, `Failed to load project ${id}:`, err);
    }
    return null;
  }

  async listProjects(statusFilter?: string): Promise<ProjectIndexEntry[]> {
    if (statusFilter) {
      return this.projectIndex.filter(e => e.status === statusFilter);
    }
    return [...this.projectIndex];
  }

  async deleteProject(id: string): Promise<boolean> {
    this.projectCache.delete(id);
    this.projectIndex = this.projectIndex.filter(e => e.id !== id);

    try {
      await this.storage.set(`planman:project:${id}`, null);
      await this.storage.set('planman:index', this.projectIndex);
      return true;
    } catch (err) {
      console.error(LOG_PREFIX, `Failed to delete project ${id}:`, err);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  createProject(
    name: string,
    description: string,
    goals?: string[]
  ): Project {
    const id = generateId();
    const now = Date.now();

    const projectGoals: ProjectGoal[] = (goals || []).map((g, i) => ({
      id: generateId(),
      description: g,
      priority: 1.0 - i * 0.1, // First goal = highest priority
      measureOfSuccess: '',
    }));

    return {
      id,
      name,
      description,
      status: 'planning',
      createdAt: now,
      updatedAt: now,
      memoryFieldId: `planman:project:${id}`,
      conversationId: '', // Populated by ProjectManager after conversation creation
      goals: projectGoals,
      milestones: [],
      plan: createEmptyPlan(id),
      settings: { ...DEFAULT_PROJECT_SETTINGS },
    };
  }

  // ---------------------------------------------------------------------------
  // Task Lookup
  // ---------------------------------------------------------------------------

  /** Find a task by ID across all loaded projects. */
  findTask(projectId: string, taskId: string): PlanTask | null {
    const project = this.projectCache.get(projectId);
    if (!project) return null;
    return this.findTaskInList(project.plan.tasks, taskId);
  }

  private findTaskInList(tasks: PlanTask[], taskId: string): PlanTask | null {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      const found = this.findTaskInList(task.subtasks, taskId);
      if (found) return found;
    }
    return null;
  }

  /** Get all tasks flattened (including subtasks) for a project. */
  getAllTasks(projectId: string): PlanTask[] {
    const project = this.projectCache.get(projectId);
    if (!project) return [];
    return this.flattenTasks(project.plan.tasks);
  }

  private flattenTasks(tasks: PlanTask[]): PlanTask[] {
    const result: PlanTask[] = [];
    for (const task of tasks) {
      result.push(task);
      if (task.subtasks.length > 0) {
        result.push(...this.flattenTasks(task.subtasks));
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /** Local search across all cached project tasks by text match. */
  searchTasks(query: string): Array<{ projectId: string; task: PlanTask }> {
    const results: Array<{ projectId: string; task: PlanTask }> = [];
    const queryLower = query.toLowerCase();

    for (const [projectId, project] of this.projectCache) {
      const allTasks = this.flattenTasks(project.plan.tasks);
      for (const task of allTasks) {
        if (
          task.title.toLowerCase().includes(queryLower) ||
          task.description.toLowerCase().includes(queryLower) ||
          task.tags.some(t => t.toLowerCase().includes(queryLower))
        ) {
          results.push({ projectId, task });
        }
      }
    }
    return results;
  }

  /** Semantic search via AlephNet memory fields (if available). */
  async searchTasksSemantic(query: string): Promise<Array<{ projectId: string; task: PlanTask }>> {
    if (!this.ipc) {
      return this.searchTasks(query); // Fallback to local search
    }

    try {
      const results = await this.ipc.invoke('memory:search', {
        query,
        namespace: 'planman',
        limit: 20,
      });

      if (Array.isArray(results)) {
        return results
          .filter((r: any) => r.metadata?.projectId && r.metadata?.taskId)
          .map((r: any) => {
            const task = this.findTask(r.metadata.projectId, r.metadata.taskId);
            return task ? { projectId: r.metadata.projectId, task } : null;
          })
          .filter((r): r is { projectId: string; task: PlanTask } => r !== null);
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Semantic search failed, falling back to local:', err);
    }
    return this.searchTasks(query);
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(): Promise<ProjectSettings> {
    try {
      const settings = await this.storage.get('planman:settings');
      if (settings) return { ...DEFAULT_PROJECT_SETTINGS, ...settings };
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to load settings:', err);
    }
    return { ...DEFAULT_PROJECT_SETTINGS };
  }

  async saveSettings(settings: ProjectSettings): Promise<void> {
    await this.storage.set('planman:settings', settings);
  }

  // ---------------------------------------------------------------------------
  // Memory Sync (AlephNet)
  // ---------------------------------------------------------------------------

  private async syncToMemory(project: Project): Promise<void> {
    if (!this.ipc) return;

    try {
      // Store project summary as a memory fragment
      const summary = this.buildProjectSummary(project);
      await this.ipc.invoke('memory:store', {
        namespace: 'planman',
        key: `project:${project.id}`,
        content: summary,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          type: 'project_summary',
        },
      });

      // Store each task as an individual memory fragment for semantic search
      for (const task of this.flattenTasks(project.plan.tasks)) {
        await this.ipc.invoke('memory:store', {
          namespace: 'planman',
          key: `task:${project.id}:${task.id}`,
          content: `${task.title}: ${task.description}. Tags: ${task.tags.join(', ')}. Status: ${task.status}.`,
          metadata: {
            projectId: project.id,
            taskId: task.id,
            status: task.status,
            priority: task.priority,
            type: 'task',
          },
        });
      }
    } catch (err) {
      // Memory sync is best-effort; don't fail the save
      console.warn(LOG_PREFIX, 'Memory sync failed (non-critical):', err);
    }
  }

  private buildProjectSummary(project: Project): string {
    const taskCount = this.flattenTasks(project.plan.tasks).length;
    const doneCount = this.flattenTasks(project.plan.tasks).filter(t => t.status === 'done').length;
    return [
      `Project: ${project.name}`,
      `Description: ${project.description}`,
      `Status: ${project.status}`,
      `Tasks: ${doneCount}/${taskCount} complete`,
      `Goals: ${project.goals.map(g => g.description).join('; ')}`,
      `Milestones: ${project.milestones.map(m => `${m.name} (${m.completionPercentage}%)`).join('; ')}`,
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /** Ensure a project is loaded into cache. */
  async ensureLoaded(id: string): Promise<Project | null> {
    if (this.projectCache.has(id)) return this.projectCache.get(id)!;
    return this.loadProject(id);
  }

  /** Invalidate a project from cache (forces reload on next access). */
  invalidate(id: string): void {
    this.projectCache.delete(id);
  }

  /** Clear the entire cache. */
  clearCache(): void {
    this.projectCache.clear();
  }
}
