# Notification Center — Enhancements

## Critical Issues

### 1. No Renderer Implementation
- **Current**: The manifest references `renderer/index.js` but no renderer source file exists. The plugin has no UI — notifications are received and stored but never displayed to the user.
- **Enhancement**: Create a full `renderer/index.tsx` with a notification panel, toast popups, and a badge counter on the nav item.
- **Priority**: Critical

### 2. No Persistence
- **Current**: Notifications are stored in an in-memory array that is lost on restart. The 100-item cap is also hardcoded.
- **Enhancement**: Use `context.storage` to persist notifications across sessions. Make the max history size configurable.
- **Priority**: High

### 3. Local Type Definitions Instead of Shared
- **Current**: Defines its own `IpcHandler` and `PluginContext` interfaces locally rather than importing from the shared plugin-types module.
- **Enhancement**: Import `PluginContext` from the shared types package for consistency and to pick up future API additions.
- **Priority**: Medium

---

## Functional Enhancements

### 4. Toast / Desktop Notifications
- Display transient toast notifications in the UI when new notifications arrive. For critical/error types, trigger native OS desktop notifications via Electron's `Notification` API.

### 5. Notification Categories & Filtering
- Add category/tag support (e.g., `system`, `agent`, `network`, `plugin`) so users can filter notifications by source or topic.

### 6. Mark All as Read / Batch Operations
- Currently only supports marking individual notifications as read via `notifications:markRead`. Add `notifications:markAllRead` and `notifications:delete` (single + batch) handlers.

### 7. Notification Actions
- Support actionable notifications with buttons (e.g., "View Details", "Dismiss", "Retry"). Allow the notification payload to include an `actions` array with callbacks or IPC channel targets.

### 8. Priority Levels
- Extend beyond `type` (info/success/warning/error) to include a `priority` field (low/medium/high/urgent) that controls display behavior — e.g., urgent notifications auto-expand and play a sound.

### 9. Notification Grouping
- Group related notifications (e.g., multiple sync events) into collapsible groups to reduce noise.

### 10. Rate Limiting / Deduplication
- Prevent notification floods by deduplicating identical messages within a time window and showing a count badge instead.

---

## UI/UX Enhancements

### 11. Unread Badge Counter
- Display unread notification count as a badge on the navigation item and optionally in the window title bar.

### 12. Notification Sound
- Play a subtle audio cue for new notifications, with user-configurable sound selection and volume.

### 13. Do Not Disturb Mode
- Add a DND toggle that suppresses visual/audio alerts while still queueing notifications.

### 14. Notification History Panel
- Provide a scrollable, searchable history view with date grouping and the ability to re-expand dismissed notifications.

---

## Architecture Enhancements

### 15. Cross-Plugin Notification API
- Formalize a notification protocol so any plugin can send notifications via a standardized IPC channel. Document the expected payload shape as a TypeScript interface.

### 16. Notification Rules Engine
- Allow users to create rules (e.g., "If notification source is 'coherence-monitor' and type is 'error', then also send desktop notification").

### 17. DSN Skill Registration
- Register a `send_notification` tool via `context.dsn.registerTool()` so agents can programmatically notify the user during task execution.

---

## Testing Enhancements

### 18. Add Test Suite
- No tests exist for this plugin. Create tests covering: notification creation, list retrieval, mark-read, clear-all, overflow eviction (101st notification), and edge cases (empty title/message).

### 19. IPC Integration Tests
- Test the full send → receive → broadcast cycle with mock contexts.
