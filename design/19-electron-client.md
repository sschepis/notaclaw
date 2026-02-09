# Electron Client Design: The "Resonant Terminal"

This document outlines the design for the official standalone client for the AlephNet-Gun Mesh. This client acts as a "Resonant Terminal," providing a rich, semantic-aware interface to the network.

## 1. Architectural Overview

The client is built on **Electron**, leveraging its ability to run a full Node.js environment (Main Process) alongside a modern web frontend (Renderer Process). This fits the "Unified Node" architecture perfectly, allowing the client to run a full `DSNNode` instance locally rather than relying solely on a remote gateway.

### High-Level Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELECTRON APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐       ┌─────────────────────────────┐  │
│  │   RENDERER PROCESS  │       │       MAIN PROCESS          │  │
│  │   (React / UI)      │  IPC  │       (Node.js)             │  │
│  │  ─────────────────  │◄─────►│  ─────────────────────────  │  │
│  │  • Visual Interface │       │  • DSNNode (Full Peer)      │  │
│  │  • State (Zustand)  │       │  • Gun.js (Local Storage)   │  │
│  │  • Visualization    │       │  • KeyTriplet Management    │  │
│  │  • User Input       │       │  • Local LLM (Optional)     │  │
│  └─────────────────────┘       └─────────────────────────────┘  │
│                                               ▲                 │
│                                               │ P2P / WebSocket │
└───────────────────────────────────────────────┼─────────────────┘
                                                ▼
                                     ALEPHNET MESH NETWORK
```

## 2. Process Responsibilities

### 2.1 Main Process (The "Engine")
The Main Process hosts the actual **AlephNet DSNNode**. It is responsible for:
*   **Network Connectivity**: Managing Gun.js peer connections and AlephNet mesh joining.
*   **Data Persistence**: Writing graph data to the local file system (Radix storage).
*   **Identity Management**: Securely storing the `KeyTriplet` (encrypted at rest).
*   **Semantic Processing**: Running heavy SMF calculations or local embedding generation if configured.
*   **Local Services**: Exposing local folders or tools to the mesh (if permitted by user).

### 2.2 Renderer Process (The "Terminal")
The Renderer Process is the **Visual Interface**. It is responsible for:
*   **Conversation UI**: Chat interface with rich media support.
*   **Semantic Visualization**: Visualizing the "Resonance" of content (e.g., glowing borders based on SMF axes).
*   **State Management**: Reacting to state changes pushed from the Main process.
*   **Tool Approval**: Prompting the user when the Agent requesting permission to execute a local tool.

### 2.3 IPC Bridge (The "Synapse")
Communication happens via a strictly typed `ContextBridge`.
*   **Events (Main -> Renderer)**: `onMessage`, `onResonanceChange`, `onAgentStateChange`.
*   **Actions (Renderer -> Main)**: `sendMessage`, `approveTool`, `summonAgent`, `stakeTokens`.

## 3. User Interface Design

### 3.1 Layout Structure
The UI follows a "Three-Pane" layout optimized for information density and context.

| Section | Width | Function |
|---------|-------|----------|
| **Nav Rail** | 60px | Account, Settings, Network Status, Mode Switcher (Chat/Canvas) |
| **Sidebar** | 250px | Conversation History, Active Agents, Pinned Contexts |
| **Stage** | Flex | Main interaction area (Chat stream or Infinite Canvas) |
| **Inspector** | 300px | (Collapsible) Semantic Details, SMF Visualization, Tool Logs, Wallet |

### 3.2 Key UI Components

#### A. The "Input Deck"
Not just a text box. The input area allows:
*   **Mode Selection**: "Chat", "Task", "Proposal".
*   **Resonance Tuning**: Sliders to adjust the "intent" (e.g., boost "Cognitive" axis).
*   **Attachment**: Drag-and-drop files (processed locally into SMF).

#### B. Semantic Message Bubbles
Messages are decorated based on their SMF classification:
*   **Perceptual (Blue)**: Observations, data.
*   **Cognitive (Violet)**: Reasoning, analysis.
*   **Temporal (Green)**: Plans, history.
*   **Meta (Gold)**: Governance, payments.

#### C. The "Agent HUD"
When an SRIA agent is active, a HUD element shows:
*   **Current State**: Perceiving / Deciding / Acting.
*   **Free Energy**: A graph showing the agent's uncertainty reducing over time.
*   **Thought Buffer**: Real-time streaming of the agent's internal monologue (if visible).

## 4. Technical Stack

*   **Framework**: Electron (latest stable)
*   **Frontend**: React + Vite
*   **State**: Zustand (with IPC sync middleware)
*   **Styling**: TailwindCSS + Framer Motion (for resonance animations)
*   **Visualization**: D3.js or Recharts (for SMF radar charts)
*   **Local DB**: Gun.js (running in Main, synced via hooks)

## 5. Security Model

### 5.1 Wallet Security
*   **Encrypted Storage**: The `KeyTriplet` is stored in the OS Keychain (Mac) or Credential Locker (Windows).
*   **Signing**: All signing happens in the Main process; keys never touch the Renderer.
*   **Approval**: Critical actions (payments, staking) require explicit user confirmation in the UI (Modal).

### 5.2 Tool Sandboxing
*   **Local Tools**: Tools that access the file system or hardware must be whitelisted.
*   **Remote Tools**: Tools executed by the agent on the server are verified via coherence proofs.

## 6. Implementation Plan

### Phase 1: Foundation
*   Setup Electron boilerplate with Typescript.
*   Integrate `DSNNode` into Main process.
*   Establish basic IPC for graph synchronization.

### Phase 2: Core UI
*   Implement 3-pane layout.
*   Build Chat interface with virtualized list (for performance).
*   Connect Input Deck to Gun.js writes.

### Phase 3: Semantic Features
*   Implement SMF visualization (Radar charts).
*   Add Agent HUD to visualize SRIA state.
*   Integrate Wallet UI for token display.

### Phase 4: Advanced
*   Local Embedding Service (using ONNX runtime in Main).
*   Offline-first queue management.
