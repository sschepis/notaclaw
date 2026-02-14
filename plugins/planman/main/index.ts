// =============================================================================
// planman — Plugin Entry Point
// =============================================================================
// Registers tools, IPC handlers, DSN tools, and traits. Wires subsystems.
// See DESIGN.md §Plugin Lifecycle.

import { PluginContext, DEFAULT_PROJECT_SETTINGS } from './types';
import { ProjectStore } from './ProjectStore';
import { PlanEngine } from './PlanEngine';
import { ExecutionOrchestrator } from './ExecutionOrchestrator';
import { ProgressMonitor } from './ProgressMonitor';
import { ProjectManager } from './ProjectManager';

const LOG_PREFIX = '[planman]';

let manager: ProjectManager | null = null;
let monitor: ProgressMonitor | null = null;

// =============================================================================
// Activate
// =============================================================================

export const activate = async (context: PluginContext) => {
  console.log(LOG_PREFIX, 'Activating...');

  // 1. Load settings
  let settings = DEFAULT_PROJECT_SETTINGS;
  try {
    const stored = await context.storage.get('planman:settings');
    if (stored) settings = { ...DEFAULT_PROJECT_SETTINGS, ...stored };
  } catch (err) {
    console.warn(LOG_PREFIX, 'Failed to load settings, using defaults');
  }

  // 2. Initialize subsystems
  const store = new ProjectStore(context.storage, context.ipc);
  const planEngine = new PlanEngine(context.ai);
  const orchestrator = new ExecutionOrchestrator(context.ipc);
  const progressMonitor = new ProgressMonitor(context.ai, context.ipc, settings);
  const projectManager = new ProjectManager(store, planEngine, orchestrator, progressMonitor, context.ipc);

  manager = projectManager;
  monitor = progressMonitor;

  await projectManager.initialize();

  // 3. Register agent tools (available to all agents in the system)
  registerTools(context, projectManager);

  // 4. Register DSN tools (mesh-available)
  registerDSNTools(context, projectManager);

  // 5. Register IPC handlers for renderer communication
  registerIPCHandlers(context, projectManager);

  // 6. Subscribe to agent task events for progress tracking
  context.ipc.on('agent:taskUpdate', async (event: any) => {
    await projectManager.handleAgentTaskUpdate(event);
  });
  context.ipc.on('agent:taskMessage', async (event: any) => {
    await projectManager.handleAgentTaskMessage(event);
  });

  // 7. Register trait
  if (context.traits) {
    context.traits.register({
      id: 'planman',
      name: 'Project Manager',
      description: 'Create and manage AI-driven projects with task decomposition, agent assignment, and progress monitoring.',
      instruction: `You can manage projects using these tools:
- project_create: Create a new project with name, description, and goals
- project_plan: Generate an AI execution plan for a project
- project_execute: Start executing ready tasks by dispatching to agents
- project_status: Get current project status summary
- project_list: List all projects
- task_update: Update a task status or add notes
- task_assign: Assign a task to a specific agent
- task_search: Search across all project tasks`,
      activationMode: 'dynamic',
      triggerKeywords: ['project', 'plan', 'task', 'milestone', 'sprint', 'kanban', 'manage', 'schedule'],
    });
  }

  // 8. Ready event
  context.on('ready', () => {
    console.log(LOG_PREFIX, 'Plugin ready');
  });
};

// =============================================================================
// Deactivate
// =============================================================================

export const deactivate = async () => {
  console.log(LOG_PREFIX, 'Deactivating...');
  if (monitor) {
    await monitor.stopAll();
  }
  manager = null;
  monitor = null;
};

// =============================================================================
// Tool Registration
// =============================================================================

function registerTools(context: PluginContext, mgr: ProjectManager): void {
  if (!context.services?.tools) return;

  context.services.tools.register({
    name: 'project_create',
    description: 'Create a new managed project from a description and goals',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description' },
        goals: { type: 'array', items: { type: 'string' }, description: 'Project goals' },
      },
      required: ['name', 'description'],
    },
    handler: async (args: any) => mgr.createProject(args.name, args.description, args.goals),
  });

  context.services.tools.register({
    name: 'project_plan',
    description: 'Generate or regenerate the execution plan for a project using AI decomposition',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        constraints: { type: 'string', description: 'Optional constraints or preferences' },
      },
      required: ['projectId'],
    },
    handler: async (args: any) => mgr.generatePlan(args.projectId, args.constraints),
  });

  context.services.tools.register({
    name: 'project_status',
    description: 'Get the current status summary of a project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    handler: async (args: any) => mgr.getProjectStatus(args.projectId),
  });

  context.services.tools.register({
    name: 'project_execute',
    description: 'Start executing ready tasks in a project by dispatching to agents',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    handler: async (args: any) => mgr.executePlan(args.projectId),
  });

  context.services.tools.register({
    name: 'project_list',
    description: 'List all managed projects with optional status filter',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status' },
      },
    },
    handler: async (args: any) => mgr.listProjects(args.status),
  });

  context.services.tools.register({
    name: 'project_pause',
    description: 'Pause a project execution',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    handler: async (args: any) => mgr.pauseProject(args.projectId),
  });

  context.services.tools.register({
    name: 'project_replan',
    description: 'Trigger AI re-planning for a project with a reason',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['projectId', 'reason'],
    },
    handler: async (args: any) => mgr.replanProject(args.projectId, args.reason),
  });

  context.services.tools.register({
    name: 'project_report',
    description: 'Generate a detailed AI status report for a project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
    handler: async (args: any) => mgr.getProjectReport(args.projectId),
  });

  context.services.tools.register({
    name: 'task_update',
    description: 'Update a task status or add notes',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        taskId: { type: 'string' },
        status: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['projectId', 'taskId'],
    },
    handler: async (args: any) => mgr.updateTask(args.projectId, args.taskId, {
      status: args.status,
      notes: args.notes,
    }),
  });

  context.services.tools.register({
    name: 'task_assign',
    description: 'Assign a task to a specific agent',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        taskId: { type: 'string' },
        agentId: { type: 'string' },
      },
      required: ['projectId', 'taskId', 'agentId'],
    },
    handler: async (args: any) => mgr.assignTask(args.projectId, args.taskId, args.agentId),
  });

  context.services.tools.register({
    name: 'task_search',
    description: 'Semantic search across all project tasks',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
    handler: async (args: any) => mgr.searchTasks(args.query),
  });
}

// =============================================================================
// DSN Tool Registration
// =============================================================================

function registerDSNTools(context: PluginContext, mgr: ProjectManager): void {
  if (!context.dsn?.registerTool) return;

  const dsnMeta = {
    executionLocation: 'SERVER',
    version: '1.0.0',
    semanticDomain: 'cognitive',
    primeDomain: [2],
    smfAxes: [0, 0, 0, 0],
    requiredTier: 'Neophyte',
  };

  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: 'project_create',
      description: 'Create a new managed project from a description and goals',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          goals: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'description'],
      },
    },
    async (args: any) => mgr.createProject(args.name, args.description, args.goals)
  );

  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: 'project_status',
      description: 'Get project status summary',
      parameters: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
    },
    async (args: any) => mgr.getProjectStatus(args.projectId)
  );

  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: 'project_list',
      description: 'List all managed projects',
      parameters: {
        type: 'object',
        properties: { status: { type: 'string' } },
      },
    },
    async (args: any) => mgr.listProjects(args.status)
  );

  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: 'task_search',
      description: 'Semantic search across all project tasks',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
    async (args: any) => mgr.searchTasks(args.query)
  );
}

// =============================================================================
// IPC Handler Registration
// =============================================================================

function registerIPCHandlers(context: PluginContext, mgr: ProjectManager): void {
  // Project CRUD
  context.ipc.handle('planman:project:create', async (data: any) =>
    mgr.createProject(data.name, data.description, data.goals)
  );

  context.ipc.handle('planman:project:list', async (data: any) =>
    mgr.listProjects(data?.status)
  );

  context.ipc.handle('planman:project:get', async (data: any) =>
    mgr.getProject(data.projectId)
  );

  context.ipc.handle('planman:project:delete', async (data: any) => {
    const deleted = await mgr.deleteProject(data.projectId);
    return { deleted };
  });

  // Planning
  context.ipc.handle('planman:project:plan', async (data: any) =>
    mgr.generatePlan(data.projectId, data.constraints)
  );

  context.ipc.handle('planman:project:replan', async (data: any) =>
    mgr.replanProject(data.projectId, data.reason)
  );

  // Execution
  context.ipc.handle('planman:project:execute', async (data: any) =>
    mgr.executePlan(data.projectId)
  );

  context.ipc.handle('planman:project:pause', async (data: any) => {
    const paused = await mgr.pauseProject(data.projectId);
    return { paused };
  });

  // Reporting
  context.ipc.handle('planman:project:report', async (data: any) =>
    mgr.getProjectReport(data.projectId)
  );

  context.ipc.handle('planman:project:status', async (data: any) =>
    mgr.getProjectStatus(data.projectId)
  );

  // Tasks
  context.ipc.handle('planman:task:update', async (data: any) =>
    mgr.updateTask(data.projectId, data.taskId, {
      status: data.status,
      notes: data.notes,
    })
  );

  context.ipc.handle('planman:task:assign', async (data: any) =>
    mgr.assignTask(data.projectId, data.taskId, data.agentId)
  );

  context.ipc.handle('planman:task:search', async (data: any) =>
    mgr.searchTasks(data.query)
  );

  // Settings
  context.ipc.handle('planman:settings:get', async () =>
    mgr.getSettings()
  );

  context.ipc.handle('planman:settings:update', async (data: any) =>
    mgr.updateSettings(data)
  );
}
