# Agent Control Protocol Reference

**Version:** 0.1.0  
**Transport:** WebSocket (JSON-RPC 2.0)  
**Default Port:** 19876  
**Default Host:** 127.0.0.1

---

## Table of Contents

1. [Connection & Authentication](#connection--authentication)
2. [Request Format](#request-format)
3. [Response Format](#response-format)
4. [Batch Requests](#batch-requests)
5. [Error Codes](#error-codes)
6. [Method Reference](#method-reference)
   - [auth](#auth)
   - [editor](#editor)
   - [fs](#fs-file-system)
   - [terminal](#terminal)
   - [command](#command)
   - [state](#state)
   - [search](#search)
   - [debug](#debug)
   - [git](#git)
7. [Notifications](#notifications)
8. [Configuration](#configuration)

---

## Connection & Authentication

### Flow

1. Client opens a WebSocket connection to `ws://{host}:{port}`
2. Server sends `auth.challenge` notification with `{ nonce: string }`
3. Client sends `auth.authenticate` request with `{ token: string, nonce: string }`
4. Server responds with `{ authenticated: boolean, sessionId?: string, error?: string }`
5. All subsequent requests require a valid session

### Example

```json
// Server → Client (notification)
{ "jsonrpc": "2.0", "method": "auth.challenge", "params": { "nonce": "abc123" } }

// Client → Server (request)
{ "jsonrpc": "2.0", "id": 1, "method": "auth.authenticate", "params": { "token": "your-token", "nonce": "abc123" } }

// Server → Client (response)
{ "jsonrpc": "2.0", "id": 1, "result": { "authenticated": true, "sessionId": "uuid" } }
```

---

## Request Format

All requests follow JSON-RPC 2.0:

```typescript
{
  jsonrpc: "2.0",
  id: string | number,      // Request identifier
  method: string,            // "category.methodName"
  params?: Record<string, unknown>  // Method parameters
}
```

---

## Response Format

### Success

```typescript
{
  jsonrpc: "2.0",
  id: string | number,
  result: unknown
}
```

### Error

```typescript
{
  jsonrpc: "2.0",
  id: string | number | null,
  error: {
    code: number,
    message: string,
    data?: {
      timestamp: string,     // ISO 8601
      errorType: string,     // "protocol" | Error name | "unknown"
      stack?: string,        // Only when logLevel is "debug"
      [key: string]: unknown // Additional context (path, command, etc.)
    }
  }
}
```

---

## Batch Requests

Send an array of requests; receive an array of responses:

```json
// Client → Server
[
  { "jsonrpc": "2.0", "id": 1, "method": "editor.getActiveFile" },
  { "jsonrpc": "2.0", "id": 2, "method": "state.getWorkspace" }
]

// Server → Client
[
  { "jsonrpc": "2.0", "id": 1, "result": { "path": "/src/app.ts", "languageId": "typescript" } },
  { "jsonrpc": "2.0", "id": 2, "result": { "folders": ["/project"], "name": "my-project" } }
]
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | ParseError | Invalid JSON |
| -32600 | InvalidRequest | Invalid JSON-RPC request |
| -32601 | MethodNotFound | Method does not exist |
| -32602 | InvalidParams | Missing or invalid parameters |
| -32603 | InternalError | Unexpected server error |
| -32001 | Unauthorized | Authentication required |
| -32002 | FileNotFound | File does not exist |
| -32003 | FileAccessDenied | File access restricted |
| -32004 | TerminalNotFound | Terminal ID not found |
| -32005 | EditorNotActive | No active text editor |
| -32006 | OperationCancelled | User denied operation |
| -32007 | RateLimited | Too many requests |
| -32008 | SessionExpired | Session timed out |
| -32009 | FeatureDisabled | Feature/category disabled |
| -32010 | PathRestricted | Path escapes workspace sandbox |
| -32011 | CommandRestricted | Command not in allow-list or in deny-list |

---

## Method Reference

### auth

#### `auth.authenticate`
Authenticate with the server.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | ✅ | Authentication token |
| nonce | string | ✅ | Nonce from auth.challenge |

**Result:** `{ authenticated: boolean, sessionId?: string, error?: string }`

---

### editor

#### `editor.openFile`
Open a file in the editor.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| preview | boolean | | Open in preview mode (default: true) |
| viewColumn | number | | Editor column (1, 2, 3...) |

**Result:** `{ documentUri: string }`

#### `editor.closeFile`
Close a file tab.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |

**Result:** `{ success: boolean }`

#### `editor.getContent`
Get file content.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |

**Result:** `{ content: string, languageId: string }`

#### `editor.setContent`
Replace entire file content.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| content | string | ✅ | New content |

**Result:** `{ success: boolean }`

#### `editor.insertText`
Insert text at a position.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| position | Position | ✅ | `{ line: number, character: number }` (0-indexed) |
| text | string | ✅ | Text to insert |

**Result:** `{ success: boolean }`

#### `editor.replaceRange`
Replace text in a range.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| range | Range | ✅ | `{ start: Position, end: Position }` |
| text | string | ✅ | Replacement text |

**Result:** `{ success: boolean }`

#### `editor.deleteRange`
Delete text in a range.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| range | Range | ✅ | `{ start: Position, end: Position }` |

**Result:** `{ success: boolean }`

#### `editor.setSelection`
Set the editor selection.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| range | Range | ✅ | Selection range |

**Result:** `{ success: boolean }`

#### `editor.revealLine`
Scroll to reveal a line.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| line | number | ✅ | Line number (0-indexed) |
| at | string | | `"top"`, `"center"` (default), or `"bottom"` |

**Result:** `{ success: boolean }`

#### `editor.getSelection`
Get the current editor selection.

**Params:** None

**Result:** `{ range: Range, text: string }`

#### `editor.getActiveFile`
Get the active file info.

**Params:** None

**Result:** `{ path: string, languageId: string }`

#### `editor.getOpenFiles`
List all open file tabs.

**Params:** None

**Result:** `{ files: string[] }`

#### `editor.getDocumentInfo`
Get document metadata without content.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |

**Result:** `{ uri: string, languageId: string, version: number, lineCount: number, isDirty: boolean }`

#### `editor.applyEdits`
Apply multiple edits atomically.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| edits | Array | ✅ | `[{ range: Range, text: string }, ...]` |

**Result:** `{ applied: number }`

#### `editor.save`
Save a file (or the active file).

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | | File to save (omit for active) |

**Result:** `{ success: boolean }`

#### `editor.saveAll`
Save all open files.

**Params:** None

**Result:** `{ success: boolean }`

#### `editor.formatDocument`
Format a document.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | | File to format (omit for active) |

**Result:** `{ success: boolean }`

#### `editor.getCompletions`
Get completion items at a position.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Absolute file path |
| position | Position | ✅ | Cursor position |
| triggerCharacter | string | | Trigger character (e.g., `.`) |

**Result:** `{ items: CompletionItem[], isIncomplete: boolean }`

Where `CompletionItem`: `{ label: string, kind: string, detail?: string, insertText?: string, sortText?: string }`

---

### fs (File System)

#### `fs.readFile`
Read file content.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path (workspace-relative or absolute) |
| encoding | string | | Encoding (default: utf-8) |

**Result:** `{ content: string }`

#### `fs.writeFile`
Write content to a file (creates if missing).

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| content | string | ✅ | File content |

**Result:** `{ success: boolean }`

#### `fs.appendFile`
Append content to a file.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| content | string | ✅ | Content to append |

**Result:** `{ success: boolean }`

#### `fs.deleteFile`
Delete a file. May require approval if `requireApproval` is enabled.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |

**Result:** `{ success: boolean }`

#### `fs.rename`
Rename or move a file.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| oldPath | string | ✅ | Current path |
| newPath | string | ✅ | New path |

**Result:** `{ success: boolean }`

#### `fs.copy`
Copy a file.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | ✅ | Source path |
| destination | string | ✅ | Destination path |

**Result:** `{ success: boolean }`

#### `fs.createDirectory`
Create a directory (recursive).

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Directory path |

**Result:** `{ success: boolean }`

#### `fs.deleteDirectory`
Delete a directory. May require approval if `requireApproval` is enabled.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Directory path |
| recursive | boolean | | Delete recursively (default: false) |

**Result:** `{ success: boolean }`

#### `fs.listDirectory`
List directory contents.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Directory path |
| recursive | boolean | | List recursively |

**Result:** `{ entries: FileEntry[] }`

Where `FileEntry`: `{ name: string, path: string, type: "file" | "directory" | "symlink", size?: number, mtime?: number }`

#### `fs.exists`
Check if a file/directory exists.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | Path to check |

**Result:** `{ exists: boolean, isFile: boolean, isDirectory: boolean }`

#### `fs.stat`
Get file stats.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |

**Result:** `{ size: number, ctime: number, mtime: number, isFile: boolean, isDirectory: boolean, isSymbolicLink: boolean }`

#### `fs.watchFiles`
Start watching files matching a glob pattern.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pattern | string | ✅ | Glob pattern (e.g., `**/*.ts`) |

**Result:** `{ watcherId: string }`

Changes are broadcast as `file.changed` notifications.

#### `fs.unwatchFiles`
Stop watching files.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| watcherId | string | ✅ | Watcher ID from `fs.watchFiles` |

**Result:** `{ success: boolean }`

---

### terminal

#### `terminal.create`
Create a new terminal.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | | Terminal name |
| cwd | string | | Working directory |
| env | object | | Environment variables |

**Result:** `{ terminalId: string }`

#### `terminal.dispose`
Close a terminal.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| terminalId | string | ✅ | Terminal ID |

**Result:** `{ success: boolean }`

#### `terminal.sendText`
Send text to a terminal.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| terminalId | string | ✅ | Terminal ID |
| text | string | ✅ | Text to send |
| addNewLine | boolean | | Append newline (default: true) |

**Result:** `{ success: boolean }`

#### `terminal.show`
Show/focus a terminal.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| terminalId | string | ✅ | Terminal ID |
| preserveFocus | boolean | | Keep focus in editor |

**Result:** `{ success: boolean }`

#### `terminal.list`
List all terminals.

**Params:** None

**Result:** `{ terminals: TerminalInfo[] }`

Where `TerminalInfo`: `{ id: string, name: string, processId?: number }`

#### `terminal.getActive`
Get the active terminal.

**Params:** None

**Result:** `{ terminalId: string, name: string }`

#### `terminal.getOutput`
Get buffered terminal output (last 1000 lines).

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| terminalId | string | ✅ | Terminal ID |
| maxLines | number | | Max lines to return |

**Result:** `{ output: string }`

---

### command

#### `command.execute`
Execute a VS Code command.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command | string | ✅ | Command ID (e.g., `editor.action.formatDocument`) |
| args | array | | Command arguments |

**Result:** `{ result: unknown }`

#### `command.list`
List available commands.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| filter | string | | Filter by prefix |

**Result:** `{ commands: string[] }`

---

### state

#### `state.getWorkspace`
Get workspace info.

**Params:** None

**Result:** `{ folders: string[], name: string }`

#### `state.getDiagnostics`
Get diagnostics (errors, warnings).

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | | Filter to specific file |

**Result:** `{ diagnostics: Diagnostic[] }`

Where `Diagnostic`: `{ uri: string, range: Range, message: string, severity: "error" | "warning" | "info" | "hint", source?: string, code?: string | number }`

#### `state.getSymbols`
Get document symbols.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |

**Result:** `{ symbols: DocumentSymbol[] }`

#### `state.findReferences`
Find all references to a symbol.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| position | Position | ✅ | Symbol position |

**Result:** `{ locations: Location[] }`

Where `Location`: `{ uri: string, range: Range }`

#### `state.goToDefinition`
Go to definition of a symbol.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| position | Position | ✅ | Symbol position |

**Result:** `{ locations: Location[] }`

#### `state.getHover`
Get hover information.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| position | Position | ✅ | Position |

**Result:** `{ content: string }`

#### `state.getCodeActions`
Get available code actions for a range.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| range | Range | ✅ | Code range |

**Result:** `{ actions: Array<{ title: string, kind?: string, isPreferred?: boolean }> }`

#### `state.getOpenDocuments`
Get all open text documents.

**Params:** None

**Result:** `{ documents: Array<{ uri: string, languageId: string, version: number, isDirty: boolean }> }`

#### `state.getVisibleEditors`
Get visible text editors.

**Params:** None

**Result:** `{ editors: Array<{ documentUri: string, viewColumn: number, selections: Range[] }> }`

---

### search

#### `search.findInFiles`
Search across workspace files.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | ✅ | Search query |
| options | SearchOptions | | Search options |

**SearchOptions:** `{ include?: string, exclude?: string, maxResults?: number, useRegex?: boolean, caseSensitive?: boolean, wholeWord?: boolean }`

**Result:** `{ results: SearchResult[] }`

Where `SearchResult`: `{ path: string, matches: Array<{ range: Range, preview: string }> }`

#### `search.findAndReplace`
Find and replace across files.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | ✅ | Search query |
| replacement | string | ✅ | Replacement text |
| options | SearchOptions | | Search options |

**Result:** `{ count: number }`

---

### debug

#### `debug.startSession`
Start a debug session.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ✅ | Debug type (e.g., `node`, `python`) |
| request | string | ✅ | `"launch"` or `"attach"` |
| name | string | | Session name |
| program | string | | Program to debug |
| args | string[] | | Program arguments |
| cwd | string | | Working directory |
| env | object | | Environment variables |

**Result:** `{ sessionId: string }`

#### `debug.stopSession`
Stop a debug session.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sessionId | string | | Session to stop (omit for active) |

**Result:** `{ success: boolean }`

#### `debug.setBreakpoints`
Set breakpoints in a file.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| breakpoints | Array | ✅ | `[{ line: number, condition?: string, hitCondition?: string, logMessage?: string }]` |

**Result:** `{ breakpoints: Array<{ id: string, verified: boolean, line: number }> }`

#### `debug.removeBreakpoints`
Remove breakpoints from a file.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | ✅ | File path |
| lines | number[] | ✅ | Lines to remove breakpoints from |

**Result:** `{ removed: number }`

#### `debug.getBreakpoints`
Get all breakpoints.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | | Filter to specific file |

**Result:** `{ breakpoints: Array<{ id: string, path: string, line: number, enabled: boolean, condition?: string }> }`

#### `debug.listSessions`
List active debug sessions.

**Params:** None

**Result:** `{ sessions: Array<{ id: string, name: string, type: string }> }`

---

### git

#### `git.status`
Get git status.

**Params:** None

**Result:** `{ branch: string, changes: Array<{ path: string, status: string }> }`

#### `git.diff`
Get git diff.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | | File to diff (omit for all) |
| staged | boolean | | Show staged changes |

**Result:** `{ diff: string }`

#### `git.log`
Get git log.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| maxEntries | number | | Max entries (default: 50) |
| path | string | | Filter to file |

**Result:** `{ entries: Array<{ hash: string, message: string, author: string, date: string }> }`

#### `git.stage`
Stage files.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| paths | string[] | ✅ | Files to stage |

**Result:** `{ success: boolean }`

#### `git.unstage`
Unstage files.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| paths | string[] | ✅ | Files to unstage |

**Result:** `{ success: boolean }`

#### `git.commit`
Create a commit.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | ✅ | Commit message |

**Result:** `{ success: boolean }`

#### `git.checkout`
Checkout a branch.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| branch | string | ✅ | Branch name |
| create | boolean | | Create branch if missing |

**Result:** `{ success: boolean }`

#### `git.branches`
List branches.

**Params:** None

**Result:** `{ branches: Array<{ name: string, current: boolean }> }`

---

## Notifications

Server-to-client notifications (no `id`, no response expected):

| Method | Params | Description |
|--------|--------|-------------|
| `auth.challenge` | `{ nonce: string }` | Sent on connection |
| `terminal.output` | `{ terminalId: string, data: string }` | Terminal output data |
| `terminal.closed` | `{ terminalId: string }` | Terminal was closed |
| `file.changed` | `{ path: string, type: "created" \| "changed" \| "deleted" }` | Watched file changed |
| `server.shutdown` | `{ reason: string }` | Server is shutting down |

---

## Configuration

All settings are under the `agentControl` namespace in VS Code settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Auto-start server |
| `port` | number | `19876` | WebSocket port |
| `host` | string | `127.0.0.1` | Bind address |
| `token` | string | `""` | Auth token (auto-generated if empty) |
| `allowedOrigins` | string[] | `["*"]` | Allowed WebSocket origins |
| `rateLimit.enabled` | boolean | `true` | Enable rate limiting |
| `rateLimit.requestsPerSecond` | number | `100` | Max requests/sec per client |
| `logging.level` | string | `"info"` | Log level |
| `logging.logToFile` | boolean | `false` | Log to file |
| `security.allowFileSystemAccess` | boolean | `true` | Allow fs operations |
| `security.allowTerminalAccess` | boolean | `true` | Allow terminal operations |
| `security.allowCommandExecution` | boolean | `true` | Allow command execution |
| `security.restrictedPaths` | string[] | `[]` | Glob patterns for denied paths |
| `security.restrictedCommands` | string[] | `[]` | Commands to deny (deny-list) |
| `security.allowedCommands` | string[] | `[]` | Commands to allow (allow-list, overrides deny-list) |
| `security.requireApproval` | boolean | `false` | Require user approval for destructive ops |
| `security.allowedMethodCategories` | string[] | `[]` | Allowed method categories (empty = all) |
