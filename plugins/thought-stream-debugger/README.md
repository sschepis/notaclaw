# Thought Stream Debugger

**Thought Stream Debugger** is a premier observability tool for the AlephNet-Integrated Durable Agent Mesh. It provides a window into the "mind" of your autonomous agents, allowing you to trace their decision-making process, memory access, and semantic resonance.

## Features

- **Execution Trace Visualization**: See the exact sequence of steps an agent took to reach a conclusion.
- **Resonance Heatmap**: Visualize which nodes in the Knowledge Graph resonated most strongly with the agent's query.
- **Prompt Inspection**: View the raw prompts sent to the LLM and the raw completion responses.
- **Tool Call Analysis**: Inspect the parameters passed to tools and the results returned.
- **Memory Field Access Logs**: See which memories were retrieved, updated, or ignored.

## Usage

1.  Enable "Debug Mode" for a specific agent or swarm.
2.  Run the agent task.
3.  Open the **Thought Stream** tab.
4.  Select the session ID from the list.
5.  Use the timeline slider to scrub through the execution history.

## Debugging Scenarios

- **Hallucination**: Identify where the agent diverged from the provided context.
- **Looping**: Detect when an agent gets stuck in a repetitive cycle.
- **Inefficiency**: Find redundant tool calls or queries.
- **Resonance Tuning**: Adjust semantic weights to improve memory retrieval relevance.

## License

MIT
