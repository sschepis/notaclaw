# Migration Plan: Integrating `assistant` into `notaclaw`

## 1. Overview
This document outlines the strategy for integrating the capabilities of the `assistant` project (a sophisticated software development agent) into `notaclaw` (the AlephNet DSN client).

**Goal:** Transform `notaclaw` from a passive DSN node into an active **Software Factory**, capable of executing complex, multi-step software development workflows (Requirements -> Design -> Code -> Test).

**Source:** `~/Development/assistant`
**Destination:** `~/Development/notaclaw/plugins/software-factory`

## 2. Architecture

We will implement this as a core plugin named `software-factory`.

### 2.1. Component Mapping

| Concept in `assistant` | Concept in `notaclaw` | Implementation Strategy |
| :--- | :--- | :--- |
| **AssistantRunner** | **SoftwareFactoryEngine** | Port the recursion/chaining logic of `AssistantRunner` into a new `SoftwareFactoryEngine` class. This engine will act as a specialized "sub-cortex" for development tasks. |
| **Tools (`config/tools.ts`)** | **AlephNet Skills** | Wrap each tool (e.g., `executeBash`, `gitProjectInitializer`) as an AlephNet `SkillDefinition` and register it via `dsn.registerSkill()`. |
| **Prompts (`config/prompts.ts`)** | **SRIA Workflows / Tasks** | Convert the static prompt configurations into dynamic `SRIA` Task definitions or a new `WorkflowDefinition` format that the `SoftwareFactoryEngine` can execute. |
| **CLI (`cli.ts`)** | **DSN Event Listeners** | Instead of CLI args, the factory will listen for `software.build_request` events on the AlephNet mesh. |

### 2.2. Directory Structure

```text
plugins/software-factory/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                # Plugin entry point (activates the factory)
│   ├── engine/                 # The "Brain" (ported from AssistantRunner)
│   │   ├── FactoryEngine.ts    # Main recursion loop
│   │   ├── PromptExecutor.ts   # LLM interaction layer
│   │   └── StateManager.ts     # Project state persistence (GMF integration)
│   ├── skills/                 # The "Hands" (ported from tools.ts)
│   │   ├── bash.ts
│   │   ├── git.ts
│   │   ├── filesystem.ts
│   │   └── ...
│   ├── workflows/              # The "Process" (ported from prompts.ts)
│   │   ├── sdlc.ts             # The full waterfall pipeline
│   │   └── ...
│   └── types.ts
```

## 3. Implementation Steps

### Phase 1: Scaffolding & Core Engine
1.  **Create Plugin Structure:** Set up the directory `plugins/software-factory` with `package.json` and `tsconfig.json`.
2.  **Port AssistantRunner:**
    *   Copy `AssistantRunner` logic to `src/engine/`.
    *   Refactor to remove CLI dependencies.
    *   Update `executePrompt` to use `notaclaw`'s configured LLM provider (or adapter).
    *   *Critical:* Ensure the "chaining" logic (`then` blocks) is preserved, as this drives the autonomous behavior.

### Phase 2: Skill Migration
1.  **Port Basic Tools:** Move `executeBash`, `respond`, `getState`, `setState` to `src/skills/`.
2.  **Wrap as AlephNet Skills:** Create a helper `registerToolAsSkill(dsn, tool)` that maps the tool's schema to `SkillDefinition`.
    *   *Semantic Domain:* `cognitive`
    *   *Prime Domain:* `[2, 3]` (Logic, Structure)
3.  **Port Complex Tools:** Move `gitProjectInitializer`, `testCoverageAnalyzer`, etc.

### Phase 3: Workflow Migration
1.  **Port Prompts:** Convert `src/config/prompts.ts` into a structured `WorkflowRegistry`.
2.  **Integrate with SRIA:** (Optional but recommended)
    *   Map high-level intents (e.g., "Build a React App") to the `main` prompt entry point.
    *   Allow `SRIAEngine` to delegate tasks to `SoftwareFactoryEngine`.

### Phase 4: State & Persistence
1.  **GMF Integration:**
    *   Replace `assistant`'s in-memory `state` object with a **GMF Object** (Global Memory Field).
    *   This ensures that the state of a software build persists across node restarts and is collaborative.
    *   *Action:* Implement `GMFStateManager` in `src/engine/`.

### Phase 5: Integration & Testing
1.  **Activate Plugin:** Import and call `SoftwareFactory.activate(dsn)` in `notaclaw/src/index.ts`.
2.  **Test Run:**
    *   Send a mock event/message to the node: `"Build a ToDo list app"`.
    *   Verify the engine picks it up, decomposes it, and executes the tools.

## 4. Dependencies

*   `@sschepis/alephnet-node`: For `DSNNode`, `SkillDefinition`.
*   `AIProvider` (ported from `assistant`): The unified LLM client.

## 5. Migration Notes from `assistant`

*   **AIProvider:** The `assistant` project recently unified its LLM handling into `AIProvider`. We must port this class and its adapters (OpenAI, Anthropic, etc.) to `plugins/software-factory/ai/`.
*   **Conditional Routing:** `assistant` implements complex conditional logic (e.g., `completionCheck`, `nextPrompt`). This logic must be preserved in `FactoryEngine` to support the waterfall SDLC.

## 6. Future Enhancements

*   **Sandboxed Execution:** Use `ai-collab-companion`'s container sandbox for `executeBash` instead of running on the host metal.
*   **Collaborative Coding:** Use AlephNet to split tasks (e.g., "Write Tests" vs "Write Code") across multiple `notaclaw` nodes.
