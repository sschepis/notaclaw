# VS Code Agent Control Extension Design

## 1. Overview

The VS Code Agent Control Extension provides a WebSocket-based remote control interface that enables AI agents to programmatically interact with VS Code. This extension exposes core editing capabilities, file operations, terminal control, and command execution through a secure, authenticated API.

### 1.1 Goals

1. **Remote Control**: Enable external agents to control VS Code via WebSocket
2. **Core Editing**: Provide file open/close/edit, navigation, and search capabilities
3. **Terminal Access**: Allow terminal creation, command execution, and output streaming
4. **Command Execution**: Execute any VS Code command programmatically
5. **State Queries**: Query editor state, open files, workspace info, and diagnostics
6. **Security**: Token-based authentication with configurable secrets

### 1.2 Non-Goals

- Visual UI manipulation (panels, status bar, notifications)
- Debugging session control
- Extension management
- Git operations (use terminal commands instead)
- Custom webview rendering

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agent                                │
│                    (External Process)                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (ws://localhost:PORT)
                            │ JSON-RPC 2.0 Messages
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VS Code Extension Host                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Agent Control Extension                       │ │
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐  │ │
│  │  │  WebSocket      │  │      Message Router             │  │ │
│  │  │  Server         │◄─┤  (JSON-RPC 2.0 Handler)        │  │ │
│  │  │  (Port Config)  │  │                                 │  │ │
│  │  └────────┬────────┘  └──────────────┬──────────────────┘  │ │
│  │           │                          │                     │ │
│  │           │     ┌────────────────────┼────────────────┐    │ │
│  │           │     │                    │                │    │ │
│  │           ▼     ▼                    ▼                ▼    │ │
│  │  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │ Auth Service     │  │ Editor Svc   │  │ Terminal Svc │  │ │
│  │  │ (Token Verify)   │  │              │  │              │  │ │
│  │  └──────────────────┘  └──────────────┘  └──────────────┘  │ │
│  │                                                            │ │
│  │  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │ FileSystem Svc   │  │ Command Svc  │  │ State Svc    │  │ │
│  │  │                  │  │              │  │              │  │ │
│  │  └──────────────────┘  └──────────────┘  └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code API                                  │
│  vscode.window  vscode.workspace  vscode.commands              │
│  vscode.terminal  vscode.TextDocument  vscode.Uri              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **WebSocket Server** | Accept connections, manage clients, handle reconnection |
| **Auth Service** | Validate tokens, manage session state, rate limiting |
| **Message Router** | Parse JSON-RPC messages, dispatch to appropriate service |
| **Editor Service** | Open/close/edit documents, selection, navigation |
| **FileSystem Service** | Read/write files, list directories, file operations |
| **Terminal Service** | Create terminals, execute commands, stream output |
| **Command Service** | Execute VS Code commands, query available commands |
| **State Service** | Query workspace, diagnostics, editor state |

## 3. Protocol Specification

### 3.1 Transport

- **Protocol**: WebSocket (ws:// for local, wss:// for remote)
- **Default Port**: 19876 (configurable)
- **Encoding**: UTF-8 JSON

### 3.2 Message Format (JSON-RPC 2.0)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "editor.openFile",
  "params": {
    "path": "/path/to/file.ts",
    "preview": false
  }
}
```

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "success": true,
    "documentUri": "file:///path/to/file.ts"
  }
}
```

**Response (Error):**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32600,
    "message": "File not found",
    "data": { "path": "/path/to/file.ts" }
  }
}
```

**Notification (Server → Client):**
```json
{
  "jsonrpc": "2.0",
  "method": "terminal.output",
  "params": {
    "terminalId": "term-123",
    "data": "npm install completed\n"
  }
}
```

### 3.3 Authentication Flow

1. Client connects to WebSocket
2. Server sends `auth.challenge` notification
3. Client responds with `auth.authenticate` containing token
4. Server validates and sends `auth.result`
5. If valid, client can send commands; otherwise, connection closes

```json
// Server → Client
{
  "jsonrpc": "2.0",
  "method": "auth.challenge",
  "params": { "nonce": "abc123" }
}

// Client → Server
{
  "jsonrpc": "2.0",
  "id": "auth-1",
  "method": "auth.authenticate",
  "params": {
    "token": "configured-secret-token",
    "nonce": "abc123"
  }
}

// Server → Client
{
  "jsonrpc": "2.0",
  "id": "auth-1",
  "result": {
    "authenticated": true,
    "sessionId": "session-456"
  }
}
```

## 4. API Reference

### 4.1 Editor Operations

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `editor.openFile` | `path: string, preview?: boolean, viewColumn?: number` | `{ documentUri: string }` | Open file in editor |
| `editor.closeFile` | `path: string` | `{ success: boolean }` | Close file tab |
| `editor.getContent` | `path: string` | `{ content: string, languageId: string }` | Get file content |
| `editor.setContent` | `path: string, content: string` | `{ success: boolean }` | Replace file content |
| `editor.insertText` | `path: string, position: Position, text: string` | `{ success: boolean }` | Insert text at position |
| `editor.replaceRange` | `path: string, range: Range, text: string` | `{ success: boolean }` | Replace text in range |
| `editor.deleteRange` | `path: string, range: Range` | `{ success: boolean }` | Delete text in range |
| `editor.setSelection` | `path: string, range: Range` | `{ success: boolean }` | Set cursor/selection |
| `editor.revealLine` | `path: string, line: number, at?: string` | `{ success: boolean }` | Scroll to line |
| `editor.getSelection` | `path?: string` | `{ range: Range, text: string }` | Get current selection |
| `editor.getActiveFile` | - | `{ path: string, languageId: string }` | Get active editor info |
| `editor.getOpenFiles` | - | `{ files: string[] }` | List open file paths |
| `editor.save` | `path?: string` | `{ success: boolean }` | Save file(s) |
| `editor.saveAll` | - | `{ success: boolean }` | Save all open files |

### 4.2 File System Operations

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `fs.readFile` | `path: string, encoding?: string` | `{ content: string }` | Read file content |
| `fs.writeFile` | `path: string, content: string` | `{ success: boolean }` | Write file content |
| `fs.appendFile` | `path: string, content: string` | `{ success: boolean }` | Append to file |
| `fs.deleteFile` | `path: string` | `{ success: boolean }` | Delete file |
| `fs.rename` | `oldPath: string, newPath: string` | `{ success: boolean }` | Rename/move file |
| `fs.copy` | `source: string, destination: string` | `{ success: boolean }` | Copy file |
| `fs.createDirectory` | `path: string` | `{ success: boolean }` | Create directory |
| `fs.deleteDirectory` | `path: string, recursive?: boolean` | `{ success: boolean }` | Delete directory |
| `fs.listDirectory` | `path: string, recursive?: boolean` | `{ entries: FileEntry[] }` | List directory contents |
| `fs.exists` | `path: string` | `{ exists: boolean, isFile: boolean }` | Check if path exists |
| `fs.stat` | `path: string` | `{ size: number, mtime: number, ... }` | Get file stats |

### 4.3 Terminal Operations

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `terminal.create` | `name?: string, cwd?: string, env?: object` | `{ terminalId: string }` | Create terminal |
| `terminal.dispose` | `terminalId: string` | `{ success: boolean }` | Close terminal |
| `terminal.sendText` | `terminalId: string, text: string, addNewLine?: boolean` | `{ success: boolean }` | Send text/command |
| `terminal.show` | `terminalId: string, preserveFocus?: boolean` | `{ success: boolean }` | Show terminal |
| `terminal.list` | - | `{ terminals: TerminalInfo[] }` | List all terminals |
| `terminal.getActive` | - | `{ terminalId: string, name: string }` | Get active terminal |

**Terminal Notifications (Server → Client):**
- `terminal.output`: Output data from terminal
- `terminal.closed`: Terminal was closed

### 4.4 Command Operations

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `command.execute` | `command: string, args?: any[]` | `{ result: any }` | Execute VS Code command |
| `command.list` | `filter?: string` | `{ commands: string[] }` | List available commands |

### 4.5 State Queries

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `state.getWorkspace` | - | `{ folders: string[], name: string }` | Get workspace info |
| `state.getDiagnostics` | `path?: string` | `{ diagnostics: Diagnostic[] }` | Get problems/errors |
| `state.getSymbols` | `path: string` | `{ symbols: DocumentSymbol[] }` | Get document symbols |
| `state.findReferences` | `path: string, position: Position` | `{ locations: Location[] }` | Find references |
| `state.goToDefinition` | `path: string, position: Position` | `{ locations: Location[] }` | Go to definition |
| `state.getHover` | `path: string, position: Position` | `{ content: string }` | Get hover info |

### 4.6 Search Operations

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `search.findInFiles` | `query: string, options?: SearchOptions` | `{ results: SearchResult[] }` | Search in workspace |
| `search.findAndReplace` | `query: string, replacement: string, options?: SearchOptions` | `{ count: number }` | Find and replace |

## 5. Type Definitions

```typescript
// Core Types
interface Position {
  line: number;    // 0-indexed
  character: number; // 0-indexed
}

interface Range {
  start: Position;
  end: Position;
}

interface Location {
  uri: string;
  range: Range;
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  mtime?: number;
}

interface TerminalInfo {
  id: string;
  name: string;
  processId?: number;
}

interface Diagnostic {
  range: Range;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
  code?: string | number;
}

interface DocumentSymbol {
  name: string;
  kind: string;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

interface SearchOptions {
  include?: string;   // Glob pattern
  exclude?: string;   // Glob pattern
  maxResults?: number;
  useRegex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

interface SearchResult {
  path: string;
  matches: {
    range: Range;
    preview: string;
  }[];
}

// Error Codes (JSON-RPC 2.0 + Custom)
enum ErrorCode {
  // Standard JSON-RPC
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // Custom Extension Errors
  Unauthorized = -32001,
  FileNotFound = -32002,
  FileAccessDenied = -32003,
  TerminalNotFound = -32004,
  EditorNotActive = -32005,
  OperationCancelled = -32006,
  RateLimited = -32007,
}
```

## 6. Configuration

The extension is configured via VS Code settings:

```json
{
  "agentControl.enabled": true,
  "agentControl.port": 19876,
  "agentControl.host": "127.0.0.1",
  "agentControl.token": "",
  "agentControl.allowedOrigins": ["*"],
  "agentControl.rateLimit": {
    "enabled": true,
    "requestsPerSecond": 100
  },
  "agentControl.logging": {
    "level": "info",
    "logToFile": false
  },
  "agentControl.security": {
    "allowFileSystemAccess": true,
    "allowTerminalAccess": true,
    "allowCommandExecution": true,
    "restrictedPaths": [],
    "restrictedCommands": []
  }
}
```

## 7. Extension Structure

```
vscode-agent-control/
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
├── README.md                # Documentation
├── CHANGELOG.md             # Version history
├── LICENSE                  # MIT License
├── .vscodeignore           # Publish ignore patterns
├── src/
│   ├── extension.ts        # Extension entry point
│   ├── server/
│   │   ├── WebSocketServer.ts      # WebSocket server implementation
│   │   ├── MessageRouter.ts        # JSON-RPC message routing
│   │   └── ConnectionManager.ts    # Client connection handling
│   ├── services/
│   │   ├── AuthService.ts          # Token authentication
│   │   ├── EditorService.ts        # Editor operations
│   │   ├── FileSystemService.ts    # File system operations
│   │   ├── TerminalService.ts      # Terminal operations
│   │   ├── CommandService.ts       # Command execution
│   │   └── StateService.ts         # State queries
│   ├── protocol/
│   │   ├── types.ts               # Protocol type definitions
│   │   ├── errors.ts              # Error definitions
│   │   └── handlers.ts            # Request handlers
│   └── utils/
│       ├── logger.ts              # Logging utility
│       └── config.ts              # Configuration helper
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── editor.test.ts
│   │   ├── terminal.test.ts
│   │   └── filesystem.test.ts
│   └── runTest.ts
└── media/
    └── icon.png
```

## 8. Security Considerations

### 8.1 Authentication

- Token-based authentication required for all connections
- Token stored securely in VS Code settings (encrypted)
- Session tokens expire after configurable timeout
- Nonce-based challenge to prevent replay attacks

### 8.2 Authorization

- Configurable restrictions on:
  - File system paths (allowlist/denylist)
  - Terminal commands (blocklist)
  - VS Code commands (blocklist)
- Rate limiting to prevent abuse

### 8.3 Network Security

- Default binding to localhost only (127.0.0.1)
- Optional TLS for remote connections
- CORS origin validation

### 8.4 Audit Logging

- All requests logged with timestamp, client ID, method
- Error conditions logged with full context
- Optional file-based logging for forensics

## 9. Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. Create extension scaffold with package.json
2. Implement WebSocket server with connection management
3. Implement JSON-RPC message router
4. Add authentication service with token validation
5. Add configuration management

### Phase 2: Editor Operations (Week 2)
1. Implement EditorService
2. Add file open/close/edit operations
3. Add selection and navigation
4. Add save operations
5. Write unit tests

### Phase 3: File System & Terminal (Week 3)
1. Implement FileSystemService
2. Add file CRUD operations
3. Implement TerminalService
4. Add terminal creation and command execution
5. Implement output streaming via notifications

### Phase 4: Commands & State (Week 4)
1. Implement CommandService
2. Implement StateService (workspace, diagnostics, symbols)
3. Add search operations
4. Complete integration tests

### Phase 5: Polish & Documentation (Week 5)
1. Security hardening
2. Performance optimization
3. Complete documentation
4. Create example client implementations
5. Prepare for VS Code Marketplace

## 10. Example Client Usage

### Python Client Example

```python
import asyncio
import websockets
import json
import uuid

class VSCodeAgentClient:
    def __init__(self, host='localhost', port=19876, token=''):
        self.uri = f'ws://{host}:{port}'
        self.token = token
        self.ws = None
        self.pending = {}
        
    async def connect(self):
        self.ws = await websockets.connect(self.uri)
        # Wait for auth challenge
        challenge = json.loads(await self.ws.recv())
        nonce = challenge['params']['nonce']
        
        # Authenticate
        await self._send('auth.authenticate', {
            'token': self.token,
            'nonce': nonce
        })
        
    async def _send(self, method, params=None):
        request_id = str(uuid.uuid4())
        message = {
            'jsonrpc': '2.0',
            'id': request_id,
            'method': method,
            'params': params or {}
        }
        await self.ws.send(json.dumps(message))
        
        # Wait for response
        while True:
            response = json.loads(await self.ws.recv())
            if response.get('id') == request_id:
                if 'error' in response:
                    raise Exception(response['error']['message'])
                return response.get('result')
    
    async def open_file(self, path, preview=False):
        return await self._send('editor.openFile', {
            'path': path,
            'preview': preview
        })
    
    async def get_content(self, path):
        result = await self._send('editor.getContent', {'path': path})
        return result['content']
    
    async def set_content(self, path, content):
        return await self._send('editor.setContent', {
            'path': path,
            'content': content
        })
    
    async def execute_command(self, command, args=None):
        return await self._send('command.execute', {
            'command': command,
            'args': args or []
        })
    
    async def run_terminal_command(self, command, cwd=None):
        # Create terminal
        result = await self._send('terminal.create', {
            'name': 'Agent Terminal',
            'cwd': cwd
        })
        terminal_id = result['terminalId']
        
        # Send command
        await self._send('terminal.sendText', {
            'terminalId': terminal_id,
            'text': command,
            'addNewLine': True
        })
        
        return terminal_id

# Usage
async def main():
    client = VSCodeAgentClient(token='my-secret-token')
    await client.connect()
    
    # Open a file
    await client.open_file('/path/to/project/src/main.py')
    
    # Read content
    content = await client.get_content('/path/to/project/src/main.py')
    print(f"File content: {content[:100]}...")
    
    # Make an edit
    new_content = content.replace('old_function', 'new_function')
    await client.set_content('/path/to/project/src/main.py', new_content)
    
    # Run a terminal command
    await client.run_terminal_command('python -m pytest', cwd='/path/to/project')

asyncio.run(main())
```

### TypeScript/Node.js Client Example

```typescript
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface RPCRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface RPCResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class VSCodeAgentClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: Function; reject: Function }>();
  
  constructor(
    private host = 'localhost',
    private port = 19876,
    private token = ''
  ) {}
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://${this.host}:${this.port}`);
      
      this.ws.on('message', async (data: string) => {
        const message = JSON.parse(data);
        
        // Handle auth challenge
        if (message.method === 'auth.challenge') {
          const result = await this.send('auth.authenticate', {
            token: this.token,
            nonce: message.params.nonce
          });
          if (result.authenticated) {
            resolve();
          } else {
            reject(new Error('Authentication failed'));
          }
          return;
        }
        
        // Handle response
        if (message.id && this.pending.has(message.id)) {
          const { resolve, reject } = this.pending.get(message.id)!;
          this.pending.delete(message.id);
          
          if (message.error) {
            reject(new Error(message.error.message));
          } else {
            resolve(message.result);
          }
        }
      });
      
      this.ws.on('error', reject);
    });
  }
  
  private send(method: string, params?: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.pending.set(id, { resolve, reject });
      
      const request: RPCRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      
      this.ws!.send(JSON.stringify(request));
    });
  }
  
  async openFile(path: string, preview = false): Promise<{ documentUri: string }> {
    return this.send('editor.openFile', { path, preview });
  }
  
  async getContent(path: string): Promise<string> {
    const result = await this.send('editor.getContent', { path });
    return result.content;
  }
  
  async setContent(path: string, content: string): Promise<void> {
    await this.send('editor.setContent', { path, content });
  }
  
  async executeCommand(command: string, args: unknown[] = []): Promise<unknown> {
    const result = await this.send('command.execute', { command, args });
    return result.result;
  }
  
  close(): void {
    this.ws?.close();
  }
}

// Usage
async function main() {
  const client = new VSCodeAgentClient('localhost', 19876, 'my-secret-token');
  await client.connect();
  
  // Open file
  await client.openFile('/path/to/file.ts');
  
  // Read and modify
  const content = await client.getContent('/path/to/file.ts');
  await client.setContent('/path/to/file.ts', content.replace('foo', 'bar'));
  
  // Execute command
  await client.executeCommand('workbench.action.files.save');
  
  client.close();
}

main().catch(console.error);
```

## 11. Future Enhancements

### 11.1 Planned Features
- Debugging session control
- Git operations API
- Custom webview rendering
- Extension management API
- Multi-window support
- Collaborative editing support

### 11.2 Integration Points
- AlephNet plugin integration
- MCP server implementation
- OpenAI/Anthropic tool calling format
- LangChain tool integration

## 12. References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)
