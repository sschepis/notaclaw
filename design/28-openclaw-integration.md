# OpenClaw Gateway Integration Design

## 1. Overview

The OpenClaw Gateway is a specialized plugin that enables AlephNet nodes to communicate with OpenClaw nodes. This integration allows AlephNet users to:
1.  Discover OpenClaw nodes.
2.  Submit tasks to OpenClaw networks.
3.  Receive results from OpenClaw tasks.
4.  Bridge AlephNet Agents with OpenClaw Agents.

## 2. Architecture

The integration follows the "Gateway Service" pattern, implemented as a standard AlephNet plugin.

### 2.1 Plugin Structure

The plugin `plugins/openclaw-gateway` will contain:
-   **Manifest**: Defines permissions (`network:http`, `dsn:register-service`).
-   **Main Process**: Handles connection to OpenClaw nodes (HTTP/WebSocket).
-   **Service Registration**: Registers an `openclaw-gateway` service in the AlephNet DSN.
-   **Tool Registration**: Exposes tools for Agents to interact with OpenClaw.

### 2.2 Communication Flow

1.  **AlephNet Agent** invokes tool `openclaw_submit_task`.
2.  **Gateway Plugin** receives the request.
3.  **Gateway Plugin** translates the request to OpenClaw API format.
4.  **Gateway Plugin** sends HTTP/WS request to configured OpenClaw node.
5.  **OpenClaw Node** processes task.
6.  **Gateway Plugin** receives result/update.
7.  **Gateway Plugin** updates AlephNet task status or returns tool result.

## 3. Configuration

The plugin requires configuration for OpenClaw endpoints.

```json
// plugins/openclaw-gateway/aleph.json
{
  "configuration": {
    "endpoints": [
      { "url": "http://localhost:8080", "name": "Local OpenClaw" },
      { "url": "https://api.openclaw.io", "name": "Public OpenClaw" }
    ],
    "autoSync": true
  }
}
```

## 4. API Mapping

### 4.1 Tools

The plugin will expose the following tools to AlephNet Agents:

-   `openclaw_list_nodes()`: Returns list of known OpenClaw nodes.
-   `openclaw_submit_task(description: string, requirements: object)`: Submits a task.
-   `openclaw_get_task_status(taskId: string)`: Checks status.
-   `openclaw_cancel_task(taskId: string)`: Cancels a task.

### 4.2 Service Definition

The plugin registers a service `openclaw.gateway` in the DSN Service Registry.

```typescript
const serviceDef: ServiceDefinition = {
  id: 'openclaw.gateway',
  name: 'OpenClaw Gateway',
  description: 'Bridge to OpenClaw networks',
  interface: {
    protocol: 'REST', // Virtual protocol, accessed via tool calls or internal API
    endpoints: [
      { name: 'submit', path: '/tasks', method: 'POST', ... }
    ]
  }
  // ...
};
```

## 5. Gateway Interface

To ensure flexibility, we define a `Gateway` interface in `src/shared/plugin-types.ts` (or similar) that this plugin implements. This allows other gateways (e.g., to other networks) to follow the same pattern.

```typescript
export interface GatewayDefinition {
  id: string;
  networkName: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  submitTask(task: any): Promise<string>;
  getTaskStatus(taskId: string): Promise<any>;
}
```

## 6. Security

-   **Permissions**: The plugin requests `network:http` to talk to OpenClaw.
-   **Trust**: The plugin should be signed by a trusted entity (e.g., the user or a verified developer).
-   **Secrets**: OpenClaw API keys (if needed) are stored in the AlephNet Secrets Manager.

## 7. Implementation Plan

1.  **Define Types**: Add `GatewayDefinition` to shared types.
2.  **Create Plugin**: Scaffold `plugins/openclaw-gateway`.
3.  **Implement Logic**: Write the connection and mapping logic.
4.  **Register Tools**: Hook up the tools in `activate()`.
5.  **Test**: Verify connectivity with a mock OpenClaw server.
