# Frontend Development

The frontend of a plugin runs in the **Electron Renderer Process**. It uses React to render UI components that are injected into predefined slots throughout the application.

## Entry Point

The file specified in `manifest.json` under `"renderer"` (e.g., `renderer/index.js`) must export an `activate` function.

```javascript
export function activate(context) {
  // Register UI components here
}

export function deactivate() {
  // Cleanup if needed
}
```

## The RendererContext

The `context` object provides methods to register UI components and access shared libraries.

### Core Properties

#### `context.id`
Your plugin's unique identifier.

#### `context.manifest`
The parsed manifest object.

#### `context.React`
A reference to the React library (use this to avoid version conflicts).

#### `context.ui`
The UIExtensionAPI for registering components.

#### `context.ipc`
IPC bridge to communicate with your backend.

### Shared Hooks

#### `context.useAppStore`
Zustand hook for global application state (read-only recommended).

```javascript
const MyComponent = () => {
  const { network, agent } = context.useAppStore();
  return <div>Peers: {network.peers}</div>;
};
```

## UI Extension API

### Registering Navigation

Add a navigation item with an associated view:

```javascript
context.ui.registerNavigation({
  id: 'my-plugin-nav',
  label: 'My Plugin',
  icon: MyIcon,
  view: {
    id: 'my-plugin-view',
    name: 'My Plugin',
    icon: MyIcon,
    component: MyMainView
  },
  badge: () => unreadCount,  // Optional badge
  order: 50                   // Position in NavRail
});
```

### Registering Panels

Add dockable panels:

```javascript
context.ui.registerPanel({
  id: 'my-sidebar-panel',
  name: 'My Panel',
  icon: PanelIcon,
  component: MySidebarPanel,
  defaultLocation: 'left',
  defaultWeight: 25,
  enableClose: true
});
```

### Registering Stage Views

Add full-screen views:

```javascript
context.ui.registerStageView({
  id: 'my-full-view',
  name: 'Full View',
  icon: ViewIcon,
  component: MyFullScreenView
});
```

### Registering Inspector Tabs

Add tabs to the Inspector panel:

```javascript
context.ui.registerInspectorTab({
  id: 'my-inspector-tab',
  label: 'My Tab',
  icon: TabIcon,
  component: MyInspectorContent,
  priority: 50,
  badge: () => alertCount
});
```

### Registering Inspector Sections

Add sections to existing Inspector tabs:

```javascript
context.ui.registerInspectorSection({
  id: 'my-section',
  targetTab: 'Cortex',  // Built-in tab ID
  component: MySectionContent,
  location: 'bottom',
  priority: 10
});
```

### Registering Message Decorators

Customize how chat messages are displayed:

```javascript
context.ui.registerMessageDecorator({
  id: 'code-highlighter',
  match: (message) => message.content.includes('```'),
  after: CodeBlockEnhancer,
  actions: [
    {
      id: 'copy-code',
      label: 'Copy Code',
      icon: CopyIcon,
      onClick: (message) => copyToClipboard(message.content)
    }
  ],
  priority: 10
});
```

### Registering Settings Tabs

Add tabs to the Settings modal:

```javascript
context.ui.registerSettingsTab({
  id: 'my-plugin-settings',
  label: 'My Plugin',
  icon: SettingsIcon,
  component: MySettingsPanel,
  order: 100
});
```

### Registering Commands

Add commands to the command palette:

```javascript
context.ui.registerCommand({
  id: 'my-plugin:do-action',
  label: 'Do My Action',
  shortcut: 'Ctrl+Shift+M',
  icon: ActionIcon,
  action: () => {
    // Execute action
  },
  category: 'My Plugin'
});
```

## Showing Overlays

### Modals

```javascript
const result = await context.ui.showModal({
  id: 'my-modal',
  title: 'Confirmation',
  component: ConfirmDialog,
  size: 'md'  // 'sm' | 'md' | 'lg' | 'xl' | 'full'
});

if (result.confirmed) {
  // User confirmed
}
```

Modal component receives `close` function:

```javascript
const ConfirmDialog = ({ close }) => (
  <div>
    <p>Are you sure?</p>
    <button onClick={() => close({ confirmed: true })}>Yes</button>
    <button onClick={() => close({ confirmed: false })}>No</button>
  </div>
);
```

### Toasts

```javascript
context.ui.showToast({
  title: 'Success!',
  message: 'Operation completed',
  type: 'success',  // 'info' | 'success' | 'warning' | 'error'
  duration: 5000,
  action: {
    label: 'Undo',
    onClick: () => undoOperation()
  }
});
```

## Slot-Based Extension

### Available Slots

| Slot ID | Context | Description |
|---------|---------|-------------|
| `nav:rail-item` | NavRailContext | NavRail buttons |
| `nav:rail-footer` | - | NavRail bottom area |
| `inspector:tab` | InspectorContext | Inspector tabs |
| `inspector:section` | InspectorContext | Sections in tabs |
| `chat:message-before` | ChatMessage | Before message content |
| `chat:message-after` | ChatMessage | After message content |
| `chat:message-action` | ChatMessage | Message action buttons |
| `chat:input-before` | - | Before input field |
| `chat:input-after` | - | After input field |
| `settings:tab` | - | Settings modal tabs |
| `fence:renderer` | FenceContext | Code fence renderers |

### Direct Slot Registration

For lower-level control:

```javascript
context.ui.registerSlot('chat:message-after', {
  component: MyMessageFooter,
  priority: 10,
  filter: (message) => message.sender === 'agent',
  metadata: { label: 'My Footer' }
});
```

## Component Best Practices

### Use Provided React

```javascript
export function activate(context) {
  const { React } = context;
  const { useState, useEffect } = React;
  
  const MyComponent = () => {
    const [state, setState] = useState(null);
    // ...
  };
}
```

### Handle Cleanup

Return cleanup functions from registration:

```javascript
export function activate(context) {
  const cleanups = [];
  
  cleanups.push(
    context.ui.registerNavigation({ /* ... */ })
  );
  
  cleanups.push(
    context.ui.registerCommand({ /* ... */ })
  );
  
  // Store for deactivate
  context._cleanups = cleanups;
}

export function deactivate(context) {
  context._cleanups?.forEach(cleanup => cleanup());
}
```

### Error Boundaries

All slot content is wrapped in error boundaries, but handle errors gracefully:

```javascript
const MyComponent = () => {
  try {
    // Potentially failing code
  } catch (error) {
    return <ErrorDisplay error={error} />;
  }
};
```

### Styling

Use Tailwind CSS classes (available globally):

```javascript
const MyPanel = () => (
  <div className="p-4 bg-gray-900 rounded-lg border border-white/10">
    <h2 className="text-lg font-bold text-white mb-2">Title</h2>
    <p className="text-sm text-gray-400">Content</p>
  </div>
);
```

## IPC Communication

### Sending to Backend

```javascript
const MyComponent = () => {
  const handleClick = () => {
    context.ipc.send('fetch-data', { query: 'example' });
  };
  
  return <button onClick={handleClick}>Fetch</button>;
};
```

### Receiving from Backend

```javascript
const MyComponent = () => {
  const [data, setData] = React.useState(null);
  
  React.useEffect(() => {
    const cleanup = context.ipc.on('data-result', (result) => {
      setData(result);
    });
    
    return cleanup;
  }, []);
  
  return <div>{JSON.stringify(data)}</div>;
};
```

## Example: Complete Frontend Plugin

```javascript
// renderer/index.js
import { Database, Settings } from 'lucide-react';

export function activate(context) {
  const { React, ui, ipc } = context;
  const { useState, useEffect, useCallback } = React;
  
  // Main view component
  const DataBrowser = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const cleanup = ipc.on('data-loaded', (data) => {
        setItems(data.items);
        setLoading(false);
      });
      
      ipc.send('load-data');
      return cleanup;
    }, []);
    
    if (loading) {
      return <div className="p-4 text-gray-500">Loading...</div>;
    }
    
    return (
      <div className="p-4 space-y-2">
        {items.map(item => (
          <div key={item.id} className="p-3 bg-white/5 rounded-lg">
            {item.name}
          </div>
        ))}
      </div>
    );
  };
  
  // Settings panel
  const SettingsPanel = () => {
    const [apiKey, setApiKey] = useState('');
    
    return (
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-gray-400">API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1 block w-full bg-black/20 border border-white/10 rounded px-3 py-2"
          />
        </label>
      </div>
    );
  };
  
  // Register navigation with view
  const cleanupNav = ui.registerNavigation({
    id: 'data-browser',
    label: 'Data Browser',
    icon: Database,
    view: {
      id: 'data-browser-view',
      name: 'Data Browser',
      icon: Database,
      component: DataBrowser
    }
  });
  
  // Register settings
  const cleanupSettings = ui.registerSettingsTab({
    id: 'data-browser-settings',
    label: 'Data Browser',
    icon: Settings,
    component: SettingsPanel
  });
  
  // Register command
  const cleanupCommand = ui.registerCommand({
    id: 'data-browser:refresh',
    label: 'Refresh Data',
    action: () => ipc.send('load-data'),
    category: 'Data Browser'
  });
  
  // Store cleanups
  context._cleanups = [cleanupNav, cleanupSettings, cleanupCommand];
}

export function deactivate(context) {
  context._cleanups?.forEach(fn => fn());
}
```
