# planman — AI-Driven Project Manager Plugin

## Overview

`planman` is an AI-driven project management plugin for notaclaw. It provides autonomous project planning, task decomposition, progress tracking, dependency resolution, and adaptive re-planning — all powered by the existing agent infrastructure. The plugin turns natural-language project descriptions into structured, executable plans that ResonantAgents can work on collaboratively, with continuous AI-driven monitoring and re-prioritization.

**Version**: 0.1.0  
**Status**: Design Phase  
**Semantic Domain**: `cognitive`

---

## Design Principles

1. **Leverage, Don't Rebuild** — Reuse [`AgentTaskRunner`](../../client/src/main/services/agent-runner/AgentTaskRunner.ts), [`TaskScheduler`](../../client/src/main/services/TaskScheduler.ts), [`ResonantAgentService`](../../client/src/main/services/ResonantAgentService.ts), [`AlephMemoryClient`](../../client/src/main/services/alephnet/AlephMemoryClient.ts), and the [`PluginContext`](../../client/src/shared/plugin-types.ts:135) API rather than creating parallel systems.
2. **AI-Native** — Every project operation (decomposition, estimation, assignment, re-planning) is mediated by AI through [`context.ai.complete()`](../../client/src/shared/plugin-types.ts:194).
3. **Agent-First Execution** — Tasks are assigned to [`ResonantAgent`](../../client/src/shared/resonant-agent-types.ts:120) instances for autonomous execution via [`AgentStartTaskParams`](../../client/src/shared/resonant-agent-types.ts:315).
4. **Memory-Backed Persistence** — Project state lives in AlephNet memory fields, enabling semantic search, cross-project learning, and mesh-distributed collaboration.
5. **Observable & Adaptive** — The system continuously monitors progress and uses AI to detect blockers, suggest re-prioritization, and adapt plans to reality.

---

## Architecture

### Data Model

```
Project
├── id: string (UUID)
├── name: string
├── description: string
├── status: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
├── createdAt: number
├── updatedAt: number
├── memoryFieldId: string          # AlephNet memory field for this project
├── conversationId: string         # Bound conversation for project chat
├── goals: ProjectGoal[]
├── milestones: Milestone[]
├── plan: Plan
└── settings: ProjectSettings

Plan
├── id: string
├── projectId: string
├── version: number                # Incremented on re-plan
├── tasks: PlanTask[]
├── dependencies: Dependency[]
├── criticalPath: string[]         # Task IDs on the critical path
├── estimatedCompletionAt: number
├── generatedAt: number
└── generatedBy: 'ai' | 'user'

PlanTask
├── id: string
├── title: string
├── description: string
├── status: 'pending' | 'ready' | 'assigned' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled'
├── priority: 'critical' | 'high' | 'medium' | 'low'
├── estimatedEffort: string        # AI-estimated (e.g., "2 hours", "1 day")
├── assignedAgentId?: string       # ResonantAgent ID
├── assignedAgentTaskId?: string   # AgentTask ID (from AgentTaskRunner)
├── dependsOn: string[]            # Task IDs this blocks on
├── blockedBy: string[]            # Task IDs blocking this
├── tags: string[]
├── acceptanceCriteria: string[]
├── output?: string                # Result/artifact produced
├── startedAt?: number
├── completedAt?: number
├── notes: TaskNote[]              # AI observations, user comments
└── subtasks: PlanTask[]           # Recursive decomposition

Dependency
├── from: string                   # Task ID
├── to: string                     # Task ID
└── type: 'blocks' | 'informs' | 'requires'

Milestone
├── id: string
├── name: string
├── targetDate?: number
├── taskIds: string[]              # Tasks that constitute this milestone
├── status: 'pending' | 'in_progress' | 'completed'
└── completionPercentage: number

ProjectGoal
├── id: string
├── description: string
├── priority: number               # 0.0 – 1.0
└── measureOfSuccess: string

TaskNote
├── author: 'ai' | 'user' | string  # Agent name
├── content: string
├── timestamp: number
└── type: 'observation' | 'blocker' | 'resolution' | 'comment'

ProjectSettings
├── autoAssign: boolean            # AI auto-assigns tasks to agents
├── autoReplan: boolean            # AI re-plans when blockers detected
├── checkInterval: string          # Cron expression for progress checks
├── defaultAgentIds: string[]      # Pool of agents available to this project
├── maxConcurrentTasks: number     # Max parallel task executions
└── notifyOnMilestone: boolean
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      planman Plugin                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ ProjectStore  │  │ PlanEngine   │  │ ExecutionOrchestrator  │ │
│  │ (persistence) │  │ (AI planning)│  │ (agent dispatch)       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘ │
│         │                 │                      │               │
│  ┌──────┴─────────────────┴──────────────────────┴─────────────┐│
│  │                    ProjectManager                            ││
│  │         (core coordinator — lifecycle, events)               ││
│  └──────────────────────┬──────────────────────────────────────┘││
│                         │                                       ││
│  ┌──────────────────────┴──────────────────────────────────────┐││
│  │                   ProgressMonitor                            │││
│  │    (scheduled checks, blocker detection, re-planning)       │││
│  └─────────────────────────────────────────────────────────────┘││
│                                                                  │
│  ┌──── Main Process (Tools) ────────────────────────────────────┐│
│  │ project_create, project_plan, project_status, task_assign,   ││
│  │ task_update, task_complete, project_replan, project_report   ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──── Renderer (UI) ──────────────────────────────────────────┐│
│  │ ProjectBoard (Kanban), GanttView, ProjectChat,              ││
│  │ TaskDetail modal, SettingsTab                                ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

External Dependencies (existing infrastructure):
  ├── AgentTaskRunner       → Executes tasks via ResonantAgents
  ├── TaskScheduler         → Scheduled progress checks (cron)
  ├── AlephMemoryClient     → Project state persistence & semantic search
  ├── ConversationManager   → Project-bound conversations
  ├── AIProviderManager     → AI completions for planning
  ├── ResonantAgentService  → Agent CRUD, summoning, task dispatch
  ├── AgentToolRegistry     → Tool registration for agent access
  └── PluginContext.ui      → Navigation, panels, modals, toasts
```

---

## Module Breakdown

### `ProjectManager` — Core Coordinator

The central service that wires together all subsystems. Instantiated in [`activate(context)`](main/index.ts).

| Method | Description |
|--------|-------------|
| `createProject(name, description, goals?)` | Creates a project, allocates memory field, binds conversation |
| `getProject(projectId)` | Retrieves project from store |
| `listProjects(filter?)` | Lists projects with optional status filter |
| `deleteProject(projectId)` | Archives and removes project |
| `generatePlan(projectId, constraints?)` | Invokes PlanEngine to decompose goals into tasks |
| `executePlan(projectId)` | Starts executing ready tasks via ExecutionOrchestrator |
| `pauseProject(projectId)` | Pauses all active task executions |
| `getProjectReport(projectId)` | AI-generated status report |

**Lifecycle**: Initialized on plugin activation. Subscribes to `AgentTaskRunner` events (`taskUpdate`, `taskMessage`) to track agent progress on assigned tasks. Subscribes to `TaskScheduler` for periodic progress monitoring.

### `ProjectStore` — Persistence Layer

Persists project data using two mechanisms:

1. **Plugin Storage** ([`context.storage`](../../client/src/shared/plugin-types.ts:143)) — Project index, settings, and lightweight metadata. Fast key-value access.
2. **AlephNet Memory Fields** ([`AlephMemoryClient`](../../client/src/main/services/alephnet/AlephMemoryClient.ts)) — Full project plans, task details, and notes as memory fragments. Enables semantic search across projects (e.g., "find tasks related to authentication" across all projects).

| Method | Storage | Description |
|--------|---------|-------------|
| `saveProject(project)` | Plugin Storage + Memory | Persists project metadata and plan |
| `loadProject(id)` | Plugin Storage | Loads project by ID |
| `listProjects()` | Plugin Storage | Returns project index |
| `searchTasks(query)` | Memory Field | Semantic search across all project tasks |
| `getProjectHistory(id)` | Memory Field | Historical plan versions and task notes |

**Memory Field Structure**: Each project gets a dedicated memory field (`planman:project:{id}`). Task data is stored as fragments with semantic vectors, enabling AI retrieval of relevant past work when planning new projects.

### `PlanEngine` — AI-Driven Planning

The AI planning engine takes project goals and produces structured plans. Uses [`context.ai.complete()`](../../client/src/shared/plugin-types.ts:194) for all AI operations.

| Method | Description |
|--------|-------------|
| `decompose(goals, context?)` | Breaks goals into a task DAG with dependencies |
| `estimate(tasks)` | AI-estimates effort for each task |
| `prioritize(tasks, constraints?)` | Orders tasks by priority and critical path |
| `replan(project, blockerInfo)` | Re-generates plan sections affected by blockers |
| `suggestAssignments(tasks, agents)` | Matches tasks to agents by capability |

**Planning Prompt Chain**: The engine uses a multi-step prompt chain (stored in [`data/prompt-chains/planman-decompose.json`](../../data/prompt-chains/planman-decompose.json)):

1. **Analyze** — Parse the project description, extract implicit requirements, identify risks
2. **Decompose** — Break into milestone → task → subtask hierarchy
3. **Sequence** — Identify dependencies, compute critical path
4. **Estimate** — Apply effort estimates per task
5. **Validate** — Check for circular dependencies, missing coverage, unrealistic estimates

**Context Enrichment**: Before planning, the engine queries AlephNet memory for:
- Similar past projects (semantic similarity search)
- Historical estimation accuracy (for calibration)
- Agent capability profiles (for assignment feasibility)

**Output Format**: Plans are returned as structured JSON matching the `Plan` data model. The AI is instructed to produce valid JSON with acceptance criteria for each task.

### `ExecutionOrchestrator` — Agent Dispatch

Bridges the plan to actual agent execution using [`ResonantAgentService`](../../client/src/main/services/ResonantAgentService.ts) and [`AgentTaskRunner`](../../client/src/main/services/agent-runner/AgentTaskRunner.ts).

| Method | Description |
|--------|-------------|
| `dispatchReadyTasks(project)` | Finds tasks with status `ready` and dispatches to agents |
| `assignTask(taskId, agentId)` | Assigns a task to a specific agent and starts execution |
| `cancelTask(taskId)` | Cancels a running agent task |
| `handleTaskComplete(agentTaskId, result)` | Processes agent completion, updates plan task status |
| `handleTaskError(agentTaskId, error)` | Handles agent failure, marks task as blocked |
| `getReadyTasks(plan)` | Returns tasks whose dependencies are all satisfied |

**Dispatch Flow**:
```
1. ExecutionOrchestrator.dispatchReadyTasks(project)
2. → Filters plan.tasks where status === 'ready' AND all dependsOn are 'done'
3. → For each ready task:
   a. Select agent (auto-assign via PlanEngine.suggestAssignments or use task.assignedAgentId)
   b. Build task prompt from task.description + task.acceptanceCriteria + project context
   c. Call ResonantAgentService via IPC: 'resonant:agent:startTask'
      with AgentStartTaskParams { agentId, conversationId, message, metadata }
   d. Store returned agentTaskId on task.assignedAgentTaskId
   e. Update task status to 'in_progress'
4. → Subscribe to AgentTaskRunner events for progress tracking
```

**Agent Task Prompt Template**:
```
You are working on project: "{project.name}"

## Your Task
**{task.title}**
{task.description}

## Acceptance Criteria
{task.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

## Context
- This task depends on: {task.dependsOn completed tasks with their outputs}
- Project workspace: {workspaceService.workspacePath}
- Related files: {AI-identified relevant files from project memory}

## Instructions
Complete this task according to the acceptance criteria above.
When finished, provide a summary of what you accomplished and any artifacts produced.
```

**Concurrency Control**: Respects `settings.maxConcurrentTasks`. Uses a simple queue — when a task completes, the next ready task is dispatched.

### `ProgressMonitor` — Scheduled Oversight

A scheduled service that periodically evaluates project health using AI. Registered with [`TaskScheduler`](../../client/src/main/services/TaskScheduler.ts) via [`context.ipc.invoke('scheduler:createTask', ...)`](../../client/src/main/services/TaskScheduler.ts:219).

| Check | Frequency | Action |
|-------|-----------|--------|
| Stale task detection | Every check interval | Flags tasks in_progress for > 2× estimated effort |
| Blocker detection | Every check interval | Identifies blocked tasks with no resolution path |
| Critical path drift | Every check interval | Re-computes critical path, warns if completion date slips |
| Agent health | Every check interval | Checks if assigned agents are in error state |
| Auto-replan | On blocker detection | Triggers PlanEngine.replan() if `settings.autoReplan` is true |
| Milestone check | On task completion | Evaluates milestone completion percentage, notifies if reached |

**Implementation**: Uses a single `ScheduledTask` with a cron expression from `settings.checkInterval` (default: `*/30 * * * *` — every 30 minutes). The driving prompt asks the AI to evaluate project health and return structured findings.

**Health Report Schema**:
```typescript
interface ProjectHealthReport {
  projectId: string;
  timestamp: number;
  overallHealth: 'healthy' | 'at_risk' | 'critical';
  completionPercentage: number;
  estimatedCompletionAt: number;
  findings: Array<{
    type: 'stale_task' | 'blocker' | 'critical_path_drift' | 'agent_error' | 'milestone_reached';
    severity: 'info' | 'warning' | 'critical';
    taskId?: string;
    message: string;
    suggestedAction?: string;
  }>;
  recommendations: string[];
}
```

---

## Agent Tools

Registered via [`context.services.tools.register()`](../../client/src/shared/plugin-types.ts:169) and also exposed on the DSN mesh via [`context.dsn.registerTool()`](../../client/src/shared/plugin-types.ts:185).

| Tool | Parameters | Description |
|------|-----------|-------------|
| `project_create` | `{ name, description, goals? }` | Create a new project |
| `project_plan` | `{ projectId, constraints? }` | Generate/regenerate the project plan |
| `project_status` | `{ projectId }` | Get current project status summary |
| `project_execute` | `{ projectId }` | Start executing ready tasks |
| `project_pause` | `{ projectId }` | Pause project execution |
| `project_replan` | `{ projectId, reason }` | Trigger AI re-planning with context |
| `project_report` | `{ projectId, format? }` | Generate detailed AI status report |
| `project_list` | `{ status? }` | List all projects |
| `task_update` | `{ projectId, taskId, status?, notes? }` | Update a task's status or add notes |
| `task_assign` | `{ projectId, taskId, agentId }` | Assign a task to an agent |
| `task_search` | `{ query }` | Semantic search across all project tasks |

These tools make planman's capabilities available to any agent in the system — including agents working on other tasks who may want to create or query projects programmatically.

---

## UI Components

### Navigation & Stage View

Registered via [`ui.registerNavigation()`](../../client/src/shared/slot-types.ts:454):

```typescript
ui.registerNavigation({
  id: 'planman',
  label: 'Projects',
  icon: KanbanIcon,       // From lucide-react
  view: {
    id: 'planman-view',
    name: 'Project Manager',
    icon: KanbanIcon,
    component: ProjectManagerView
  },
  badge: () => activeProjectCount || null,
  order: 25
});
```

### `ProjectManagerView` — Main Stage View

A tabbed layout with three sub-views:

1. **Project List** — Cards showing each project with status, completion %, and quick actions
2. **Board View** — Kanban board for the active project (columns: Pending → Ready → In Progress → Review → Done)
3. **Timeline View** — Gantt-style chart showing task dependencies and estimated durations

### `TaskDetailModal` — Task Inspector

Shown via [`ui.showModal()`](../../client/src/shared/slot-types.ts:469) when clicking a task card:

- Task title, description, acceptance criteria
- Status selector
- Agent assignment (dropdown of available agents)
- Dependency graph (which tasks this depends on / blocks)
- Notes timeline (AI observations + user comments)
- Action buttons: Assign, Start, Cancel, Mark Complete

### `ProjectChatDecorator` — Chat Integration

Registered via [`ui.registerMessageDecorator()`](../../client/src/shared/slot-types.ts:463):

Decorates chat messages in project-bound conversations with:
- Task reference links (auto-detected `#task-123` patterns)
- Progress bars on milestone messages
- Inline status badges on agent task completion messages

### `PlanmanSettingsTab` — Settings

Registered via [`ui.registerSettingsTab()`](../../client/src/shared/slot-types.ts:466):

- Default check interval
- Auto-assign toggle
- Auto-replan toggle
- Max concurrent tasks
- Default agent pool selection

### Bottom Panel Tab

Registered via [`ui.registerBottomPanelTab()`](../../client/src/shared/slot-types.ts:477):

- **Project Activity** — Live feed of task status changes, agent messages, and AI health observations across all active projects

---

## IPC Channels

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `planman:project:create` | renderer → main | `{ name, description, goals? }` | `Project` |
| `planman:project:list` | renderer → main | `{ status? }` | `Project[]` |
| `planman:project:get` | renderer → main | `{ projectId }` | `Project` |
| `planman:project:delete` | renderer → main | `{ projectId }` | `{ deleted: boolean }` |
| `planman:project:plan` | renderer → main | `{ projectId, constraints? }` | `Plan` |
| `planman:project:execute` | renderer → main | `{ projectId }` | `{ started: boolean }` |
| `planman:project:pause` | renderer → main | `{ projectId }` | `{ paused: boolean }` |
| `planman:project:replan` | renderer → main | `{ projectId, reason }` | `Plan` |
| `planman:project:report` | renderer → main | `{ projectId }` | `ProjectHealthReport` |
| `planman:task:update` | renderer → main | `{ projectId, taskId, updates }` | `PlanTask` |
| `planman:task:assign` | renderer → main | `{ projectId, taskId, agentId }` | `PlanTask` |
| `planman:task:search` | renderer → main | `{ query }` | `PlanTask[]` |
| `planman:settings:get` | renderer → main | — | `ProjectSettings` |
| `planman:settings:update` | renderer → main | `Partial<ProjectSettings>` | `ProjectSettings` |

Events (main → renderer via [`context.ipc.send()`](../../client/src/shared/plugin-types.ts:160)):

| Event | Payload | Trigger |
|-------|---------|---------|
| `planman:task:statusChanged` | `{ projectId, taskId, oldStatus, newStatus }` | Task status transition |
| `planman:project:healthUpdate` | `ProjectHealthReport` | ProgressMonitor check completes |
| `planman:milestone:reached` | `{ projectId, milestoneId, name }` | All milestone tasks completed |

---

## Prompt Chain: `planman-decompose`

Stored at [`data/prompt-chains/planman-decompose.json`](../../data/prompt-chains/planman-decompose.json).

```json
{
  "meta": {
    "_name": "Project Plan Decomposition",
    "_description": "Multi-step chain for decomposing project goals into executable task plans",
    "_version": "1.0.0"
  },
  "prompts": [
    {
      "name": "analyze",
      "system": "You are a senior technical project manager...",
      "user": "Analyze this project:\nName: {name}\nDescription: {description}\nGoals:\n{goals}\n\nIdentify: implicit requirements, technical risks, skill domains needed, and constraints.",
      "responseFormat": {
        "requirements": ["string"],
        "risks": [{"description": "string", "severity": "string", "mitigation": "string"}],
        "skillDomains": ["string"],
        "constraints": ["string"]
      },
      "then": { "next": "decompose" }
    },
    {
      "name": "decompose",
      "system": "You are a project decomposition specialist...",
      "user": "Given the analysis:\n{state.analyze}\n\nDecompose into milestones and tasks. Each task must have:\n- Clear title and description\n- Acceptance criteria (testable)\n- Dependencies on other tasks\n- Priority (critical/high/medium/low)\n- Estimated effort\n- Required skill domain",
      "responseFormat": {
        "milestones": [{"name": "string", "tasks": ["PlanTask"]}]
      },
      "then": { "next": "sequence" }
    },
    {
      "name": "sequence",
      "system": "You are a dependency analysis specialist...",
      "user": "Given the task breakdown:\n{state.decompose}\n\nValidate and refine dependencies. Identify the critical path. Flag any:\n- Circular dependencies\n- Tasks with missing dependencies\n- Parallelizable tasks currently sequenced\n- Bottleneck tasks with many dependents",
      "responseFormat": {
        "tasks": ["PlanTask with refined dependencies"],
        "criticalPath": ["taskId"],
        "warnings": ["string"]
      },
      "then": { "next": "validate" }
    },
    {
      "name": "validate",
      "system": "You are a QA specialist for project plans...",
      "user": "Review this plan for completeness:\n{state.sequence}\n\nOriginal goals:\n{goals}\n\nCheck:\n1. Every goal is addressed by at least one task\n2. No acceptance criteria are vague or untestable\n3. Effort estimates are reasonable\n4. The plan is achievable\n\nReturn the final validated plan.",
      "responseFormat": {
        "plan": "Plan",
        "validationIssues": ["string"],
        "confidence": "number 0-1"
      }
    }
  ]
}
```

---

## Plugin Manifest

```json
{
  "id": "com.notaclaw.planman",
  "version": "0.1.0",
  "name": "PlanMan",
  "description": "AI-driven project manager with autonomous task planning, agent assignment, and adaptive re-planning.",
  "author": "notaclaw",
  "main": "main/index.js",
  "renderer": "renderer/bundle.js",
  "permissions": [
    "store:read",
    "store:write",
    "ai:complete",
    "dsn:register-tool",
    "dsn:invoke-tool"
  ],
  "semanticDomain": "cognitive",
  "aleph": {
    "type": "aleph-extension",
    "capabilities": {
      "skillProvider": true,
      "dsnEnabled": true,
      "semanticDomain": "cognitive"
    },
    "tools": [
      {
        "name": "project_create",
        "description": "Create a new managed project from a description and goals",
        "parameters": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "description": "Project name" },
            "description": { "type": "string", "description": "Project description" },
            "goals": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Project goals (optional)"
            }
          },
          "required": ["name", "description"]
        }
      },
      {
        "name": "project_plan",
        "description": "Generate or regenerate the execution plan for a project using AI decomposition",
        "parameters": {
          "type": "object",
          "properties": {
            "projectId": { "type": "string" },
            "constraints": { "type": "string", "description": "Optional constraints or preferences for planning" }
          },
          "required": ["projectId"]
        }
      },
      {
        "name": "project_status",
        "description": "Get the current status summary of a project including task completion and health",
        "parameters": {
          "type": "object",
          "properties": {
            "projectId": { "type": "string" }
          },
          "required": ["projectId"]
        }
      },
      {
        "name": "project_execute",
        "description": "Start executing ready tasks in a project by dispatching them to agents",
        "parameters": {
          "type": "object",
          "properties": {
            "projectId": { "type": "string" }
          },
          "required": ["projectId"]
        }
      },
      {
        "name": "task_update",
        "description": "Update a task's status or add notes",
        "parameters": {
          "type": "object",
          "properties": {
            "projectId": { "type": "string" },
            "taskId": { "type": "string" },
            "status": { "type": "string" },
            "notes": { "type": "string" }
          },
          "required": ["projectId", "taskId"]
        }
      },
      {
        "name": "task_search",
        "description": "Semantic search across all project tasks",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    ],
    "configuration": [
      { "name": "checkInterval", "type": "string", "default": "*/30 * * * *", "description": "Cron expression for automated progress checks" },
      { "name": "autoAssign", "type": "boolean", "default": true, "description": "Automatically assign tasks to best-fit agents" },
      { "name": "autoReplan", "type": "boolean", "default": false, "description": "Automatically re-plan when blockers detected" },
      { "name": "maxConcurrentTasks", "type": "number", "default": 3, "description": "Maximum tasks executing in parallel" }
    ],
    "smfProfile": [0.9, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.5,
                   0.7, 0.3, 0.8, 0.2, 0.9, 0.4, 0.5, 0.6]
  }
}
```

---

## Plugin Lifecycle

### `activate(context: PluginContext)`

```typescript
export async function activate(context: PluginContext) {
  // 1. Load settings from plugin storage
  const settings = await context.storage.get('settings') || DEFAULT_SETTINGS;

  // 2. Initialize subsystems
  const store = new ProjectStore(context.storage, context.dsn);
  const planEngine = new PlanEngine(context.ai);
  const orchestrator = new ExecutionOrchestrator(context.ipc);
  const monitor = new ProgressMonitor(context.ai, context.ipc, settings);
  const manager = new ProjectManager(store, planEngine, orchestrator, monitor);

  // 3. Register agent tools (available to all agents in the system)
  context.services.tools.register({
    name: 'project_create',
    description: 'Create a new managed project...',
    parameters: { /* ... */ },
    handler: async (args) => manager.createProject(args.name, args.description, args.goals)
  });
  // ... register all 10 tools

  // 4. Register DSN tools (mesh-available)
  context.dsn.registerTool(
    { name: 'project_create', description: '...' },
    async (args) => manager.createProject(args.name, args.description, args.goals)
  );
  // ... register key tools on DSN

  // 5. Register IPC handlers for renderer communication
  context.ipc.handle('planman:project:create', (data) => manager.createProject(data.name, data.description, data.goals));
  context.ipc.handle('planman:project:list', (data) => manager.listProjects(data?.status));
  context.ipc.handle('planman:project:plan', (data) => manager.generatePlan(data.projectId, data.constraints));
  context.ipc.handle('planman:project:execute', (data) => manager.executePlan(data.projectId));
  // ... register all IPC handlers

  // 6. Subscribe to agent task events for progress tracking
  context.ipc.on('agent:taskUpdate', (event) => orchestrator.handleAgentTaskUpdate(event));
  context.ipc.on('agent:taskMessage', (event) => orchestrator.handleAgentTaskMessage(event));

  // 7. Restore active projects and resume monitoring
  const projects = await store.listProjects();
  for (const project of projects) {
    if (project.status === 'active') {
      monitor.startMonitoring(project);
    }
  }

  // 8. Lifecycle event
  context.on('ready', () => {
    console.log('[planman] Plugin ready');
  });
}
```

### `deactivate()`

```typescript
export function deactivate() {
  // 1. Pause all active project monitors
  monitor.stopAll();
  // 2. Cancel any in-progress scheduled checks
  // 3. Save any unsaved state
}
```

---

## Integration Points

### With `AgentTaskRunner`

When planman dispatches a task to an agent:

1. Calls `resonant:agent:startTask` IPC channel with [`AgentStartTaskParams`](../../client/src/shared/resonant-agent-types.ts:315)
2. The `AgentTaskRunner` creates an `AgentTask`, builds tools from `AgentToolRegistry`, and runs the [`AgentLoop`](../../client/src/main/services/agent-runner/AgentLoop.ts:44)
3. Planman listens for `taskUpdate` events matching its tracked `agentTaskId`s
4. On `completed`: extracts output, updates plan task status to `done`, triggers ready-task dispatch
5. On `error`: marks task as `blocked`, adds error note, optionally triggers re-plan

### With `TaskScheduler`

Progress monitoring uses `TaskScheduler` for cron-based scheduling:

1. On project activation, creates a `ScheduledTask` via IPC `scheduler:createTask`
2. The `ScheduledTask.drivingPrompt` contains the health check prompt with project context
3. On execution, the AI evaluates project health and returns a `ProjectHealthReport`
4. Planman processes findings and emits IPC events to the renderer

### With `AlephNet Memory`

Project data persistence and cross-project intelligence:

1. Each project gets a memory field: `planman:project:{id}`
2. Tasks are stored as memory fragments with semantic vectors
3. On planning, the engine queries memory for similar past projects
4. Historical estimation data improves future effort predictions
5. Cross-project search enables finding related work across all projects

### With `ResonantAgent Templates`

Planman benefits from the existing [agent template system](../../client/src/shared/resonant-agent-types.ts:163):

- `code-engineer` template → assigned to implementation tasks
- `research-analyst` template → assigned to research/investigation tasks  
- `system-operator` template → assigned to DevOps/infrastructure tasks
- Custom project-specific agents can be created on-demand

---

## Execution Walkthrough

### Creating and Running a Project

```
User: "Create a project to build a REST API for user management"

1. User invokes project_create tool (or uses UI)
   → ProjectManager.createProject("User Management API", "Build a REST API...")
   → ProjectStore allocates memory field, creates conversation
   → Returns Project { id: "proj-abc", status: "planning" }

2. User invokes project_plan tool
   → PlanEngine.decompose() runs planman-decompose prompt chain:
     Step 1 (analyze): Identifies requirements (auth, CRUD, validation, DB)
     Step 2 (decompose): Creates milestones & tasks:
       Milestone 1: "Foundation"
         Task 1.1: Set up Node.js project with Express (ready, low, 30min)
         Task 1.2: Design database schema (ready, high, 1hr)
         Task 1.3: Set up database connection (depends: 1.2, medium, 30min)
       Milestone 2: "Core CRUD"
         Task 2.1: Implement user creation endpoint (depends: 1.1+1.3, high, 2hr)
         Task 2.2: Implement user retrieval endpoints (depends: 1.3, high, 1hr)
         ...
       Milestone 3: "Auth & Security"
         Task 3.1: Implement JWT authentication (depends: 2.1, critical, 3hr)
         ...
     Step 3 (sequence): Computes critical path: 1.2 → 1.3 → 2.1 → 3.1
     Step 4 (validate): Confirms plan covers all goals, estimates reasonable
   → Returns Plan with 12 tasks, 3 milestones

3. User invokes project_execute tool
   → ExecutionOrchestrator.dispatchReadyTasks():
     Task 1.1 status=ready, no deps → dispatch to code-engineer agent
     Task 1.2 status=ready, no deps → dispatch to research-analyst agent
   → Two agents working in parallel

4. Agent completes Task 1.1
   → AgentTaskRunner emits taskUpdate { status: 'completed' }
   → ExecutionOrchestrator.handleTaskComplete():
     Marks task 1.1 as 'done'
     Checks: Task 2.1 depends on 1.1 + 1.3 → 1.3 not done yet, stays pending
   → No new tasks to dispatch

5. Agent completes Task 1.2
   → Task 1.2 marked 'done'
   → Task 1.3 depends only on 1.2 → now 'ready' → dispatched to code-engineer

6. ProgressMonitor runs (30 min check)
   → AI evaluates: 2/12 tasks done, critical path on track
   → Returns: { overallHealth: 'healthy', completionPercentage: 17 }

7. ... continues until all tasks done

8. Final milestone reached
   → planman:milestone:reached event emitted
   → Project status → 'completed'
   → AI generates final project report
```

---

## File Structure

```
plugins/planman/
├── DESIGN.md                          # This document
├── manifest.json                      # Plugin manifest
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
├── main/
│   ├── index.ts                       # Plugin entry point (activate/deactivate)
│   ├── ProjectManager.ts              # Core coordinator
│   ├── ProjectStore.ts                # Persistence layer
│   ├── PlanEngine.ts                  # AI planning engine
│   ├── ExecutionOrchestrator.ts       # Agent dispatch & tracking
│   ├── ProgressMonitor.ts            # Scheduled health checks
│   └── types.ts                       # All data model types
├── renderer/
│   ├── index.tsx                      # Renderer entry point
│   ├── bundle.js                      # Built renderer bundle
│   ├── ProjectManagerView.tsx         # Main stage view
│   ├── components/
│   │   ├── ProjectList.tsx            # Project cards grid
│   │   ├── BoardView.tsx              # Kanban board
│   │   ├── TimelineView.tsx           # Gantt chart
│   │   ├── TaskCard.tsx               # Individual task card
│   │   ├── TaskDetailModal.tsx        # Task detail inspector
│   │   ├── ProjectChatDecorator.tsx   # Chat message decorations
│   │   ├── ActivityFeed.tsx           # Bottom panel activity log
│   │   └── PlanmanSettings.tsx        # Settings tab
│   └── store.ts                       # Zustand store for renderer state
├── data/
│   └── prompt-chains/
│       ├── planman-decompose.json     # Planning prompt chain
│       └── planman-healthcheck.json   # Health monitoring prompt chain
└── tests/
    ├── ProjectManager.test.ts
    ├── PlanEngine.test.ts
    ├── ExecutionOrchestrator.test.ts
    └── ProgressMonitor.test.ts
```

---

## Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| `AgentTaskRunner` | Core service | Execute tasks via agents |
| `TaskScheduler` | Core service | Schedule periodic health checks |
| `ResonantAgentService` | Core service | Agent CRUD and summoning |
| `AlephMemoryClient` | Core service | Project persistence and semantic search |
| `ConversationManager` | Core service | Project-bound conversations |
| `AIProviderManager` | Core service (via `context.ai`) | AI completions for planning |
| `AgentToolRegistry` | Core service | Tool registration |
| `PluginContext` | Plugin API | Storage, IPC, DSN, UI |

No external npm dependencies required — planman operates entirely through the existing notaclaw infrastructure.

---

## Security & Permissions

| Permission | Usage | Justification |
|------------|-------|---------------|
| `store:read` | Load project data from plugin storage | Required for persistence |
| `store:write` | Save project data to plugin storage | Required for persistence |
| `ai:complete` | AI-driven planning, estimation, health checks | Core functionality |
| `dsn:register-tool` | Expose project tools on the mesh | Enables remote agent access |
| `dsn:invoke-tool` | Query memory fields for project data | Enables semantic search |

Planman does **not** request `fs:read`, `fs:write`, or `exec:shell` — filesystem access is handled by the agents executing tasks, not by planman itself. This follows the principle of least privilege: planman manages and coordinates, agents execute.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI produces invalid plan structure | Medium | JSON schema validation on all AI outputs; retry with explicit correction prompt on parse failure |
| Circular dependency in generated plan | Medium | Topological sort validation in PlanEngine.sequence step; reject and re-plan if cycles detected |
| Agent task execution stalls indefinitely | Medium | ProgressMonitor detects stale tasks; `AgentLoopConfig.maxDurationMs` enforces hard timeout |
| Memory field growth unbounded | Low | Implement archival: completed projects archived to cold storage after configurable period |
| Re-plan disrupts in-progress tasks | Medium | Re-plan only modifies tasks with status `pending` or `ready`; in-progress tasks are preserved |
| Multiple projects competing for same agents | Low | Concurrency limit per project; agent pool assignment prevents contention |
| Prompt chain token limit exceeded on large projects | Medium | Chunk large plans into sub-plans per milestone; summarize context for chain steps |

---

## Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Multi-agent orchestration** | Use [`ResonantAgentTeam`](../../client/src/shared/resonant-agent-types.ts:267) for team-based task execution with inter-agent communication |
| **Project templates** | Pre-built plan templates for common project types (API, CLI tool, library) |
| **Retrospective analysis** | AI-driven post-project analysis comparing estimates vs actuals |
| **Resource contention graph** | Visual display of agent utilization across projects |
| **External integrations** | Sync with GitHub Issues, Linear, Jira via gateway plugins |
| **Natural language commands** | "What's blocking the authentication milestone?" → direct AI query |
| **Budget tracking** | Track AI token costs per project, per task, per agent |
| **RISA script triggers** | Attach [`AgentScriptAttachment`](../../client/src/shared/resonant-agent-types.ts:93) scripts for event-driven project automation |
