# User Session Interface Design: The "Neural Link"

This document outlines the design for the User Session Interface, enabling AI agents to perceive and interact with the host operating system.

## 1. Architectural Decision: Native Integration vs. VNC

### The Proposal
The initial proposal considered running a VNC server on the host and connecting via an AI-controlled VNC client.

### The Recommendation: Native Direct Link
We have chosen a **Native "Direct Link" Architecture** over VNC. This leverages Electron's privileged access to the host OS (Main Process) to provide vision and control directly.

| Feature | VNC Server Approach | Native Electron Approach |
| :--- | :--- | :--- |
| **Architecture** | Separate binary; TCP connection. | Built-in APIs + Native Node modules. |
| **Performance** | High latency (Encode -> Network -> Decode). | Zero-copy / Low latency. |
| **Security** | Opens network ports; Firewall risks. | No open ports; OS-level permissions. |
| **UX** | "Remote Desktop" feel. | Integrated "Co-pilot" feel. |

## 2. System Architecture

The system consists of three core components:

### 2.1 The Eye (Vision)
Uses Electron's `desktopCapturer` API to retrieve visual state.
*   **On-Demand Snapshots**: Agents request frames only when needed, reducing CPU overhead compared to continuous streaming.
*   **Context Awareness**: Can capture specific windows or the entire screen.

### 2.2 The Hand (Actuation)
Uses a native node library (e.g., `@nut-tree/nut-js`) running in the Main Process.
*   **Capabilities**: Mouse movement, clicking, dragging, keyboard input.
*   **Verification**: Can use computer vision to verify that an action had the intended effect (e.g., "Did the menu open?").

### 2.3 The Cortex (Session Manager)
A new service `SessionManager` in the Main Process orchestrates the interaction.
*   **State Machine**: Manages states (`IDLE`, `OBSERVING`, `ACTING`, `LOCKED`).
*   **Security Gating**: Enforces user permissions before executing actions.

## 3. Security & Trust Model

The primary design goal is **User Agency**. The AI is a guest, not the owner.

### 3.1 The "Dead Man's Switch"
*   **Global Hotkey**: A system-wide shortcut (e.g., `Cmd+Esc`) immediately severs the link, halting all AI input.
*   **Visual Border**: When the AI is active, a high-contrast border (e.g., Neon Orange) renders around the capture area.

### 3.2 Permission Levels
1.  **Sovereign (Manual)**: AI proposes an action; User must explicitly approve it in the UI.
2.  **Autonomous (Scoped)**: User grants permission for a specific duration or task (e.g., "Fix this form for the next 5 minutes").

## 4. User Interface Design

### 4.1 Uplink Status Bar
A persistent indicator in the application window.
*   **Icon**: Changes state (Eye = Observing, Cursor = Moving).
*   **Preview**: Small thumbnail showing the AI's current field of view.

### 4.2 Action Log
A scrolling log providing transparency.
```text
[10:01:23] 👁️ Scanned screen (1920x1080)
[10:01:25] 🧠 Identified target: "Submit Button" at (800, 600)
[10:01:26] 🖱️ Moving mouse to (800, 600)
```

## 5. Implementation Strategy

### 5.1 Dependencies
*   `electron` (Built-in): For `desktopCapturer`.
*   `@nut-tree/nut-js`: For cross-platform input simulation.

### 5.2 Service Structure (`client/src/main/services/SessionManager.ts`)

```typescript
export class SessionManager {
  // Capture screen content
  async getSnapshot(): Promise<string> { ... }

  // Execute physical input
  async executeAction(action: Action): Promise<Result> { ... }
  
  // Security check
  private validateRequest(action: Action): boolean { ... }
}
```

### 5.3 IPC Protocol
*   `session:start`: Initiate a controlled session.
*   `session:stop`: Emergency halt.
*   `session:snapshot`: Request visual context.
*   `session:act`: Request physical interaction.
