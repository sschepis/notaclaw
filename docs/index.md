# AlephNet-Integrated Durable Agent Mesh Documentation

Welcome to the documentation for the **AlephNet-Integrated Durable Agent Mesh** (codenamed "notaclaw"). This application represents a paradigm shift in distributed intelligence, combining Gun.js's offline-first durability with AlephNet's semantic-aware Global Memory Field (GMF).

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd notaclaw
npm install && cd client && npm install && cd ..

# Start the application
npm start
```

See [Getting Started](./user-guide/01-getting-started.md) for detailed setup instructions.

## Documentation Sections

### [User's Guide](./user-guide/01-getting-started.md)
For end-users who want to install, run, and use the application.

*   **[Getting Started](./user-guide/01-getting-started.md)**: Installation, onboarding, and initial setup
*   **[Interface Overview](./user-guide/02-interface.md)**: Understanding the NavRail, Sidebar, Stage, Inspector, and more
*   **[Managing Plugins](./user-guide/03-managing-plugins.md)**: How to extend your agent's capabilities
*   **[AI Providers](./user-guide/04-ai-providers.md)**: Configuring AI backends (OpenAI, Anthropic, etc.)
*   **[Memory Fields](./user-guide/05-memory-fields.md)**: Understanding semantic memory storage
*   **[Scheduled Tasks](./user-guide/06-scheduled-tasks.md)**: Automating AI workflows

### [Developer's Guide](./developer-guide/01-architecture.md)
For developers who want to build plugins or contribute to the core.

*   **[Architecture](./developer-guide/01-architecture.md)**: Deep dive into the Dual-Stack Node and Plugin System
*   **[Plugin Structure](./developer-guide/02-plugin-structure.md)**: How plugins are organized
*   **[Backend Development](./developer-guide/03-backend-development.md)**: Writing Main process logic
*   **[Frontend Development](./developer-guide/04-frontend-development.md)**: Creating React components for the UI
*   **[IPC Communication](./developer-guide/05-ipc-communication.md)**: Bridging the gap between Main and Renderer
*   **[Tutorial: First Plugin](./developer-guide/06-tutorial-first-plugin.md)**: A step-by-step "Hello World"

### [Reference](./reference/01-manifest.md)
Technical specifications and API documentation.

*   **[Manifest Schema](./reference/01-manifest.md)**: The `manifest.json` specification
*   **[API Reference](./reference/02-api.md)**: Complete PluginContext and UIExtensionAPI documentation

## Core Concepts

### Dual-Stack Node
Each node in the mesh runs two parallel layers:
- **Gun.js Layer**: Data replication, cryptographic identity (SEA), and offline-first storage
- **AlephNet DSNNode Layer**: Semantic indexing, agentic reasoning (SRIA), and global consensus

### Cellular Extensions
Plugins are self-contained units that project capabilities from the backend to the frontend:
- **Sandboxed Execution**: Plugins run with restricted permissions
- **UI Slots**: Inject components into predefined locations
- **IPC Channels**: Secure namespaced communication

### Prime-Resonance
Identity and routing are based on semantic resonance, not just addressability:
- **SMF Vectors**: 16-dimensional semantic field representation
- **Trust Evaluation**: Coherence-based trust scoring
- **Memory Fields**: Hierarchical semantic storage (Global → User → Conversation)

### Multi-Provider AI
Flexible AI backend configuration:
- **Cloud Providers**: OpenAI, Anthropic, Google, OpenRouter
- **Local Models**: Ollama, LM Studio
- **Browser Inference**: WebLLM for offline operation
- **Routing Rules**: Automatic provider selection based on content type

## Key Features

| Feature | Description |
|---------|-------------|
| **AI Conversations** | Multi-turn chat with context and attachments |
| **Memory Fields** | Semantic memory with scoping and entropy tracking |
| **Groups & Feeds** | Decentralized social features |
| **Connections** | Peer-to-peer friend system |
| **Scheduled Tasks** | Cron-based AI automation |
| **Plugin System** | Extensible architecture with UI slots |
| **Multiple AI Providers** | Cloud, local, and browser inference |

## Architecture Overview

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

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0-alpha | 2024 | Initial release with core features |

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the project.

## License

This project is licensed under [LICENSE](../LICENSE).
