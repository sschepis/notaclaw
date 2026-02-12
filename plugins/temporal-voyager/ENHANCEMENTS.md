# Temporal Voyager — Enhancements

## Critical Issues

### 1. History Events Are Mocked
- **Current**: `getHistoryEvents` returns a hardcoded array of 3 mock events. No actual Gun.js/RAD history integration exists despite the README describing it as a core feature.
- **Enhancement**: Integrate with the actual storage adapter's history API (Gun.js immutable log or RAD). Query real state-change events from the graph.
- **Priority**: Critical

### 2. Time Travel is Simulated
- **Current**: `travelToTime` writes a timestamp to `context.storage` but nothing reads it or changes the application's data view. The graph state never actually changes.
- **Enhancement**: Implement a proper temporal read-head that filters the graph/store to show data as it existed at the target timestamp. This requires cooperation with the host's data layer.
- **Priority**: Critical

### 3. Timeline Forking is In-Memory Only
- **Current**: Forks are stored in a `Map` that is lost on restart. No actual data branching occurs — only metadata is tracked.
- **Enhancement**: Persist forks to `context.storage`. Implement real data-layer branching where a fork creates an isolated writable overlay on top of a historical snapshot.
- **Priority**: High

### 4. Renderer Uses `window.aleph` Instead of Plugin Context
- **Current**: `renderer/index.tsx` directly accesses `window.aleph.invoke()` instead of using the plugin context's IPC API. This bypasses the plugin sandbox and won't work in a properly sandboxed environment.
- **Enhancement**: Refactor the renderer to accept `context` in an `activate()` function (like other plugins) and use `context.ipc.invoke()` for all tool calls.
- **Priority**: High

### 5. Renderer Exports a Default Component Instead of `activate/deactivate`
- **Current**: `renderer/index.tsx` exports `default function TemporalVoyager()` — a bare React component. Other plugins export `activate(context)` / `deactivate()` functions that register components via the plugin context.
- **Enhancement**: Restructure to follow the standard plugin renderer pattern: export `activate(context)` that registers navigation and view components.
- **Priority**: High

---

## Functional Enhancements

### 6. Event Replay / Deterministic Re-execution
- The README promises "re-execute agent decision loops against historical data" but no replay logic exists. Implement a sandbox that loads historical state and re-runs agent loops to compare outcomes.

### 7. Causality Analysis
- The README promises "trace the chain of events that led to a specific state change" but no causality tracking exists. Implement event dependency tracking and a causal graph visualization.

### 8. Diff View Between Timestamps
- Show a side-by-side or unified diff of the graph state between two timestamps, highlighting what changed.

### 9. Fork Comparison
- Compare the current state of two forks side-by-side to evaluate "what if" scenarios.

### 10. Fork Merging
- Allow merging changes from a fork back into the main timeline, with conflict resolution for divergent state.

### 11. Bookmarks / Named Snapshots
- Allow users to bookmark specific timestamps with labels and notes for quick navigation to important historical moments.

### 12. Configurable Time Range
- The range slider is hardcoded to 24 hours. Allow configurable time ranges (1h, 6h, 24h, 7d, 30d, all time).

### 13. Event Type Filtering
- Allow filtering the event log by type (`agent_decision`, `network_sync`, `user_input`, etc.) to focus on specific categories of changes.

---

## UI/UX Enhancements

### 14. Visual Timeline with Event Markers
- Replace the plain range slider with a rich timeline visualization that shows event markers, density heatmaps, and fork branch points along the timeline.

### 15. State Inspector Panel
- When viewing a historical state, show a collapsible tree view of the graph data at that timestamp, allowing drill-down into specific nodes and properties.

### 16. Keyboard Shortcuts
- Add keyboard shortcuts for common actions: step back/forward (arrow keys), toggle live mode (Space), create fork (F), jump to now (Home).

### 17. Animation / Playback Mode
- Add a "playback" mode that automatically steps through historical states at a configurable speed, animating state changes.

### 18. Fork Tree Visualization
- Display forks as a branching tree diagram showing the relationship between the main timeline and all forks, with click-to-switch functionality.

### 19. Remove `alert()` Call
- `handleFork()` uses `alert()` for feedback — replace with an in-UI toast notification or status message.

---

## Testing Enhancements

### 20. Expand Test Coverage
- Only 1 test exists (verifies 3 tools are registered). Add tests for: `travelToTime` handler behavior, `forkTimeline` storage and retrieval, `getHistoryEvents` with parameterized limits, fork persistence, and error cases (invalid timestamp, missing label).

### 21. Renderer Component Tests
- No renderer tests exist. Test: timeline scrubber interaction, fork creation flow, live mode toggle, event log rendering, and historical state indicator.

---

## Architecture Enhancements

### 22. Storage Adapter Abstraction
- Abstract the history query layer behind an interface so different backends (Gun.js, SQLite, custom log) can be swapped.

### 23. Event Sourcing Pattern
- Implement a proper event-sourcing pattern where all state mutations are logged as immutable events, enabling natural time-travel without special storage adapter support.

### 24. Cross-Plugin Event Hooks
- Allow other plugins to contribute events to the temporal log (e.g., coherence monitor logs coherence drops, reputation manager logs score changes).

### 25. Snapshot Caching
- Cache reconstructed historical states to avoid recomputing from the full event log on repeated visits to the same timestamp.

### 26. Add `aleph.json` Configuration
- This plugin lacks an `aleph.json` file. Add one with skill definitions for `travelToTime`, `forkTimeline`, and `getHistoryEvents` so agents can use temporal navigation as a tool.
