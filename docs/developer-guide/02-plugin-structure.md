# Plugin Structure

A plugin is simply a directory inside the `plugins/` folder. It must contain a `manifest.json` file and the entry points defined therein.

## File Layout

```
my-plugin/
├── manifest.json       # Metadata & Permissions
├── main/
│   └── index.js        # Backend entry point (Node.js)
├── renderer/
│   └── index.js        # Frontend entry point (React/ESM)
└── assets/             # Icons, images, etc.
```

## The Manifest (`manifest.json`)

The manifest is the passport for your plugin. It tells the system who you are and what you need.

```json
{
  "id": "com.example.weather",
  "version": "1.0.0",
  "name": "Weather Agent",
  "description": "Provides weather updates",
  "main": "main/index.js",
  "renderer": "renderer/index.js",
  "permissions": [
    "network:http",
    "store:read"
  ],
  "semanticDomain": "perceptual"
}
```

### Key Fields
*   **id**: Unique identifier (reverse domain notation recommended).
*   **main**: Path to the backend entry point (relative to plugin root).
*   **renderer**: Path to the frontend entry point (relative to plugin root).
*   **permissions**: Array of capability strings required by the plugin.
