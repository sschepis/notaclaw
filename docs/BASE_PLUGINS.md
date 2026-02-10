# Base Plugins for AlephNet Client

This document outlines the core set of plugins to be shipped with the AlephNet-Integrated Durable Agent Mesh client. These plugins provide essential functionality for identity, economics, network visualization, and agent capabilities.

## Core Infrastructure (Tier 1)

These plugins are critical for the basic operation of the node.

### 1. AlephNet Wallet (`@alephnet/wallet`)

**Purpose**: Manages the user's Cryptographic Identity (KeyTriplet) and Aleph Token (ℵ) economics.

*   **Functionality**:
    *   **Identity Management**: Create/Import KeyTriplets, view Identity Fingerprint.
    *   **Token Management**: View Balance (Available, Staked, Reserved), Send/Receive Tokens.
    *   **Staking**: Interface to stake tokens for Tiers (Neophyte, Adept, Magus, Archon).
    *   **Transaction History**: View past transfers, rewards, and payments.
*   **Permissions**: `dsn:identity`, `store:read`, `store:write`, `network:http`.
*   **Extension Slots**:
    *   `sidebar:nav-item`: Wallet Icon (shows notification dot for incoming tx).
    *   `sidebar:panel`: Quick view of Balance and current Staking Tier.
    *   `stage:view`: Full Wallet Dashboard (Send/Receive, Staking UI, History).

### 2. Network Visualizer (`@alephnet/network-visualizer`)

**Purpose**: Provides situational awareness of the Distributed Sentience Network (DSN) mesh.

*   **Functionality**:
    *   **Mesh View**: Visualizes connected Gun.js peers and DSN nodes.
    *   **Semantic Routing**: Visualizes the "Semantic Distance" to other nodes based on Prime-Resonant keys.
    *   **Connection Stats**: Latency, Bandwidth, and Sync status.
*   **Permissions**: `store:read` (Network State).
*   **Extension Slots**:
    *   `sidebar:nav-item`: Network Icon (color-coded by connection health).
    *   `stage:view`: Interactive 3D/2D Graph of the mesh.
    *   `inspector:tab`: Detailed node inspection when a peer is selected.

### 3. Agent Essentials (`@alephnet/agent-essentials`)

**Purpose**: Equips the SRIA (Summonable Resonant Intelligent Agent) with standard capabilities.

*   **Functionality**:
    *   **File System**: Sandboxed read/write access to a specific `agent_workspace` directory.
    *   **Web Search**: Tool to perform searches via configured providers (e.g., Tavily, Serper).
    *   **System Info**: Tool to check local resource usage (CPU, RAM) - important for load balancing.
    *   **Time/Date**: Basic temporal awareness.
*   **Permissions**: `fs:read`, `fs:write`, `network:http`.
*   **Extension Slots**:
    *   `inspector:tab`: "Active Tools" log showing what the agent is currently doing.
    *   `settings:tab`: Configuration for search providers and file limits.

### 4. Knowledge Graph Explorer (`@alephnet/knowledge-graph`)

**Purpose**: Allows the user to explore and manage the semantic data stored in the Global Memory Field (GMF).

*   **Functionality**:
    *   **Data Browser**: Tree or Graph view of Gun.js nodes.
    *   **Semantic Inspector**: View the SMF (Semantic Memory Field) vectors associated with data.
    *   **Manual Entry**: Form to manually add/edit data nodes (for debugging or seeding).
*   **Permissions**: `store:read`, `store:write`.
*   **Extension Slots**:
    *   `sidebar:nav-item`: Database Icon.
    *   `stage:view`: Data explorer interface.

### 5. Coherence Monitor (`@alephnet/coherence-monitor`)

**Purpose**: Visualizes the "Free Energy" minimization process and the coherence of the local node.

*   **Functionality**:
    *   **Free Energy Gauge**: Real-time visualization of the agent's prediction error.
    *   **Coherence Score**: Display of the node's semantic coherence with the network.
    *   **Alerts**: Notifications when coherence drops below a threshold.
*   **Permissions**: `store:read`.
*   **Extension Slots**:
    *   `inspector:tab`: Real-time charts of Free Energy vs. Time.
    *   `message:decorator`: Adds "Coherence Confidence" indicators to agent messages.

---

## Extended Ecosystem (Tier 2)

These plugins enhance the utility of the agent and the user's interaction with the community.

### 6. Governance Console (`@alephnet/governance`)

**Purpose**: Enables participation in the decentralized governance of the network (Archon/Magus tiers).

*   **Functionality**:
    *   **Proposal Browser**: View and filter active proposals (Parameter Changes, Upgrades).
    *   **Voting Interface**: Cast votes using Staked Tokens.
    *   **Coherence Claims**: View and stake on "Truth Claims" within the network.
*   **Permissions**: `dsn:identity`, `store:write`.
*   **Extension Slots**:
    *   `stage:view`: Governance Dashboard.
    *   `sidebar:panel`: Active Proposals summary.

### 7. Secure Comms (`@alephnet/secure-comms`)

**Purpose**: Encrypted peer-to-peer messaging and private rooms.

*   **Functionality**:
    *   **Direct Messages**: SEA-encrypted chats with other nodes.
    *   **Private Rooms**: Group chats for Adept+ tiers.
    *   **File Sharing**: Secure P2P file transfer.
*   **Permissions**: `dsn:identity`, `network:p2p`.
*   **Extension Slots**:
    *   `sidebar:nav-item`: Chat/Comms Icon.
    *   `stage:view`: Messaging Interface (distinct from the main Agent chat).

### 8. Service Marketplace (Built-in Service)

**Purpose**: Discovery and subscription management for SRIA services.

*   **Functionality**:
    *   **Service Registry**: Browse available services from other nodes (e.g., "Deep Research", "Image Gen").
    *   **Subscription Manager**: Manage active subscriptions and payments.
    *   **Provider Dashboard**: For users offering services, view usage and revenue.
*   **Implementation**: Built into core application as `MarketplaceService.ts`
*   **Note**: Uses AlephGunBridge for decentralized service discovery rather than a plugin.

### 9. OpenClaw Skill Manager (`@alephnet/openclaw-skills`)

**Purpose**: A comprehensive interface for managing, creating, and sharing skills in the OpenClaw standard format.

*   **Functionality**:
    *   **OpenClaw Support**: Full import/export of OpenClaw skill definitions (JSON/YAML).
    *   **Visual Editor**: No-code interface to define tool parameters (JSONSchema), execution logic, and metadata.
    *   **Semantic Tagging**: Interface to assign AlephNet-specific metadata (`semanticDomain`, `primeDomain`, `smfAxes`) to standard OpenClaw skills.
    *   **Testing Sandbox**: Interactive environment to test skills with mock inputs before publishing.
*   **Permissions**: `dsn:register-tool`, `fs:read` (importing skills), `fs:write` (exporting skills).
*   **Extension Slots**:
    *   `stage:view`: Skill Editor & Manager Dashboard.
    *   `inspector:tab`: Skill debugger (when testing).

### 10. Document Reader (`@alephnet/document-reader`)

**Purpose**: Advanced document ingestion and semantic indexing.

*   **Functionality**:
    *   **Ingestion**: Drag-and-drop PDF/Docx/Txt.
    *   **Semantic Indexing**: Automatically generates SMF vectors for document chunks.
    *   **Q&A Interface**: Chat specifically with a document.
*   **Permissions**: `fs:read`, `store:write` (indexing).
*   **Extension Slots**:
    *   `sidebar:panel`: Recent Documents.
    *   `stage:view`: Document Viewer with semantic highlighting.

---

## Advanced Capabilities (Tier 3)

These plugins provide specialized functionality for power users, developers, and complex deployments.

### 11. Semantic Search Engine (`@alephnet/semantic-search`)

**Purpose**: Deep search capabilities leveraging the Global Memory Field (GMF) vectors.

*   **Functionality**:
    *   **Concept Search**: Find data based on meaning (SMF resonance) rather than keywords.
    *   **Resonance Filtering**: Filter results by their semantic distance to specific concepts.
    *   **Visual Cluster**: View search results as clustered nodes in 3D space.
*   **Permissions**: `store:read`.
*   **Extension Slots**:
    *   `stage:view`: Advanced Search Interface.

### 12. Swarm Controller (`@alephnet/swarm-controller`)

**Purpose**: Orchestration tool for managing multiple DSN nodes owned by the same identity.

*   **Functionality**:
    *   **Fleet View**: Monitor health/status of all owned nodes (servers, desktops, mobile).
    *   **Task Delegation**: Manually dispatch tasks to specific nodes in your swarm.
    *   **Config Sync**: Synchronize settings and plugins across the swarm.
*   **Permissions**: `network:p2p`, `dsn:identity`.
*   **Extension Slots**:
    *   `stage:view`: Fleet Dashboard.

### 13. Code Interpreter (`@alephnet/code-interpreter`)

**Purpose**: A secure, sandboxed environment for the agent to write and execute code.

*   **Functionality**:
    *   **Execution Sandbox**: WASM-based runtime for Python/JS execution.
    *   **Data Analysis**: Generate charts/graphs from data (displayed in chat).
    *   **File Processing**: Transform data files via code.
*   **Permissions**: `fs:read`, `fs:write` (sandbox only).
*   **Extension Slots**:
    *   `message:decorator`: Rendered outputs (charts/tables) in chat.

### 14. Reputation Manager (`@alephnet/reputation-manager`)

**Purpose**: Visualizes and manages the Web of Trust and node reputation scores.

*   **Functionality**:
    *   **Trust Graph**: View who trusts whom in the network.
    *   **Scorecard**: Detailed breakdown of a node's reputation (Uptime, Accuracy, Coherence).
    *   **Blocklist**: Manage local blocklists for malicious nodes.
*   **Permissions**: `store:read`, `store:write` (trust settings).
*   **Extension Slots**:
    *   `inspector:tab`: Reputation details for selected peer.

### 15. Prime Tuner (`@alephnet/prime-tuner`)

**Purpose**: Low-level diagnostic tool to visualize and tune the Prime-Resonant frequencies.

*   **Functionality**:
    *   **Resonance Visualizer**: Spectrogram-like view of incoming semantic signals.
    *   **Frequency Filter**: Manually adjust which prime domains the node listens to.
    *   **Interference Monitor**: Detect "semantic jamming" or incoherence attacks.
*   **Permissions**: `store:read`, `store:write` (tuning).
*   **Extension Slots**:
    *   `stage:view`: Signal Analysis Dashboard.

### 16. Secure Backup (`@alephnet/secure-backup`)

**Purpose**: Automated, encrypted backups of the local graph and identity.

*   **Functionality**:
    *   **Local Backup**: Encrypted export to local disk.
    *   **Decentralized Backup**: Encrypted replication to IPFS/Arweave (requires provider).
    *   **Recovery**: Restore identity and graph from backup file.
*   **Permissions**: `fs:write`, `store:read`, `network:http` (for cloud/ipfs).
*   **Extension Slots**:
    *   `settings:tab`: Backup Configuration.

### 17. Voice Capabilities (Built-in)

**Purpose**: Speech-to-text (STT) and text-to-speech (TTS) capabilities are integrated directly into the chat interface.

*   **Functionality**:
    *   **Speech-to-Text**: Voice input via microphone button in the chat input area (uses Web Speech API).
    *   **Text-to-Speech**: "Read Aloud" action on any message (uses browser speechSynthesis).
*   **Location**: Integrated into `InputArea.tsx` (mic button) and `MessageActions.tsx` (read aloud).
*   **Note**: These features are built into the core chat UI rather than a separate plugin.

### 18. API Gateway (`@alephnet/api-gateway`)

**Purpose**: Exposes the agent's capabilities via a local REST/WebSocket API.

*   **Functionality**:
    *   **Endpoint Config**: Enable/Disable specific API endpoints.
    *   **Key Management**: Generate API keys for external apps.
    *   **Request Log**: Monitor incoming API requests.
*   **Permissions**: `network:http` (server).
*   **Extension Slots**:
    *   `settings:tab`: API Configuration.

### 19. Theme Studio (`@alephnet/theme-studio`)

**Purpose**: Advanced UI customization and theming.

*   **Functionality**:
    *   **Theme Editor**: Customize colors, fonts, and layout density.
    *   **Community Themes**: Download themes shared by other users.
    *   **CSS Injection**: (Advanced) Custom CSS overrides.
*   **Permissions**: `ui:theme`.
*   **Extension Slots**:
    *   `settings:tab`: Appearance settings.

### 20. Notification Center (`@alephnet/notification-center`)

**Purpose**: Centralized hub for system alerts and agent notifications.

*   **Functionality**:
    *   **Unified Feed**: Aggregates alerts from all plugins (Wallet, Network, Agent).
    *   **Rules Engine**: Configure "Do Not Disturb" and priority filters.
    *   **Toast Manager**: Controls on-screen popups.
*   **Permissions**: `ui:notification`.
*   **Extension Slots**:
    *   `sidebar:panel`: Notification History.

### 21. HTML Artifact Studio (`@alephnet/html-artifacts`)

**Purpose**: A dedicated environment for generating, previewing, and editing HTML/React artifacts created by the agent.

*   **Functionality**:
    *   **Artifact Generation Skill**: A tool (`generate_artifact`) exposed to the agent to create web pages and components.
    *   **Live Preview**: Real-time rendering of the generated code (supports HTML/CSS/JS and React).
    *   **Code Editor**: Integrated editor to tweak the generated code manually.
    *   **Version History**: Track changes to artifacts.
*   **Permissions**: `dsn:register-tool`, `fs:read`, `fs:write`.
*   **Extension Slots**:
    *   `stage:view`: Artifact Editor & Preview Dashboard.
    *   `message:decorator`: "View Artifact" button in chat messages.

## Implementation Structure

The project uses two plugin directories:

### Core Plugins (`plugins/`)
These are always loaded and provide essential functionality.

```
plugins/
├── agent-essentials/     # SRIA agent tools (fs, search, system info)
├── auto-dash/            # Generative runtime dashboard
├── knowledge-graph/      # Semantic knowledge graph explorer
├── notification-center/  # System alerts and notifications
└── secrets-manager/      # API key and credential storage
```

### Extended Plugins (`plugins-extended/`)
Optional plugins for advanced integrations.

```
plugins-extended/
├── openclaw-gateway/     # OpenClaw network gateway connection
└── openclaw-skills/      # OpenClaw skill definition manager
```

### Built-in Features (No Plugin)
Some functionality is built directly into the core application:

- **Voice Input/Output**: STT and TTS in the chat interface
- **Marketplace Service**: Service discovery via `MarketplaceService.ts`
