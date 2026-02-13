# Design: AI Agent UI Context Awareness & Prompt Editor Integration

## Problem Statement

The agent (running in the main process via `AgentTaskRunner` → `AgentLoop`) currently operates blind to the renderer's UI state. It doesn't know what tab the user has open, what's in the text editor, which conversation is active, or what sidebar panel they're viewing. This limits the agent's ability to proactively help with prompts and act as a true co-pilot within the app.

**Goal**: Give the agent ambient awareness of the app's visual state and equip it with tools to programmatically interact with prompt templates and the editor — all through the existing chat interface.

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Renderer
        A[AppStore / UI State]
        B[UIContextProvider]
        C[TextEditorPanel]
        D[ConversationTabs]
        E[CommandRegistry]
    end
    
    subgraph Preload
        F[electronAPI bridge]
    end
    
    subgraph Main Process
        G[IPC Setup]
        H[AgentTaskRunner]
        I[AgentContextBuilder]
        J[UIContextTools]
        K[PromptTemplateTools]
        L[AgentLoop]
    end

    A -->|snapshot| B
    B -->|IPC response| F
    F -->|app:getUIContext| G
    G -->|query result| H
    H -->|inject context| I
    I -->|system prompt with UI state| L
    L -->|tool calls| J
    L -->|tool calls| K
    J -->|IPC commands| G
    G -->|app:invoke| F
    F -->|dispatch actions| A
    K -->|read/write FS| Main Process
```

---

## Layer 1: UI Context Snapshot

### What it captures

A serializable snapshot of the renderer's current state, gathered on-demand when the agent needs it.

### Type Definition

```typescript
// client/src/shared/ui-context-types.ts

export interface UIContextSnapshot {
  /** What the user is currently looking at */
  activeView: {
    tabId: string | null;
    tabType: 'chat' | 'group' | 'feed' | 'file' | 'extension' | null;
    tabTitle: string | null;
  };
  
  /** Active conversation details */
  conversation: {
    id: string | null;
    title: string | null;
    messageCount: number;
    recentMessages: UIContextMessage[];  // last 5 messages
    personalityId: string | null;
  } | null;
  
  /** Text editor state - if a file tab is active */
  editor: {
    filePath: string;
    language: string;
    lineCount: number;
    isDirty: boolean;
    cursorPosition: { line: number; col: number };
    /** First ~200 lines of content for context */
    contentPreview: string;
    /** Selected text, if any */
    selection: string | null;
  } | null;
  
  /** Sidebar state */
  sidebar: {
    activeView: string;  // 'explorer' | 'extensions' | 'messages' | etc.
  };
  
  /** Active agent task, if any */
  agentTask: {
    id: string;
    status: string;
    stepCount: number;
    currentTool: string | null;
  } | null;
  
  /** Available prompt templates on disk */
  promptTemplates: string[];  // filenames in data/prompt-chains/
  
  /** Timestamp of snapshot */
  timestamp: number;
}

export interface UIContextMessage {
  sender: 'user' | 'agent';
  content: string;  // truncated to 500 chars
  timestamp: string;
}
```

### Renderer-Side Provider

New file: `client/src/renderer/services/UIContextProvider.ts`

```typescript
import { useAppStore } from '../store/useAppStore';

export function gatherUIContext(): UIContextSnapshot {
  const state = useAppStore.getState();
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const activeConv = state.activeConversationId 
    ? state.conversations[state.activeConversationId] 
    : null;
    
  return {
    activeView: {
      tabId: state.activeTabId,
      tabType: activeTab?.type ?? null,
      tabTitle: activeTab?.title ?? null,
    },
    conversation: activeConv ? {
      id: activeConv.id,
      title: activeConv.title,
      messageCount: activeConv.messages.length,
      recentMessages: activeConv.messages.slice(-5).map(m => ({
        sender: m.sender,
        content: m.content.substring(0, 500),
        timestamp: m.timestamp,
      })),
      personalityId: (activeConv as any).personalityId ?? null,
    } : null,
    editor: activeTab?.type === 'file' ? {
      filePath: activeTab.data?.path || '',
      language: getLanguageFromPath(activeTab.data?.path || ''),
      lineCount: (activeTab.data?.content || '').split('\n').length,
      isDirty: false, // Would need ref to editor component
      cursorPosition: { line: 1, col: 1 },
      contentPreview: (activeTab.data?.content || '').split('\n').slice(0, 200).join('\n'),
      selection: null,
    } : null,
    sidebar: {
      activeView: state.activeSidebarView,
    },
    agentTask: null, // Populated from activeTaskByConversation if present
    promptTemplates: [], // Populated server-side
    timestamp: Date.now(),
  };
}
```

### IPC Wiring

The main process already has an `invokeRenderer` pattern (used by `setCommandInterface`). We add one new channel:

**In `ipc-setup.ts`**, register a new `app:getUIContext` channel via the existing `invokeRenderer` mechanism.

**In `preload/index.ts`**, register the `app:invoke` handler to respond to `ui:getContext` requests.

**In the renderer**, register a handler in the `app:invoke` listener that calls `gatherUIContext()` and returns the result.

This follows the exact same pattern already used for `commands:list`, `commands:execute`, etc. at [line 55-60 of `ipc-setup.ts`](client/src/main/ipc-setup.ts:55).

---

## Layer 2: Context Auto-Injection into Agent

### Modification to `AgentContextBuilder.ts`

Add a new section to `AGENTIC_INSTRUCTIONS` that gets dynamically populated:

```typescript
// In AgentContextBuilder.ts

export function buildUIContextSection(snapshot: UIContextSnapshot): string {
  const parts: string[] = ['## Current Application State'];
  
  // Active view
  if (snapshot.activeView.tabType) {
    parts.push(`The user is viewing a ${snapshot.activeView.tabType} tab: "${snapshot.activeView.tabTitle}".`);
  }
  
  // Conversation context
  if (snapshot.conversation) {
    parts.push(`Active conversation: "${snapshot.conversation.title}" with ${snapshot.conversation.messageCount} messages.`);
    if (snapshot.conversation.personalityId) {
      parts.push(`Personality: ${snapshot.conversation.personalityId}`);
    }
  }
  
  // Editor context
  if (snapshot.editor) {
    parts.push(`\nThe text editor is open with file: ${snapshot.editor.filePath}`);
    parts.push(`Language: ${snapshot.editor.language}, ${snapshot.editor.lineCount} lines${snapshot.editor.isDirty ? ', UNSAVED CHANGES' : ''}`);
    parts.push(`Cursor at line ${snapshot.editor.cursorPosition.line}, col ${snapshot.editor.cursorPosition.col}`);
    if (snapshot.editor.selection) {
      parts.push(`Selected text:\n\`\`\`\n${snapshot.editor.selection}\n\`\`\``);
    }
    parts.push(`\nEditor content preview:\n\`\`\`${snapshot.editor.language}\n${snapshot.editor.contentPreview}\n\`\`\``);
  }
  
  // Prompt templates
  if (snapshot.promptTemplates.length > 0) {
    parts.push(`\nAvailable prompt templates: ${snapshot.promptTemplates.join(', ')}`);
  }
  
  return parts.join('\n');
}
```

### Modification to `AgentTaskRunner.executeLoop()`

In [`AgentTaskRunner.executeLoop()`](client/src/main/services/agent-runner/AgentTaskRunner.ts:217), before building initial messages:

```typescript
// NEW: Gather UI context snapshot
let uiContext: UIContextSnapshot | null = null;
try {
  uiContext = await this.getUIContext();  // Calls invokeRenderer
} catch {
  // Non-fatal — agent can still work without UI context
}

const uiContextSection = uiContext 
  ? buildUIContextSection(uiContext) 
  : '';

// Existing: Build initial messages (now with UI context appended)
const initialMessages = buildInitialMessages(
  agenticPrompt,
  task.originalPrompt,
  situationalContext + '\n\n' + uiContextSection
);
```

---

## Layer 3: Agent Tools for Prompt & UI Interaction

New file: `client/src/main/services/agent-runner/UITools.ts`

These tools give the agent the ability to query and manipulate the UI programmatically.

### Tool: `get_ui_context`

Fetches a fresh UI context snapshot mid-loop (the initial injection may be stale).

```typescript
{
  name: 'get_ui_context',
  description: 'Get the current state of the application UI: what tab is open, editor content, active conversation, sidebar panel, etc.',
  parameters: { type: 'object', properties: {}, required: [] },
  script: async () => {
    return await invokeRenderer('ui:getContext');
  }
}
```

### Tool: `navigate_ui`

Switches the active view, opens conversations, changes sidebar panels.

```typescript
{
  name: 'navigate_ui',
  description: 'Navigate the application UI. Can switch sidebar views, open conversations, or change tabs.',
  parameters: {
    type: 'object',
    properties: {
      action: { 
        type: 'string', 
        enum: ['openConversation', 'switchSidebar', 'openFile', 'switchTab'],
        description: 'Navigation action to perform'
      },
      target: { type: 'string', description: 'Target ID or path' }
    },
    required: ['action', 'target']
  },
  script: async ({ action, target }) => {
    return await invokeRenderer('ui:navigate', { action, target });
  }
}
```

### Tool: `get_editor_content`

Reads the full content of the currently open text editor.

```typescript
{
  name: 'get_editor_content',
  description: 'Get the full content of the file currently open in the text editor.',
  parameters: { type: 'object', properties: {}, required: [] },
  script: async () => {
    return await invokeRenderer('ui:getEditorContent');
  }
}
```

### Tool: `set_editor_content`

Replaces or patches the editor content programmatically.

```typescript
{
  name: 'set_editor_content',
  description: 'Set or replace the content in the currently open text editor. Use for editing prompt templates or any open file.',
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'New content to set in the editor' },
      save: { type: 'boolean', description: 'Whether to auto-save after setting content' }
    },
    required: ['content']
  },
  script: async ({ content, save }) => {
    return await invokeRenderer('ui:setEditorContent', { content, save });
  }
}
```

### Tool: `list_prompt_templates`

Lists available prompt chain/template files from the filesystem.

```typescript
{
  name: 'list_prompt_templates',
  description: 'List all available prompt templates/chains from the data directory.',
  parameters: { type: 'object', properties: {}, required: [] },
  script: async () => {
    const dir = path.join(process.cwd(), 'data', 'prompt-chains');
    if (!fs.existsSync(dir)) return { templates: [] };
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return { 
      templates: files.map(f => ({
        filename: f,
        name: f.replace('.json', ''),
        path: path.join(dir, f)
      }))
    };
  }
}
```

### Tool: `read_prompt_template`

Reads and parses a prompt template JSON file.

```typescript
{
  name: 'read_prompt_template',
  description: 'Read the contents of a prompt template/chain file.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Template name or filename' }
    },
    required: ['name']
  },
  script: async ({ name }) => {
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const filePath = path.join(process.cwd(), 'data', 'prompt-chains', filename);
    if (!fs.existsSync(filePath)) return { error: `Template "${name}" not found` };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { template: JSON.parse(content), path: filePath };
  }
}
```

### Tool: `save_prompt_template`

Creates or updates a prompt template JSON file.

```typescript
{
  name: 'save_prompt_template',
  description: 'Create or update a prompt template/chain file.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Template name' },
      template: { 
        type: 'object', 
        description: 'The prompt template/chain object to save' 
      }
    },
    required: ['name', 'template']
  },
  script: async ({ name, template }) => {
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const filePath = path.join(process.cwd(), 'data', 'prompt-chains', filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
    return { success: true, path: filePath };
  }
}
```

### Tool: `open_prompt_in_editor`

Opens a prompt template in the text editor for the user to see/edit.

```typescript
{
  name: 'open_prompt_in_editor',
  description: 'Open a prompt template file in the text editor panel so the user can view and edit it.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Template name or filename' }
    },
    required: ['name']
  },
  script: async ({ name }) => {
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const filePath = path.join(process.cwd(), 'data', 'prompt-chains', filename);
    if (!fs.existsSync(filePath)) return { error: `Template "${name}" not found` };
    await commandInterface.openFile(filePath);
    return { success: true, message: `Opened "${name}" in the editor` };
  }
}
```

---

## Layer 4: Renderer-Side Handlers

The renderer needs to register handlers for the new `ui:*` IPC channels. This follows the existing `app:invoke` pattern.

### Registration Point

In the component that initializes app-level IPC listeners (or create a dedicated hook):

```typescript
// In App.tsx or a dedicated useUIContextBridge hook

useEffect(() => {
  const cleanup = window.electronAPI.onAppInvoke((_, payload) => {
    const { requestId, channel, data } = payload;
    
    let result: any;
    switch (channel) {
      case 'ui:getContext':
        result = gatherUIContext();
        break;
      case 'ui:navigate':
        result = handleNavigate(data);
        break;
      case 'ui:getEditorContent':
        result = getEditorContent();
        break;
      case 'ui:setEditorContent':
        result = setEditorContent(data);
        break;
      // existing handlers...
      case 'commands:list':
        result = commandRegistry.getAll();
        break;
      // etc.
    }
    
    window.electronAPI.sendAppResponse(requestId, { result });
  });
  
  return cleanup;
}, []);
```

The `handleNavigate` function dispatches to the AppStore:

```typescript
function handleNavigate(data: { action: string; target: string }) {
  const store = useAppStore.getState();
  switch (data.action) {
    case 'openConversation':
      store.setActiveConversationId(data.target);
      return { success: true };
    case 'switchSidebar':
      store.setActiveSidebarView(data.target as SidebarView);
      return { success: true };
    case 'openFile':
      // Create a file tab
      store.openTab({
        id: `file-${data.target}`,
        type: 'file',
        title: path.basename(data.target),
        data: { path: data.target, content: '' } // Content loaded async
      });
      return { success: true };
    case 'switchTab':
      store.setActiveTabId(data.target);
      return { success: true };
    default:
      return { error: `Unknown action: ${data.action}` };
  }
}
```

---

## Integration into AgentTaskRunner

### Where tools are registered

In [`AgentTaskRunner.getPersonalityTools()`](client/src/main/services/agent-runner/AgentTaskRunner.ts:363), add the new UI + prompt tools alongside the existing shell/file tools:

```typescript
private getPersonalityTools(conversationId: string, metadata: any): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  
  // ... existing shell, read_file, write_file, list_directory tools ...
  
  // NEW: UI context and prompt tools
  tools.push(...buildUITools(this.invokeRenderer));
  tools.push(...buildPromptTemplateTools());
  
  return tools;
}
```

Where `buildUITools` and `buildPromptTemplateTools` are exported from `UITools.ts`.

### `invokeRenderer` access

`AgentTaskRunner` needs access to the `invokeRenderer` function from `ipc-setup.ts`. The cleanest approach: pass it as a dependency during construction in `services-setup.ts`, or set it via a setter method like `setCommandInterface`.

```typescript
// In AgentTaskRunner
private invokeRenderer: ((channel: string, data?: any) => Promise<any>) | null = null;

setInvokeRenderer(fn: (channel: string, data?: any) => Promise<any>) {
  this.invokeRenderer = fn;
}
```

Then in `ipc-setup.ts`:
```typescript
agentTaskRunner.setInvokeRenderer(invokeRenderer);
```

---

## Data Flow Summary

### At task start - Ambient Context Injection

```
User sends message → AgentTaskRunner.startTask()
  → invokeRenderer('ui:getContext') → Renderer gathers snapshot → returns UIContextSnapshot
  → buildUIContextSection(snapshot) → Injected into system prompt as "Current Application State"
  → AgentLoop starts with full UI awareness
```

### During task - On-Demand Refresh

```
Agent calls get_ui_context tool
  → invokeRenderer('ui:getContext') → Fresh snapshot returned
  → Agent reasons about current state and decides next action
```

### Agent edits a prompt

```
Agent calls list_prompt_templates → sees available templates
Agent calls read_prompt_template('software-factory') → reads template JSON
Agent calls open_prompt_in_editor('software-factory') → user sees it in editor
Agent calls set_editor_content(modified_content) → updates editor
Agent calls send_update('I've updated the software-factory prompt template...')
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `client/src/shared/ui-context-types.ts` | **Create** | Type definitions for UIContextSnapshot |
| `client/src/renderer/services/UIContextProvider.ts` | **Create** | Gathers UI state snapshot from AppStore |
| `client/src/main/services/agent-runner/UITools.ts` | **Create** | Agent tools for UI context + prompt template interaction |
| `client/src/main/services/agent-runner/AgentTaskRunner.ts` | **Modify** | Add invokeRenderer dependency, inject UI context, register new tools |
| `client/src/main/services/agent-runner/AgentContextBuilder.ts` | **Modify** | Add buildUIContextSection function |
| `client/src/main/services/agent-runner/AgentToolkit.ts` | **Modify** | Update buildFullToolkit to accept UI tools |
| `client/src/main/ipc-setup.ts` | **Modify** | Pass invokeRenderer to AgentTaskRunner |
| `client/src/renderer/App.tsx` | **Modify** | Register ui:* handlers in app:invoke listener |
| `client/src/preload/index.ts` | **No change** | Already has onAppInvoke/sendAppResponse |

---

## Non-Goals (Out of Scope)

- Real-time streaming of UI state changes to the agent (push model) — we use pull/snapshot
- Visual screenshot-based awareness (already handled by DesktopAccessibilityLearner)
- Prompt template execution within the agent loop (the agent uses existing tools like shell/PromptEngine)
- Modifying the PromptEngine itself — we only add tools that work with prompt template files

---

## Extension: Default Agent Prompt Chain

### Purpose

Allow a prompt chain to be designated as the **default agent chain** — the one loaded automatically when any agent task starts. This injects the chain's system instructions, sub-prompt catalog, and tool descriptions into the agent's context without manual intervention.

### Architecture

```
User → set_default_prompt_chain("software-factory")
  → configManager.setDefaultPromptChain("software-factory")
  → persisted in config.json { agent: { defaultPromptChain: "software-factory" } }

New task starts → AgentTaskRunner.executeLoop()
  → configManager.getDefaultPromptChain() → "software-factory"
  → loadPromptChain("software-factory") → ParsedPromptChain
  → buildChainSystemSection(chain) → markdown system context
  → injected into fullContext alongside situationalContext and uiContextSection
```

### Storage

The default chain name is stored in `ConfigManager` under `config.agent.defaultPromptChain`:

```typescript
interface AgentConfig {
  defaultPromptChain: string | null;
}

interface AppConfig {
  network: NetworkConfig;
  logging: LoggingConfig;
  workspace?: WorkspaceConfig;
  agent?: AgentConfig;  // NEW
}
```

### Chain Loader

New file: `client/src/main/services/agent-runner/PromptChainLoader.ts`

Responsibilities:
- Parse prompt chain JSON files into typed `ParsedPromptChain` structures
- Identify the entry prompt ("main" > "start" > first in array)
- Build a human-readable system context section (`buildChainSystemSection`)
- Multi-fallback path resolution (same as PromptTemplateTools)

Key types:
```typescript
interface ParsedPromptChain {
  meta: PromptChainMeta;           // _id, _name, _description, _source
  prompts: ChainPrompt[];         // All prompts in the chain
  tools: ChainToolDef[];          // Chain-specific tool definitions
  entryPrompt: ChainPrompt;      // The entry-point prompt
}
```

### Agent Tools

Two new tools added to `PromptTemplateTools`:

| Tool | Description |
|------|-------------|
| `get_default_prompt_chain` | Returns the current default chain name, metadata, prompt/tool counts |
| `set_default_prompt_chain` | Sets or clears the default chain (validates existence before saving) |

### IPC + Preload

| Channel | Direction | Description |
|---------|-----------|-------------|
| `agent:getDefaultChain` | Renderer → Main | Get current default chain name |
| `agent:setDefaultChain` | Renderer → Main | Set/clear default chain |

### Data Flow at Task Start

```
1. systemPrompt = getSystemPrompt(task, metadata)     // personality
2. chainContext = loadPromptChain(defaultChainName)    // chain instructions
   → buildChainSystemSection(chain)
3. agenticPrompt = buildAgenticSystemPrompt(systemPrompt) // + agentic mode rules  
4. situationalContext = getSituationalContext(...)      // memory
5. uiContextSection = buildUIContextSection(snapshot)   // UI state
6. fullContext = [situationalContext, chainContext, uiContextSection].join('\n\n')
7. initialMessages = buildInitialMessages(agenticPrompt, userMessage, fullContext)
```

### Design Decisions

- **Chain tools are NOT executed** in the AgentLoop — their `script` fields are JavaScript strings intended for PromptEngine's `context.require` pattern. The agent can invoke equivalent functionality through its built-in tools (shell, read_file, etc.).
- **Chain descriptions ARE injected** — the AI sees the chain's purpose, sub-prompts, and tool descriptions so it can reason about available workflows.
- **Fail-safe**: If the configured default chain file is missing or unparseable, the agent proceeds without chain context (logged as a warning).
- **Persistence**: The setting survives app restarts via `config.json`.

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `client/src/main/services/agent-runner/PromptChainLoader.ts` | **Create** | Chain loading, parsing, and context building |
| `client/src/main/services/ConfigManager.ts` | **Modify** | Add AgentConfig, getDefaultPromptChain, setDefaultPromptChain |
| `client/src/main/services/agent-runner/PromptTemplateTools.ts` | **Modify** | Add get/set_default_prompt_chain tools |
| `client/src/main/services/agent-runner/AgentTaskRunner.ts` | **Modify** | Load chain at task start, inject into context |
| `client/src/main/services/agent-runner/index.ts` | **Modify** | Export new symbols |
| `client/src/main/ipc-setup.ts` | **Modify** | Add agent:getDefaultChain/setDefaultChain handlers |
| `client/src/preload/index.ts` | **Modify** | Add agentGetDefaultChain/agentSetDefaultChain APIs |
