# IPC Communication

Inter-Process Communication (IPC) is the mechanism that allows your plugin's Frontend (Renderer) to talk to its Backend (Main).

## Security & Routing
The application uses a routed IPC system. You do not send messages to the global channel; instead, you send messages to specific channels defined by your plugin.

Behind the scenes, the `PluginManager` prefixes all channels with your plugin ID:
`plugin:<your-plugin-id>:<channel-name>`

This ensures that:
1.  Your messages don't collide with other plugins.
2.  Other plugins cannot eavesdrop on your private communications.

## Sending from Frontend to Backend

**Frontend (React Component):**
```javascript
// Send a request
context.ipc.send('get-data', { id: 123 });
```

**Backend (Main Process):**
```javascript
activate(context) {
  context.ipc.on('get-data', (payload) => {
    console.log('Received:', payload); // { id: 123 }
  });
}
```

## Sending from Backend to Frontend

**Backend (Main Process):**
```javascript
// Send an update
context.ipc.send('data-update', { status: 'complete' });
```

**Frontend (React Component):**
```javascript
useEffect(() => {
  const handler = (payload) => {
    console.log('Update:', payload); // { status: 'complete' }
  };
  
  context.ipc.on('data-update', handler);
  
  // Cleanup is important!
  return () => {
    // context.ipc.off('data-update', handler); // (If supported)
  };
}, []);
```
