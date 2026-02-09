# Implementation Spec: Session Security ("Neural Link")

## 1. Overview
This specification details the security enhancements for the `SessionManager`, focusing on user agency and safety. This involves implementing the "Dead Man's Switch" (global hotkey kill switch), the "Visual Border" (indicating active observation), and the `validateRequest` gating logic.

## 2. Security Features

### 2.1 Dead Man's Switch
*   **Mechanism**: A global system-wide hotkey (`Command+Escape` or `Ctrl+Escape`) that immediately transitions the session state to `IDLE` or `LOCKED`.
*   **Implementation**: Use `globalShortcut` from Electron in the Main process.
*   **Behavior**:
    1.  User presses hotkey.
    2.  `SessionManager` sets `state = LOCKED`.
    3.  Any pending `executeAction` calls are rejected.
    4.  UI is notified to show a "Session Terminated" alert.

### 2.2 Visual Border
*   **Mechanism**: A transparent, click-through overlay window that draws a high-contrast border around the screen when the session is `OBSERVING` or `ACTING`.
*   **Implementation**:
    *   Create a dedicated `BrowserWindow` in `SessionManager`.
    *   Properties: `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`, `focusable: false`.
    *   Content: A CSS border (`border: 5px solid #ff00ff`).
    *   Lifecycle: Show when session starts, hide when session stops.

### 2.3 Request Validation (`validateRequest`)
*   **Mechanism**: A filter that checks every action before execution.
*   **Policies**:
    *   **Coordinates**: Ensure clicks are within screen bounds.
    *   **Blacklist**: Prevent clicking on specific protected areas (e.g., OS system settings) - *Future Scope*.
    *   **Rate Limit**: Prevent rapid-fire clicks (e.g., > 10 clicks/sec).
    *   **User Confirmation**: If `securityLevel` is `HIGH`, require an explicit user approval dialog for every action (via IPC to Renderer).

## 3. Updated SessionManager (`client/src/main/services/SessionManager.ts`)

```typescript
export class SessionManager {
  private overlayWindow: BrowserWindow | null = null;
  private securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

  // ... existing methods ...

  private setupOverlay() {
    // Create click-through window
  }

  private registerGlobalShortcuts() {
    globalShortcut.register('CommandOrControl+Escape', () => {
      this.emergencyStop();
    });
  }

  public async executeAction(action: SessionAction): Promise<boolean> {
    if (!this.validateRequest(action)) return false;
    // ... execution ...
  }

  private validateRequest(action: Action): boolean {
    if (this.state === 'LOCKED') return false;
    // Check rate limits
    // Check bounds
    return true;
  }
}
```

## 4. Implementation Plan

1.  **Update `SessionManager`**:
    *   Import `globalShortcut` and `BrowserWindow`.
    *   Implement `setupOverlay()` and `toggleOverlay(visible: boolean)`.
    *   Implement `registerGlobalShortcuts()`.
    *   Implement `validateRequest()`.
2.  **Update `App.tsx` / `Sidebar`**:
    *   Add a visual indicator of the session state (e.g., an icon in the status bar).
