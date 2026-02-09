# Backend Development

The backend of a plugin runs in the **Electron Main Process**. This is where you handle business logic, file I/O, network requests, and heavy computation.

## Entry Point
The file specified in `manifest.json` under `"main"` (e.g., `main/index.js`) must export an `activate` function.

```javascript
module.exports = {
  activate: function(context) {
    console.log('My Plugin Activated!');
    
    // Your initialization logic here
  },
  
  deactivate: function() {
    console.log('My Plugin Deactivated');
    // Cleanup logic here
  }
};
```

## The PluginContext
The `context` object passed to `activate` is your bridge to the rest of the application.

### `context.id`
The ID of your plugin.

### `context.ipc`
Used to communicate with your frontend.
*   `context.ipc.on(channel, handler)`: Listen for messages.
*   `context.ipc.send(channel, data)`: Send messages.

### `context.storage`
Persistent storage scoped to your plugin.
*   `await context.storage.get(key)`
*   `await context.storage.set(key, value)`

### `context.dsn` (If permitted)
Access to AlephNet capabilities.
*   `context.dsn.registerTool(def, handler)`: Register an SRIA tool.

## Example: Weather Service

```javascript
const https = require('https');

module.exports = {
  activate: function(context) {
    
    // Listen for requests from the frontend
    context.ipc.on('fetch-weather', (data) => {
      const city = data.city;
      
      // Perform logic
      fetchWeather(city).then(result => {
        // Send result back
        context.ipc.send('weather-data', result);
      });
    });
  }
};
```
