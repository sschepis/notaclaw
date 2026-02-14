// =============================================================================
// planman — Data Model Types
// =============================================================================
// All types defined per DESIGN.md data model specification.

// --- Plugin Context (local interface matching PluginContext API) ---

export interface PluginContext {
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  ipc: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
    on: (channel: string, handler: (args: any) => Promise<void>) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
  dsn: {
    registerTool: (metadata: any, handler: (args: any) => Promise<any>) => void;
  };
  ai: {
    complete: (params: AICompleteParams) => Promise<AICompleteResult>;
  };
  services: {
    tools: {
      register: (tool: ToolRegistration) => void;
    };
  };
  traits?: {
    register: (trait: any) => void;
  };
  on: (event: string, handler: () => void) => void;
}

export interface AICompleteParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface AICompleteResult {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface ToolRegistration {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: any) => Promise<any>;
}

// --- Core Data Model ---

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived';

export type TaskStatus =
  | 'pending'
  | 'ready'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'review'
  | 'done'
  | 'cancelled';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type DependencyType = 'blocks' | 'informs' | 'requires';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed';

export type NoteType = 'observation' | 'blocker' | 'resolution' | 'comment';

export type HealthStatus = 'healthy' | 'at_risk' | 'critical';

export type FindingType =
  | 'stale_task'
  | 'blocker'
  | 'critical_path_drift'
  | 'agent_error'
  | 'milestone_reached';

export type FindingSeverity = 'info' | 'warning' | 'critical';

// --- Project ---

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

export interface ProjectGoal {
  id: string;
  description: string;
  priority: number; // 0.0 – 1.0
  measureOfSuccess: string;
}

export interface ProjectSettings {
  autoAssign: boolean;
  autoReplan: boolean;
  checkInterval: string; // cron expression
  defaultAgentIds: string[];
  maxConcurrentTasks: number;
  notifyOnMilestone: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  autoAssign: true,
  autoReplan: false,
  checkInterval: '*/30 * * * *',
  defaultAgentIds: [],
  maxConcurrentTasks: 3,
  notifyOnMilestone: true,
};

// --- Plan ---

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

export function createEmptyPlan(projectId: string): Plan {
  return {
    id: generateId(),
    projectId,
    version: 0,
    tasks: [],
    dependencies: [],
    criticalPath: [],
    estimatedCompletionAt: 0,
    generatedAt: Date.now(),
    generatedBy: 'user',
  };
}

// --- Task ---

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

export interface TaskNote {
  author: string; // 'ai' | 'user' | agent name
  content: string;
  timestamp: number;
  type: NoteType;
}

// --- Dependency ---

export interface Dependency {
  from: string; // Task ID
  to: string;   // Task ID
  type: DependencyType;
}

// --- Milestone ---

export interface Milestone {
  id: string;
  name: string;
  targetDate?: number;
  taskIds: string[];
  status: MilestoneStatus;
  completionPercentage: number;
}

// --- Health Report ---

export interface ProjectHealthReport {
  projectId: string;
  timestamp: number;
  overallHealth: HealthStatus;
  completionPercentage: number;
  estimatedCompletionAt: number;
  findings: HealthFinding[];
  recommendations: string[];
}

export interface HealthFinding {
  type: FindingType;
  severity: FindingSeverity;
  taskId?: string;
  message: string;
  suggestedAction?: string;
}

// --- Agent Task Events ---

export interface AgentTaskUpdateEvent {
  taskId: string;
  agentId: string;
  status: string;
  result?: string;
  error?: string;
}

export interface AgentTaskMessageEvent {
  taskId: string;
  agentId: string;
  message: string;
  role: string;
}

// --- IPC Payloads ---

export interface CreateProjectParams {
  name: string;
  description: string;
  goals?: string[];
}

export interface PlanProjectParams {
  projectId: string;
  constraints?: string;
}

export interface ExecuteProjectParams {
  projectId: string;
}

export interface PauseProjectParams {
  projectId: string;
}

export interface ReplanProjectParams {
  projectId: string;
  reason: string;
}

export interface ReportProjectParams {
  projectId: string;
  format?: 'summary' | 'detailed';
}

export interface UpdateTaskParams {
  projectId: string;
  taskId: string;
  status?: TaskStatus;
  notes?: string;
}

export interface AssignTaskParams {
  projectId: string;
  taskId: string;
  agentId: string;
}

export interface SearchTaskParams {
  query: string;
}

// --- Status Change Event ---

export interface TaskStatusChangeEvent {
  projectId: string;
  taskId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export interface MilestoneReachedEvent {
  projectId: string;
  milestoneId: string;
  name: string;
}

// --- Utility ---

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function computeCompletionPercentage(tasks: PlanTask[]): number {
  if (tasks.length === 0) return 0;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  return Math.round((doneTasks / tasks.length) * 100);
}

/**
 * Find tasks that are ready to execute:
 * status === 'pending' or 'ready', and all dependsOn tasks are 'done'.
 */
export function getReadyTasks(tasks: PlanTask[]): PlanTask[] {
  const doneIds = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));
  return tasks.filter(t => {
    if (t.status !== 'pending' && t.status !== 'ready') return false;
    return t.dependsOn.every(depId => doneIds.has(depId));
  });
}

/**
 * Detect circular dependencies using topological sort (Kahn's algorithm).
 * Returns list of task IDs involved in cycles, or empty array if acyclic.
 */
export function detectCycles(tasks: PlanTask[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const task of tasks) {
    if (!inDegree.has(task.id)) inDegree.set(task.id, 0);
    if (!adjacency.has(task.id)) adjacency.set(task.id, []);
    for (const dep of task.dependsOn) {
      if (!adjacency.has(dep)) adjacency.set(dep, []);
      adjacency.get(dep)!.push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighbor of adjacency.get(node) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  const allIds = new Set(tasks.map(t => t.id));
  return [...allIds].filter(id => !sorted.includes(id));
}

/**
 * Compute the critical path through the task graph.
 * Returns an ordered array of task IDs on the longest dependency chain.
 */
export function computeCriticalPath(tasks: PlanTask[]): string[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const memo = new Map<string, string[]>();

  function longestPath(taskId: string): string[] {
    if (memo.has(taskId)) return memo.get(taskId)!;
    const task = taskMap.get(taskId);
    if (!task) return [];

    let longest: string[] = [];
    for (const depId of task.dependsOn) {
      const path = longestPath(depId);
      if (path.length > longest.length) longest = path;
    }

    const result = [...longest, taskId];
    memo.set(taskId, result);
    return result;
  }

  let criticalPath: string[] = [];
  for (const task of tasks) {
    const path = longestPath(task.id);
    if (path.length > criticalPath.length) criticalPath = path;
  }
  return criticalPath;
}
