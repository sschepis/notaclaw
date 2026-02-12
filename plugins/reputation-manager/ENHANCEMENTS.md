# Reputation Manager — Enhancements

## Critical Issues

### 1. Renderer Uses Hardcoded Data Instead of IPC
- **Current**: `renderer/index.tsx` initializes with hardcoded dummy data (`useState(750)`, static feedback array) and never calls the backend IPC handlers (`reputation:get`, `reputation:add-feedback`).
- **Enhancement**: Fetch reputation data from the main process via `context.ipc.invoke('reputation:get')` on mount and subscribe to live updates.
- **Priority**: Critical

### 2. No Persistence — Data Lost on Restart
- **Current**: `ReputationManager` class stores all data in memory. Reputation scores and feedback vanish on process restart.
- **Enhancement**: Use `context.storage.set/get()` to persist reputation data. Load from storage on activation, save after each mutation.
- **Priority**: High

### 3. Local Type Definitions Instead of Shared
- **Current**: Defines its own `IpcHandler` and `PluginContext` interfaces locally instead of importing from shared types.
- **Enhancement**: Import `PluginContext` from the shared module for consistency and future-proofing.
- **Priority**: Medium

### 4. DSN Skills Declared but Not Registered
- **Current**: `aleph.json` declares `get_reputation` and `submit_feedback` skills, but `main/index.ts` never calls `context.dsn.registerTool()`.
- **Enhancement**: Register DSN tools matching the declared skills so agents can query and submit reputation data.
- **Priority**: High

---

## Functional Enhancements

### 5. Weighted Reputation Algorithm
- The current score formula `score + (rating - 3) * 10` is simplistic. Implement a weighted algorithm that considers: recency of feedback, trustworthiness of the reviewer, category of interaction, and diminishing returns for repeated reviewers.

### 6. Multi-Entity Reputation Tracking
- Currently tracks only a single reputation. Support tracking reputation for multiple entities (peers, services, agents) with per-entity score histories.

### 7. Reputation History & Trends
- Store historical score snapshots and display a trend chart showing reputation evolution over time.

### 8. Reputation Decay
- Implement time-based decay: if no positive feedback is received within a configurable window, the score gradually decreases to incentivize ongoing good behavior.

### 9. Dispute / Appeal Mechanism
- Allow users to flag or dispute unfair feedback with a review process.

### 10. Peer Reputation Queries
- Enable querying reputation of remote peers via the DSN network, not just local data. Display peer reputation when evaluating whether to trust incoming connections or service requests.

### 11. Rank System Expansion
- The rank "Magus" is hardcoded. Implement a proper rank tier system (e.g., Novice → Apprentice → Adept → Magus → Archon) with defined score thresholds and configurable rank names.

---

## UI/UX Enhancements

### 12. Submit Feedback Form
- The renderer shows feedback but provides no way to submit new feedback. Add an input form with star rating, comment field, and subject selector.

### 13. Reputation Visualization
- Add a radial/gauge chart for the trust score and a bar chart breakdown by feedback category.

### 14. Feedback Sorting & Filtering
- Allow sorting feedback by date, score, or reviewer. Add filtering by score range.

### 15. Use Proper Icon
- The nav button displays text "REP" instead of an icon. Use a lucide-react icon (e.g., `Shield`, `Award`, or `Star`).

---

## Testing Enhancements

### 16. Expand Test Coverage
- Current tests cover basic IPC registration and score math. Add tests for: edge cases (score clamping at 0 and 1000), feedback ordering, concurrent feedback submission, and deactivation cleanup.

### 17. Renderer Component Tests
- No renderer tests exist. Test that the component renders feedback items, displays the correct score, and updates when new data arrives.

---

## Architecture Enhancements

### 18. Event-Driven Score Updates
- Emit `reputation:updated` events via IPC when scores change so the renderer and other plugins can react in real-time.

### 19. Integration with Trust Gate
- Feed reputation scores into the host application's `TrustGate` and `TrustEvaluator` services to influence permission decisions.

### 20. Configurable Settings
- Add plugin settings in `aleph.json` for: initial score, score bounds, decay rate, rank thresholds, and feedback retention period.
