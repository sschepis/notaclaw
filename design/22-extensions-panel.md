# Extensions Panel Design

## Overview

The Extensions panel provides a unified interface for managing both locally installed plugins and remotely available OpenClaw skills. Users can filter, search, install, and manage extensions from this single view.

## Filter Modes

The panel supports three filter modes accessible via a dropdown selector:

### 1. All Extensions (Default)
- Shows all installed plugins first
- Followed by available OpenClaw skills that are not yet installed
- Items are clearly labeled with their installation status

### 2. Installed
- Shows only locally installed plugins
- Each entry shows: name, version, description, and a settings button
- Installed plugins can be configured or uninstalled

### 3. Upgradeable
- Shows only installed plugins that have newer versions available in OpenClaw
- Displays current version and available version
- Provides an "Update" action button

## Extension Types

### Plugin (Local)
A plugin is a locally installed package that may include:
- `manifest.json` - Required plugin metadata
- `main/` - Main process code (optional)
- `renderer/` - Renderer process UI components (optional)
- `aleph.json` - Optional Aleph extension configuration (see below)

### OpenClaw Skill (Remote)
Skills available from the OpenClaw registry that can be installed as plugins.
Skills are fetched from the configured OpenClaw registry endpoint.

## aleph.json Format

The `aleph.json` file, when present in a plugin directory, designates the plugin as an Aleph extension with additional capabilities:

```json
{
  "$schema": "https://aleph.network/schemas/aleph-extension-v1.json",
  "type": "aleph-extension",
  "alephVersion": "1.0.0",
  "capabilities": {
    "skillProvider": true,
    "dsnEnabled": true,
    "semanticDomain": "general"
  },
  "skills": [
    {
      "name": "skill_name",
      "description": "Skill description",
      "executionLocation": "SERVER" | "CLIENT"
    }
  ],
  "permissions": [
    "dsn:register-tool",
    "network:http"
  ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | No | JSON Schema URL for validation |
| `type` | string | Yes | Must be `"aleph-extension"` |
| `alephVersion` | string | Yes | Aleph extension API version |
| `capabilities.skillProvider` | boolean | No | Provides skills to the DSN |
| `capabilities.dsnEnabled` | boolean | No | Interacts with the DSN mesh |
| `capabilities.semanticDomain` | string | No | Primary semantic domain |
| `skills` | array | No | Skills this extension provides |
| `permissions` | array | Yes | Required permissions |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ExtensionsView.tsx                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌───────────────────────────────────────┐ │
│  │ Filter      │  │ Search Input                          │ │
│  │ Dropdown    │  └───────────────────────────────────────┘ │
│  └─────────────┘                                            │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Extension Item                                        │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ Name                        [Installed] [v1.0.0] │  │  │
│  │ │ Description text...                              │  │  │
│  │ │ plugin-id                          [Settings] ⚙  │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ OpenClaw Skill (Not Installed)                        │  │
│  │ ┌──────────────────────────────────────────────────┐  │  │
│  │ │ Skill Name                              [v2.0.0] │  │  │
│  │ │ Skill description...                             │  │  │
│  │ │ skill-id                               [Install] │  │  │
│  │ └──────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## State Management

The extension state is managed in `usePluginStore.ts`:

```typescript
interface PluginState {
  plugins: PluginManifest[];        // Installed plugins
  availableSkills: SkillManifest[]; // Remote skills from OpenClaw
  filter: ExtensionFilter;          // 'all' | 'installed' | 'upgradeable'
  
  setPlugins: (plugins: PluginManifest[]) => void;
  setAvailableSkills: (skills: SkillManifest[]) => void;
  setFilter: (filter: ExtensionFilter) => void;
}
```

## IPC Handlers

### getOpenClawSkills
Fetches available skills from the OpenClaw registry.

**Handler:** `client/src/main/index.ts`
**Preload:** `window.electronAPI.getOpenClawSkills()`
**Returns:** `SkillManifest[]`

### Future: installSkill
Installs a skill from OpenClaw.

**Handler:** TBD
**Preload:** `window.electronAPI.installSkill(skillId)`
**Returns:** `Promise<boolean>`

### Future: updatePlugin
Updates an installed plugin to the latest version.

**Handler:** TBD
**Preload:** `window.electronAPI.updatePlugin(pluginId)`
**Returns:** `Promise<boolean>`

## Type Definitions

### SkillManifest

```typescript
interface SkillManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  author?: string;
  downloadUrl?: string;
  semanticDomain?: string;
  downloads?: number;  // Download count from ClawHub
  stars?: number;      // Star count from ClawHub
}
```

### ExtensionFilter

```typescript
type ExtensionFilter = 'all' | 'installed' | 'upgradeable';
```

## Implementation Files

| File | Purpose |
|------|---------|
| [`client/src/renderer/components/layout/ExtensionsView.tsx`](../client/src/renderer/components/layout/ExtensionsView.tsx) | Main UI component |
| [`client/src/renderer/store/usePluginStore.ts`](../client/src/renderer/store/usePluginStore.ts) | State management |
| [`client/src/shared/plugin-types.ts`](../client/src/shared/plugin-types.ts) | Type definitions |
| [`client/src/main/index.ts`](../client/src/main/index.ts) | IPC handlers |
| [`client/src/preload/index.ts`](../client/src/preload/index.ts) | Preload bridge |
