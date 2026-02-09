# Implementation Spec: Plugin System Upgrade

## 1. Overview
This specification outlines the upgrades required for the `PluginManager` and `PluginContext` to support the full "Resonant Extension" architecture. This includes exposing the AlephNet (DSN) capabilities to plugins, implementing secure IPC routing, and adding persistent storage.

## 2. Updated Plugin Context (`client/src/shared/plugin-types.ts`)

The `PluginContext` needs to be expanded to match `design/20-plugin-architecture.md`.

```typescript
export interface PluginContext {
  id: string;
  manifest: PluginManifest;
  
  // Lifecycle
  on(event: 'ready' | 'stop', callback: () => void): void;
  
  // Storage (Scoped)
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // IPC (Scoped)
  ipc: {
    send(channel: string, data: any): void;
    on(channel: string, handler: (data: any) => void): void;
    invoke(channel: string, data: any): Promise<any>; // Request-Response
  };

  // AlephNet Extensions (New)
  dsn: {
    registerTool(toolDefinition: SkillDefinition, handler: Function): void;
    registerService(serviceDef: ServiceDefinition, handler: Function): void;
    publishObservation(content: string, smf: number[]): void;
    getIdentity(): Promise<KeyTriplet>; // Read-only access to identity
  };
}
```

## 3. PluginManager Upgrades (`client/src/main/services/PluginManager.ts`)

### 3.1 DSN Integration
The `PluginManager` must be injected with the `DSNNode` instance (or `AlephGunBridge`) during initialization so it can proxy DSN calls from plugins.

*   **`registerTool`**: Stores the tool definition in the `DSNNode`'s `hostedSkills` list and registers an internal handler.
*   **`publishObservation`**: Calls `DSNNode.publishObservation`.

### 3.2 Secure IPC Routing
Currently, `ipc.send` broadcasts to all windows. This is insecure.
*   **Change**: Use `webContents.send` only to the specific renderer process associated with the plugin (if we had separate processes) or tag messages so the renderer-side `PluginContext` filters them.
*   **Renderer Filter**: The `PluginLoader` in the renderer should wrap the global `electronAPI.onPluginMessage` and only trigger the plugin's callback if the `pluginId` matches.

### 3.3 Persistent Storage
Implement `storage` using `electron-store`.
*   Each plugin gets a scoped store: `plugins.<pluginId>`.
*   `get(key)` -> `store.get('plugins.com.example.id.' + key)`
*   `set(key, val)` -> `store.set('plugins.com.example.id.' + key, val)`

## 4. Renderer Plugin Registry (`client/src/renderer/services/PluginLoader.ts`)

We need a proper `PluginLoader` service in the renderer that:
1.  Initializes the `RendererPluginContext`.
2.  Connects to the `ExtensionSlot` system.
3.  Manages the lifecycle of React components registered by plugins.

## 5. Implementation Plan

1.  **Update `plugin-types.ts`**: Add `dsn` namespace and `SkillDefinition` types.
2.  **Update `PluginManager`**:
    *   Add `electron-store` dependency.
    *   Implement `storage` methods.
    *   Inject `DSNNode` into `PluginManager`.
    *   Implement `dsn.registerTool` proxy.
3.  **Update `PluginLoader` (Renderer)**:
    *   Ensure `registerComponent` works correctly with `usePluginStore`.
