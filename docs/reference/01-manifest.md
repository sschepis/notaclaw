# Manifest Schema (`manifest.json`)

The `manifest.json` file is required for every plugin. It defines metadata, entry points, permissions, and semantic properties.

## Complete Schema

```json
{
  "id": "string (required)",
  "version": "string (required)",
  "name": "string (required)",
  "description": "string (required)",
  "author": "string (optional)",
  "license": "string (optional)",
  "main": "string (optional)",
  "renderer": "string (optional)",
  "permissions": "string[] (optional)",
  "semanticDomain": "string (optional)",
  "aleph": "object (optional)"
}
```

## Core Fields

### `id`
*   **Type**: `string`
*   **Required**: Yes
*   **Description**: A unique identifier for the plugin.
*   **Format**: Reverse domain notation recommended (e.g., `com.company.plugin-name`)
*   **Constraints**: Must be unique across all installed plugins

**Examples**:
```json
"id": "com.aleph.canvas-viz"
"id": "org.mycompany.data-analyzer"
```

### `version`
*   **Type**: `string`
*   **Required**: Yes
*   **Description**: The version of the plugin.
*   **Format**: SemVer recommended (e.g., `1.0.0`, `0.1.0-alpha`)

**Examples**:
```json
"version": "1.0.0"
"version": "2.1.3-beta.1"
```

### `name`
*   **Type**: `string`
*   **Required**: Yes
*   **Description**: The human-readable name of the plugin.
*   **Constraints**: Keep concise, 2-4 words recommended

**Examples**:
```json
"name": "Canvas Visualization"
"name": "Data Analyzer Pro"
```

### `description`
*   **Type**: `string`
*   **Required**: Yes
*   **Description**: A short description of what the plugin does.
*   **Constraints**: 1-2 sentences, under 200 characters recommended

**Examples**:
```json
"description": "Interactive canvas for visualizing node graphs and diagrams."
"description": "Analyzes data patterns and generates insights."
```

## Optional Metadata Fields

### `author`
*   **Type**: `string`
*   **Description**: Plugin author or organization.

```json
"author": "AlephNet Team"
```

### `license`
*   **Type**: `string`
*   **Description**: License identifier (SPDX format recommended).

```json
"license": "MIT"
```

### `repository`
*   **Type**: `string`
*   **Description**: URL to the plugin's source repository.

```json
"repository": "https://github.com/org/plugin-name"
```

### `homepage`
*   **Type**: `string`
*   **Description**: URL to plugin documentation or website.

```json
"homepage": "https://docs.example.com/plugin"
```

## Entry Points

### `main`
*   **Type**: `string`
*   **Description**: Relative path to the backend entry point (Node.js/CommonJS module).
*   **Context**: Runs in Electron Main process
*   **Export**: Must export `activate(context)` and optionally `deactivate()`

```json
"main": "main/index.js"
```

### `renderer`
*   **Type**: `string`
*   **Description**: Relative path to the frontend entry point (ES Module).
*   **Context**: Runs in Electron Renderer process
*   **Export**: Must export `activate(context)` and optionally `deactivate()`

```json
"renderer": "renderer/bundle.js"
```

**Note**: At least one of `main` or `renderer` should be specified for a functional plugin.

## Permissions

### `permissions`
*   **Type**: `string[]`
*   **Description**: A list of capability strings required by the plugin.
*   **Enforcement**: Plugin operations are restricted to granted permissions.

```json
"permissions": [
  "network:http",
  "store:read",
  "store:write"
]
```

### Available Permissions

| Permission | Description | Risk Level |
|------------|-------------|------------|
| `network:http` | Make HTTP/HTTPS requests | Medium |
| `network:ws` | Open WebSocket connections | Medium |
| `fs:read` | Read files from the filesystem | High |
| `fs:write` | Write files to the filesystem | High |
| `store:read` | Read from the application state | Low |
| `store:write` | Modify the application state | Medium |
| `dsn:register-tool` | Register an SRIA agent tool | Medium |
| `dsn:register-service` | Register a background service | Medium |
| `dsn:publish` | Publish observations to the mesh | Medium |
| `dsn:query` | Query the semantic mesh | Low |
| `secrets:read` | Read from secure credential storage | High |
| `secrets:write` | Write to secure credential storage | High |
| `ai:request` | Make AI provider requests | Medium |

## Semantic Properties

### `semanticDomain`
*   **Type**: `string`
*   **Description**: A hint for the AlephNet Global Memory Field (GMF) regarding the semantic nature of this plugin.
*   **Purpose**: Enables semantic routing and discovery

**Common Values**:

| Domain | Description |
|--------|-------------|
| `cognitive` | Reasoning, analysis, decision-making |
| `perceptual` | Observation, monitoring, sensing |
| `temporal` | Time-based operations, scheduling |
| `spatial` | Location, mapping, visualization |
| `social` | Communication, collaboration |
| `economic` | Transactions, resources |

```json
"semanticDomain": "perceptual"
```

## AlephNet Configuration

### `aleph`
*   **Type**: `object`
*   **Description**: Extended configuration for AlephNet integration.

```json
"aleph": {
  "tools": [...],
  "services": [...],
  "smfProfile": [...]
}
```

### `aleph.tools`
Array of SRIA tool definitions that the plugin registers.

```json
"aleph": {
  "tools": [
    {
      "name": "analyze_data",
      "description": "Analyzes structured data and returns insights",
      "parameters": {
        "type": "object",
        "properties": {
          "data": { "type": "string", "description": "JSON data to analyze" }
        },
        "required": ["data"]
      }
    }
  ]
}
```

### `aleph.services`
Array of background service definitions.

```json
"aleph": {
  "services": [
    {
      "name": "data-monitor",
      "description": "Monitors data sources for changes",
      "interval": 60000
    }
  ]
}
```

### `aleph.smfProfile`
Default SMF vector for semantic positioning (16 dimensions).

```json
"aleph": {
  "smfProfile": [0.8, 0.2, 0.5, 0.1, 0.9, 0.3, 0.6, 0.4, 
                 0.7, 0.2, 0.8, 0.1, 0.5, 0.3, 0.6, 0.4]
}
```

## Complete Example

```json
{
  "id": "com.aleph.weather-agent",
  "version": "1.2.0",
  "name": "Weather Agent",
  "description": "Provides real-time weather data and forecasts.",
  "author": "AlephNet Team",
  "license": "MIT",
  "main": "main/index.js",
  "renderer": "renderer/bundle.js",
  "permissions": [
    "network:http",
    "store:read",
    "store:write",
    "dsn:register-tool"
  ],
  "semanticDomain": "perceptual",
  "aleph": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or coordinates"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "smfProfile": [0.9, 0.1, 0.3, 0.2, 0.8, 0.1, 0.7, 0.2,
                   0.5, 0.3, 0.6, 0.2, 0.4, 0.1, 0.8, 0.3]
  }
}
```

## Validation

The PluginManager validates manifests on load:

1. **Required fields**: `id`, `version`, `name`, `description` must be present
2. **Unique ID**: No duplicate plugin IDs allowed
3. **Valid JSON**: Must be parseable JSON
4. **Entry points**: At least one of `main` or `renderer` should exist
5. **Permissions**: All requested permissions must be recognized

### Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required field` | Required field not present | Add the missing field |
| `Duplicate plugin ID` | Another plugin has same ID | Use unique ID |
| `Invalid JSON` | Syntax error in manifest | Fix JSON syntax |
| `Entry point not found` | Specified file doesn't exist | Check file path |
| `Unknown permission` | Unrecognized permission string | Use valid permission |

## Best Practices

1. **Use Descriptive IDs**: Include organization and purpose
2. **Follow SemVer**: Update version appropriately for changes
3. **Minimal Permissions**: Only request what you need
4. **Semantic Domain**: Choose the most relevant domain
5. **Document Tools**: Provide clear descriptions for SRIA tools
