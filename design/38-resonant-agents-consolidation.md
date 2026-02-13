# Design: Resonant Agents — Unified Agent System

## Executive Summary

This document consolidates the fragmented agent functionality scattered across the codebase into a single, coherent system called **Resonant Agents**. Currently, agent-related code exists in at least **7 distinct, loosely-coupled subsystems** with duplicated concepts, inconsistent nomenclature, and competing UI entry points. This design unifies them into one plugin-based architecture with a clear data model, lifecycle, and integration surface.

---

## Part 1: Critical Analysis of Current State

### 1.1 Inventory of Existing Agent Subsystems

| # | Subsystem | Location | Purpose | Status |
|---|-----------|----------|---------|--------|
| 1 | **AgentTaskRunner** (agent-runner/) | `client/src/main/services/agent-runner/` (7 files) | Local agentic task execution with tool-calling loop | ✅ Functional, well-structured |
| 2 | **SRIA Agents** (AlephNet) | `client/src/shared/alephnet-types.ts` lines 695-762, `AlephNetClient.ts` | Remote agent CRUD via AlephNet (create, summon, step, dismiss, run) | ⚠️ Stub implementations, AlephNet-dependent |
| 3 | **RISAService** (Scripts) | `client/src/main/services/RISAService.ts` | Event-driven script execution in VM sandbox | ⚠️ Working but disconnected from agents |
| 4 | **TeamManager** | `client/src/main/services/TeamManager.ts` | Agent team CRUD (local JSON persistence) | ⚠️ Minimal, no actual team orchestration |
| 5 | **PersonalityManager** | `client/src/main/services/PersonalityManager.ts` | System prompt + tool building for conversations | ✅ Functional, but tools duplicated with AgentTaskRunner |
| 6 | **Renderer Agent UI** | `client/src/renderer/components/agents/` (3 components) | Sidebar panel, create dialog, detail stage view | ⚠️ Wired to AlephNet SRIA, not to local AgentTaskRunner |
| 7 | **Agent Store Slice** | `client/src/renderer/store/app/agentSlice.ts` | Zustand slice for AgentTask status tracking | ✅ Functional for AgentTaskRunner |

### 1.2 Identified Problems

#### P1: Two Competing Agent Models
- **`AgentTask`** (from [`agent-types.ts`](client/src/shared/agent-types.ts:23)): Local task-based agent with status, scratchpad, step count. Used by `AgentTaskRunner`.
- **`SRIAAgent`** (from [`alephnet-types.ts`](client/src/shared/alephnet-types.ts:697)): Network-based agent with beliefs, goal priors, lifecycle states. Used by AlephNet API.

These are fundamentally different data models representing the same concept ("an autonomous agent") with no bridge between them.

#### P2: Duplicated UI Entry Points
- **NavRail** [`agents` item](client/src/renderer/components/layout/NavRail.tsx:78): Opens sidebar panel labeled "SRIA Agents" → shows [`ResonantAgentsPanel`](client/src/renderer/components/agents/ResonantAgentsPanel.tsx:221) (AlephNet agents)
- **Agent task status** embedded in [`ChatView.tsx`](client/src/renderer/components/layout/ChatView.tsx:256): Shows `AgentTaskRunner` status inline in conversation
- No unified "Agents" view that shows both local tasks AND SRIA agents

#### P3: Tool Duplication
- [`AgentTaskRunner.getPersonalityTools()`](client/src/main/services/agent-runner/AgentTaskRunner.ts:421) builds shell, read_file, write_file, list_directory tools inline
- [`PersonalityManager.handleInteraction()`](client/src/main/services/PersonalityManager.ts) builds a similar but different set of tools inline
- No shared tool registry

#### P4: RISA Scripts are Disconnected
- [`RISAService`](client/src/main/services/RISAService.ts) runs scripts in VM contexts with event triggers
- These scripts could enhance agent behavior (entropy monitoring, coherence tracking) but have no integration with `AgentTaskRunner` or `SRIAAgent`

#### P5: TeamManager is a Shell
- [`TeamManager`](client/src/main/services/TeamManager.ts) stores team membership in JSON but has no orchestration logic
- IPC handlers for `team:summon`, `team:step`, `team:dismiss` are [placeholder stubs](client/src/main/ipc-setup.ts:247-260)

#### P6: Nomenclature Confusion
- "SRIA" (Self-Resonant Intelligent Agent), "Agent", "AgentTask", "RISAScript", "RISATask" — five different "agent-like" concepts with overlapping semantics and no clear hierarchy

---

## Part 2: Resonant Agents — Unified Design

### 2.1 Core Concept

A **Resonant Agent** is a persistent, autonomous entity that:
1. Has a **definition** (identity, personality, capabilities, tools)
2. Can be **summoned** into a conversation or standalone context
3. **Performs work** via an agentic loop (tool-calling, multi-step reasoning)
4. Maintains **memory** across sessions via memory fields
5. Can participate in **teams** for collaborative multi-agent work
6. Is **deployable** locally or to the AlephNet mesh

### 2.2 Data Model

```
ResonantAgent (unified)
├── id: string                          // UUID
├── name: string                        // Display name
├── description: string                 // Purpose description
├── avatar?: string                     // Icon/avatar URI
│
├── personality: AgentPersonality       // Personality definition
│   ├── systemPrompt: string            // Core system prompt
│   ├── traits: string[]                // Personality traits
│   ├── style: 'concise' | 'detailed' | 'technical' | 'creative'
│   └── resonanceSignature?: number[]   // Prime resonance for mesh routing
│
├── capabilities: AgentCapabilities     // What the agent can do
│   ├── tools: string[]                 // Tool IDs this agent has access to
│   ├── promptChain?: string            // Default prompt chain name
│   ├── maxSteps: number                // Step limit per task (default 50)
│   ├── maxDurationMs: number           // Duration limit (default 30min)
│   └── permissions: AgentPermission[]  // fs, shell, network, memory, ui
│
├── memory: AgentMemoryConfig           // Memory configuration
│   ├── personalFieldId?: string        // Agent's personal memory field
│   ├── sharedFieldIds: string[]        // Shared memory fields
│   └── retentionPolicy: 'session' | 'persistent' | 'ephemeral'
│
├── deployment: AgentDeployment         // Where this agent runs
│   ├── mode: 'local' | 'mesh' | 'hybrid'
│   ├── meshNodeId?: string             // If deployed to specific node
│   ├── semanticDomain?: SemanticDomain // For mesh routing
│   └── stakingTier?: StakingTier       // Required tier for mesh deployment
│
├── scripts: AgentScript[]              // Attached RISA scripts
│   ├── scriptId: string
│   ├── trigger: RISATrigger
│   └── active: boolean
│
├── status: AgentStatus                 // Current runtime state
│   ├── state: 'dormant' | 'active' | 'busy' | 'error'
│   ├── activeTaskId?: string           // Current AgentTask ID
│   ├── lastActiveAt?: number
│   └── errorMessage?: string
│
├── beliefs: AgentBelief[]              // Active inference beliefs (from SRIA)
├── goalPriors: Record<string, number>  // Goal weights (from SRIA)
│
├── createdAt: number
├── updatedAt: number
└── createdBy: 'user' | 'system' | 'template'
```

### 2.3 Agent Lifecycle

```
                    ┌─────────────────────────────────────────────┐
                    │              Resonant Agent Lifecycle        │
                    └─────────────────────────────────────────────┘

    ┌──────────┐     summon()     ┌──────────┐     startTask()    ┌──────────┐
    │ DORMANT  │ ──────────────→  │  ACTIVE  │ ──────────────→    │   BUSY   │
    │          │                  │          │                     │          │
    │ Defined  │     dismiss()    │ Summoned │     taskComplete()  │ Working  │
    │ but idle │ ←──────────────  │ ready    │ ←──────────────     │ on task  │
    └──────────┘                  └──────────┘                     └──────────┘
         ↑                             │                                │
         │                             │ error                          │ error
         │                             ↓                                ↓
         │                        ┌──────────┐                          │
         └────────── reset() ──── │  ERROR   │ ←────────────────────────┘
                                  └──────────┘

    State Descriptions:
    - DORMANT:  Agent exists but is not loaded into memory. Can be summoned.
    - ACTIVE:   Agent is loaded, personality initialized, ready to receive tasks.
    - BUSY:     Agent is executing a task (running AgentLoop). Can be interrupted.
    - ERROR:    Agent encountered an unrecoverable error. Can be reset.
```

### 2.4 Summoning & Task Execution

**Summoning** transitions an agent from DORMANT → ACTIVE:
1. Load agent definition from storage
2. Initialize personality (system prompt + traits)
3. Load memory fields (attach personal + shared fields)
4. Register available tools based on capabilities
5. Start any attached RISA scripts
6. Agent is now ready to receive tasks

**Task Execution** transitions ACTIVE → BUSY:
1. Create an `AgentTask` (same model as current `agent-types.ts`)
2. Build context: personality prompt + agentic instructions + memory + UI context
3. Build toolkit: agent's declared tools + control tools + memory tools
4. Run `AgentLoop` (existing implementation, unchanged)
5. On completion: BUSY → ACTIVE (ready for next task)

**Dismissing** transitions ACTIVE → DORMANT:
1. Stop any running tasks
2. Persist memory field state
3. Stop RISA scripts
4. Unload from memory
5. Generate beacon fingerprint for resumption

### 2.5 Team Orchestration

```
                    ┌─────────────────────────────────────────────┐
                    │              Team Orchestration              │
                    └─────────────────────────────────────────────┘

    User Message → TeamOrchestrator
                      │
                      ├── Decompose task into subtasks
                      │
                      ├── Assign subtasks to agents based on:
                      │   ├── Agent capabilities/tools
                      │   ├── Semantic domain alignment
                      │   └── Current agent state (busy/free)
                      │
                      ├── Execute subtasks (parallel where possible)
                      │   ├── Agent A: subtask 1 → result
                      │   ├── Agent B: subtask 2 → result
                      │   └── Agent C: subtask 3 → result
                      │
                      ├── Synthesize results
                      │   ├── Merge outputs
                      │   ├── Resolve conflicts
                      │   └── Generate coherence score
                      │
                      └── Return unified result to user
```

### 2.6 Tool Registry

Instead of each subsystem building tools inline, establish a central **ToolRegistry**:

```typescript
interface ToolRegistration {
  id: string;                           // Unique tool ID
  name: string;                         // Tool function name
  description: string;                  // For AI tool-calling
  parameters: JSONSchema;               // Parameter schema
  handler: (args: any) => Promise<any>; // Execution handler
  source: 'core' | 'plugin' | 'agent'; // Who registered it
  permissions: AgentPermission[];       // Required permissions
  category: 'filesystem' | 'shell' | 'memory' | 'ui' | 'network' | 'custom';
}
```

**Core tools** (always available):
- `shell` — Execute shell commands
- `read_file`, `write_file`, `list_directory` — File operations
- `memory_search_*`, `memory_store`, `memory_recall` — Memory operations
- `get_conversation_history`, `search_conversation_history` — Conversation tools
- `get_ui_context`, `navigate_ui` — UI awareness
- Control tools: `task_complete`, `ask_user`, `send_update`

**Plugin tools** (registered by plugins via `PluginContext.services.tools.register()`):
- Already supported by the plugin system; needs integration with agent toolkit

**Agent-specific tools** (attached to individual agents):
- Custom tools defined in agent configuration
- Tools from attached RISA scripts

---

## Part 3: Consolidated Plugin Architecture

### 3.1 Plugin Structure

The Resonant Agents system is implemented as a **core plugin** (cannot be uninstalled) that provides:

```
plugins/resonant-agents/
├── manifest.json
├── main/
│   ├── index.ts                    // Main process entry
│   ├── ResonantAgentService.ts     // Central service (replaces TeamManager + SRIA stubs)
│   ├── AgentStore.ts               // Persistent agent storage
│   ├── AgentToolRegistry.ts        // Centralized tool registry
│   └── TeamOrchestrator.ts         // Multi-agent coordination
├── renderer/
│   ├── index.ts                    // Renderer entry
│   ├── AgentsPlugin.tsx            // Plugin registration (nav, views, inspector)
│   ├── views/
│   │   ├── AgentListView.tsx       // Main view: list all agents + teams
│   │   ├── AgentDetailView.tsx     // Single agent detail/control
│   │   ├── AgentEditorView.tsx     // Create/edit agent
│   │   ├── TeamDetailView.tsx      // Team detail/orchestration
│   │   └── AgentSettingsView.tsx   // Agent system settings
│   ├── components/
│   │   ├── AgentCard.tsx           // Compact agent card
│   │   ├── AgentStatusBadge.tsx    // Status indicator
│   │   ├── BeliefBar.tsx           // Belief visualization
│   │   ├── ToolSelector.tsx        // Tool capability picker
│   │   └── PersonalityEditor.tsx   // Personality configuration
│   └── store/
│       └── useAgentStore.ts        // Zustand store for agent UI state
└── shared/
    └── types.ts                    // Shared type definitions (ResonantAgent, etc.)
```

### 3.2 Plugin Registration

The plugin registers these UI extension points:

```typescript
// renderer/index.ts
export function activate(ctx: RendererPluginContext) {
  // 1. Navigation item (replaces the current NavRail "SRIA Agents" entry)
  ctx.ui.registerNavigation({
    id: 'resonant-agents',
    label: 'Agents',
    icon: BotIcon,
    view: {
      id: 'agents-main',
      name: 'Resonant Agents',
      icon: BotIcon,
      component: AgentListView,
    },
    order: 40,
  });

  // 2. Inspector tab (agent status when conversation has active agent)
  ctx.ui.registerInspectorTab({
    id: 'agent-inspector',
    label: 'Agent',
    icon: BotIcon,
    component: AgentInspectorTab,
  });

  // 3. Chat input decoration (agent selector before send)
  ctx.ui.registerSlot('chat:input-before', {
    component: AgentSelector,
    priority: 10,
  });

  // 4. Message decorators (agent task messages get special styling)
  ctx.ui.registerMessageDecorator({
    id: 'agent-task-decorator',
    match: (msg) => !!msg.metadata?.agentTaskId,
    before: AgentTaskMessageHeader,
    actions: [
      { id: 'stop-task', label: 'Stop Task', icon: StopIcon, onClick: stopTask },
    ],
  });

  // 5. Command palette commands
  ctx.ui.registerCommand({
    id: 'agent:create',
    label: 'Create New Agent',
    category: 'Agents',
    action: () => openAgentEditor(),
  });
  ctx.ui.registerCommand({
    id: 'agent:summon',
    label: 'Summon Agent',
    category: 'Agents',
    action: () => openAgentSummonDialog(),
  });
  
  // 6. Settings tab
  ctx.ui.registerSettingsTab({
    id: 'agents',
    label: 'Agents',
    icon: BotIcon,
    component: AgentSettingsView,
  });
}
```

### 3.3 Service Integration

The main-process side of the plugin replaces scattered agent services:

```typescript
// main/index.ts
export function activate(ctx: PluginContext) {
  const agentService = new ResonantAgentService(
    ctx.ai,           // AI completion
    ctx.services,     // Tool registry
    ctx.storage,      // Persistent storage
    ctx.dsn,          // AlephNet integration
  );

  // Register IPC handlers
  ctx.ipc.handle('agent:list', () => agentService.listAgents());
  ctx.ipc.handle('agent:get', ({ id }) => agentService.getAgent(id));
  ctx.ipc.handle('agent:create', (def) => agentService.createAgent(def));
  ctx.ipc.handle('agent:update', ({ id, updates }) => agentService.updateAgent(id, updates));
  ctx.ipc.handle('agent:delete', ({ id }) => agentService.deleteAgent(id));
  ctx.ipc.handle('agent:summon', ({ id, context }) => agentService.summon(id, context));
  ctx.ipc.handle('agent:dismiss', ({ id }) => agentService.dismiss(id));
  ctx.ipc.handle('agent:startTask', (params) => agentService.startTask(params));
  ctx.ipc.handle('agent:stopTask', ({ taskId }) => agentService.stopTask(taskId));

  // Team orchestration
  ctx.ipc.handle('team:create', (params) => agentService.createTeam(params));
  ctx.ipc.handle('team:orchestrate', (params) => agentService.orchestrateTeam(params));

  // Register agent-specific tools with the tool registry
  ctx.services.tools.register({
    name: 'delegate_to_agent',
    description: 'Delegate a subtask to another Resonant Agent by name or ID',
    parameters: { /* ... */ },
    handler: (args) => agentService.delegateTask(args),
  });
}
```

---

## Part 4: Migration Path

### Phase 1: Type Unification (Non-breaking)

1. Create [`client/src/shared/resonant-agent-types.ts`](client/src/shared/resonant-agent-types.ts) with the unified `ResonantAgent` type
2. Add adapter functions: `sriaAgentToResonant()`, `agentTaskToResonant()`
3. Keep existing types as aliases for backward compatibility

### Phase 2: Service Consolidation

1. Create `ResonantAgentService` that wraps:
   - `AgentTaskRunner` (for local task execution — no changes to its internals)
   - `TeamManager` (absorb into ResonantAgentService)
   - SRIA Agent CRUD (from AlephNetClient)
   - Agent storage (new, replaces scattered JSON files)
2. Wire new service into [`services-setup.ts`](client/src/main/services-setup.ts)
3. Update IPC handlers in [`ipc-setup.ts`](client/src/main/ipc-setup.ts) to use new service

### Phase 3: Tool Registry

1. Extract tools from [`AgentTaskRunner.getPersonalityTools()`](client/src/main/services/agent-runner/AgentTaskRunner.ts:421) into `AgentToolRegistry`
2. Register plugin tools through the registry
3. Modify `AgentToolkit.buildFullToolkit()` to pull from registry based on agent capabilities

### Phase 4: UI Consolidation (Plugin)

1. Create the `resonant-agents` core plugin
2. Move [`ResonantAgentsPanel`](client/src/renderer/components/agents/ResonantAgentsPanel.tsx), [`CreateAgentDialog`](client/src/renderer/components/agents/CreateAgentDialog.tsx), [`AgentDetailStage`](client/src/renderer/components/agents/AgentDetailStage.tsx) into the plugin
3. Merge with `AgentTaskRunner` status display from ChatView
4. Remove the hardcoded `'agents'` entry from [`SidebarView`](client/src/renderer/store/app/types.ts:77) type
5. Remove hardcoded NavRail entry — plugin registers it dynamically

### Phase 5: RISA Integration

1. Add `scripts` field to `ResonantAgent` definition
2. When an agent is summoned, its attached RISA scripts are started
3. When dismissed, scripts are stopped
4. Scripts can trigger agent tasks (event: `agent.task.requested`)

### Phase 6: Team Orchestration

1. Implement `TeamOrchestrator` with task decomposition
2. Use AI to decompose complex tasks into agent-appropriate subtasks
3. Parallel execution with result synthesis
4. Shared memory fields for inter-agent knowledge

---

## Part 5: Detailed Component Specifications

### 5.1 ResonantAgentService

```typescript
class ResonantAgentService extends EventEmitter {
  private agents: Map<string, ResonantAgent>;
  private taskRunner: AgentTaskRunner;
  private risaService: RISAService;
  private storage: AgentStorage;
  private toolRegistry: AgentToolRegistry;

  // Agent CRUD
  async createAgent(def: CreateAgentOptions): Promise<ResonantAgent>;
  async getAgent(id: string): Promise<ResonantAgent | null>;
  async listAgents(filter?: AgentFilter): Promise<ResonantAgent[]>;
  async updateAgent(id: string, updates: Partial<ResonantAgent>): Promise<ResonantAgent>;
  async deleteAgent(id: string): Promise<void>;
  async duplicateAgent(id: string, newName: string): Promise<ResonantAgent>;
  async importAgent(json: string): Promise<ResonantAgent>;
  async exportAgent(id: string): Promise<string>;

  // Lifecycle
  async summon(id: string, context?: SummonContext): Promise<void>;
  async dismiss(id: string): Promise<void>;

  // Task execution (delegates to AgentTaskRunner)
  async startTask(params: StartTaskParams): Promise<string>;
  async stopTask(taskId: string): Promise<void>;
  async delegateTask(params: DelegateParams): Promise<any>;

  // Team operations
  async createTeam(params: CreateTeamParams): Promise<AgentTeam>;
  async orchestrateTeam(params: OrchestrateParams): Promise<OrchestrateResult>;

  // Templates
  getTemplates(): AgentTemplate[];
  async createFromTemplate(templateId: string, overrides?: Partial<ResonantAgent>): Promise<ResonantAgent>;
}
```

### 5.2 AgentToolRegistry

```typescript
class AgentToolRegistry {
  private tools: Map<string, ToolRegistration>;

  register(tool: ToolRegistration): void;
  unregister(toolId: string): void;
  getToolsForAgent(agent: ResonantAgent): ToolDefinition[];
  getToolsByCategory(category: string): ToolRegistration[];
  listAll(): ToolRegistration[];
}
```

### 5.3 Built-in Agent Templates

```typescript
const BUILTIN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Excels at finding, analyzing, and synthesizing information',
    personality: {
      systemPrompt: 'You are a meticulous research analyst...',
      traits: ['analytical', 'thorough', 'evidence-based'],
      style: 'detailed',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'memory_search_*', 'memory_store'],
      permissions: ['fs:read', 'shell', 'memory'],
      maxSteps: 30,
    },
  },
  {
    id: 'code-engineer',
    name: 'Code Engineer',
    description: 'Writes, reviews, and refactors code across languages',
    personality: {
      systemPrompt: 'You are an expert software engineer...',
      traits: ['precise', 'pragmatic', 'best-practices-aware'],
      style: 'technical',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      permissions: ['fs:read', 'fs:write', 'shell'],
      maxSteps: 50,
    },
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Generates creative content, stories, and narratives',
    personality: {
      systemPrompt: 'You are a creative writer with a vivid imagination...',
      traits: ['imaginative', 'eloquent', 'narrative-driven'],
      style: 'creative',
    },
    capabilities: {
      tools: ['write_file', 'memory_store'],
      permissions: ['fs:write', 'memory'],
      maxSteps: 20,
    },
  },
  {
    id: 'system-operator',
    name: 'System Operator',
    description: 'Manages system tasks, automation, and DevOps workflows',
    personality: {
      systemPrompt: 'You are a systems administrator and DevOps expert...',
      traits: ['methodical', 'safety-conscious', 'automation-first'],
      style: 'concise',
    },
    capabilities: {
      tools: ['shell', 'read_file', 'write_file', 'list_directory'],
      permissions: ['fs:read', 'fs:write', 'shell'],
      maxSteps: 50,
      maxDurationMs: 60 * 60 * 1000, // 1 hour for long ops
    },
  },
];
```

### 5.4 UI: AgentListView (Main Stage)

The primary view when navigating to "Agents":

```
┌──────────────────────────────────────────────────────────────────┐
│  🤖 Resonant Agents                           [+ Create Agent]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACTIVE (2)                                                      │
│  ┌────────────────────────────────┐  ┌─────────────────────────┐ │
│  │ 🟢 Research Analyst            │  │ 🟡 Code Engineer       │ │
│  │ Working: "Analyze codebase..." │  │ Idle — ready for tasks │ │
│  │ Step 4/30 ████░░░░             │  │ Last active: 2m ago    │ │
│  │ [View] [Stop] [Dismiss]        │  │ [View] [Dismiss]       │ │
│  └────────────────────────────────┘  └─────────────────────────┘ │
│                                                                  │
│  DORMANT (3)                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Creative   │  │ System     │  │ Data       │                 │
│  │ Writer     │  │ Operator   │  │ Analyst    │                 │
│  │ [Summon]   │  │ [Summon]   │  │ [Summon]   │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
│                                                                  │
│  TEAMS (1)                                                       │
│  ┌────────────────────────────────────────────────────┐          │
│  │ 👥 Full Stack Team                                 │          │
│  │ Members: Research Analyst, Code Engineer            │          │
│  │ [Orchestrate] [Edit] [Disband]                     │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.5 UI: AgentEditorView (Create/Edit)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back    Create Resonant Agent                    [Save]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Identity ──────────────────────────────────────────────────┐ │
│  │  Name: [Research Analyst_______]                             │ │
│  │  Description: [Finds and synthesizes information_________]  │ │
│  │  Template: [Custom ▼]  or  [From Template: Research ▼]      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Personality ───────────────────────────────────────────────┐ │
│  │  System Prompt:                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │ You are a meticulous research analyst who excels     │   │ │
│  │  │ at finding, verifying, and synthesizing information. │   │ │
│  │  │ Always cite sources. Be thorough but concise.       │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  │  Style: ○ Concise  ● Detailed  ○ Technical  ○ Creative     │ │
│  │  Traits: [analytical] [thorough] [evidence-based] [+]       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Capabilities ──────────────────────────────────────────────┐ │
│  │  Tools: ☑ Shell  ☑ File Read  ☑ File Write  ☑ Memory       │ │
│  │         ☐ UI Control  ☐ Network  ☑ Conversation History     │ │
│  │  Max Steps: [30]   Max Duration: [30 min]                   │ │
│  │  Prompt Chain: [None ▼]                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Memory ────────────────────────────────────────────────────┐ │
│  │  Retention: ○ Session  ● Persistent  ○ Ephemeral            │ │
│  │  Shared Fields: [core-personality] [research-notes] [+]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Deployment ────────────────────────────────────────────────┐ │
│  │  Mode: ● Local  ○ Mesh  ○ Hybrid                           │ │
│  │  [Advanced: Semantic Domain, Staking Tier]                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Scripts (Optional) ────────────────────────────────────────┐ │
│  │  Attached RISA Scripts: [None]  [+ Attach Script]           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Integration Points

### 6.1 Chat Integration

When the user sends a message in a conversation:
1. Check if an agent is assigned to the conversation
2. If yes, route through that agent's `startTask()` (uses agent's personality + tools)
3. If no, use default `PersonalityManager` path (current behavior, unchanged)

The agent selector in the chat input allows switching between:
- **Default** (no agent — uses PersonalityManager)
- **Any summoned agent** (uses agent's personality + capabilities)

### 6.2 Memory Integration

Each Resonant Agent can have:
- **Personal memory field**: Only this agent reads/writes to it
- **Shared memory fields**: Multiple agents can access (for team collaboration)
- **Conversation memory**: Standard per-conversation memory (existing behavior)

### 6.3 RISA Integration

RISA scripts can be attached to agents as behavioral enhancers:
- **Entropy Monitor**: Alert when agent's reasoning becomes incoherent
- **Coherence Tracker**: Track belief consistency across sessions
- **Custom scripts**: User-defined automation (e.g., "check for new emails every hour")

### 6.4 AlephNet Integration

For `deployment.mode === 'mesh'`:
- Agent definition is published to AlephNet
- Other nodes can summon this agent
- Work is routed based on semantic domain and staking tier
- Results are verified through coherence network

---

## Part 7: Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `client/src/shared/resonant-agent-types.ts` | Unified type definitions |
| `client/src/main/services/ResonantAgentService.ts` | Central agent service |
| `client/src/main/services/AgentToolRegistry.ts` | Centralized tool registry |
| `client/src/main/services/TeamOrchestrator.ts` | Multi-agent coordination |

### Modified Files
| File | Changes |
|------|---------|
| `client/src/main/services-setup.ts` | Add ResonantAgentService, replace TeamManager |
| `client/src/main/ipc-setup.ts` | Replace scattered agent IPC with unified handlers |
| `client/src/main/services/agent-runner/AgentTaskRunner.ts` | Accept ResonantAgent config for per-agent personality/tools |
| `client/src/main/services/agent-runner/AgentToolkit.ts` | Pull tools from AgentToolRegistry |
| `client/src/renderer/store/app/types.ts` | Remove hardcoded 'agents' from SidebarView |
| `client/src/renderer/components/layout/NavRail.tsx` | Remove hardcoded agents entry |
| `client/src/renderer/components/layout/Sidebar.tsx` | Remove hardcoded ResonantAgentsPanel import |

### Files to Deprecate/Remove (After Migration)
| File | Reason |
|------|--------|
| `client/src/main/services/TeamManager.ts` | Absorbed into ResonantAgentService |
| `client/src/renderer/components/agents/ResonantAgentsPanel.tsx` | Replaced by plugin view |
| `client/src/renderer/components/agents/CreateAgentDialog.tsx` | Replaced by plugin view |
| `client/src/renderer/components/agents/AgentDetailStage.tsx` | Replaced by plugin view |
| `client/src/renderer/components/agents/views/TeamDetailView.tsx` | Replaced by plugin view |

---

## Part 8: Key Design Decisions

### D1: Plugin vs. Core Service
**Decision**: Implement as a core plugin (cannot be uninstalled) rather than hardcoded.
**Rationale**: Uses the existing plugin extensibility system (slots, navigation, inspector tabs), keeps the core app lean, and allows the agent UI to be iterated independently.

### D2: Keep AgentTaskRunner As-Is
**Decision**: Do not modify the core `AgentLoop` or `AgentTaskRunner` internals.
**Rationale**: The agentic loop is well-designed and functional. The consolidation is about what sits *around* it (agent definitions, tool selection, personality, lifecycle) not the loop itself.

### D3: Unified Type with Adapters
**Decision**: Create a new `ResonantAgent` type that encompasses both `AgentTask` and `SRIAAgent`, with adapter functions for backward compatibility.
**Rationale**: Avoids breaking existing code while providing a single type for new development.

### D4: Tool Registry over Inline Construction
**Decision**: Centralize tool definitions in a registry rather than building them inline in `AgentTaskRunner.getPersonalityTools()`.
**Rationale**: Eliminates duplication, enables per-agent tool filtering, and allows plugins to contribute tools.

### D5: RISA Scripts as Agent Extensions
**Decision**: RISA scripts are attachments to agents, not a parallel system.
**Rationale**: Scripts that monitor entropy, track coherence, or automate tasks make more sense as behaviors of a specific agent rather than free-floating system scripts.

---

## Appendix A: Naming Glossary

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| SRIA Agent | Resonant Agent | More evocative, less acronym-heavy |
| Agent Task | Agent Task (unchanged) | Already well-named |
| RISA Script | Agent Script / Behavior Script | Clarifies relationship to agents |
| RISA Task | Script Execution | Avoids confusion with Agent Task |
| Team | Agent Team (unchanged) | Already clear |
| Summon | Summon (unchanged) | Good metaphor for activation |
| Dismiss | Dismiss (unchanged) | Good metaphor for deactivation |
| Step | (removed) | Replaced by full task execution |
| Free Energy | Coherence Score | More intuitive for users |
| Beliefs | Agent Beliefs (unchanged) | Core active inference concept |
| Goal Priors | Agent Goals | Simpler naming |

## Appendix B: IPC Channel Consolidation

### Before (scattered across ipc-setup.ts)
```
agent:startTask, agent:stopTask, agent:userResponse, agent:getTask, agent:getActiveTask
team:create, team:list, team:get, team:update, team:addAgent, team:removeAgent, team:delete, team:summon, team:step, team:dismiss
summonAgent (legacy)
risa:installScript, risa:updateScript, risa:uninstallScript, risa:getScripts, risa:startTask, risa:stopTask, risa:getTasks
```

### After (unified under resonant-agents plugin)
```
resonant:agent:list, resonant:agent:get, resonant:agent:create, resonant:agent:update, resonant:agent:delete
resonant:agent:summon, resonant:agent:dismiss
resonant:agent:startTask, resonant:agent:stopTask, resonant:agent:respondToTask
resonant:agent:import, resonant:agent:export
resonant:team:create, resonant:team:list, resonant:team:orchestrate, resonant:team:disband
resonant:script:attach, resonant:script:detach, resonant:script:list
resonant:tool:list, resonant:tool:register
```

---

## Part 9: Implementation Status

This section documents the actual implementation completed against this design.

### 9.1 Files Created

| File | Purpose | Status |
|------|---------|--------|
| [`client/src/shared/resonant-agent-types.ts`](client/src/shared/resonant-agent-types.ts) | Unified `ResonantAgent` type, IPC payload types, adapter functions, built-in templates | ✅ Complete |
| [`client/src/main/services/AgentToolRegistry.ts`](client/src/main/services/AgentToolRegistry.ts) | Central tool registry with permission-based agent filtering | ✅ Complete |
| [`client/src/main/services/ResonantAgentService.ts`](client/src/main/services/ResonantAgentService.ts) | Central agent service with CRUD, lifecycle, task execution, team orchestration | ✅ Complete |
| [`client/src/renderer/store/useResonantAgentStore.ts`](client/src/renderer/store/useResonantAgentStore.ts) | Zustand store mirroring service API, real-time event handling | ✅ Complete |
| [`client/src/renderer/components/agents/ResonantAgentsView.tsx`](client/src/renderer/components/agents/ResonantAgentsView.tsx) | Consolidated UI: agent list, create form, agent detail with task assignment | ✅ Complete |

### 9.2 Files Modified

| File | Changes | Status |
|------|---------|--------|
| [`client/src/main/services-setup.ts`](client/src/main/services-setup.ts) | Instantiate `AgentToolRegistry`, `ResonantAgentService`; wire tool registry into `AgentTaskRunner`; forward events via IPC | ✅ Complete |
| [`client/src/main/ipc-setup.ts`](client/src/main/ipc-setup.ts) | Added 18 `resonant:*` IPC handlers | ✅ Complete |
| [`client/src/preload/index.ts`](client/src/preload/index.ts) | Added 22 preload bridge methods for Resonant Agent API | ✅ Complete |
| [`client/src/shared/types.ts`](client/src/shared/types.ts) | Extended `IElectronAPI` with all Resonant Agent methods | ✅ Complete |
| [`client/src/renderer/App.tsx`](client/src/renderer/App.tsx) | Wire event listener for `resonant:agentChanged`, bootstrap store loading | ✅ Complete |
| [`client/src/renderer/components/layout/Sidebar.tsx`](client/src/renderer/components/layout/Sidebar.tsx) | Import and use `ResonantAgentsView` | ✅ Complete |
| [`client/src/main/services/agent-runner/AgentTaskRunner.ts`](client/src/main/services/agent-runner/AgentTaskRunner.ts) | Added `setToolRegistry()` method; refactored `getPersonalityTools()` to delegate to registry with inline fallback | ✅ Complete |

### 9.3 Key Implementation Details

**Team Orchestration**: `orchestrateTeam()` in `ResonantAgentService` performs real task delegation — iterates through team agents, auto-summons dormant agents, skips busy ones, and delegates tasks via `startTask()` which runs through the full `AgentTaskRunner` agentic loop.

**Tool Registry Integration**: `AgentTaskRunner.getPersonalityTools()` now checks if a tool registry is wired. If so, it calls `toolRegistry.getToolsForAgent()` with the agent's metadata (name, permissions, tool list). If no registry is available, it falls back to `buildInlineCoreTools()` for backward compatibility.

**Task Assignment UI**: The `AgentDetail` component in `ResonantAgentsView` includes a task input form that only appears when an agent is in the `active` state. It sends tasks via `startAgentTask()` to the main process, using the active conversation ID or generating a standalone one.

### 9.4 Remaining Future Work

| Item | Priority | Description |
|------|----------|-------------|
| RISA Script Integration | Medium | Attach/detach RISA scripts to agents; auto-start on summon |
| Advanced Team Orchestration | Medium | AI-driven task decomposition, parallel execution, result synthesis |
| Plugin Migration | Low | Move from hardcoded integration to core plugin using slot system |
| AlephNet Mesh Deployment | Low | Publish agent definitions to mesh; cross-node summoning |
| Agent Inspector Tab | Low | Real-time agent monitoring in conversation inspector panel |
| Chat Agent Selector | Low | Inline agent picker in chat input area |
| Message Decorators | Low | Custom styling for agent task messages in chat |
