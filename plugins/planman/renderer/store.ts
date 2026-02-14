// =============================================================================
// planman — Renderer State Store
// =============================================================================
// Zustand-based state management for the renderer UI. Communicates with the
// main process via IPC. See DESIGN.md §UI Components.

// Types duplicated for renderer (no cross-process imports)

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived';
export type TaskStatus = 'pending' | 'ready' | 'assigned' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type HealthStatus = 'healthy' | 'at_risk' | 'critical';

export interface ProjectGoal {
  id: string;
  description: string;
  priority: number;
  measureOfSuccess: string;
}

export interface TaskNote {
  author: string;
  content: string;
  timestamp: number;
  type: 'observation' | 'blocker' | 'resolution' | 'comment';
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedEffort: string;
  assignedAgentId?: string;
  assignedAgentTaskId?: string;
  dependsOn: string[];
  blockedBy: string[];
  tags: string[];
  acceptanceCriteria: string[];
  output?: string;
  startedAt?: number;
  completedAt?: number;
  notes: TaskNote[];
  subtasks: PlanTask[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'blocks' | 'informs' | 'requires';
}

export interface Milestone {
  id: string;
  name: string;
  targetDate?: number;
  taskIds: string[];
  status: 'pending' | 'in_progress' | 'completed';
  completionPercentage: number;
}

export interface Plan {
  id: string;
  projectId: string;
  version: number;
  tasks: PlanTask[];
  dependencies: Dependency[];
  criticalPath: string[];
  estimatedCompletionAt: number;
  generatedAt: number;
  generatedBy: 'ai' | 'user';
}

export interface ProjectSettings {
  autoAssign: boolean;
  autoReplan: boolean;
  checkInterval: string;
  defaultAgentIds: string[];
  maxConcurrentTasks: number;
  notifyOnMilestone: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  memoryFieldId: string;
  conversationId: string;
  goals: ProjectGoal[];
  milestones: Milestone[];
  plan: Plan;
  settings: ProjectSettings;
}

export interface HealthFinding {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  taskId?: string;
  message: string;
  suggestedAction?: string;
}

export interface ProjectHealthReport {
  projectId: string;
  timestamp: number;
  overallHealth: HealthStatus;
  completionPercentage: number;
  estimatedCompletionAt: number;
  findings: HealthFinding[];
  recommendations: string[];
}

export interface ProjectIndexEntry {
  id: string;
  name: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  projectId: string;
  projectName: string;
  type: 'task_status' | 'milestone' | 'health' | 'agent_message';
  message: string;
}

// =============================================================================
// Store Shape
// =============================================================================

export interface PlanmanState {
  // Data
  projects: ProjectIndexEntry[];
  activeProject: Project | null;
  healthReport: ProjectHealthReport | null;
  activityFeed: ActivityEntry[];
  settings: ProjectSettings;

  // UI state
  selectedTaskId: string | null;
  activeView: 'list' | 'board' | 'timeline';
  isLoading: boolean;
  error: string | null;

  // Actions (will be populated by the renderer entry via IPC)
  loadProjects: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  createProject: (name: string, description: string, goals?: string[]) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  generatePlan: (projectId: string, constraints?: string) => Promise<void>;
  executePlan: (projectId: string) => Promise<void>;
  pauseProject: (projectId: string) => Promise<void>;
  replanProject: (projectId: string, reason: string) => Promise<void>;
  updateTask: (projectId: string, taskId: string, updates: { status?: TaskStatus; notes?: string }) => Promise<void>;
  assignTask: (projectId: string, taskId: string, agentId: string) => Promise<void>;
  searchTasks: (query: string) => Promise<Array<{ projectId: string; task: PlanTask }>>;
  getReport: (projectId: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<ProjectSettings>) => Promise<void>;
  selectTask: (taskId: string | null) => void;
  setActiveView: (view: 'list' | 'board' | 'timeline') => void;
  addActivity: (entry: ActivityEntry) => void;
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create the planman Zustand store. Called from the renderer entry
 * with the IPC invoke function injected.
 */
export function createPlanmanStore(
  create: any,
  ipcInvoke: (channel: string, data?: any) => Promise<any>
) {
  return create((set: any, get: any) => ({
    // Initial state
    projects: [],
    activeProject: null,
    healthReport: null,
    activityFeed: [],
    settings: {
      autoAssign: true,
      autoReplan: false,
      checkInterval: '*/30 * * * *',
      defaultAgentIds: [],
      maxConcurrentTasks: 3,
      notifyOnMilestone: true,
    },
    selectedTaskId: null,
    activeView: 'list' as const,
    isLoading: false,
    error: null,

    // Actions
    loadProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const projects = await ipcInvoke('planman:project:list', {});
        set({ projects, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load projects', isLoading: false });
      }
    },

    loadProject: async (projectId: string) => {
      set({ isLoading: true, error: null });
      try {
        const project = await ipcInvoke('planman:project:get', { projectId });
        set({ activeProject: project, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load project', isLoading: false });
      }
    },

    createProject: async (name: string, description: string, goals?: string[]) => {
      set({ isLoading: true, error: null });
      try {
        const project = await ipcInvoke('planman:project:create', { name, description, goals });
        const { projects } = get();
        set({
          projects: [...projects, { id: project.id, name: project.name, status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt }],
          activeProject: project,
          isLoading: false,
        });
        return project;
      } catch (err: any) {
        set({ error: err.message || 'Failed to create project', isLoading: false });
        throw err;
      }
    },

    deleteProject: async (projectId: string) => {
      try {
        await ipcInvoke('planman:project:delete', { projectId });
        const { projects, activeProject } = get();
        set({
          projects: projects.filter((p: ProjectIndexEntry) => p.id !== projectId),
          activeProject: activeProject?.id === projectId ? null : activeProject,
        });
      } catch (err: any) {
        set({ error: err.message || 'Failed to delete project' });
      }
    },

    generatePlan: async (projectId: string, constraints?: string) => {
      set({ isLoading: true, error: null });
      try {
        const plan = await ipcInvoke('planman:project:plan', { projectId, constraints });
        const { activeProject } = get();
        if (activeProject && activeProject.id === projectId) {
          set({ activeProject: { ...activeProject, plan }, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (err: any) {
        set({ error: err.message || 'Failed to generate plan', isLoading: false });
      }
    },

    executePlan: async (projectId: string) => {
      try {
        await ipcInvoke('planman:project:execute', { projectId });
        // Reload project to get updated statuses
        const project = await ipcInvoke('planman:project:get', { projectId });
        set({ activeProject: project });
      } catch (err: any) {
        set({ error: err.message || 'Failed to execute plan' });
      }
    },

    pauseProject: async (projectId: string) => {
      try {
        await ipcInvoke('planman:project:pause', { projectId });
        const project = await ipcInvoke('planman:project:get', { projectId });
        set({ activeProject: project });
      } catch (err: any) {
        set({ error: err.message || 'Failed to pause project' });
      }
    },

    replanProject: async (projectId: string, reason: string) => {
      set({ isLoading: true, error: null });
      try {
        await ipcInvoke('planman:project:replan', { projectId, reason });
        const project = await ipcInvoke('planman:project:get', { projectId });
        set({ activeProject: project, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to re-plan project', isLoading: false });
      }
    },

    updateTask: async (projectId: string, taskId: string, updates: { status?: TaskStatus; notes?: string }) => {
      try {
        await ipcInvoke('planman:task:update', { projectId, taskId, ...updates });
        const project = await ipcInvoke('planman:project:get', { projectId });
        set({ activeProject: project });
      } catch (err: any) {
        set({ error: err.message || 'Failed to update task' });
      }
    },

    assignTask: async (projectId: string, taskId: string, agentId: string) => {
      try {
        await ipcInvoke('planman:task:assign', { projectId, taskId, agentId });
        const project = await ipcInvoke('planman:project:get', { projectId });
        set({ activeProject: project });
      } catch (err: any) {
        set({ error: err.message || 'Failed to assign task' });
      }
    },

    searchTasks: async (query: string) => {
      try {
        return await ipcInvoke('planman:task:search', { query });
      } catch (err: any) {
        set({ error: err.message || 'Search failed' });
        return [];
      }
    },

    getReport: async (projectId: string) => {
      set({ isLoading: true, error: null });
      try {
        const report = await ipcInvoke('planman:project:report', { projectId });
        set({ healthReport: report, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to get report', isLoading: false });
      }
    },

    loadSettings: async () => {
      try {
        const settings = await ipcInvoke('planman:settings:get', {});
        set({ settings });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load settings' });
      }
    },

    updateSettings: async (updates: Partial<ProjectSettings>) => {
      try {
        const settings = await ipcInvoke('planman:settings:update', updates);
        set({ settings });
      } catch (err: any) {
        set({ error: err.message || 'Failed to update settings' });
      }
    },

    selectTask: (taskId: string | null) => {
      set({ selectedTaskId: taskId });
    },

    setActiveView: (view: 'list' | 'board' | 'timeline') => {
      set({ activeView: view });
    },

    addActivity: (entry: ActivityEntry) => {
      const { activityFeed } = get();
      set({ activityFeed: [entry, ...activityFeed].slice(0, 100) }); // Keep last 100
    },
  }));
}
