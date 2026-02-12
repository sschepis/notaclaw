# Network Visualizer — Enhancements

## Critical Issues

### 1. Main Process is a Stub
- **Current**: [`main/index.js`](main/index.js) only handles a generic `ping/pong` IPC exchange. No network topology data is collected or served from the backend.
- **Enhancement**: Integrate with the host's `DSNNode` and `AlephNetClient` services to collect real peer data — connected peers, connection latency, sync state, message throughput, and routing tables. Expose this data via IPC handlers (`network:get-topology`, `network:get-peers`, `network:get-stats`).
- **Priority**: Critical

### 2. Network Data is Entirely Mocked
- **Current**: The renderer generates 30 random nodes with random positions and random links on mount. All stats (latency: `42ms`, peers count, sync status: `99.9%`) are hardcoded strings.
- **Enhancement**: Fetch real network topology from the main process via IPC. Update the graph dynamically as peers connect/disconnect. Display real latency, message count, and sync percentage.
- **Priority**: Critical

### 3. Settings Declared but Not Consumed
- **Current**: The manifest declares 4 settings (`refreshRate`, `showTraffic`, `layoutMode`, `nodeSize`) but none are read or applied anywhere.
- **Enhancement**: Load settings on activation and apply them: use `refreshRate` for the polling interval, `showTraffic` to toggle traffic animation on edges, `layoutMode` to switch between force-directed/circular/grid layouts, and `nodeSize` for the base node radius.
- **Priority**: High

---

## Functional Enhancements

### 4. Force-Directed Layout Algorithm
- The current animation is a simple bouncing-ball simulation that doesn't represent actual network topology. Implement a proper force-directed graph layout (d3-force, or a custom Barnes-Hut simulation) where connected nodes attract and disconnected nodes repel.

### 5. Real-Time Peer Discovery Events
- Subscribe to DSN peer discovery/disconnect events to dynamically add/remove nodes from the graph in real-time, with entry/exit animations.

### 6. Traffic Visualization
- Animate data flow along edges as particles or pulses to show message traffic between nodes. Vary particle speed/density based on actual throughput.

### 7. Node Detail Panel
- Click on a node to show a detail panel with: peer ID, IP address (if available), connection duration, message counts (sent/received), latency history, trust score, and semantic domain.

### 8. Edge Detail Panel
- Click on an edge to show: connection type, message throughput, latency, and protocol version.

### 9. Network Health Score
- Compute and display an overall network health score based on: average latency, peer count vs. expected, sync completion percentage, and connection stability.

### 10. Geographic Map View
- If peer IP geolocation is available, offer a world map view showing peer locations and connections overlaid on geography.

### 11. Cluster Visualization
- Identify and highlight semantic clusters — groups of nodes that share the same `semanticDomain` — using color coding or spatial grouping.

### 12. Network History / Timeline
- Record network state snapshots over time. Allow scrubbing back to see how the topology evolved (integrate with the Temporal Voyager plugin).

### 13. Peer Search & Filter
- Add a search box to find specific peers by ID or address. Add filters to show/hide node types (archon, peer, local).

---

## UI/UX Enhancements

### 14. Canvas/WebGL Rendering
- The current SVG renderer will degrade with 100+ nodes. Switch to Canvas 2D or WebGL (via pixi.js or three.js) for rendering large graphs performantly.

### 15. Zoom and Pan Controls
- The current view has no zoom or pan. Add mouse wheel zoom, click-drag pan, and a minimap for navigation on large graphs.

### 16. Legend Interactivity
- Make the legend interactive — clicking a node type in the legend should toggle visibility of that node type.

### 17. Responsive SVG Viewbox
- The SVG viewBox is hardcoded to `800x600`. Make it responsive to the actual container dimensions.

### 18. Node Labels
- Show peer IDs or friendly names next to nodes, with option to toggle label visibility.

### 19. Edge Width Based on Traffic
- Vary edge stroke width and opacity based on the volume of traffic between connected nodes.

### 20. Animation Frame Optimization
- The current `setInterval(50ms)` animation creates excessive re-renders. Use `requestAnimationFrame` for smoother, more efficient animation.

---

## Testing Enhancements

### 21. Add Test Suite
- No tests exist. Create tests for: main process IPC handler registration, node/link data transformation, force-directed layout computation, and settings application.

### 22. Renderer Component Tests
- Test graph rendering with various node counts, link configurations, and node types. Verify click interactions and legend toggling.

---

## Architecture Enhancements

### 23. Data Layer Separation
- Separate the network data model from the visualization logic. Create a `NetworkTopology` class in the main process that maintains the canonical graph state and emits change events.

### 24. Cross-Plugin Integration
- Emit `network:peer-connected` and `network:peer-disconnected` events for other plugins to consume (e.g., notification center can alert on peer changes).

### 25. Add `aleph.json`
- This plugin lacks a dedicated `aleph.json` file. Add one with proper capabilities and optional DSN tool registrations (e.g., `get_network_status` tool for agents).

### 26. Convert to TypeScript
- The main process is plain JavaScript. Convert to TypeScript for type safety and consistency with the rest of the codebase.
