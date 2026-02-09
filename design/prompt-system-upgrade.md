# Prompt System Upgrade Design

## Overview
This document outlines the design for upgrading the AI prompt subsystem in `notaclaw`. The goal is to centralize the powerful prompt engine currently isolated in `plugins/software-factory` and enhance it with the modular, dynamic architecture described in the OpenClaw Agent Prompt Structure.

## Problem Statement
- **Fragmentation:** The "really great" prompt engine (state machine, tool handling, structured I/O) is locked inside `plugins/software-factory`. Other parts of the app (e.g., `PersonalityManager`, `TaskScheduler`) use basic string concatenation.
- **Rigidity:** The current engine uses static strings for system prompts, making it hard to inject dynamic context (Time, Safety, Workspace) or adapt to different modes (Architect vs. Code).
- **Lack of Prominence:** The advanced capabilities are not exposed as a core service.

## Goals
1.  **Centralize:** Move the `software-factory` engine to `src/core/prompt-engine` (or `client/src/main/services/PromptEngine`).
2.  **Modularize:** Implement a `PromptBuilder` that constructs prompts from dynamic sections (Identity, Tools, Safety, Context).
3.  **Enhance:** Add global context injection (OS, Time, Project State) and safety protocols.
4.  **Standardize:** Make this the default way to interact with LLMs across the application.

## Architecture

### 1. Core Service: `PromptEngine`
The `PromptEngine` will be the central service for executing AI workflows. It will handle:
- **State Management:** Tracking conversation history and task state.
- **Workflow Execution:** Executing multi-step prompts (the `then` logic from `software-factory`).
- **Tool Execution:** resolving and executing tools.
- **Retry & Error Handling:** Robust error recovery.

### 2. `PromptBuilder`
A builder pattern to construct the system prompt dynamically.

```typescript
interface PromptSection {
  id: string;
  priority: number;
  content: string | ((context: PromptContext) => string | Promise<string>);
}

class PromptBuilder {
  addSection(section: PromptSection): this;
  addToolDefinitions(tools: Tool[]): this;
  addSafetyRules(level: 'strict' | 'flexible'): this;
  addRuntimeContext(context: RuntimeContext): this;
  build(): Promise<string>;
}
```

### 3. Standard Sections (OpenClaw Architecture)
The `PromptBuilder` will support the following standard sections:

1.  **Identity & Role:** Defined by `PersonalityManager` or specific task config.
2.  **Tooling:** Auto-generated from registered tools. Includes usage guidelines.
3.  **Safety:** Hardcoded safety directives (Anthropic-style).
4.  **Runtime Context:**
    - Time/Date (via `session_status`).
    - OS/Environment.
    - User Identity.
5.  **Workspace:** Current working directory and file constraints.
6.  **Project Context:** Injected files (`SOUL.md`, `README.md`, etc.).
7.  **Task/Workflow:** The specific instructions for the current step.

### 4. `PromptRegistry`
A registry for prompt templates. Instead of static objects, templates can be functions that return a configured `PromptBuilder`.

```typescript
// Example Template
const TaskDecomposerTemplate = (task: string) => 
  new PromptBuilder()
    .addSection({ id: 'identity', content: 'You are a task decomposition expert...' })
    .addSection({ id: 'task', content: `Task: ${task}` })
    .addResponseFormat({ subtasks: 'array' });
```

## Integration Plan

### Phase 1: Extraction
1.  Refactor `plugins/software-factory/src/engine` into a standalone library or core service (`src/core/prompt-engine`).
2.  Ensure it has no dependencies on the plugin-specific code.

### Phase 2: Enhancement
1.  Implement `PromptBuilder` with support for modular sections.
2.  Port the `software-factory` prompts (`main`, `taskDecomposer`) to use `PromptBuilder`.
3.  Add "Safety" and "Runtime" sections.

### Phase 3: Adoption
1.  Update `PersonalityManager` to use `PromptEngine` for the main chat.
2.  Update `TaskScheduler` to use `PromptEngine`.
3.  Expose `PromptEngine` to all plugins via the Plugin API.

## Data Structures

### `PromptContext`
```typescript
interface PromptContext {
  agentId: string;
  mode: 'full' | 'minimal' | 'code' | 'architect';
  workspaceDir: string;
  runtime: {
    os: string;
    time: string;
    model: string;
  };
  state: Record<string, any>;
  tools: Tool[];
}
```

### `PromptTemplate`
```typescript
interface PromptTemplate {
  name: string;
  description: string;
  build: (context: PromptContext, args: any) => Promise<PromptBuilder>;
  responseFormat?: any;
  tools?: string[]; // Allowed tools
}
```

## Benefits
- **Consistency:** All agents speak with the same "voice" and safety rules.
- **Power:** Complex workflows (chains of thought, tool use) become easy to implement.
- **Maintainability:** Prompts are code, not just strings.
- **Extensibility:** Plugins can register new prompt templates and tools easily.
