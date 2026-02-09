# Interface Overview

The application interface is built around a modern, dark-themed design with four primary areas, plus additional overlay components for advanced functionality.

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Title Bar / Menu                        │
├──────┬───────────┬────────────────────────────┬─────────────────┤
│      │           │                            │                 │
│ Nav  │  Sidebar  │         Stage              │   Inspector     │
│ Rail │           │                            │                 │
│      │           │                            │                 │
├──────┴───────────┴────────────────────────────┴─────────────────┤
│                      Terminal Drawer                            │
├─────────────────────────────────────────────────────────────────┤
│                         Status Bar                              │
└─────────────────────────────────────────────────────────────────┘
```

## 1. NavRail (Left Edge)

The narrow strip on the far left provides quick access to all major application areas.

### Core Navigation Items

| Icon | Name | Description |
|------|------|-------------|
| 📁 | **Explorer** | File tree browser for workspace navigation |
| 📦 | **Extensions** | View and manage installed plugins |
| 💬 | **Chat Mode** | AI conversation interface (main working area) |
| ✉️ | **Messages** | Direct messages and group conversations |
| 👥 | **Groups** | AlephNet groups and feeds |
| 🗃️ | **Memory Fields** | Semantic memory storage and retrieval |
| 🛡️ | **Coherence Network** | Trust and identity coherence visualization |
| 🖥️ | **SRIA Agents** | AI agent orchestration and monitoring |
| 🔗 | **Connections** | Friend list and social connections |

### Bottom Actions
- **Network Status**: Current mesh connectivity indicator
- **Settings**: Open the settings modal

### Customization
- **Drag to Reorder**: NavRail items can be reordered by dragging
- **Plugin Icons**: Extensions can register additional navigation items

## 2. Sidebar (Left Panel)

The expandable panel next to the NavRail displays context-specific content based on the selected navigation item.

### Sidebar Views

| View | Contents |
|------|----------|
| **Explorer** | File tree with workspace files and folders |
| **Extensions** | List of installed plugins with enable/disable toggles |
| **Messages** | Conversation list with domains, DMs, groups, and AI chats |
| **Groups** | Group navigation with feed browser |
| **Memory Fields** | Searchable list of memory fields organized by scope |
| **Connections** | Friend list, pending requests, and profile settings |

### Key Features
- **Search**: Most views include search functionality
- **Context Menus**: Right-click for additional actions
- **Collapsible Sections**: Organize content into expandable categories

## 3. Stage (Center Area)

The main working area supports multiple view types through a flexible tab system.

### Chat View
The default view for AI conversations:
- **Message Stream**: Displays conversation history with user and agent messages
- **Input Deck**: Rich text input with:
  - File attachments (images, documents)
  - Model selector dropdown
  - Voice input (speech-to-text)
  - Send button
- **Message Types**: Messages are color-coded by semantic type:
  - **Perceptual** (blue): Standard responses
  - **Cognitive** (purple): Reasoning/analysis
  - **Temporal** (amber): Time-related information
  - **Agentic** (green): Action execution
  - **Error** (red): Error states

### Groups Stage
For group interactions:
- **Group Detail View**: Members, posts, and group settings
- **Feed View**: Aggregated content from subscribed groups
- **Post Detail View**: Individual post with comments

### Memory Viewer
For exploring semantic memory:
- **Fragment Browser**: View and search memory fragments
- **Field Details**: Metadata, entropy, and contribution counts
- **Visualization**: SMF radar charts

### Tab Management
- **Multiple Tabs**: Open multiple views simultaneously
- **Tab Bar**: Switch between open views
- **Close/Reorder**: Manage tabs like a browser

## 4. Inspector (Right Panel)

The collapsible panel provides detailed information and debugging tools.

### Built-in Tabs

| Tab | Description |
|-----|-------------|
| **Cortex** | AI agent state, SMF vector visualization, free energy metrics |
| **Mesh** | Network status, connected peers, latency information |
| **Session** | Current session details, identity information |
| **Ledger** | Wallet balance, staking status, transaction history |
| **Console** | Application logs and debug output |

### Features
- **Plugin Tabs**: Extensions can add custom inspector tabs
- **Expandable Sections**: Detailed information in collapsible sections
- **Real-time Updates**: Live data streaming for network and agent state

## 5. Terminal Drawer

A slide-up panel at the bottom for command-line operations.

- **Toggle**: Click the terminal icon or use keyboard shortcut
- **Multiple Sessions**: Support for multiple terminal instances
- **Integration**: Direct access to system commands

## 6. Status Bar

The bottom bar displays system status at a glance:

- **Network Status**: Online/Offline indicator with peer count
- **Agent State**: Current AI agent activity (Idle, Perceiving, Acting)
- **Latency**: Network response time
- **Quick Actions**: Common operations accessible from status bar

## 7. Command Menu (⌘K / Ctrl+K)

A spotlight-style command palette for quick actions:

- **Search**: Find files, commands, and settings
- **Navigation**: Jump to any view or conversation
- **Actions**: Execute commands without mouse navigation
- **Plugin Commands**: Extensions can register custom commands

## 8. Overlay Components

### Settings Modal
Accessed via NavRail settings button:
- **General**: Application preferences
- **AI & Models**: Provider configuration, model selection, routing rules
- **Extensions**: Plugin management and configuration
- **Appearance**: Theme customization (coming soon)
- **Plugin Tabs**: Extensions can add custom settings sections

### Modals and Dialogs
- **Create Task**: Schedule AI tasks with cron expressions
- **Create Memory Field**: Add new semantic memory fields
- **Provider Configuration**: Set up AI providers
- **Plugin-Registered Modals**: Extensions can show custom modals

### Toast Notifications
- **Success/Error/Info**: System notifications
- **Action Toasts**: Notifications with clickable actions
- **Plugin Toasts**: Extensions can trigger notifications

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Menu |
| `⌘,` / `Ctrl+,` | Open Settings |
| `⌘N` / `Ctrl+N` | New Conversation |
| `⌘\` / `Ctrl+\` | Toggle Sidebar |
| `⌘J` / `Ctrl+J` | Toggle Terminal |
| `Escape` | Close modals/dialogs |

## Responsive Behavior

- **Collapsible Panels**: Inspector and Sidebar can be collapsed
- **Resizable**: Panel widths are adjustable by dragging borders
- **Persistent Layout**: Layout preferences are saved between sessions
