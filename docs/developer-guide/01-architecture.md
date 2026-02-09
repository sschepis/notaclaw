# Architecture Overview

The AlephNet-Integrated Durable Agent Mesh is built on a **Dual-Stack** architecture, combining the distributed graph synchronization of **Gun.js** with the semantic computing capabilities of **AlephNet**.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │      Main Process       │    │      Renderer Process       │  │
│  │                         │    │                             │  │
│  │  ┌───────────────────┐  │    │  ┌───────────────────────┐  │  │
│  │  │   PluginManager   │  │    │  │   React Application   │  │  │
│  │  │   AIProviderMgr   │◄─┼────┼─►│   Zustand Stores      │  │  │
│  │  │   MemoryService   │  │    │  │   PluginLoader        │  │  │
│  │  │   TaskScheduler   │  │    │  │   SlotRegistry        │  │  │
│  │  │   IdentityManager │  │    │  │   WebLLMService       │  │  │
│  │  │   SecretsManager  │  │    │  │                       │  │  │
│  │  └───────────────────┘  │    │  └───────────────────────┘  │  │
│  │           │              │    │             │               │  │
│  │           ▼              │    │             ▼               │  │
│  │  ┌───────────────────┐  │    │  ┌───────────────────────┐  │  │
│  │  │    IPC Bridge     │◄─┼────┼─►│   Preload Scripts     │  │  │
│  │  └───────────────────┘  │    │  └───────────────────────┘  │  │
│  │                         │    │                             │  │
│  └─────────────────────────┘    └─────────────────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                        Plugin Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │canvas-viz│ │elevenvox │ │theme-std │ │  user plugins...    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      AlephNet Layer                               │
│  ┌───────────────────────┐    ┌─────────────────────────────┐    │
│  │       Gun.js          │    │         DSNNode             │    │
│  │   (Graph Database)    │◄───┤   (Semantic Computing)      │    │
│  │   - Data replication  │    │   - SRIA reasoning          │    │
│  │   - SEA encryption    │    │   - Memory fields           │    │
│  │   - Offline-first     │    │   - SMF vectors             │    │
│  └───────────────────────┘    └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## The Dual-Stack Node

Every node in the mesh runs two parallel layers:

### 1. Gun.js Layer
Handles the "physical" data layer:
- **Data Replication**: CRDT-based graph synchronization across peers
- **Cryptographic Identity**: SEA (Security, Encryption, Authorization) keypairs
- **Offline-First Storage**: Local RadixTree for durability
- **Peer-to-Peer**: Mesh networking without central servers

### 2. AlephNet DSNNode Layer
Handles the "semantic" computation layer:
- **Semantic Indexing**: SMF (Semantic Meaning Field) vectors
- **SRIA Reasoning**: Self-Reflective Intelligent Agent framework
- **Memory Fields**: Hierarchical semantic storage
- **Trust Evaluation**: Coherence-based trust scoring

### Bridge
The two layers are connected by a bridge that:
- Synchronizes cryptographic identity between Gun.js and AlephNet
- Projects graph data into the Global Memory Field (GMF)
- Routes semantic queries through both layers

## Core Services (Main Process)

### PluginManager
Central orchestrator for the plugin system:
- Scans `plugins/` directory on startup
- Validates and loads plugin manifests
- Creates sandboxed `PluginContext` for each plugin
- Manages plugin lifecycle (activate, deactivate)
- Routes IPC messages to appropriate plugins

### AIProviderManager
Multi-provider AI backend orchestration:
- Manages provider configurations (API keys, endpoints)
- Implements routing rules for content types
- Caches model lists per provider
- Handles Vercel AI SDK and manual integrations
- Supports fallback chains

### IdentityManager
Cryptographic identity management:
- Generates Gun.js SEA keypairs
- Creates AlephNet KeyTriplets
- Persists identity securely
- Handles identity recovery

### SecretsManager
Secure credential storage:
- Encrypted local storage
- Scoped access per plugin
- API key management

### TaskScheduler
Cron-based automation:
- Parses cron expressions
- Schedules and executes AI tasks
- Tracks execution history
- Manages task lifecycle

### ConversationManager
Chat persistence:
- Creates and manages conversations
- Persists messages
- Handles attachments
- Title generation

## Renderer Architecture

### React Application
The UI is built with React 18:
- **Functional Components**: Hooks-based architecture
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animations and gestures
- **FlexLayout**: Dockable panel system

### State Management (Zustand)

| Store | Purpose |
|-------|---------|
| `useAppStore` | Global UI state, conversations, network |
| `useAlephStore` | AlephNet-specific state (groups, DMs, social) |
| `useMemoryStore` | Memory field state and operations |
| `useTaskStore` | Scheduled task state |
| `usePluginStore` | Plugin registry and state |
| `useFenceStore` | Code fence renderer registry |

### PluginLoader
Renderer-side plugin coordinator:
- Receives plugin list from Main process
- Loads renderer entry points
- Passes context to plugin activate functions
- Manages cleanup on deactivation

### SlotRegistry
UI extension point manager:
- Maintains registry of all extension slots
- Tracks component registrations per slot
- Provides hooks for slot consumers
- Handles priorities and filtering

### WebLLMService
Browser-based inference:
- Initializes MLC AI engine
- Downloads and caches models
- Provides chat completion API
- WebGPU acceleration

## Plugin System: "Cellular Extensions"

Plugins are self-contained units inspired by biological cells:

### Characteristics
- **Self-Contained**: Plugin contains all code, assets, and configuration
- **Sandboxed**: Runs with explicit permissions
- **Resonant**: Can declare semantic capabilities for discovery

### Plugin Structure
```
my-plugin/
├── manifest.json       # Metadata & permissions
├── aleph.json          # AlephNet-specific config (optional)
├── main/
│   └── index.js        # Backend entry (Node.js)
├── renderer/
│   └── bundle.js       # Frontend entry (React/ESM)
└── assets/             # Icons, images, etc.
```

### Plugin Context
Plugins receive a context object with:

**Main Process**:
- `ipc`: Send/receive messages to renderer
- `storage`: Persistent key-value storage
- `dsn`: AlephNet integration (tools, services)
- `ai`: AI provider access
- `secrets`: Secure credential storage

**Renderer Process**:
- `ipc`: Send/receive messages to main
- `ui`: UIExtensionAPI for registering components
- `React`: Shared React instance
- `useAppStore`: Global state access

## IPC Communication

### Channel Namespacing
All plugin IPC channels are prefixed:
```
plugin:<plugin-id>:<channel-name>
```

This ensures:
1. No collisions between plugins
2. Security isolation
3. Easy debugging/logging

### Message Flow
```
┌─────────────────┐          ┌─────────────────┐
│  Plugin UI      │          │  Plugin Backend │
│  (Renderer)     │          │  (Main)         │
├─────────────────┤          ├─────────────────┤
│                 │  send()  │                 │
│  context.ipc ───┼──────────┼─► context.ipc   │
│                 │          │                 │
│  context.ipc ◄──┼──────────┼─── context.ipc  │
│                 │  send()  │                 │
└─────────────────┘          └─────────────────┘
```

## UI Extension Slots

The application defines extension points (slots) where plugins inject components:

### Layout Slots
- `layout:panel` - Dockable panels
- `layout:stage-view` - Full-screen views
- `layout:sidebar-view` - Sidebar content

### Navigation Slots
- `nav:rail-item` - NavRail buttons
- `nav:rail-footer` - NavRail bottom section

### Inspector Slots
- `inspector:tab` - Inspector tabs
- `inspector:section` - Content sections

### Chat Slots
- `chat:message-before` - Pre-message content
- `chat:message-after` - Post-message content
- `chat:message-action` - Message action buttons
- `chat:input-before` - Before input field
- `chat:input-after` - After input field

### Special Slots
- `settings:tab` - Settings modal tabs
- `fence:renderer` - Code block renderers
- `overlay:command-palette` - Command menu items

## Data Flow

### User Interaction Flow
```
1. User Action     → React Component (onClick)
2. State Update    → Zustand store (setX)
3. IPC Call        → ipcRenderer.send()
4. Main Processing → Service handles request
5. IPC Response    → ipcRenderer.on()
6. State Update    → Zustand store update
7. UI Re-render    → React component updates
```

### AI Request Flow
```
1. User sends message
2. Message added to conversation (useAppStore)
3. IPC: 'ai:chat' sent to Main
4. AIProviderManager resolves provider/model
5. Request sent to provider API
6. Response streamed/returned
7. IPC: 'ai:message' sent to Renderer
8. Message added to conversation
9. UI updates with response
```

### Plugin Initialization Flow
```
1. App starts
2. PluginManager scans plugins/
3. Valid manifests loaded
4. Main entry points activated
5. Plugin list sent to Renderer
6. PluginLoader loads renderer entries
7. Plugins register UI components
8. SlotRegistry makes components available
9. UI renders with plugin content
```

## Security Model

### Process Isolation
- Main process has Node.js access
- Renderer is sandboxed (contextIsolation: true)
- Preload scripts expose safe APIs

### Permission System
- Plugins declare required permissions
- Operations checked against granted permissions
- Sensitive operations (fs, secrets) require explicit permission

### IPC Security
- All IPC goes through validated channels
- Plugin channels are namespaced
- No direct access to Electron APIs from renderer

## Performance Considerations

### Lazy Loading
- Plugins loaded on-demand
- Heavy components code-split
- Models downloaded when needed

### Caching
- AI model lists cached (24h TTL)
- WebLLM models cached in IndexedDB
- Conversation data cached locally

### Optimization
- React.memo for expensive components
- Virtual scrolling for long lists
- Debounced search/filter operations
