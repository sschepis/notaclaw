# Coherence Monitor — Enhancements

## Critical Issues

### 1. Replace Mock Data with Real Metrics
- **Current**: Main process emits `Math.random()` values on a 3-second interval — purely decorative.
- **Enhancement**: Integrate with the actual RISA/Free Energy minimization engine. Pull real coherence and entropy metrics from `RISAService` or `TrustEvaluator`. The `PluginContext` provides `dsn` and `storage` APIs that should be leveraged.
- **Priority**: High

### 2. Missing IPC Cleanup in Renderer
- **Current**: The `useEffect` cleanup in `renderer/index.tsx` has `ipc.off` commented out.
- **Enhancement**: Implement proper listener removal on unmount to prevent memory leaks. Requires either exposing `ipc.off()` in the plugin IPC bridge or using an `AbortController` pattern.
- **Priority**: High

### 3. Import Path Uses Relative Traversal
- **Current**: `main/index.ts` imports `PluginContext` via `'../../../client/src/shared/plugin-types'`. This breaks if the plugin is installed externally.
- **Enhancement**: Use the shared package or ambient type declarations so the plugin is self-contained.
- **Priority**: High

---

## Functional Enhancements

### 4. Historical Coherence Charting
- Add a time-series chart (e.g., sparkline or line chart) showing coherence and entropy over the last N minutes/hours. The current UI only displays instantaneous values with no trend visibility.

### 5. Configurable Monitoring Interval
- Expose the polling interval (currently hardcoded to 3000ms) as a plugin setting via `aleph.json` or manifest settings. Allow users to increase/decrease granularity.

### 6. Threshold Alerts
- Define configurable thresholds (e.g., coherence < 0.3, entropy > 0.7) that trigger notifications via the Notification Center plugin. Cross-plugin IPC: `context.ipc.send('notify', { ... })`.

### 7. Multi-Source Monitoring
- Currently hardcoded to `source: 'SRIA-Core'`. Support monitoring multiple coherence sources (agent loops, network peers, memory subsystems) with per-source breakdown in the UI.

### 8. Data Export
- Add ability to export coherence event history as CSV or JSON for offline analysis.

### 9. DSN Tool Registration
- Register a `getCoherenceStatus` tool via `context.dsn.registerTool()` so agents can programmatically query current coherence state during decision loops.

---

## UI/UX Enhancements

### 10. Color-Coded Event Severity
- Events currently display the same styling regardless of coherence level. Use green/yellow/red color coding based on coherence thresholds.

### 11. Event Filtering & Search
- The event stream grows up to 50 entries with no way to filter. Add filtering by source, message content, or coherence range.

### 12. Pause/Resume Stream
- Add a toggle to pause the live event stream for inspection without new events pushing older entries out of view.

### 13. Use `registerNavigation` API Consistently
- The renderer uses the newer `ui.registerNavigation()` pattern which is good, but should ensure it also registers a bottom panel slot for quick-glance coherence status.

---

## Testing Enhancements

### 14. Expand Test Coverage
- Only 1 test exists. Add tests for: deactivation cleanup, interval clearing on stop event, multiple ready event calls (idempotency), and event data shape validation.

### 15. Renderer Component Tests
- No tests exist for the React renderer. Add component tests using React Testing Library to verify UI state updates when IPC events arrive.

---

## Architecture Enhancements

### 16. Add `aleph.json` Configuration
- This plugin lacks an `aleph.json` file unlike other plugins. Add one with proper `semanticDomain`, `capabilities`, and skill definitions.

### 17. Persistence Layer
- Store historical coherence data in plugin-scoped `context.storage` so trends survive restarts.

### 18. Decouple Event Shape
- Define a proper TypeScript interface for coherence events rather than using anonymous object literals. Export the type for consumer plugins.
