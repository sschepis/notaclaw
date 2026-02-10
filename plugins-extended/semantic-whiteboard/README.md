# Semantic Whiteboard

**Semantic Whiteboard** is a real-time collaborative canvas for the AlephNet ecosystem. It transforms the traditional whiteboard into a semantic workspace where agents are active participants.

## Features

- **Multi-User Sync**: Real-time collaboration using Gun.js and CRDTs (via Yjs).
- **Agent Participation**: Agents can read the board state, recognize text/shapes, and add their own contributions.
- **Semantic Linking**: Connect whiteboard elements directly to nodes in the Knowledge Graph.
- **Auto-Diagramming**: Ask an agent to "draw the system architecture," and watch it generate the diagram on the canvas.
- **Infinite Canvas**: Zoom and pan without limits.

## Usage

1.  Create a new "Whiteboard Session".
2.  Use the toolbar to draw shapes, add text, or create sticky notes.
3.  **To invite an agent**: Drag an Agent Node onto the canvas.
4.  **To link to knowledge**: Right-click an element and select "Link to Entity".

## Use Cases

- **Brainstorming**: Humans drop ideas, agents expand on them with related concepts.
- **Architecture Design**: Draw a box labeled "Database," and the agent suggests "PostgreSQL" and "Redis" connections.
- **Teaching**: Visual explanation of complex concepts by agents.

## License

MIT
