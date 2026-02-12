# VS Code Control — Enhancements

## Critical Issues

### 1. Insecure Default Configuration
- **Current**: Default host `127.0.0.1` and port `19876` with empty token.
- **Enhancement**: Enforce token generation on first run if none exists. Bind to `127.0.0.1` strictly unless explicitly configured otherwise.
- **Priority**: Critical

### 2. Missing Error Handling in WebSocket Client
- **Current**: Basic error logging exists, but no automatic recovery strategies for specific error codes (e.g., 401 Unauthorized vs. Connection Refused).
- **Enhancement**: Implement granular error handling with specific recovery strategies. Add exponential backoff for reconnection attempts.
- **Priority**: High

### 3. Hardcoded Timeout Values
- **Current**: 30s timeout for requests, 120s for pairing.
- **Enhancement**: Make timeouts configurable via `aleph.json` settings.
- **Priority**: Medium

---

## Functional Enhancements

### 4. Multi-Instance Support
- Support connecting to multiple VS Code instances simultaneously (e.g., different projects). Manage active connection context via UI selector.

### 5. Remote Workspace Support
- Add support for VS Code Remote Development (SSH, WSL, Containers) by proxying connections or handling remote paths correctly.

### 6. Terminal Session Management
- Enhance terminal tools to support persistent sessions, resizing, and shell selection (bash/zsh/powershell).

### 7. File Watcher Filters
- Add support for exclude patterns in file watchers to reduce noise (e.g., ignore `node_modules`, `.git`).

### 8. Debug Protocol Extensions
- Add support for variable inspection, watch expressions, and call stack navigation during debug sessions.

### 9. Git Conflict Resolution
- Add tools to list merge conflicts and resolve them (accept ours/theirs) programmatically.

### 10. Snippet Management
- Add tools to list, insert, and manage user snippets.

---

## UI/UX Enhancements

### 11. Connection Status Dashboard
- Expand the status panel to show detailed connection metrics: latency, message throughput, active subscriptions.

### 12. Terminal Output Viewer
- Add a dedicated view to stream terminal output within the AlephNet UI, separate from the main log view.

### 13. File Explorer Tree
- Render a read-only file tree of the remote workspace for easier navigation and file selection.

### 14. Command Palette Mirror
- Create a searchable list of available VS Code commands that can be triggered directly from the plugin UI.

### 15. Theme Synchronization
- Sync VS Code theme colors to the plugin UI for a seamless experience.

---

## Testing Enhancements

### 16. Integration Tests
- Add end-to-end tests that spin up a mock WebSocket server to verify client behavior under various network conditions.

### 17. Component Tests
- Add tests for React components (`PairingView`, `LogView`) to verify state transitions and user interactions.

### 18. Protocol Fuzzing
- Test the robustness of the JSON-RPC implementation by sending malformed or unexpected messages.

---

## Architecture Enhancements

### 19. Type-Safe Protocol Definition
- Share Protocol types between the VS Code extension and this plugin to ensure contract compatibility.

### 20. Request Batching Optimization
- Implement automatic request batching for high-frequency operations (e.g., typing simulation) to reduce network overhead.

### 21. State Reconciliation
- Implement a local state mirror that syncs with VS Code to provide faster read access to document state without round-trips.
