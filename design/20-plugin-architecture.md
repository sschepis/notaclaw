# Plugin Architecture: The "Resonant Extension" System

This document outlines the architecture for the **Plugin System** of the AlephNet-Integrated Durable Agent Mesh client. The system is designed "back-to-front," prioritizing robust backend extensibility (Main Process) that securely projects capabilities to the frontend (Renderer Process).

## 1. Core Philosophy

The plugin system follows the **"Cellular Extension"** paradigm:
1.  **Self-Contained**: A plugin is a complete unit (backend logic + frontend UI + assets).
2.  **Resonant**: Plugins can declare "Semantic Contracts" (e.g., "I provide weather data") rather than just rigid API endpoints.
3.  **Sandboxed-by-Default**: Plugins operate with least privilege, requesting specific capabilities (File System, Network, AlephNet Identity).

## 2. Plugin Structure

A plugin is a directory (or `.asar` archive) containing a `manifest.json` and entry points.

```
my-plugin/
├── manifest.json       # Metadata & Permissions
├── main/
│   └── index.js        # Main Process entry point (Node.js)
├── renderer/
│   └── index.js        # Renderer entry point (React/ESM)
└── assets/             # Icons, defaults, etc.
```

### 2.1 The Manifest (`manifest.json`)

```json
{
  "id": "com.example.weather-agent",
  "version": "1.0.0",
  "name": "Weather Agent",
  "description": "Adds local weather awareness to your agent",
  "main": "main/index.js",
  "renderer": "renderer/index.js",
  "permissions": [
    "network:http",      // Access external APIs
    "store:read",        // Read App State
    "dsn:register-tool"  // Register an SRIA tool
  ],
  "semanticDomain": "perceptual" // Hints for SMF placement
}
```

## 3. Backend Architecture (Main Process)

The **Plugin Host** in the Main Process is the source of truth. It manages the lifecycle and security context of all plugins.

### 3.1 The `PluginManager` Service

Responsible for:
1.  **Discovery**: Scanning the `plugins/` directory.
2.  **Validation**: Verifying signatures (future) and manifests.
3.  **Lifecycle**: `load()`, `enable()`, `disable()`, `unload()`.
4.  **Context Creation**: Generating a sandboxed `PluginContext` for each plugin.

### 3.2 The `PluginContext` API

Instead of giving plugins raw access to `app` or `dsnNode`, we inject a restricted API object:

```typescript
interface PluginContext {
  // Lifecycle
  on(event: 'ready' | 'stop', callback: () => void): void;
  
  // Storage (Scoped to plugin)
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
  };

  // Interaction
  ipc: {
    // Send to this plugin's renderer counterpart
    send(channel: string, data: any): void; 
    // Listen for this plugin's renderer counterpart
    on(channel: string, handler: (data: any) => void): void;
  };

  // AlephNet Extensions
  dsn: {
    registerTool(toolDefinition: ToolDef, handler: Function): void;
    registerService(serviceDef: ServiceDef, handler: Function): void;
    publishObservation(content: string, smf: number[]): void;
  };
}
```

### 3.3 Backend Lifecycle

1.  **Resolution**: Manager reads `manifest.json`.
2.  **Construction**: Manager creates `PluginContext` based on requested `permissions`.
3.  **Activation**: Manager requires `main/index.js` and calls `activate(context)`.
4.  **Running**: Plugin registers tools, services, and IPC listeners.
5.  **Deactivation**: Manager calls `deactivate()`, unregisters listeners, and clears memory.

## 4. Frontend Architecture (Renderer Process)

The frontend plugin system is designed to be **Reactive** and **Slot-Based**. Plugins inject components into specific "Slots" in the UI.

### 4.1 The `PluginRegistry` (Store)

Tracks loaded plugins and their registered UI components.

```typescript
interface PluginRegistryState {
  plugins: Map<string, PluginMetadata>;
  extensions: {
    [SlotName: string]: Array<ComponentDefinition>;
  };
}
```

### 4.2 Extension Slots

The main UI (`App.tsx`, `Sidebar.tsx`, etc.) defines `<ExtensionSlot name="..." />` components.

Common Slots:
*   `sidebar:nav-item`: Icons in the NavRail.
*   `sidebar:panel`: Content for the Sidebar (e.g., a list of weather alerts).
*   `stage:view`: A full-screen view (e.g., a Weather Dashboard).
*   `inspector:tab`: A tab in the Inspector panel.
*   `message:decorator`: Custom rendering for specific message types.

### 4.3 Renderer Entry Point

The `renderer/index.js` exports an `activate` function that receives a `RendererContext`:

```typescript
export function activate(context) {
  // Add a button to the NavRail
  context.registerComponent('sidebar:nav-item', {
    id: 'weather-icon',
    icon: 'CloudSun',
    label: 'Weather',
    onClick: () => context.navigate('weather-view')
  });

  // Register the main view
  context.registerComponent('stage:view', {
    id: 'weather-view',
    component: WeatherDashboard // React Component
  });
}
```

## 5. The Bridge (IPC)

Plugins need a private channel to talk to their backend.

*   **Pattern**: `plugin:<plugin-id>:<channel>`
*   **Security**: The Main process `PluginManager` automatically routes messages. A plugin cannot listen to another plugin's messages unless explicitly shared.

**Flow:**
1.  Renderer: `context.ipc.send('fetch-weather', { city: 'London' })`
2.  Main (PluginManager): Routes to `com.example.weather-agent`.
3.  Main (Plugin): Receives event, calls API, returns result.
4.  Main (Plugin): `context.ipc.send('weather-data', { temp: 15 })`
5.  Renderer: Updates UI.

## 6. Security & Permissions

To prevent malicious plugins, we implement a **Permission Model**:

| Permission | Description | Risk |
| :--- | :--- | :--- |
| `network:http` | Make arbitrary HTTP requests | High |
| `fs:read` | Read files outside plugin dir | High |
| `dsn:identity` | Sign messages as the user | Critical |
| `ui:notification` | Show system notifications | Low |

*   **Manifest Enforcement**: Plugins must declare permissions in `manifest.json`.
*   **User Consent**: On installation (or first run), the user is prompted to grant these permissions.
*   **Runtime Checks**: The `PluginContext` proxies calls and throws if permission is missing.

## 7. Implementation Roadmap

### Phase 1: The Loader (Main)
*   Create `PluginManager` class.
*   Implement `manifest.json` parsing.
*   Create basic `PluginContext` with `console` and `ipc`.

### Phase 2: The Registry (Renderer)
*   Create `PluginContext` for Renderer.
*   Implement `<ExtensionSlot>` component.
*   Update `App.tsx` to load plugins from Main.

### Phase 3: The Bridge
*   Implement secure IPC routing.
*   Add `storage` API (using `electron-store` or `gun`).

### Phase 4: DSN Integration
*   Allow plugins to register `Tools` that the SRIA Agent can summon.
