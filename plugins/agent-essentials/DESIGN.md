# Agent Essentials - Design Document

## 1. Overview
This document outlines the design for enhancing the `@alephnet/agent-essentials` plugin. The goal is to transform the current basic implementation into a robust, secure, and feature-rich suite of tools for the SRIA agent.

## 2. Architecture
The plugin will be refactored into a modular architecture to support scalability and maintainability.

### 2.1 Directory Structure
```
plugins/agent-essentials/
├── main/
│   ├── index.ts                # Entry point
│   ├── services/
│   │   ├── FilesystemService.ts # Sandbox & File Ops
│   │   ├── WebSearchService.ts  # Search & Rate Limiting
│   │   ├── SystemInfoService.ts # System Metrics
│   │   ├── BrowserService.ts    # Headless Browser
│   │   └── ClipboardService.ts  # Clipboard & Screenshot
│   ├── tools/                  # Tool definitions
│   │   ├── index.ts            # Tool registration
│   │   ├── filesystem.ts
│   │   ├── web.ts
│   │   └── system.ts
│   └── utils/
│       ├── RateLimiter.ts
│       └── ErrorHandler.ts
├── renderer/
│   ├── components/
│   │   ├── FileExplorer/
│   │   ├── SystemMonitor/
│   │   └── SearchHistory/
│   └── ...
└── ...
```

### 2.2 Core Components
- **PluginManager**: (Existing) Manages the lifecycle of the plugin.
- **Service Layer**: Encapsulates business logic (e.g., `FilesystemService` handles sandbox logic).
- **Tool Layer**: Defines the DSN tools exposed to the agent, delegating execution to services.

## 3. Security & Sandboxing (Critical)
### 3.1 Filesystem Sandbox
- **Objective**: Restrict agent file access to specific directories.
- **Implementation**:
  - `FilesystemService` will maintain a `allowedPaths` list (default: `~/alephnet/sandbox`).
  - All file operations will validate paths using `path.resolve()` to ensure they are within allowed directories.
  - Attempting to access paths outside the sandbox will throw a `SecurityError`.
  - **Virtual Filesystem**: For testing and strict environments, an optional in-memory filesystem adapter can be used.

### 3.2 Rate Limiting
- **Objective**: Prevent abuse of external APIs.
- **Implementation**:
  - `RateLimiter` class implementing a Token Bucket algorithm.
  - `WebSearchService` will consume tokens before making requests.
  - Configurable limits (e.g., 10 requests/minute).

## 4. Functional Enhancements
### 4.1 Advanced File Operations
- **Compression**: Support `zip` and `tar` using `archiver` and `unzipper` (or similar libraries).
- **Encryption**: AES-256 encryption for files using Node's `crypto` module.
- **Batch Operations**: `moveFiles`, `deleteFiles` accepting arrays of paths.

### 4.2 Headless Browser
- **Library**: `puppeteer` (or `puppeteer-core` if Chrome is available).
- **Capabilities**:
  - `browse_page(url)`: Render page and return text/HTML.
  - `screenshot_page(url)`: Capture page screenshot.
  - `extract_data(url, selector)`: Scrape specific data.

### 4.3 System Integration
- **Clipboard**: Use `clipboardy` to read/write system clipboard.
- **Screenshots**: Use `screenshot-desktop` to capture screen content.
- **Notifications**: Use `node-notifier` for desktop alerts.
- **System Info**: Use `systeminformation` for detailed CPU, Memory, and Network stats.

## 5. UI/UX Enhancements
### 5.1 File Explorer
- **Components**: `FileTree`, `FileList`, `FilePreview`.
- **Features**: Navigate sandbox, view text/images, create/delete files/folders.

### 5.2 System Monitor
- **Components**: `ResourceGraph` (using Recharts or similar).
- **Features**: Real-time display of CPU usage, Memory consumption, and Network activity.

### 5.3 Search History
- **Storage**: Persist search queries and results in a local JSON file or `localStorage`.
- **UI**: List of past searches, click to re-run or view cached results.

## 6. Testing Strategy
- **Mock Filesystem**: Use `memfs` or manual mocks to test `FilesystemService` without disk I/O.
- **API Mocking**: Mock `https.get` and `puppeteer` calls in Jest tests.
- **Unit Tests**: Cover `RateLimiter`, `PathValidation`, and Tool definitions.

## 7. Implementation Plan
1.  **Refactor**: Create directory structure and move existing logic to Services.
2.  **Security**: Implement `FilesystemService` with sandboxing.
3.  **Features**: Add System Info, Browser, and Clipboard services.
4.  **UI**: Build File Explorer and System Monitor components.
5.  **Integration**: Wire up tools to services and register them.
6.  **Testing**: Write comprehensive tests for all new features.
