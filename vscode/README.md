# VS Code Agent Control Extension

A WebSocket-based remote control interface that enables AI agents to programmatically interact with VS Code. This extension exposes core editing capabilities, file operations, terminal control, and command execution through a secure, authenticated API.

## Features

- **Remote Control via WebSocket**: Connect AI agents to VS Code using JSON-RPC 2.0 over WebSocket
- **Core Editor Operations**: Open, close, edit files, navigate code, manage selections
- **File System Access**: Read, write, delete, copy, move files and directories
- **Terminal Control**: Create terminals, execute commands, stream output
- **Command Execution**: Execute any VS Code command programmatically
- **State Queries**: Query workspace info, diagnostics, symbols, references
- **Secure Authentication**: Token-based authentication with configurable secrets

## Installation

### From VSIX

1. Download the `.vsix` file from releases
2. In VS Code, press `Ctrl+Shift+P` / `Cmd+Shift+P`
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded file

### From Source

```bash
cd vscode
npm install
npm run compile
npm run package
```

## Quick Start

1. **Generate a token** (optional - one is auto-generated):
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run "Agent Control: Generate New Authentication Token"
   - Copy the token for use in your agent

2. **Start the server**:
   - Run "Agent Control: Start Agent Control Server"
   - The server starts on port 19876 by default

3. **Connect your agent** using WebSocket at `ws://localhost:19876`

## Configuration

Configure the extension in VS Code settings (`settings.json`):

```json
{
  "agentControl.enabled": false,          // Auto-start server on VS Code launch
  "agentControl.port": 19876,            // WebSocket server port
  "agentControl.host": "127.0.0.1",      // Host address (use 0.0.0.0 for all interfaces)
  "agentControl.token": "",              // Auth token (auto-generated if empty)
  "agentControl.allowedOrigins": ["*"],  // Allowed WebSocket origins
  
  "agentControl.rateLimit.enabled": true,
  "agentControl.rateLimit.requestsPerSecond": 100,
  
  "agentControl.logging.level": "info",  // debug, info, warn, error
  "agentControl.logging.logToFile": false,
  
  "agentControl.security.allowFileSystemAccess": true,
  "agentControl.security.allowTerminalAccess": true,
  "agentControl.security.allowCommandExecution": true,
  "agentControl.security.restrictedPaths": [],      // Glob patterns to block
  "agentControl.security.restrictedCommands": []    // Commands to block
}
```

## Protocol

The extension uses JSON-RPC 2.0 over WebSocket. All messages follow this format:

### Request
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

### Response
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "documentUri": "file:///path/to/file.ts"
  }
}
```

### Authentication Flow

1. Connect to WebSocket
2. Receive `auth.challenge` notification with nonce
3. Send `auth.authenticate` with token and nonce
4. Receive authentication result

```json
// Server → Client
{ "jsonrpc": "2.0", "method": "auth.challenge", "params": { "nonce": "abc123" } }

// Client → Server
{ "jsonrpc": "2.0", "id": "1", "method": "auth.authenticate", "params": { "token": "your-token", "nonce": "abc123" } }

// Server → Client
{ "jsonrpc": "2.0", "id": "1", "result": { "authenticated": true, "sessionId": "session-456" } }
```

## API Reference

### Editor Operations

| Method | Description |
|--------|-------------|
| `editor.openFile` | Open a file in the editor |
| `editor.closeFile` | Close a file tab |
| `editor.getContent` | Get file content |
| `editor.setContent` | Replace file content |
| `editor.insertText` | Insert text at position |
| `editor.replaceRange` | Replace text in range |
| `editor.deleteRange` | Delete text in range |
| `editor.setSelection` | Set cursor/selection |
| `editor.revealLine` | Scroll to line |
| `editor.getSelection` | Get current selection |
| `editor.getActiveFile` | Get active file info |
| `editor.getOpenFiles` | List open files |
| `editor.save` | Save file |
| `editor.saveAll` | Save all files |

### File System Operations

| Method | Description |
|--------|-------------|
| `fs.readFile` | Read file content |
| `fs.writeFile` | Write file content |
| `fs.appendFile` | Append to file |
| `fs.deleteFile` | Delete file |
| `fs.rename` | Rename/move file |
| `fs.copy` | Copy file |
| `fs.createDirectory` | Create directory |
| `fs.deleteDirectory` | Delete directory |
| `fs.listDirectory` | List directory contents |
| `fs.exists` | Check if path exists |
| `fs.stat` | Get file stats |

### Terminal Operations

| Method | Description |
|--------|-------------|
| `terminal.create` | Create new terminal |
| `terminal.dispose` | Close terminal |
| `terminal.sendText` | Send text/command |
| `terminal.show` | Show terminal |
| `terminal.list` | List terminals |
| `terminal.getActive` | Get active terminal |

### Command Operations

| Method | Description |
|--------|-------------|
| `command.execute` | Execute VS Code command |
| `command.list` | List available commands |

### State Operations

| Method | Description |
|--------|-------------|
| `state.getWorkspace` | Get workspace info |
| `state.getDiagnostics` | Get problems/errors |
| `state.getSymbols` | Get document symbols |
| `state.findReferences` | Find references |
| `state.goToDefinition` | Go to definition |
| `state.getHover` | Get hover info |

### Search Operations

| Method | Description |
|--------|-------------|
| `search.findInFiles` | Search in workspace |
| `search.findAndReplace` | Find and replace |

## Example Clients

### Python

```python
import asyncio
import websockets
import json

async def main():
    async with websockets.connect('ws://localhost:19876') as ws:
        # Wait for auth challenge
        challenge = json.loads(await ws.recv())
        nonce = challenge['params']['nonce']
        
        # Authenticate
        await ws.send(json.dumps({
            'jsonrpc': '2.0',
            'id': '1',
            'method': 'auth.authenticate',
            'params': {'token': 'your-token', 'nonce': nonce}
        }))
        auth_result = json.loads(await ws.recv())
        
        # Open a file
        await ws.send(json.dumps({
            'jsonrpc': '2.0',
            'id': '2',
            'method': 'editor.openFile',
            'params': {'path': '/path/to/file.py'}
        }))
        result = json.loads(await ws.recv())
        print(f"Opened: {result}")

asyncio.run(main())
```

### TypeScript/Node.js

```typescript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:19876');

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.method === 'auth.challenge') {
    // Authenticate
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'auth.authenticate',
      params: { token: 'your-token', nonce: message.params.nonce }
    }));
  } else if (message.id === '1' && message.result?.authenticated) {
    // Open a file
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: '2',
      method: 'editor.openFile',
      params: { path: '/path/to/file.ts' }
    }));
  } else {
    console.log('Response:', message);
  }
});
```

## Commands

| Command | Description |
|---------|-------------|
| `agentControl.start` | Start the WebSocket server |
| `agentControl.stop` | Stop the WebSocket server |
| `agentControl.status` | Show server status |
| `agentControl.generateToken` | Generate new auth token |
| `agentControl.showConnections` | Show connected clients |

## Security Considerations

1. **Token Authentication**: All connections must authenticate with a secret token
2. **Local Only by Default**: Server binds to 127.0.0.1 (localhost) by default
3. **Rate Limiting**: Configurable request limits to prevent abuse
4. **Path Restrictions**: Block access to sensitive file paths
5. **Command Restrictions**: Block execution of dangerous commands

### Production Recommendations

- Use a strong, randomly generated token
- Keep the server bound to localhost if possible
- Use TLS (wss://) for remote connections
- Configure restrictedPaths for sensitive directories
- Enable logging for audit trails

## Troubleshooting

### Server won't start
- Check if port 19876 is already in use
- Try a different port in settings

### Authentication failing
- Verify the token matches exactly
- Check that nonce is echoed back correctly

### Can't access files
- Check `security.allowFileSystemAccess` is true
- Verify path is not in `security.restrictedPaths`

### Commands not executing
- Check `security.allowCommandExecution` is true
- Verify command is not in `security.restrictedCommands`

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Run linter
npm run lint

# Run tests
npm run test

# Package extension
npm run package
```

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests.
