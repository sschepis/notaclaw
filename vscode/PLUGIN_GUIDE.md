# Plugin Developer Guide

This guide explains how to build a plugin for the **Resonant Terminal** (notaclaw) that communicates with VS Code through the Agent Control extension.

## Architecture Overview

```
┌─────────────────────────┐          ┌─────────────────────────┐
│   Resonant Terminal     │          │   VS Code Extension     │
│   (Electron App)        │  WebSocket  │   (Agent Control)    │
│                         │◄────────►│                         │
│  ┌───────────────────┐  │  JSON-RPC│  ┌───────────────────┐  │
│  │ Your Plugin       │  │   2.0   │  │ WebSocketServer   │  │
│  │                   │──┼─────────┼──│                   │  │
│  │ - registers tools │  │         │  │ - routes requests │  │
│  │ - calls VS Code   │  │         │  │ - enforces auth   │  │
│  └───────────────────┘  │         │  │ - rate limiting   │  │
│                         │         │  └───────────────────┘  │
└─────────────────────────┘         └─────────────────────────┘
```

## Quick Start

### 1. Create the Plugin Directory

```
plugins-extended/my-plugin/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 2. Plugin Entry Point

```typescript
// src/index.ts
import type { PluginContext } from '../../src/plugins/plugin-types';

let ws: WebSocket | null = null;
let requestId = 0;
const pending = new Map<number, { resolve: Function; reject: Function }>();

export function activate(context: PluginContext) {
  // Connect to the VS Code extension
  ws = new WebSocket('ws://localhost:3710');

  ws.onopen = () => {
    console.log('Connected to VS Code');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    handleMessage(msg);
  };

  // Register tools with the Resonant Terminal
  context.dsn.registerTool({
    name: 'my-plugin.readFile',
    description: 'Read a file from VS Code',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'File path to read' },
      },
      required: ['filePath'],
    },
    execute: async (params) => {
      return await send('fs.readFile', { filePath: params.filePath });
    },
  });
}

export function deactivate() {
  if (ws) {
    ws.close();
    ws = null;
  }
  pending.clear();
}

function send(method: string, params?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    ws!.send(JSON.stringify({ jsonrpc: '2.0', method, params, id }));
  });
}

function handleMessage(msg: any) {
  // Response to a request
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)!;
    pending.delete(msg.id);
    if (msg.error) {
      reject(new Error(msg.error.message));
    } else {
      resolve(msg.result);
    }
    return;
  }

  // Notification from server
  if (msg.method) {
    console.log(`Notification: ${msg.method}`, msg.params);
  }
}
```

## Authentication

The extension uses challenge-response authentication:

1. **Server sends challenge** — On WebSocket connect, the server sends:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "auth.challenge",
     "params": { "challenge": "<random-nonce>" }
   }
   ```

2. **Client responds** — Your plugin must authenticate within the timeout:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "auth.authenticate",
     "params": { "token": "<HMAC-SHA256(challenge, secret)>" },
     "id": 1
   }
   ```

3. **Server confirms** — On success:
   ```json
   { "jsonrpc": "2.0", "id": 1, "result": { "authenticated": true } }
   ```

### Computing the Token

```typescript
import * as crypto from 'crypto';

function computeToken(challenge: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(challenge)
    .digest('hex');
}
```

The `secret` is configured in VS Code settings: `agentControl.authToken`.

### Auth Gate Pattern

Always gate requests behind authentication:

```typescript
let authPromise: Promise<void>;
let resolveAuth: () => void;

ws.onopen = () => {
  authPromise = new Promise((resolve) => { resolveAuth = resolve; });
};

// In your auth handler, after successful auth:
resolveAuth();

// Before any request:
async function send(method: string, params?: any) {
  await authPromise; // Wait for auth to complete
  // ... send the request
}
```

## Available Methods

### Editor Methods

| Method | Params | Description |
|--------|--------|-------------|
| `editor.openFile` | `{ filePath }` | Open a file |
| `editor.getContent` | — | Get active editor content |
| `editor.setContent` | `{ filePath, content }` | Replace file content |
| `editor.insertText` | `{ text, line, character }` | Insert text at position |
| `editor.replaceText` | `{ text, startLine, startCharacter, endLine, endCharacter }` | Replace range |
| `editor.save` | — | Save active document |
| `editor.close` | — | Close active editor |
| `editor.formatDocument` | — | Format active document |
| `editor.getDocumentInfo` | `{ filePath }` | Get document metadata |
| `editor.applyEdits` | `{ edits: [...] }` | Atomic multi-edit |
| `editor.getCompletions` | `{ filePath, line, character }` | Get completions |

### File System Methods

| Method | Params | Description |
|--------|--------|-------------|
| `fs.readFile` | `{ filePath }` | Read file contents |
| `fs.writeFile` | `{ filePath, content }` | Write file |
| `fs.deleteFile` | `{ filePath }` | Delete file |
| `fs.listDirectory` | `{ dirPath }` | List directory |
| `fs.createDirectory` | `{ dirPath }` | Create directory |
| `fs.watchFiles` | `{ globPattern }` | Watch for file changes |
| `fs.unwatchFiles` | `{ globPattern }` | Stop watching |

### Terminal Methods

| Method | Params | Description |
|--------|--------|-------------|
| `terminal.execute` | `{ command }` | Execute command |
| `terminal.getOutput` | `{ terminalId }` | Get buffered output |

### State Methods

| Method | Params | Description |
|--------|--------|-------------|
| `state.getOpenDocuments` | — | List open documents |
| `state.getVisibleEditors` | — | List visible editors |
| `state.getDiagnostics` | `{ filePath }` | Get diagnostics |
| `state.getSymbols` | `{ filePath }` | Get document symbols |
| `state.getHover` | `{ filePath, line, character }` | Get hover info |
| `state.getReferences` | `{ filePath, line, character }` | Find references |
| `state.getDefinition` | `{ filePath, line, character }` | Go to definition |
| `state.getCodeActions` | `{ filePath, startLine, startCharacter, endLine, endCharacter }` | Get code actions |

### Debug Methods

| Method | Params | Description |
|--------|--------|-------------|
| `debug.startSession` | `{ name, type, request }` | Start debugging |
| `debug.stopSession` | — | Stop debug session |
| `debug.setBreakpoints` | `{ filePath, lines }` | Set breakpoints |
| `debug.removeBreakpoints` | `{ filePath }` | Remove breakpoints |
| `debug.getBreakpoints` | — | List all breakpoints |
| `debug.listSessions` | — | List debug sessions |

### Git Methods

| Method | Params | Description |
|--------|--------|-------------|
| `git.status` | — | Get working tree status |
| `git.diff` | — | Get diff of changes |
| `git.log` | — | Get recent commits |
| `git.stage` | `{ files }` | Stage files |
| `git.unstage` | `{ files }` | Unstage files |
| `git.commit` | `{ message }` | Commit staged changes |
| `git.checkout` | `{ branch }` | Switch branch |
| `git.branches` | — | List branches |

### Command Methods

| Method | Params | Description |
|--------|--------|-------------|
| `command.execute` | `{ command, args? }` | Execute VS Code command |

## Notifications (Server → Client)

The server can push notifications to your plugin:

```typescript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  // Notifications have `method` but no `id`
  if (msg.method && msg.id === undefined) {
    switch (msg.method) {
      case 'fs.fileChanged':
        // { type: 'created'|'changed'|'deleted', uri: string }
        handleFileChange(msg.params);
        break;
      case 'server.shutdown':
        handleShutdown();
        break;
    }
  }
};
```

## Batch Requests

Send multiple requests in a single message:

```typescript
const batch = [
  { jsonrpc: '2.0', method: 'editor.openFile', params: { filePath: '/a.ts' }, id: 1 },
  { jsonrpc: '2.0', method: 'editor.openFile', params: { filePath: '/b.ts' }, id: 2 },
];
ws.send(JSON.stringify(batch));

// Response will be an array of results in the same order
```

## Error Handling

All errors follow JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Missing required parameter: 'filePath'",
    "data": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "errorType": "ValidationError",
      "method": "editor.openFile"
    }
  }
}
```

### Standard Error Codes

| Code | Meaning |
|------|---------|
| `-32700` | Parse error (invalid JSON) |
| `-32600` | Invalid request / auth error |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |

## Reconnection

Implement exponential backoff for robustness:

```typescript
let retryDelay = 1000;
const MAX_DELAY = 60000;

function connect() {
  ws = new WebSocket('ws://localhost:3710');

  ws.onopen = () => {
    retryDelay = 1000; // Reset on success
    // ... authenticate
  };

  ws.onclose = () => {
    const jitter = Math.random() * 1000;
    setTimeout(connect, retryDelay + jitter);
    retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
  };
}
```

## Security Considerations

1. **Always authenticate** — Unauthenticated requests (except `auth.authenticate`) are rejected
2. **File paths are sandboxed** — Paths outside the workspace root are blocked
3. **Commands may be restricted** — The user can configure `agentControl.security.allowedCommands` to limit which commands are executable
4. **Method categories can be disabled** — `agentControl.security.allowedMethodCategories` restricts available method groups
5. **Destructive operations may require approval** — When `agentControl.security.requireApproval` is true, operations like `fs.deleteFile` prompt the user for confirmation
6. **Rate limiting** — Excessive requests from a single client are throttled (sliding window)

## Configuration Reference

All settings are under `agentControl.*` in VS Code settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `port` | number | 3710 | WebSocket server port |
| `authToken` | string | — | Authentication secret |
| `enableLogging` | boolean | true | Enable server logging |
| `maxConnections` | number | 5 | Max simultaneous clients |
| `sessionTimeout` | number | 3600 | Session timeout (seconds) |
| `rateLimit` | number | 100 | Max requests per second |
| `allowedOrigins` | array | [] | Allowed WebSocket origins |
| `restrictedCommands` | array | [] | Blocked commands (deny-list) |
| `tls.enabled` | boolean | false | Enable TLS/WSS |
| `tls.certPath` | string | — | TLS certificate path |
| `tls.keyPath` | string | — | TLS private key path |
| `tls.caPath` | string | — | CA certificate path |
| `security.allowedCommands` | array | [] | Allowed commands (allow-list) |
| `security.requireApproval` | boolean | false | Require user approval for destructive ops |
| `security.allowedMethodCategories` | array | [] | Restrict to specific method categories |

## Example: Full Plugin

See the reference implementation at:
`plugins-extended/vscode-control/src/index.ts`

This plugin demonstrates:
- WebSocket connection with auth gate
- Exponential backoff reconnection
- All 30+ tool registrations
- Notification handling
- Proper `deactivate()` cleanup
