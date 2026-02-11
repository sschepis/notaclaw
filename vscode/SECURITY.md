# Security Hardening Guide

This guide covers recommended security configuration for the VS Code Agent Control extension in production environments.

---

## 1. Authentication

### Token Management

- **Never use an empty token.** The extension auto-generates one, but you should set a strong token explicitly:
  ```json
  "agentControl.token": "your-64-char-hex-token"
  ```
- Generate tokens with: `openssl rand -hex 32`
- Rotate tokens periodically by updating the setting and restarting the server
- Store tokens in VS Code's user settings (not workspace settings) to avoid committing them to source control

### Rate Limiting

Keep rate limiting enabled to prevent abuse:
```json
"agentControl.rateLimit.enabled": true,
"agentControl.rateLimit.requestsPerSecond": 50
```

The rate limiter uses a sliding window algorithm — bursts within a 1-second window are accurately detected.

---

## 2. Network Security

### Bind to Localhost Only

The default `127.0.0.1` restricts connections to the local machine. **Never bind to `0.0.0.0` in production** unless behind a reverse proxy:

```json
"agentControl.host": "127.0.0.1"
```

### Origin Enforcement

Restrict which origins can connect:

```json
"agentControl.allowedOrigins": ["http://localhost:3000", "electron://notaclaw"]
```

Remove the `"*"` wildcard in production. Connections from disallowed origins are rejected with close code 1008.

### TLS/WSS (Future)

TLS support is planned (see ENHANCEMENTS.md §2.1.1). Until then:
- Use an SSH tunnel for remote connections: `ssh -L 19876:127.0.0.1:19876 user@remote`
- Or use a reverse proxy (nginx, caddy) with TLS termination

---

## 3. File System Sandboxing

### Path Containment

All file operations are sandboxed to the workspace root. Paths containing `../` that resolve outside the workspace are rejected with `PathRestricted` error code.

### Restricted Paths

Block sensitive patterns:

```json
"agentControl.security.restrictedPaths": [
  "**/.env",
  "**/.env.*",
  "**/secrets/**",
  "**/*.pem",
  "**/*.key",
  "**/node_modules/**",
  "**/.git/objects/**"
]
```

### File System Access Toggle

Disable file system access entirely for read-only agents:

```json
"agentControl.security.allowFileSystemAccess": false
```

---

## 4. Command Execution

### Allow-List Mode (Recommended)

For maximum security, use allow-list mode — only explicitly listed commands can be executed:

```json
"agentControl.security.allowedCommands": [
  "editor.action.formatDocument",
  "editor.action.organizeImports",
  "workbench.action.files.save"
]
```

When `allowedCommands` is non-empty, all unlisted commands are blocked regardless of `restrictedCommands`.

### Deny-List Mode

If allow-list is too restrictive, use deny-list to block dangerous commands:

```json
"agentControl.security.restrictedCommands": [
  "workbench.action.terminal.sendSequence",
  "workbench.action.terminal.runSelectedText",
  "workbench.action.openSettings",
  "workbench.action.openSettingsJson"
]
```

### Terminal Access

Disable terminal access if the agent doesn't need it:

```json
"agentControl.security.allowTerminalAccess": false
```

---

## 5. Destructive Operation Approval

Enable user approval for destructive operations:

```json
"agentControl.security.requireApproval": true
```

When enabled, `fs.deleteFile` and `fs.deleteDirectory` show a modal dialog requiring the user to click "Allow" before proceeding.

---

## 6. Method Category Restrictions

Limit which method categories are available:

```json
"agentControl.security.allowedMethodCategories": ["editor", "state", "search"]
```

This creates a read-only agent that can view files and search but cannot modify files, run terminals, or execute commands.

### Category Reference

| Category | Capabilities |
|----------|-------------|
| `editor` | Open, close, read, edit, save files |
| `fs` | Read, write, delete, list files and directories |
| `terminal` | Create, send commands, read output |
| `command` | Execute VS Code commands |
| `state` | Diagnostics, symbols, references, hover |
| `search` | Find in files, find and replace |
| `debug` | Start/stop debug sessions, breakpoints |
| `git` | Status, diff, stage, commit, branches |

---

## 7. Logging

### Production Logging

Use `info` level in production to avoid performance overhead:

```json
"agentControl.logging.level": "info"
```

**Warning:** `debug` level includes stack traces in error responses — use only for development.

### Audit Trail

Enable file logging for audit purposes:

```json
"agentControl.logging.logToFile": true
```

---

## 8. Recommended Production Configuration

```json
{
  "agentControl.enabled": true,
  "agentControl.host": "127.0.0.1",
  "agentControl.port": 19876,
  "agentControl.token": "<generated-64-char-hex>",
  "agentControl.allowedOrigins": ["electron://notaclaw"],
  "agentControl.rateLimit.enabled": true,
  "agentControl.rateLimit.requestsPerSecond": 50,
  "agentControl.logging.level": "info",
  "agentControl.logging.logToFile": true,
  "agentControl.security.allowFileSystemAccess": true,
  "agentControl.security.allowTerminalAccess": false,
  "agentControl.security.allowCommandExecution": true,
  "agentControl.security.restrictedPaths": [
    "**/.env", "**/.env.*", "**/*.pem", "**/*.key",
    "**/secrets/**", "**/.git/objects/**"
  ],
  "agentControl.security.allowedCommands": [
    "editor.action.formatDocument",
    "editor.action.organizeImports"
  ],
  "agentControl.security.requireApproval": true,
  "agentControl.security.allowedMethodCategories": [
    "editor", "fs", "state", "search", "command", "git"
  ]
}
```

---

## 9. Threat Model

| Threat | Mitigation |
|--------|-----------|
| Unauthorized access | Token-based auth, origin enforcement |
| Path traversal | Workspace sandboxing via `path.resolve()` containment check |
| Command injection | Allow-list/deny-list mode for VS Code commands |
| Denial of service | Sliding window rate limiter, ping/pong stale connection removal |
| Data exfiltration | Restricted paths, method category restrictions |
| Man-in-the-middle | Localhost binding; TLS planned |
| Session hijacking | Nonce-based challenge-response, session expiry |
