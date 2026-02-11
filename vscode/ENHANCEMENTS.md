# Enhancement List for VS Code Agent Control Extension & notaclaw Plugin

## Status Legend
- ✅ Implemented
- 🔲 Not yet started

---

## 1. Critical Bug Fixes

### 1.1 ✅ Rate Limiter is Broken
**File:** [`AuthService.ts`](src/services/AuthService.ts)
**Issue:** The rate limiter used `requestCount / totalSeconds` which produces an average over the lifetime of the session. After 100 seconds, a client could burst 100 requests in 1 second and still pass the check.
**Fix:** Replaced with a proper `SlidingWindowRateLimiter` class using a 1-second sliding timestamp window.

### 1.2 ✅ Interval Timer Leak in AuthService
**File:** [`AuthService.ts`](src/services/AuthService.ts)
**Issue:** `setInterval` in the constructor was never cleared on dispose, leaking the timer.
**Fix:** Stored the interval handle in `cleanupInterval` and clear it in `dispose()`.

### 1.3 ✅ No Parameter Validation in WebSocket Router
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
**Issue:** Method handlers blindly cast `request.params as any` without validating required fields exist or are of the correct type.
**Fix:** Added `requireString()` and `requireParams()` helpers; all routed methods now validate required parameters.

### 1.4 ✅ Client Origin Not Tracked Post-Connection
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
**Issue:** `req.headers.origin` was read but not stored on the `Client` object, so auth received `'unknown'` origin.
**Fix:** Added `origin` field to `Client` interface and populated from `req.headers.origin`.

### 1.5 ✅ `editor.formatDocument` Not Exposed
**Files:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts), [`types.ts`](src/protocol/types.ts)
**Issue:** `EditorService.formatDocument()` existed but was not routed in the WebSocket server or listed in `METHOD_CATEGORIES`.
**Fix:** Added routing and method registry entry.

### 1.6 ✅ Unused Variable in EditorService.save()
**File:** [`EditorService.ts`](src/services/EditorService.ts)
**Issue:** Declared `uri` variable that was never used.
**Fix:** Removed the unused variable.

---

## 2. Extension Enhancements

### 2.1 Security

#### 2.1.1 ✅ TLS/WSS Support
**Files:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts), [`config.ts`](src/utils/config.ts), [`types.ts`](src/protocol/types.ts), [`package.json`](package.json)
Added optional TLS support with `tls.enabled`, `tls.certPath`, `tls.keyPath`, `tls.caPath` settings. When enabled, creates an HTTPS server for encrypted WebSocket (WSS) connections.

#### 2.1.2 ✅ Origin Enforcement
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
Added `isOriginAllowed()` method and enforcement in `handleConnection()` — rejects connections from disallowed origins with close code 1008.

#### 2.1.3 ✅ Per-Method Permission Scoping
**Files:** [`types.ts`](src/protocol/types.ts), [`config.ts`](src/utils/config.ts), [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
Added `security.allowedMethodCategories` config (array of category names: `editor`, `fs`, `terminal`, `command`, `state`, `search`, `debug`, `git`). When non-empty, only listed categories are routed; others return `FeatureDisabled`. Empty array means all categories allowed (default). Registered as VS Code setting in `package.json`.

### 2.2 New Methods

#### 2.2.1 ✅ JSON-RPC 2.0 Batch Request Support
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
`handleMessage()` now detects arrays, processes each element, and returns batch responses per JSON-RPC 2.0 spec.

#### 2.2.2 ✅ `editor.getDocumentInfo`
**File:** [`EditorService.ts`](src/services/EditorService.ts)
Returns `DocumentInfo`: uri, languageId, version, lineCount, isDirty.

#### 2.2.3 ✅ `editor.applyEdits`
**File:** [`EditorService.ts`](src/services/EditorService.ts)
Atomic multi-edit via `WorkspaceEdit` — applies multiple range replacements in a single operation.

#### 2.2.4 ✅ `fs.watchFiles` / `fs.unwatchFiles`
**File:** [`FileSystemService.ts`](src/services/FileSystemService.ts)
Watch glob patterns using `vscode.createFileSystemWatcher`. Changes broadcast as `file.changed` notifications.

#### 2.2.5 ✅ `editor.getCompletions`
**Files:** [`EditorService.ts`](src/services/EditorService.ts), [`WebSocketServer.ts`](src/server/WebSocketServer.ts), [`types.ts`](src/protocol/types.ts)
Calls `vscode.executeCompletionItemProvider` at a given position. Returns up to 100 completion items with label, kind, detail, insertText, sortText, and `isIncomplete` flag. Supports optional `triggerCharacter`.

#### 2.2.6 ✅ `state.getCodeActions`
**File:** [`StateService.ts`](src/services/StateService.ts)
Returns available code actions (quick fixes, refactorings) for a given range using `vscode.executeCodeActionProvider`.

#### 2.2.7 ✅ `terminal.getOutput`
**File:** [`TerminalService.ts`](src/services/TerminalService.ts)
Added output buffering (ring buffer of last 1000 lines) and `getOutput()` method to retrieve buffered terminal output.

#### 2.2.8 ✅ `debug.*` Method Category
**File:** [`DebugService.ts`](src/services/DebugService.ts)
New service with: `debug.startSession`, `debug.stopSession`, `debug.setBreakpoints`, `debug.removeBreakpoints`, `debug.getBreakpoints`, `debug.listSessions`.

#### 2.2.9 ✅ `git.*` Method Category
**File:** [`GitService.ts`](src/services/GitService.ts)
New service using VS Code's built-in Git extension API: `git.status`, `git.diff`, `git.log`, `git.stage`, `git.unstage`, `git.commit`, `git.checkout`, `git.branches`.

#### 2.2.10 ✅ Route `state.getOpenDocuments` / `state.getVisibleEditors`
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
Methods already existed in StateService but were not routed. Now accessible via the protocol.

### 2.3 Security & Safety

#### 2.3.1 ✅ Path Sandboxing
**File:** [`FileSystemService.ts`](src/services/FileSystemService.ts)
Rewrote `resolvePath()` to use `path.resolve()` for proper normalization. Added workspace containment check in `checkAccess()` — resolved paths must start with the workspace root, preventing `../` traversal attacks.

#### 2.3.2 ✅ Command Allow-List
**Files:** [`config.ts`](src/utils/config.ts), [`types.ts`](src/protocol/types.ts), [`package.json`](package.json)
Added `security.allowedCommands` array config. When non-empty (allow-list mode), only listed commands pass `isCommandRestricted()`. Otherwise falls back to deny-list (`restrictedCommands`). Registered as VS Code setting.

#### 2.3.3 ✅ Approval Workflow for Destructive Operations
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
Added `confirmDestructiveOperation()` — when `security.requireApproval` is enabled, shows a modal warning dialog before `fs.deleteFile` and `fs.deleteDirectory`. User must click "Allow" to proceed.

### 2.4 Reliability

#### 2.4.1 ✅ Structured Error Enrichment
**File:** [`errors.ts`](src/protocol/errors.ts)
All error responses now include structured `data` payloads with `timestamp` (ISO 8601), `errorType` (protocol/Error name/unknown), and optional `stack` trace (only when `logLevel` is `debug`). Also handles `__invalidParams` errors from validation helpers, converting them to proper `InvalidParams` responses.

#### 2.4.2 ✅ WebSocket Ping/Pong Health Check
**File:** [`WebSocketServer.ts`](src/server/WebSocketServer.ts)
30-second ping interval detects and removes stale connections. Graceful shutdown sends `server.shutdown` notification to clients.

---

## 3. Plugin (vscode-control) Enhancements

### 3.1 ✅ Register All Available Tools
**File:** [`../plugins-extended/vscode-control/src/index.ts`](../plugins-extended/vscode-control/src/index.ts)
Expanded from 5 tools to 30+ tools covering: editor (open, close, get content, edit, insert, replace, apply edits, save, save all, get active, get open, format), file system (read, write, delete, list, rename, exists), terminal (run command, list), search (find, find and replace), state (diagnostics, symbols, references, definitions, hover, workspace, code actions), and command execution.

### 3.2 ✅ Fix Auth Race Condition
**File:** [`../plugins-extended/vscode-control/src/index.ts`](../plugins-extended/vscode-control/src/index.ts)
Added `waitForAuth()` pattern — `send()` awaits `authPromise` before sending any request, preventing messages from being sent before auth completes.

### 3.3 ✅ Exponential Backoff Reconnect
**File:** [`../plugins-extended/vscode-control/src/index.ts`](../plugins-extended/vscode-control/src/index.ts)
Replaced fixed 5-second timer with exponential backoff (1s, 2s, 4s, 8s... max 60s) with random jitter. Resets on successful connection.

### 3.4 ✅ Notification Handling
**File:** [`../plugins-extended/vscode-control/src/index.ts`](../plugins-extended/vscode-control/src/index.ts)
Added `onNotification()` method and `dispatchNotification()` for server-sent events: `terminal.output`, `terminal.closed`, `file.changed`, `server.shutdown`.

### 3.5 ✅ `deactivate()` Export
**File:** [`../plugins-extended/vscode-control/src/index.ts`](../plugins-extended/vscode-control/src/index.ts)
Exported `deactivate()` that calls `client.dispose()` — closes WebSocket, stops reconnect timer, rejects pending requests.

---

## 4. Architectural Improvements

### 4.1 ✅ Service Registry Pattern
**File:** [`ServiceRegistry.ts`](src/services/ServiceRegistry.ts)
Lightweight DI container supporting factory registration (lazy singleton or transient), instance registration, and automatic `dispose()` calls on cleanup. Exported via `src/services/index.ts`.

### 4.2 ✅ Request Middleware Pipeline
**File:** [`Middleware.ts`](src/server/Middleware.ts)
Composable middleware pipeline with `use()`, `useBefore()`, `useAfter()`, `remove()` for named middlewares. Built-in factories: `createLoggingMiddleware()`, `createAuthMiddleware()`, `createPermissionMiddleware()`. Each middleware receives `(ctx, next)` and can short-circuit or transform responses.

### 4.3 ✅ Event Bus
**File:** [`EventBus.ts`](src/utils/EventBus.ts)
Typed publish/subscribe event bus with `on()`, `once()`, `emit()`, `removeAllListeners()`, `dispose()`. Typed for all extension events (file changes, terminal output, editor events, debug events, server lifecycle). Error isolation ensures one handler's exception doesn't break others.

### 4.4 ✅ Method Schema Validation
**File:** [`MethodSchemas.ts`](src/server/MethodSchemas.ts)
Parameter schemas for all 30+ methods with type checking (string, number, boolean, array, object), required fields, `minLength`, `min`/`max` constraints, and array item type validation. `validateParams()` function and `createValidationMiddleware()` factory for pipeline integration.

---

## 5. Testing

### 5.1 ✅ Expanded Unit Tests
**Files:**
- [`eventBus.test.ts`](src/test/suite/eventBus.test.ts) — EventBus subscribe/emit/once/dispose/error isolation
- [`serviceRegistry.test.ts`](src/test/suite/serviceRegistry.test.ts) — Register/resolve/singleton/transient/dispose
- [`middleware.test.ts`](src/test/suite/middleware.test.ts) — Pipeline ordering, short-circuit, insert before/after, auth middleware, logging middleware
- [`validation.test.ts`](src/test/suite/validation.test.ts) — Schema validation: types, required, string constraints, number ranges, array items

### 5.2 ✅ Integration Tests
**File:** [`integration.test.ts`](src/test/suite/integration.test.ts)
Protocol-level integration tests verifying: JSON-RPC message structure, batch requests, notifications, auth flow, error format, method category routing.

### 5.3 ✅ Rate Limiter Unit Tests
**File:** [`rateLimiter.test.ts`](src/test/suite/rateLimiter.test.ts)
Tests for sliding window rate limiting: allows under limit, blocks over limit, independent client tracking, window sliding/expiry, burst detection, cleanup, zero-limit edge case.

---

## 6. Documentation

### 6.1 ✅ Protocol Reference
**File:** [`PROTOCOL.md`](PROTOCOL.md)
Complete protocol reference with: connection & auth flow, request/response format, batch requests, all error codes, full method reference (9 categories, 50+ methods with parameter tables and result types), notifications, and configuration reference.

### 6.2 ✅ Plugin Developer Guide
**File:** [`PLUGIN_GUIDE.md`](PLUGIN_GUIDE.md)
Comprehensive guide covering: architecture overview, quick start template, authentication (challenge-response flow, auth gate pattern, token computation), all methods grouped by category, notifications, batch requests, error handling, reconnection with exponential backoff, security considerations, configuration reference, and reference implementation pointer.

### 6.3 ✅ Security Hardening Guide
**File:** [`SECURITY.md`](SECURITY.md)
Comprehensive guide covering: token management, network security (localhost binding, origin enforcement), file system sandboxing, command allow-list/deny-list, destructive operation approval, method category restrictions, logging, recommended production configuration, and threat model.
