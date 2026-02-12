# Prompt Chain Editor Design

## Overview
A plugin to visually edit and manage prompt chains (workflows) for the `WorkflowEngine`. It enables users to design complex agentic behaviors using a node-based interface and allows the agent itself to modify these chains.

## Goals
1.  **Visual Editing:** React-based node editor for prompt chains.
2.  **Core Integration:** Native support for `WorkflowEngine` configuration format.
3.  **Self-Modification:** Allow editing the "Default Agent" chain.
4.  **Agent API:** Tools for the agent to read/write chains.

## Architecture

### Data Model
The editor works directly with the `WorkflowConfig` structure defined in `src/services/WorkflowEngine/types.ts`.

- **Chain:** Maps to `WorkflowConfig`.
- **Node:** Maps to a `Prompt` definition.
- **Edge:** Maps to a condition in the `then` block of a prompt.
- **Tool:** Maps to a `Tool` definition.

### Storage
- **Location:** `data/prompt-chains/*.json`
- **Format:** JSON serialization of `WorkflowConfig`.
- **Default Chain:** `data/prompt-chains/default-agent.json`.

### Backend (Main Process)
- **Service:** `ChainManagerService`
    - `listChains()`: Returns list of available chains.
    - `getChain(id)`: Returns `WorkflowConfig`.
    - `saveChain(id, config)`: Saves config to disk.
    - `validateChain(config)`: Validates structure.
    - `setActiveAgentChain(id)`: Configures `DSNNode` to use this chain for the main agent loop.

### Frontend (Renderer Process)
- **Library:** `React Flow` (if available) or custom SVG/Canvas implementation.
- **Components:**
    - `ChainList`: Sidebar listing available chains.
    - `Canvas`: The graph editor area.
    - `NodeEditor`: Property panel for the selected node (prompt text, schema, tools).
    - `EdgeEditor`: Property panel for transitions (conditions, argument interpolation).

## Integration with Core Agent
To enable "editing the default agent", we must refactor `DSNNode` to optionally use `WorkflowEngine` instead of the legacy `PersonalityManager` loop.

**Migration Strategy:**
1.  Create a `default-agent.json` chain that replicates the current "Helpful Assistant" behavior.
2.  Update `DSNNode` to check for an active chain configuration.
3.  If a chain is active, use `context.workflow.createRunner()` to handle the message.
4.  If not, fall back to `PersonalityManager`.

## Agent Capabilities
The plugin will register tools for the agent:
- `list_prompt_chains`
- `read_prompt_chain`
- `write_prompt_chain`
- `set_active_agent_chain`

This allows the agent to "rewrite its own brain".

## UI Layout
```
+----------------+------------------------------------------------+
|  Chain List    |                  Toolbar                       |
|                | (Save, Run, Set Active, Zoom)                  |
| - Default      +------------------------------------------------+
| - Research     |                                                |
| - Coding       |                  Canvas                        |
|                |                                                |
|                |      [Prompt: Start] --> [Prompt: Plan]        |
|                |             |                   |              |
|                |             v                   v              |
|                |      [Tool: Search]      [Tool: Write File]    |
|                |                                                |
|                +------------------------------------------------+
|                |               Property Panel                   |
|                | Selected: [Prompt: Plan]                       |
|                | System: "You are a planner..."                 |
|                | Tools: [Search, ReadFile]                      |
+----------------+------------------------------------------------+
```
