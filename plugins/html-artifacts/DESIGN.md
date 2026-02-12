# HTML Artifact Studio - Design Document

## Overview
This document outlines the design for enhancing the HTML Artifact Studio plugin to support advanced features like React components, security sandboxing, state persistence, and a better developer experience.

## Architecture

### 1. Main Process (`main/index.js`)
- **Responsibility**: 
  - Manage artifact storage (persistence).
  - Handle export/publish actions via DSN.
  - Serve as the bridge for file system operations if needed.
- **Enhancements**:
  - Implement `saveArtifact` and `loadArtifacts` IPC handlers.
  - Implement `publishArtifact` to DSN.
  - Implement `versionArtifact` to store history.

### 2. Renderer Process (`renderer/index.tsx`)
- **Responsibility**: 
  - UI for editing and previewing artifacts.
  - Client-side compilation of React/JSX.
  - Sandboxed rendering.
- **Components**:
  - `ArtifactStudio`: Main layout container.
  - `Editor`: Code editor (using `react-simple-code-editor` or `monaco-editor` if feasible, likely `react-simple-code-editor` for simplicity in this environment).
  - `Preview`: Sandboxed `iframe` component.
  - `Console`: Output pane for iframe logs/errors.
  - `Toolbar`: Actions for saving, exporting, changing templates.

## Feature Implementation Details

### 1. Security Sandbox
- **Mechanism**: Use an `iframe` with the `sandbox` attribute.
- **Attributes**: `allow-scripts`, `allow-forms`, `allow-popups`, `allow-modals`. **Exclude** `allow-same-origin` if possible to prevent access to the parent's storage/cookies, but this might break some local storage usage within the artifact. We will use `srcDoc` or a Blob URL to render content.
- **CSP**: Inject a `<meta http-equiv="Content-Security-Policy" ...>` tag into the generated HTML to restrict external connections (unless explicitly allowed).

### 2. React Component Support
- **Compiler**: Use `@babel/standalone` to transform JSX code in the browser.
- **Runtime**: Inject React and ReactDOM from a CDN (e.g., unpkg or esm.sh) into the iframe.
- **Template**: Wrap user code in a standard React mount boilerplate:
  ```javascript
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  // User code here...
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
  ```

### 3. State Persistence & Versioning
- **Storage**: Use the plugin's `context.storage` API.
- **Structure**:
  ```json
  {
    "artifacts": {
      "id_1": {
        "id": "id_1",
        "title": "My Component",
        "type": "react",
        "content": "...",
        "versions": [
          { "timestamp": 123456789, "content": "..." }
        ],
        "externalLibs": ["https://cdn.example.com/lib.js"]
      }
    }
  }
  ```

### 4. External Libraries
- **UI**: A settings panel for each artifact to add URL references to JS/CSS files.
- **Injection**: Dynamically add `<script src="...">` and `<link rel="stylesheet" ...>` tags to the iframe head.

### 5. Data Binding
- **Mechanism**: `window.postMessage` from parent to iframe.
- **Iframe Side**: Provide a helper function `useData()` (hook) or `window.onDataUpdate(callback)` for artifacts to consume data.

### 6. Export/Publish
- **Export**: Generate a standalone `.html` file containing all code and styles.
- **Publish**: Use `context.dsn.publish` (if available) to store the artifact on the network.

### 7. UI/UX Enhancements
- **Split View**: Implement a resizable split pane.
- **Live Preview**: Debounced update of the iframe content (e.g., 500ms delay after typing).
- **Template Gallery**: A set of predefined templates (Basic HTML, React Counter, Tailwind Dashboard, etc.).

## Implementation Plan

1.  **Dependencies**: Install `@babel/standalone` for JSX compilation.
2.  **Refactor Main**: Update `main/index.js` to handle storage and IPC events for saving/loading.
3.  **Refactor Renderer**:
    -   Create `components/Editor.tsx`.
    -   Create `components/Preview.tsx` (Iframe logic).
    -   Create `components/Toolbar.tsx`.
    -   Update `ArtifactStudio` to manage state and layout.
4.  **Implement Compiler**: Write a utility to wrap user code and transform JSX.
5.  **Add Templates**: Create a `templates.ts` file.
6.  **Testing**: Verify rendering and interaction.

## Release Readiness
- Error handling for compilation errors.
- Loading states.
- Clean UI with proper styling (Tailwind is already used).
