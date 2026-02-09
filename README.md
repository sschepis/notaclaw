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

## 🚧 Project Status

**Current Status: Alpha / Active Development**

This project is currently in the **Alpha** phase. Core architectures (Dual-Stack Node, Plugin System) are in place, but many features are still under active development.

Please refer to **[TASKS.md](docs/TASKS.md)** for a detailed roadmap and current implementation status.

## 📂 Directory Structure

*   `client/`: The Electron/React frontend application.
    *   `src/main/`: Backend logic (Main Process).
    *   `src/renderer/`: Frontend UI (Renderer Process).
    *   `src/preload/`: Secure bridge between Main and Renderer.
*   `src/`: Core backend services and shared logic.
*   `plugins/`: Built-in and example plugins.
*   `docs/`: Comprehensive documentation.
*   `personalities/`: JSON definitions for AI agent personalities.

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| **AI Conversations** | Multi-turn chat with context, attachments, and multi-provider support. |
| **Memory Fields** | Semantic memory with scoping, entropy tracking, and holographic recall. |
| **Decentralized Social** | Peer-to-peer messaging, friends, and coherence-based trust networks. |
| **Plugin System** | Extensible architecture allowing developers to add new capabilities. |
| **Multi-Provider AI** | Support for OpenAI, Anthropic, Google, and local/browser-based inference (WebLLM). |
| **Prompt Engine** | Sophisticated workflow management for AI tasks, including state management, tool integration, and structured I/O. |
| **Scheduled Tasks** | Cron-based AI automation and workflow management. |

## 🛠️ Getting Started

### Prerequisites
*   Node.js (v20+ recommended)
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd notaclaw
    ```

2.  **Install dependencies**
    This project uses a root-level package for the backend and a nested `client` package for the frontend.
    ```bash
    npm install
    cd client
    npm install
    cd ..
    ```

3.  **Start the application**
    ```bash
    npm start
    ```

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:

*   **[User Guide](docs/user-guide/01-getting-started.md)**: Installation, onboarding, and usage.
*   **[Developer Guide](docs/developer-guide/01-architecture.md)**: Architecture, plugin development, and API reference.
*   **[AlephNet Interfaces](docs/ALEPHNET_INTERFACES.md)**: Comprehensive list of IPC channels and data types.

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
│  │  │MemoryService  │  │  │  │   SlotRegistry        │  │  │
│  │  │TaskScheduler  │  │  │  │   WebLLMService       │  │  │
│  │  └───────────────┘  │  │  └───────────────────────┘  │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Plugin Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │canvas-viz│ │elevenvox │ │theme-std │ │swarm-control│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    AlephNet Layer                            │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │     Gun.js       │  │        DSNNode               │    │
│  │  (Graph Sync)    │◄─┼─►│  (Semantic Computing)    │    │
│  └──────────────────┘  └──────────────────────────────┘    │
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
*   **Voice Interface / Symphony**: Voice interaction capabilities.
*   **ElevenVoices**: Integration with ElevenLabs for high-quality TTS and voice cloning.

### 💬 Communication & Social
*   **Entangled Chat**: Secure, distributed chat capabilities.
*   **Secure Comms**: Encrypted peer-to-peer communication channels.
*   **Social Mirror**: Identity and reputation management across the mesh.

### 📚 Data & Knowledge
*   **Quantum Vault**: Secure, encrypted data storage.
*   **Knowledge Graph**: Visualize and query semantic relationships.
*   **Semantic Search**: Meaning-based search across all data.
*   **Document Reader**: Ingest and process various document formats.
*   **Data Osmosis**: Intelligent data synchronization and import/export.

### 🎨 Visualization & UI
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
*   **MCP Support**: Support for the Model Context Protocol.

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
