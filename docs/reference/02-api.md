# API Reference

This document covers the complete API available to plugin developers, including the core PluginContext and the UI Extension API.

---

## PluginContext (Shared)

These methods are available in both the Main and Renderer processes.

### `context.id`
*   **Type**: `string`
*   **Description**: The unique ID of the plugin.

### `context.manifest`
*   **Type**: `PluginManifest`
*   **Description**: The parsed content of `manifest.json`.

### `context.on(event, callback)`
*   **Description**: Listen for lifecycle events.
*   **Events**: `'ready'`, `'stop'`.

### `context.storage`
Persistent storage scoped to your plugin.

```typescript
interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### `context.ipc`
Inter-process communication bridge.

```typescript
interface PluginIPC {
  send(channel: string, data: any): void;
  on(channel: string, handler: (data: any) => void): () => void;
  off(channel: string, handler: (data: any) => void): void;
}
```

---

## PluginContext (Main Only)

These methods are only available in the Main process (`main/index.js`).

### `context.dsn`
Access to AlephNet DSN capabilities.

```typescript
interface DSNContext {
  // Register an SRIA tool
  registerTool(toolDefinition: ToolDef, handler: Function): void;
  
  // Register a background service
  registerService(serviceDef: ServiceDef, handler: Function): void;
  
  // Publish observation to Global Memory Field
  publishObservation(content: string, smf: number[]): void;
  
  // Query the semantic mesh
  query(query: string, options?: QueryOptions): Promise<QueryResult>;
}
```

### `context.ai`
AI provider access (if permitted).

```typescript
interface AIContext {
  // Send a request to the configured AI provider
  request(prompt: string, options: AIRequestOptions): Promise<AIResponse>;
  
  // Get available models
  getModels(): Promise<string[]>;
}
```

### `context.secrets`
Secure credential storage (if permitted).

```typescript
interface SecretsContext {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}
```

---

## RendererPluginContext (Renderer Only)

These methods are only available in the Renderer process (`renderer/index.js`).

### `context.React`
*   **Type**: `typeof React`
*   **Description**: The React library instance used by the host application. Use this to avoid version conflicts.

### `context.ui`
*   **Type**: `UIExtensionAPI`
*   **Description**: The UI extension API for registering components.

### `context.useAppStore`
*   **Type**: `() => AppState`
*   **Description**: Zustand hook to access global application state.

---

## UIExtensionAPI

The primary API for plugins to extend the application UI.

### Panel Registration

#### `registerPanel(options: PanelOptions)`
Register a dockable panel.

```typescript
interface PanelOptions {
  id: string;                  // Unique panel ID
  name: string;                // Display name
  icon: ComponentType | string; // Icon component or name
  component: ComponentType;     // Panel content component
  defaultLocation?: 'left' | 'right' | 'bottom';
  defaultWeight?: number;       // Size percentage (0-100)
  enableClose?: boolean;        // Allow user to close
}
```

**Returns**: `() => void` - Cleanup function to unregister.

### Stage View Registration

#### `registerStageView(options: StageViewOptions)`
Register a full-screen stage view.

```typescript
interface StageViewOptions {
  id: string;
  name: string;
  icon: ComponentType | string;
  component: ComponentType;
}
```

### Navigation Registration

#### `registerNavigation(options: NavigationOptions)`
Register a navigation item in the NavRail with an associated view.

```typescript
interface NavigationOptions {
  id: string;
  label: string;
  icon: ComponentType | string;
  view: StageViewOptions;       // The view to show when clicked
  badge?: () => number | null;  // Optional badge count
  order?: number;               // Position in rail (lower = higher)
}
```

### Inspector Extensions

#### `registerInspectorTab(options: InspectorTabOptions)`
Add a new tab to the Inspector panel.

```typescript
interface InspectorTabOptions {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  component: ComponentType<{ context: InspectorContext }>;
  priority?: number;
  badge?: () => number | null;
}
```

#### `registerInspectorSection(options: InspectorSectionOptions)`
Add a section to an existing Inspector tab.

```typescript
interface InspectorSectionOptions {
  id: string;
  targetTab: string;            // ID of the tab to extend
  component: ComponentType<{ context: InspectorContext }>;
  location?: 'top' | 'bottom';
  priority?: number;
}
```

### Message Decorators

#### `registerMessageDecorator(options: MessageDecoratorOptions)`
Decorate chat messages with custom content or actions.

```typescript
interface MessageDecoratorOptions {
  id: string;
  match: (message: ChatMessage) => boolean;  // Filter function
  wrapper?: ComponentType<{ message: ChatMessage; children: ReactNode }>;
  before?: ComponentType<{ message: ChatMessage }>;
  after?: ComponentType<{ message: ChatMessage }>;
  actions?: MessageAction[];
  priority?: number;
}

interface MessageAction {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  onClick: (message: ChatMessage) => void;
  visible?: (message: ChatMessage) => boolean;
}
```

### Settings Integration

#### `registerSettingsTab(options: SettingsTabOptions)`
Add a tab to the Settings modal.

```typescript
interface SettingsTabOptions {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  component: ComponentType;
  order?: number;
}
```

### Slot Registration

#### `registerSlot<K extends keyof SlotContextMap>(slotId: K, options: SlotRegistrationOptions<SlotContextMap[K]>)`
Register a component for a specific slot.

```typescript
interface SlotRegistrationOptions<TContext> {
  component: ComponentType<SlotComponentProps<TContext>>;
  priority?: number;
  filter?: (context: TContext) => boolean;
  metadata?: Record<string, unknown>;
}

interface SlotComponentProps<TContext> {
  context: TContext;
  metadata?: Record<string, unknown>;
}
```

### Overlays

#### `showModal<T>(options: ModalOptions<T>)`
Display a modal dialog.

```typescript
interface ModalOptions<T> {
  id: string;
  title: string;
  component: ComponentType<{ close: (result?: T) => void }>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
```

**Returns**: `Promise<T | undefined>` - Resolves when modal closes.

#### `closeModal(id: string)`
Programmatically close a modal.

#### `showToast(options: ToastOptions)`
Display a toast notification.

```typescript
interface ToastOptions {
  id?: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;  // ms, default 5000
  action?: { label: string; onClick: () => void };
}
```

### Command Palette

#### `registerCommand(options: CommandOptions)`
Register a command in the command palette (⌘K).

```typescript
interface CommandOptions {
  id: string;
  label: string;
  shortcut?: string;
  icon?: ComponentType<{ size?: number }>;
  action: () => void;
  category?: string;
}
```

---

## Slot Context Types

Different slots provide different context to components:

### `NavRailContext`
```typescript
interface NavRailContext {
  activeView: string;
  setActiveView: (view: string) => void;
}
```

### `InspectorContext`
```typescript
interface InspectorContext {
  activeTab: string;
}
```

### `ChatMessage`
```typescript
interface ChatMessage {
  id: string;
  content: string;
  type: 'perceptual' | 'agentic' | 'resonant' | 'error' | 'cognitive' | 'temporal' | 'meta';
  sender: 'user' | 'agent';
  timestamp: string;
  attachments?: ChatAttachment[];
}
```

### `FenceContext`
For code fence renderers:
```typescript
interface FenceContext {
  language: string;
  code: string;
  meta?: string;
}
```

---

## Available Slot IDs

| Slot ID | Category | Context Type | Allows Multiple |
|---------|----------|--------------|-----------------|
| `layout:panel` | Layout | `undefined` | Yes |
| `layout:stage-view` | Layout | `undefined` | Yes |
| `layout:sidebar-view` | Layout | `undefined` | Yes |
| `nav:rail-item` | Navigation | `NavRailContext` | Yes |
| `nav:rail-footer` | Navigation | `undefined` | Yes |
| `nav:menu-item` | Navigation | `undefined` | Yes |
| `nav:context-menu` | Navigation | `ContextMenuContext` | Yes |
| `inspector:tab` | Inspector | `InspectorContext` | Yes |
| `inspector:tab-button` | Inspector | `InspectorContext` | Yes |
| `inspector:tab-content` | Inspector | `InspectorContext` | Yes |
| `inspector:section` | Inspector | `InspectorContext` | Yes |
| `chat:message-before` | Chat | `ChatMessage` | Yes |
| `chat:message-after` | Chat | `ChatMessage` | Yes |
| `chat:message-action` | Chat | `ChatMessage` | Yes |
| `chat:input-before` | Chat | `undefined` | Yes |
| `chat:input-after` | Chat | `undefined` | Yes |
| `chat:empty-state` | Chat | `undefined` | No |
| `overlay:command-palette` | Overlay | `undefined` | Yes |
| `fence:renderer` | Specialized | `FenceContext` | Yes |
| `settings:tab` | Specialized | `undefined` | Yes |
| `onboarding:step` | Specialized | `undefined` | Yes |

---

## Type Definitions

### `PluginManifest`
```typescript
interface PluginManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  main?: string;
  renderer?: string;
  permissions?: string[];
  semanticDomain?: string;
}
```

### `AIRequestOptions`
```typescript
interface AIRequestOptions {
  contentType: 'chat' | 'code' | 'embedding';
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### `AIResponse`
```typescript
interface AIResponse {
  content: string;
  model: string;
  providerId: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

---

## Example: Full Plugin

```javascript
// main/index.js
module.exports = {
  activate(context) {
    // Register an SRIA tool
    context.dsn.registerTool(
      { name: 'myTool', description: 'Does something' },
      async (params) => {
        return { result: 'done' };
      }
    );
    
    // Listen for frontend messages
    context.ipc.on('do-action', async (data) => {
      const result = await someAsyncWork(data);
      context.ipc.send('action-result', result);
    });
  },
  
  deactivate() {
    // Cleanup
  }
};
```

```javascript
// renderer/index.js
export function activate(context) {
  const { React, ui } = context;
  
  // Register navigation with view
  ui.registerNavigation({
    id: 'my-plugin',
    label: 'My Plugin',
    icon: MyIcon,
    view: {
      id: 'my-plugin-view',
      name: 'My Plugin',
      icon: MyIcon,
      component: MyMainView
    }
  });
  
  // Register settings tab
  ui.registerSettingsTab({
    id: 'my-plugin-settings',
    label: 'My Plugin',
    icon: SettingsIcon,
    component: MySettingsPanel
  });
  
  // Register command
  ui.registerCommand({
    id: 'my-plugin:action',
    label: 'Do My Action',
    shortcut: 'Ctrl+Shift+M',
    action: () => {
      ui.showToast({ title: 'Action performed!', type: 'success' });
    }
  });
}
```
