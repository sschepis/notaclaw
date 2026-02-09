# Workflow Weaver

**Workflow Weaver** is a powerful visual orchestration engine designed for the AlephNet-Integrated Durable Agent Mesh. It allows users to create, visualize, and manage complex agent workflows through a drag-and-drop interface.

## Features

- **Visual Workflow Builder**: intuitive drag-and-drop canvas for chaining agents, tools, and semantic queries.
- **Agent Orchestration**: Coordinate multiple agents (SRIAs) to work together on complex tasks.
- **Conditional Logic**: Implement branching logic based on agent outputs or semantic resonance scores.
- **Reusable Blueprints**: Save and share workflow templates with the community via the Marketplace.
- **Live Monitoring**: Watch workflows execute in real-time with visual status indicators.

## Usage

1.  Open the **Workflow Weaver** tab in the main interface.
2.  Drag nodes from the sidebar (Agents, Tools, Logic, Triggers) onto the canvas.
3.  Connect nodes to define the data flow and execution order.
4.  Configure node properties in the side panel.
5.  Click **Run** to execute the workflow.

## Node Types

- **Trigger**: Starts a workflow (e.g., Schedule, Webhook, Manual).
- **Agent**: Invokes a specific SRIA or a swarm.
- **Tool**: Executes a specific tool capability (e.g., from `software-factory`).
- **Query**: Performs a semantic search on the Knowledge Graph.
- **Logic**: If/Else, Loop, Map, Reduce.
- **Action**: Side effects like sending notifications or updating the GMF.

## Integration

Workflow Weaver integrates deeply with:
- **Software Factory**: To use registered tools.
- **Resonant Agent**: To query the semantic engine.
- **Swarm Controller**: To deploy agent swarms as workflow steps.

## License

MIT
