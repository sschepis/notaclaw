# Notification Center Design Document

## Overview
This document outlines the design for the enhanced Notification Center plugin. The goal is to provide a robust, persistent, and feature-rich notification system for the OpenClaw platform.

## Architecture

### Data Model

```typescript
interface NotificationAction {
  id: string;
  label: string;
  action: string; // IPC channel or command ID
  data?: any;
}

interface Notification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string; // e.g., 'system', 'agent', 'network', 'plugin'
  source: string; // Plugin ID or service name
  read: boolean;
  actions?: NotificationAction[];
  data?: any; // Additional context
}

interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings;
}

interface NotificationSettings {
  maxHistory: number;
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  dndEnabled: boolean; // Do Not Disturb
  desktopNotifications: boolean; // Enable OS native notifications
}
```

### Main Process (`main/index.ts`)

#### Responsibilities
- **Persistence**: Store notifications and settings using `context.storage`.
- **Management**: Add, update, delete, and retrieve notifications.
- **Filtering & Grouping**: Logic to handle deduplication and rate limiting (can be done on ingestion).
- **IPC Handling**: Serve requests from the renderer and other plugins.
- **Native Notifications**: Trigger OS-level notifications for high-priority items.

#### IPC Channels
- **Input**:
  - `notification:send` (payload: `Partial<Notification>`): entry point for other plugins.
- **Renderer Requests**:
  - `notifications:list` (params: filter options): returns `Notification[]`.
  - `notifications:markRead` (params: `{ id: string }` | `{ ids: string[] }`): marks as read.
  - `notifications:markAllRead`: marks all as read.
  - `notifications:delete` (params: `{ id: string }` | `{ ids: string[] }`): deletes notifications.
  - `notifications:clear`: deletes all notifications.
  - `notifications:getSettings`: returns `NotificationSettings`.
  - `notifications:updateSettings` (payload: `Partial<NotificationSettings>`): updates settings.
- **Output (Broadcast)**:
  - `notification:new` (payload: `Notification`): sent when a new notification is added.
  - `notification:update` (payload: `Notification`): sent when a notification is modified (e.g., read status).
  - `notification:removed` (payload: `{ id: string }`): sent when a notification is deleted.
  - `notifications:settingsUpdated` (payload: `NotificationSettings`): sent when settings change.

### Renderer Process (`renderer/index.tsx`)

#### Components
1.  **NotificationProvider**: Context provider managing local state and IPC listeners.
2.  **NotificationCenterButton**: Sidebar icon with an unread badge counter.
3.  **NotificationPanel**: Main view.
    -   **Header**: Title, "Mark All Read", "Clear All", Settings toggle.
    -   **FilterBar**: Filter by category or type.
    -   **NotificationList**: Scrollable list of `NotificationItem`s.
        -   **NotificationItem**: Displays individual notification.
            -   Visual indicator for type/priority.
            -   Collapsible body for long messages.
            -   Action buttons.
            -   Time relative (e.g., "5 mins ago").
4.  **ToastManager**: Handles transient popups for new notifications (unless DND is on).
5.  **SettingsPanel**: Configuration for sound, DND, history size.

#### Features
-   **Audio**: Play sound on new notification (throttled).
-   **Toast**: Show toast for X seconds. Urgent notifications might stay until dismissed.
-   **Grouping**: Visually group notifications from the same source if they arrive in close succession (optional UI enhancement).

### Shared Types
- Import `PluginContext` from `@alephnet/shared/types` (or equivalent) instead of local definition.

## Implementation Plan

1.  **Type Definitions**: Define `Notification`, `NotificationSettings` in a shared file or top of `main/index.ts`.
2.  **Main Process Overhaul**:
    -   Implement `StorageService` wrapper or use `context.storage` directly.
    -   Implement `NotificationManager` class to handle logic.
    -   Implement IPC handlers.
    -   Add `notification:send` listener.
3.  **Renderer Overhaul**:
    -   Create `NotificationContext`.
    -   Build `Toast` system.
    -   Build `NotificationPanel` with filtering and actions.
    -   Update `NotificationCenterButton` with badge.
4.  **Integration**:
    -   Test sending notifications from another plugin (mocked).
    -   Verify persistence.

## Testing Strategy
-   **Unit Tests**: Test `NotificationManager` logic (add, limit, dedupe).
-   **Integration Tests**: Mock `ipcMain` and `ipcRenderer` to test flow.
