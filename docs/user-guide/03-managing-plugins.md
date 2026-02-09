# Managing Plugins

Plugins extend the functionality of your agent with additional capabilities, UI components, and integrations. The plugin system is designed for safety and extensibility.

## Plugin Directory

Plugins are loaded from the `plugins/` directory in the application root. Each plugin is a self-contained folder with its own manifest, code, and assets.

```
plugins/
├── canvas-viz/          # Visualization canvas plugin
├── elevenvoices/        # Voice synthesis integration
├── theme-studio/        # Theme customization
├── swarm-controller/    # Multi-agent orchestration
├── secrets-manager/     # Secure credential storage
└── your-plugin/         # Your custom plugins
```

## Viewing Installed Plugins

### Via NavRail
1. Click the **Extensions** icon in the NavRail
2. View the list of installed plugins with their status

### Via Settings
1. Open Settings (`⌘,` / `Ctrl+,`)
2. Navigate to **Extensions**
3. See all plugins with configuration options

## Plugin States

| State | Description |
|-------|-------------|
| **Active** | Plugin is loaded and running |
| **Inactive** | Plugin is installed but not enabled |
| **Error** | Plugin failed to load (check console) |

## Enabling/Disabling Plugins

Currently, plugins in the `plugins/` directory are loaded automatically on startup. To disable a plugin:

1. Rename the plugin folder (e.g., `canvas-viz` → `_canvas-viz`)
2. Restart the application

## Plugin Permissions

Plugins operate within a sandboxed environment with explicit permissions defined in their `manifest.json`.

### Permission Types

| Permission | Description | Risk Level |
|------------|-------------|------------|
| `network:http` | Make HTTP/HTTPS requests | Medium |
| `network:ws` | Open WebSocket connections | Medium |
| `fs:read` | Read files from filesystem | High |
| `fs:write` | Write files to filesystem | High |
| `store:read` | Read application state | Low |
| `store:write` | Modify application state | Medium |
| `dsn:register-tool` | Register SRIA agent tools | Medium |
| `dsn:publish` | Publish to AlephNet mesh | Medium |

### Checking Plugin Permissions
1. Navigate to Extensions in Settings
2. Click on a plugin to view its details
3. Review the "Permissions" section

## Plugin UI Components

Plugins can inject UI components into various application slots:

### Extension Slots

| Slot | Description |
|------|-------------|
| `nav:rail-item` | NavRail navigation buttons |
| `sidebar:panel` | Sidebar view panels |
| `stage:view` | Full-screen stage views |
| `inspector:tab` | Inspector panel tabs |
| `inspector:section` | Sections within inspector tabs |
| `chat:message-before` | Content before messages |
| `chat:message-after` | Content after messages |
| `chat:message-action` | Message action buttons |
| `settings:tab` | Settings modal tabs |
| `overlay:command-palette` | Command palette items |

### Identifying Plugin UI
Plugin-injected components are visually indicated and wrapped in error boundaries to prevent crashes.

## Available Plugins

### Core Plugins

#### Canvas Visualization
- **ID**: `com.aleph.canvas-viz`
- **Purpose**: Visual canvas for node graphs and diagrams
- **Slots**: Stage view

#### ElevenVoices
- **ID**: `com.aleph.elevenvoices`
- **Purpose**: Text-to-speech with ElevenLabs integration
- **Slots**: Message actions, settings tab

#### Theme Studio
- **ID**: `com.aleph.theme-studio`
- **Purpose**: Customize application themes
- **Slots**: Settings tab

#### Swarm Controller
- **ID**: `com.aleph.swarm-controller`
- **Purpose**: Multi-agent orchestration and coordination
- **Slots**: Inspector tab, stage view

#### Secrets Manager
- **ID**: `com.aleph.secrets-manager`
- **Purpose**: Secure credential and API key storage
- **Slots**: Settings tab, sidebar view

## Installing New Plugins

### From Source
1. Clone or download the plugin to `plugins/` directory
2. Run `npm run build:plugins` if the plugin requires building
3. Restart the application

### Plugin Dependencies
If a plugin has its own `package.json`:
```bash
cd plugins/plugin-name
npm install
```

## Troubleshooting Plugins

### Plugin Not Loading
1. Check the **Console** tab in Inspector for errors
2. Verify `manifest.json` is valid JSON
3. Ensure all required fields are present (id, name, version)
4. Check that entry points (`main`, `renderer`) exist

### Plugin Crashes
1. Plugin errors are caught by error boundaries
2. A crashed plugin shows an error state in its UI slot
3. Check console for stack traces
4. Disable the plugin and report the issue

### Permission Errors
1. Plugin may be attempting unauthorized operations
2. Review plugin's requested permissions in manifest
3. Check if permission is granted in the manifest

### IPC Communication Failures
1. Verify plugin uses correct channel naming
2. Check that both main and renderer handlers are registered
3. Review IPC logs in Console tab

## Plugin Development

For creating your own plugins, see the Developer Guide:
*   [Plugin Structure](../developer-guide/02-plugin-structure.md)
*   [Backend Development](../developer-guide/03-backend-development.md)
*   [Frontend Development](../developer-guide/04-frontend-development.md)
*   [Tutorial: First Plugin](../developer-guide/06-tutorial-first-plugin.md)

## Security Considerations

### Trusting Plugins
- Only install plugins from trusted sources
- Review plugin permissions before installation
- Be cautious with `fs:write` and `network:*` permissions

### Plugin Isolation
- Plugins run in isolated contexts
- IPC channels are namespaced per-plugin
- Plugins cannot access other plugins' data directly

### Reporting Issues
If you discover a security issue in a plugin:
1. Do not use the plugin
2. Report to the plugin maintainer
3. Remove the plugin from your installation
