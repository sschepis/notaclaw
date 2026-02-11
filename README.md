# AlephNet-Integrated Durable Agent Mesh (notaclaw)

**A paradigm shift in distributed intelligence.**

"notaclaw" is an electron-based **Resonant Terminal** that combines **Gun.js**'s offline-first durability with **AlephNet**'s semantic-aware Global Memory Field (GMF). It is designed to be a durable, decentralized platform for AI agents, semantic memory, and secure peer-to-peer collaboration.

## 🌟 Core Concepts

### Dual-Stack Node
Every node in the mesh runs two parallel layers:
*   **Gun.js Layer**: Handles "physical" data replication, cryptographic identity (SEA), and offline-first storage.
*   **AlephNet DSNNode Layer**: Handles "semantic" computing, SRIA (Self-Reflective Intelligent Agent) reasoning, and global consensus.

### Cellular Extensions (Plugins)
The application is built on a biological "cellular" plugin architecture. Plugins are self-contained units that project capabilities from the backend to the frontend:
*   **Sandboxed Execution**: Plugins run with restricted permissions for security.
*   **UI Slots**: Plugins can inject components into predefined locations (Sidebar, Inspector, Chat, etc.).
*   **IPC Channels**: Secure, namespaced communication between main and renderer processes.

### Prime-Resonance
Identity and routing are based on semantic resonance rather than just addressability:
*   **SMF Vectors**: 16-dimensional semantic field representation.
*   **Trust Evaluation**: Coherence-based trust scoring.
*   **Memory Fields**: Hierarchical semantic storage (Global → User → Conversation).

### Memory Promotion & Persistence
Memories flow from transient conversation context into durable user-level storage:
*   **Explicit Promotion**: Users or the AI can request "remember this" to persist data to user long-term memory.
*   **Implicit Promotion**: Pattern-based detection automatically promotes skill configurations, user preferences, identity information, factual context, and recurring workflows.
*   **Skill Config Persistence**: Skill settings are stored as typed JSON fragments in user memory fields, surviving across conversations.
*   **Conversation Folding**: Significant fragments from a conversation memory field can be consolidated into user long-term memory when a conversation is archived.

### Conversation Session Serialization
Conversations persist across application restarts:
*   **Progressive Session Saving**: Active and open conversation IDs are saved on every state change (create, switch, close, delete, message).
*   **Startup Restoration**: Previously open conversations and the active tab are automatically restored when the app launches.
*   **File-Based Persistence**: Session state is stored as JSON in Electron's `userData` directory for reliability.

## 🚧 Project Status

**Current Status: Alpha / Active Development**

This project is currently in the **Alpha** phase. Core architectures (Dual-Stack Node, Plugin System, Memory Promotion, Conversation Persistence) are in place, but many features are still under active development.

Please refer to **[TASKS.md](docs/TASKS.md)** for a detailed roadmap and current implementation status.

## 📂 Directory Structure

*   `client/`: The Electron/React frontend application.
    *   `src/main/`: Backend logic (Main Process).
        *   `services/`: Core services including `ConversationManager`, `MemoryPromotionService`, `AIProviderManager`, `PluginManager`, etc.
    *   `src/renderer/`: Frontend UI (Renderer Process).
        *   `store/`: Zustand state management with slice pattern (`conversationSlice`, etc.).
        *   `components/`: React components organized by feature (conversation, memory, settings, layout).
    *   `src/preload/`: Secure IPC bridge between Main and Renderer.
    *   `src/shared/`: Shared type definitions and API contracts.
*   `src/`: Core backend services and shared logic (headless mode).
*   `plugins/`: Built-in core plugins.
*   `plugins-extended/`: Extended and experimental plugins.
*   `vscode/`: VSCode extension for remote agent pairing.
*   `docs/`: Comprehensive documentation.
*   `design/`: Design documents and specifications.
*   `client/personalities/`: JSON definitions for AI agent personalities.

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| **AI Conversations** | Multi-turn chat with context, attachments, and multi-provider support. Conversations persist across restarts. |
| **Memory Fields** | Semantic memory with scoping (global/user/conversation), entropy tracking, and holographic recall. |
| **Memory Promotion** | Explicit and implicit promotion of conversation memories to user long-term storage. |
| **Skill Config Persistence** | Skill configurations stored in user memory fields, available across all conversations. |
| **Conversation Serialization** | Progressive session state saving with automatic startup restoration of open conversations. |
| **Decentralized Social** | Peer-to-peer messaging, friends, and coherence-based trust networks. |
| **Plugin System** | Extensible architecture allowing developers to add new capabilities via UI slots and IPC channels. |
| **Multi-Provider AI** | Support for OpenAI, Anthropic, Google, and local/browser-based inference (WebLLM). |
| **Prompt Engine** | Sophisticated workflow management for AI tasks, including state management, tool integration, and structured I/O. |
| **Scheduled Tasks** | Cron-based AI automation and workflow management. |
| **VSCode Integration** | Remote agent pairing and control via VSCode extension. |

## 🛠️ Getting Started

### Prerequisites
*   Node.js (v20+ recommended)
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/sschepis/notaclaw.git
    cd notaclaw
    ```

2.  **Install dependencies**
    This project uses a root-level package for the backend and a nested `client` package for the frontend.
    ```bash
    npm install
    cd client
    npm install
    ```

3.  **Start the application**
    From the `client` directory:
    ```bash
    npm start
    ```

### Building

To build a release package (macOS DMG + ZIP):
```bash
cd client
npm run build
```

Release artifacts will be placed in `client/release/`.

### Development

For development with hot-reload:
```bash
cd client
npm run dev
```

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:

*   **[User Guide](docs/user-guide/01-getting-started.md)**: Installation, onboarding, and usage.
*   **[Developer Guide](docs/developer-guide/01-architecture.md)**: Architecture, plugin development, and API reference.
*   **[AlephNet Interfaces](docs/ALEPHNET_INTERFACES.md)**: Comprehensive list of IPC channels and data types.
*   **[Memory Fields](docs/user-guide/05-memory-fields.md)**: How memory fields work, including promotion and persistence.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Application                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │    Main Process     │  │      Renderer Process       │  │
│  │  ┌───────────────┐  │  │  ┌───────────────────────┐  │  │
│  │  │PluginManager  │  │  │  │   React Application   │  │  │
│  │  │AIProviderMgr  │◄─┼──┼─►│   PluginLoader        │  │  │
│  │  │ConversationMgr│  │  │  │   SlotRegistry        │  │  │
│  │  │MemoryPromotion│  │  │  │   WebLLMService       │  │  │
│  │  │TaskScheduler  │  │  │  │   Zustand Store        │  │  │
│  │  └───────────────┘  │  │  └───────────────────────┘  │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Plugin Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │canvas-viz│ │voice-ste │ │theme-std │ │swarm-control│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    AlephNet Layer                            │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │     Gun.js       │  │        DSNNode               │    │
│  │  (Graph Sync)    │◄─┼─►│  (Semantic Computing)    │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Memory Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Promotion Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Conversation Memory Field                                   │
│  ┌─────────────────────────────────────────┐                │
│  │  fragments: messages, context, insights │                │
│  │  scope: 'conversation'                  │                │
│  └──────────────┬──────────────────────────┘                │
│                 │                                            │
│       ┌─────────┴─────────┐                                 │
│       │                   │                                  │
│   Explicit            Implicit                               │
│   "remember this"     pattern detection                      │
│       │               (skill_config,                         │
│       │                user_preference,                      │
│       │                identity, etc.)                       │
│       │                   │                                  │
│       └─────────┬─────────┘                                 │
│                 │                                            │
│                 ▼                                            │
│  User Long-Term Memory Field                                │
│  ┌─────────────────────────────────────────┐                │
│  │  fragments: preferences, skill configs, │                │
│  │             knowledge, workflows        │                │
│  │  scope: 'user'                          │                │
│  │  persists across ALL conversations      │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Session State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Session State Serialization                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Actions ──► conversationSlice ──► saveSessionState()  │
│  (create, switch,   (Zustand store)      (IPC to Main)      │
│   close, delete,                              │              │
│   add message)                                ▼              │
│                                     conversation-session.json│
│                                     (userData directory)     │
│                                                              │
│  App Startup ──► loadConversations() ──► restoreSessionState│
│                    (GunDB)                (read JSON, rebuild│
│                                           tabs & active ID)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Included Plugins

The application comes with a rich ecosystem of built-in plugins, categorized by function:

### 🧠 AI & Intelligence
*   **Resonant Agent**: Core agent behaviors and personality management.
*   **Thought Stream Debugger**: Visualize and inspect the agent's reasoning process.
*   **Code Interpreter**: Execute code safely within the agent's context.
*   **Federated Trainer**: Distributed AI model training.
*   **OpenClaw Skills**: Manage, create, and share skills in the OpenClaw standard format.
*   **Prime Tuner**: Fine-tune agent parameters and behaviors.
*   **Voice Suite**: Unified voice capabilities including Text-to-Speech, Speech-to-Text, and Voice Cloning (ElevenLabs/OpenAI).

### 💬 Communication & Social
*   **Entangled Chat**: Secure, distributed chat capabilities.
*   **Secure Comms**: Encrypted peer-to-peer communication channels.
*   **Social Mirror**: Identity and reputation management across the mesh.

### 📚 Data & Knowledge
*   **Knowledge Graph**: Visualize and query semantic relationships.
*   **Semantic Search**: Meaning-based search across all data.
*   **Document Reader**: Ingest and process various document formats.
*   **Data Osmosis**: Intelligent data synchronization and import/export.

### 🎨 Visualization & UI
*   **AutoDash**: Generative UI dashboard for dynamic agent interfaces.
*   **Canvas Viz**: Interactive data visualization canvas.
*   **Network Visualizer**: 3D visualization of the mesh network.
*   **Semantic Whiteboard**: Collaborative visual thinking space.
*   **HTML Artifacts**: Render and interact with HTML content generated by agents.
*   **Theme Studio**: Advanced UI customization and theming engine.

### 💰 Economy & Governance
*   **Wallet**: Manage digital assets and tokens.
*   **DegenTrader**: Automated trading and market analysis tools.
*   **Governance**: DAO-like voting and proposal mechanisms.
*   **Marketplace**: Buy and sell plugins, skills, and data.
*   **Reputation Manager**: Track and manage trust scores within the network.

### 🔗 Integration & Connectivity
*   **API Gateway**: Connect to external APIs and services.
*   **IoT Resonance Bridge**: Interface with IoT devices and sensors.
*   **OpenClaw Gateway**: Gateway for OpenClaw distributed compute delegation.
*   **VSCode Control**: Integration for controlling VSCode instances with agent pairing.

### ⚙️ Workflow & Automation
*   **Workflow Weaver**: Visual workflow builder and automation engine.
*   **Swarm Controller**: Coordinate multiple agents for complex tasks.
*   **Software Factory**: Automated code generation and project scaffolding.
*   **Temporal Voyager**: Time-based task scheduling and execution.

### 🛡️ Core & System
*   **Agent Essentials**: Fundamental agent capabilities.
*   **Secrets Manager**: Secure credential storage.
*   **Secure Backup**: Encrypted backup and recovery.
*   **Notification Center**: Centralized system notifications.
*   **Coherence Monitor**: System health and network stability monitoring.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) (if available) or check the `docs/TASKS.md` file for current priorities.

## 📄 License

This project is licensed under the ISC License.
