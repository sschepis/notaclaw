# Potential Enhancements for VS Code Agent Control

## VS Code Extension Enhancements

These features require updates to the VS Code extension (`vscode/`) to expose new capabilities or improve security.

### Security & Connectivity
- **TLS/WSS Support**: Implement secure WebSocket server (WSS) to allow safe remote connections over public networks.
- **Granular Permissions**: Implement a permission system to restrict file access to specific directories or read-only modes per client.
- **Client Identity**: Enhance authentication to support client certificates or stronger identity verification beyond simple tokens.

### User Experience (VS Code UI)
- **Activity Indicators**: Add a status bar item or notification to show when the agent is actively performing operations.
- **User-Agent Chat Panel**: Create a custom webview panel in VS Code for the user to chat directly with the connected agent.
- **Approval Workflows**: Implement a mechanism to prompt the user for confirmation before executing potentially destructive actions (e.g., `fs.deleteFile`).

### Functional Capabilities
- **Debugger Control**: Expose VS Code's debugging API to allow the agent to start/stop sessions, set breakpoints, and inspect variables.
- **LSP Integration**: Provide direct access to Language Server Protocol features like "Go to Definition", "Find References", and "Rename Symbol" via the API.
- **Enhanced Terminal Control**: Allow the agent to send input to running terminal processes (stdin) and capture output streams more reliably.
- **File Watching**: Implement a file watcher service to push notifications to the agent when files are changed by the user.
- **Git Integration**: Expose VS Code's Git extension API to allow the agent to stage, commit, and push changes.
- **Multi-Root Workspace Support**: Improve file system operations to handle multi-root workspaces correctly.
- **Extension Management**: Allow the agent to list, install, and disable other VS Code extensions.

## AlephNet Client Enhancements

These features require updates to the AlephNet plugin (`plugins-extended/vscode-control/`) or the agent logic to leverage the VS Code capabilities.

### Integration Logic
- **Smart Reconnection**: Implement robust reconnection logic with exponential backoff to handle VS Code restarts.
- **Context Synchronization**: Automatically sync open files and cursor position to the agent's context window.
- **Terminal Session Management**: Maintain persistent terminal sessions across agent tasks.

### User Interaction
- **Chat Interface Handler**: Handle messages from the VS Code User-Agent Chat panel and route them to the conversation engine.
- **Approval Request Handling**: Handle "approval required" responses from the extension and present them to the user (if using a different interface).

### Tool Abstractions
- **High-Level Coding Tools**: Create higher-level tools that combine multiple primitives (e.g., "Refactor Function" that uses LSP to find references and applies edits).
- **Project Scaffolding**: Tools to scaffold new projects using VS Code's template capabilities or file system operations.

## Custom Agent Integration

To leverage the "custom development agents" (Architect, Operator), we can integrate the VS Code control capabilities directly into their workflows.

### The Architect (System & Code Mentor)
- **Capability**: `code_review` -> **VS Code Tool**: `vscode_read_file`, `vscode_list_files`
- **Capability**: `architecture_design` -> **VS Code Tool**: `vscode_open_file` (to visualize diagrams or specs)
- **Integration**: Give The Architect the ability to actively explore the codebase in VS Code to provide more context-aware architectural advice.

### The Operator (DevOps & Security)
- **Capability**: `security_audit` -> **VS Code Tool**: `vscode_run_terminal_command` (to run audit tools), `vscode_read_file` (to check config)
- **Integration**: Allow The Operator to run security scans in the VS Code terminal and open vulnerable files for the user to fix.

### Integration Strategy
1.  **Trait Injection**: Create a `vscode-controller` trait that grants access to the `vscode_*` tools.
2.  **Personality Update**: Add the `vscode-controller` trait to `architect.json` and `operator.json`.
3.  **Context Awareness**: Update the system prompt for these agents to be aware of their ability to manipulate the user's active editor.
