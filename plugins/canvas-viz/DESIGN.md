# Canvas Visualizer Design Specification

## Overview
This document outlines the design for the Canvas Visualizer plugin enhancements, focusing on security, performance, and developer experience.

## 1. Security Sandbox
**Goal**: Isolate user code execution.
- **Implementation**: Continue using `iframe` with `sandbox="allow-scripts"`.
- **Improvement**: Use `Blob` URL for the iframe source instead of `srcDoc` to better handle large content and potentially use `Worker` for computation if needed.
- **Communication**: Use `postMessage` for communication between the main app and the iframe (e.g., for data binding).

## 2. Code Editor Integration
**Goal**: Better coding experience.
- **Library**: `react-simple-code-editor` with `prismjs` for syntax highlighting.
- **UI**: Split pane layout (resizable) with Editor on the left/bottom and Canvas on the right/top.

## 3. Library Support
**Goal**: Easy access to visualization libraries.
- **Mechanism**: Inject `<script>` tags for popular libraries (D3, Chart.js, Three.js) into the iframe head based on configuration or auto-detection.
- **Registry**: Maintain a list of supported libraries and their CDN URLs.

## 4. Export Functionality
**Goal**: Save visualizations.
- **Image**: `canvas.toDataURL()` sent via `postMessage` to main app for download.
- **Video**: `MediaRecorder` API on the canvas stream, sending chunks to main app.

## 5. Data Binding
**Goal**: Real-time updates.
- **API**: `window.onData(callback)` inside the sandbox.
- **Mechanism**: Main app subscribes to DSN/Context and sends `postMessage` with data updates to the iframe.

## 6. Performance
**Goal**: Smooth rendering.
- **Loop**: Provide `class CanvasVisualization` with `start()`, `stop()`, `animate()` methods (already partially present, will refine).
- **Offscreen**: Explore `OffscreenCanvas` if `Worker` strategy is adopted, but `iframe` is simpler for DOM-based libs like D3. We will stick to `iframe` for broad compatibility but ensure `requestAnimationFrame` is managed correctly.

## Plan
1.  **Dependencies**: Install `react-simple-code-editor`, `prismjs`.
2.  **Refactor**: Split `CanvasRenderer` into sub-components (`Editor`, `Preview`, `Toolbar`).
3.  **Sandbox**: Enhance the iframe construction logic using Blob.
4.  **Features**: Implement Export and Library injection.
5.  **Data Binding**: Add IPC listeners and pass data to iframe.
