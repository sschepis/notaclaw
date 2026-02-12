# Prompt Editor Enhancements

Analysis of the prompt editor plugin and underlying infrastructure reveals several key areas for improvement to make it a powerful tool for building complex agentic behaviors.

## 1. Visual Editor Experience

### 1.1 Live Execution Highlighting
**Description:** Visually highlight the currently executing node in the graph during a chain run.
**Benefit:** Provides immediate visual feedback on the agent's progress and logic flow.

### 1.2 State Inspection Overlay
**Description:** Hovering over a node or edge should show the `state` object at that point in time (inputs, outputs, variables).
**Benefit:** Essential for debugging complex variable interpolations and tool outputs.

### 1.3 Auto-Layout & Organization
**Description:** "Clean Up" button to automatically arrange nodes using a layout algorithm (e.g., Dagre). Support for grouping nodes into "Frames" or "Regions" with labels.
**Benefit:** Keeps large chains manageable and readable.

### 1.4 Sub-Chains (Nested Workflows)
**Description:** Allow collapsing a group of nodes into a single "Sub-Chain" node that references another workflow file.
**Benefit:** Enables modular design and reuse of common patterns (e.g., "Research Loop", "Code Review").

## 2. Debugging & Simulation

### 2.1 Step-Through Debugging
**Description:** "Pause" and "Step" controls for chain execution. Allow the user to inspect and manually edit the `state` before proceeding to the next node.
**Benefit:** Critical for diagnosing why a chain fails or hallucinates without re-running the whole sequence.

### 2.2 Test Case Management
**Description:** Interface to define saved "Test Inputs" (mock user queries, initial state) for a chain.
**Benefit:** Allows for regression testing of prompts as they evolve.

### 2.3 Cost & Token Estimation
**Description:** Display estimated token usage and cost for each node based on the prompt length and selected model.
**Benefit:** Helps optimize chains for cost and latency.

## 3. Advanced Prompt Engineering

### 3.1 Prompt Versioning & A/B Testing
**Description:** Built-in support for saving versions of a prompt node and rapidly switching between them (or running them in parallel to compare outputs).
**Benefit:** Facilitates scientific improvement of prompt performance.

### 3.2 Template Library
**Description:** Drag-and-drop library of common prompt patterns:
- Chain of Thought
- ReAct (Reason + Act)
- Reflection / Critique
- Summarization
**Benefit:** Speeds up creation of robust agents.

### 3.3 JSON Schema Visual Editor
**Description:** Replace raw JSON editors for `requestFormat` and `responseFormat` with a visual schema builder.
**Benefit:** Reduces syntax errors and makes it easier to define strict output contracts.

## 4. Tool Integration

### 4.1 Tool Discovery & Drag-and-Drop
**Description:** Sidebar panel listing all available system tools (from `PluginManager` / `ServiceRegistry`). Dragging a tool onto the canvas creates a pre-configured Tool Node.
**Benefit:** Eliminates the need to manually copy-paste tool definitions and signatures.

### 4.2 Integrated Script Editor
**Description:** Embed a Monaco editor instance for writing custom tool scripts directly within the Node Editor panel, with TypeScript intellisense.
**Benefit:** Drastically improves the developer experience for creating custom logic.

### 4.3 Tool Mocking
**Description:** Ability to "mock" a tool's output during testing (e.g., return a fixed JSON instead of actually calling an API).
**Benefit:** Allows testing chains without incurring API costs or side effects (like writing files).
