# AlephNet-Integrated Durable Agent Mesh

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

The application ships with **40+ plugins** across core (`plugins/`) and extended (`plugins-extended/`) directories:

### 🧠 AI & Intelligence
| Plugin | Description |
|--------|-------------|
| **Resonant Agent** | Semantic Resonance Engine and SRIA Agent implementation. |
| **Thought Stream Debugger** | Advanced observability tool for inspecting agent execution traces, memory access, and resonance scores. |
| **Code Interpreter** | Secure sandboxed environment for code execution. |
| **Federated Trainer** | Orchestrates distributed training rounds for fine-tuning SLMs across the mesh without sharing raw data. |
| **OpenClaw Skills** | Manage, create, and share skills in the OpenClaw standard format. |
| **Prime Tuner** | Diagnostic tool to visualize and tune Prime-Resonant frequencies. |
| **Voice Suite** | Comprehensive voice interface combining ElevenLabs and OpenAI capabilities for TTS, STT, and voice cloning. |

### 💬 Communication & Social
| Plugin | Description |
|--------|-------------|
| **Entangled Chat** | Non-local, resonance-based communication system using prime entanglement protocols. |
| **Secure Comms** | Encrypted peer-to-peer messaging and private rooms. |
| **Social Mirror** | Ingests social graphs and content from Farcaster, Lens, and Twitter into the Global Memory Field. |

### 📚 Data & Knowledge
| Plugin | Description |
|--------|-------------|
| **Knowledge Graph** | Semantic knowledge graph for storing and querying entities, relationships, and concepts. Enables AI-powered knowledge management and traversal. |
| **Semantic Search** | Deep semantic search capabilities using GMF vectors for content similarity matching and retrieval. Index and search content by meaning, not just keywords. |
| **Document Reader** | Advanced document ingestion and semantic indexing. |
| **Data Osmosis** | Universal data connector for ingesting external data sources into the AlephNet Semantic Graph. |

### 🎨 Visualization & UI
| Plugin | Description |
|--------|-------------|
| **AutoDash** | A generative runtime dashboard that updates dynamically based on context. |
| **Canvas Viz** | Renders interactive HTML5 Canvas visualizations inline in chat. Supports ```canvas and ```viz fence blocks with sandboxed execution, edit/view source toggle, and AI skill integration. |
| **Network Visualizer** | Visualizes the DSN mesh topology and semantic routing paths. |
| **Semantic Whiteboard** | Real-time collaborative canvas where humans and agents co-create mind maps, diagrams, and notes. |
| **HTML Artifacts** | Generate, preview, and edit HTML/React artifacts. |
| **Theme Studio** | Advanced UI customization and theming. |

### 💰 Economy & Governance
| Plugin | Description |
|--------|-------------|
| **Wallet** | Manages identity, Aleph Token (ℵ) balance, staking, and transactions. |
| **DegenTrader** | Multi-chain crypto trading bot with AI-driven strategies and learning capabilities. |
| **Governance** | Participation in decentralized governance, voting, and coherence claims. |
| **Marketplace** | Discovery and subscription management for SRIA services. |
| **Reputation Manager** | Visualizes and manages Web of Trust and reputation scores. |

### 🔗 Integration & Connectivity
| Plugin | Description |
|--------|-------------|
| **API Gateway** | Exposes agent capabilities via local REST/WebSocket API. |
| **IoT Resonance Bridge** | Connects the Semantic Mesh to the physical world via Home Assistant and Matter integration. |
| **OpenClaw Gateway** | Gateway service to connect AlephNet with OpenClaw nodes for distributed compute delegation. |
| **VSCode Control** | Control VS Code via WebSocket for remote agent pairing and development collaboration. |

### ⚙️ Workflow & Automation
| Plugin | Description |
|--------|-------------|
| **Workflow Weaver** | Visual orchestration engine for chaining agents, tools, and semantic queries into reusable workflows. |
| **Swarm Controller** | Orchestration tool for managing multiple DSN nodes. |
| **Software Factory** | Automated code generation and project scaffolding. |
| **Temporal Voyager** | Time-travel debugging and simulation tool leveraging Gun.js history for agent state replay. |

### 🛡️ Core & System
| Plugin | Description |
|--------|-------------|
| **Agent Essentials** | Standard tools for the SRIA agent (Filesystem, Web Search, System Info). |
| **Secrets Manager** | Securely manage API keys and secrets. |
| **Secure Backup** | Automated, encrypted backups of local graph and identity. |
| **Notification Center** | Centralized hub for system alerts and notifications. |
| **Coherence Monitor** | Visualizes Free Energy minimization and node coherence. |
| **Hello World** | A basic Hello World plugin demonstrating structure and capabilities. |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) (if available) or check the `docs/TASKS.md` file for current priorities.

## 📄 License

This project is licensed under the ISC License.
