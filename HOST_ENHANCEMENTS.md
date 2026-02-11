# Host App (Resonant Terminal) — Enhancement List

Comprehensive analysis of the notaclaw headless node and its `vscode-control` plugin.  
Items are categorized by severity and area.

---

## 1. Critical Bugs

### 1.1 Duplicate Service Instantiation
**Files:** [`index.ts`](src/index.ts:25), [`DSNNode.ts`](src/services/DSNNode.ts:28-32)  
`index.ts` creates `IdentityManager` + `SignedEnvelopeService`, but `DSNNode` constructor creates its own copies internally. Two independent `IdentityManager` instances may diverge in state (keys, identity cache).

### 1.2 Stubbed Trust Adapter (Hardcoded Values)
**File:** [`index.ts`](src/index.ts:83-89)  
Trust adapter returns `getFriends: []`, `getReputation: 0.5`, `getStakingTier: 'Neophyte'`, `getCoherenceScore: 0.5`. Trust evaluation is functionally inert—all external artifacts score identically, defeating the web-of-trust model.

### 1.3 No Plugin Shutdown on SIGINT
**File:** [`index.ts`](src/index.ts:118-123)  
`SIGINT` handler calls `dsnNode.stop()` and `secretsManager.shutdown()` but never `pluginManager.shutdown()`. Active plugins (e.g., vscode-control) won't have `deactivate()` called, leaking WebSocket connections and timers.

### 1.4 No Graceful Shutdown on BasePluginManager
**File:** [`BasePluginManager.ts`](src/shared/plugin-core/BasePluginManager.ts)  
No `shutdown()` or `dispose()` method exists. No way to iterate plugins and call `deactivate()` on each during application teardown.

### 1.5 Sandbox Provider is `{} as any`
**File:** [`PluginManager.ts`](src/services/PluginManager.ts:361)  
`services.sandbox` is `{} as any`. Any plugin with `exec:spawn` permission that calls `createSession()` will crash with a runtime TypeError.

### 1.6 `gateway:register` Capability Duplicated
**File:** [`trust-types.ts`](src/shared/trust-types.ts:94-95)  
`Capability` type lists `'gateway:register'` twice — harmless but indicates copy-paste drift.

### 1.7 Capability Decision Race Condition
**File:** [`PluginManager.ts`](src/services/PluginManager.ts:218-221)  
`this.currentCapabilityDecisions` is set as a class field, then read inside `createContext()`, then cleared. If plugins are loaded concurrently, decisions from one plugin could bleed into another's context closure.

### 1.8 Embedding Fallback Returns Random Vectors
**File:** [`AIProviderManager.ts`](src/services/AIProviderManager.ts:456-493)  
When no embedding provider is configured or on error, `getEmbeddings()` silently returns `Array.from({ length: 768 }, () => Math.random())`. This corrupts any semantic search or vector store built on these embeddings.

---

## 2. Host App Service Enhancements

### 2.1 Architecture

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.1.1 | **DI container** — Replace manual wiring in `index.ts` with a centralized DI container. Prevents duplicate instances and makes testing easier. | `index.ts`, all services |
| 2.1.2 | **DSNNode dependency injection** — Accept `IdentityManager`, `SignedEnvelopeService`, `DomainManager` as constructor params instead of self-instantiating. | `DSNNode.ts`, `index.ts` |
| 2.1.3 | **Typed event bus** — Replace raw `EventEmitter` in DSNNode/BasePluginManager with a typed event bus for compile-time safety. | `DSNNode.ts`, `BasePluginManager.ts` |
| 2.1.4 | **Structured logging** — Replace `console.log`/`console.error` with structured logger using `ConfigManager.logging` settings. | All files |

### 2.2 Plugin Manager

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.2.1 | **Plugin shutdown lifecycle** — Add `shutdown()` to `BasePluginManager` that calls `deactivate()` on all loaded plugins. Wire into SIGINT handler. | `BasePluginManager.ts`, `PluginManager.ts`, `index.ts` |
| 2.2.2 | **Plugin dependency ordering** — Plugins should declare dependencies in manifest; load order should respect dependency graph (topological sort). | `PluginManager.ts`, manifest schema |
| 2.2.3 | **Hot reload** — Support `unloadPlugin` → `loadPlugin` cycle without restarting the node. | `PluginManager.ts` |
| 2.2.4 | **Fix capability decision race** — Pass `capabilityDecisions` as a parameter to `createContext()` instead of class-level mutable state. | `PluginManager.ts` |
| 2.2.5 | **IPC bus for headless mode** — Implement local EventEmitter-based IPC so plugins can communicate (`send`/`on`/`handle`/`invoke`) without Electron. | `PluginManager.ts` |
| 2.2.6 | **Sandbox provider** — Implement at least a basic Node.js `child_process` sandbox for the `exec:spawn` capability. | `PluginManager.ts`, new `SandboxProvider.ts` |
| 2.2.7 | **Plugin health monitoring** — Heartbeat or watchdog that detects hung/crashed plugins and emits `plugin-error` events. | `PluginManager.ts` |
| 2.2.8 | **Runtime plugin configuration** — Allow plugins to read/update config via `context.storage` beyond just `manifest.alephConfig.configuration`. | `PluginManager.ts` |

### 2.3 AI Provider Manager

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.3.1 | **Fetch Anthropic models from API** — Replace hardcoded model list with Anthropic's `/v1/models` endpoint. | `AIProviderManager.ts` L363-370 |
| 2.3.2 | **Cache Vertex access tokens** — JWT tokens are valid for 1 hour; cache the token and reuse until 5 min before expiry instead of regenerating per request. | `AIProviderManager.ts` `getVertexAccessToken()` |
| 2.3.3 | **Streaming support** — `AIRequestOptions.stream` field exists but is unused. Implement streaming for OpenAI, Anthropic, Google, Vertex. | `AIProviderManager.ts`, `ai-types.ts` |
| 2.3.4 | **Type `toolCalls` properly** — `AIResponse.toolCalls` is `any[]`. Create `ToolCall` interface with `id`, `name`, `arguments`. | `ai-types.ts` |
| 2.3.5 | **Fix embedding fallback** — Throw an error or return `null` instead of silent random vectors. Log a warning clearly. | `AIProviderManager.ts` `getEmbeddings()` |
| 2.3.6 | **Provider health checks** — Periodic probe of configured providers; maintain health status; auto-failover to next provider on sustained failure. | `AIProviderManager.ts` |
| 2.3.7 | **Request retry with backoff** — Retry transient errors (HTTP 429, 500, 502, 503) with exponential backoff before surfacing failure. | `AIProviderManager.ts` |

### 2.4 PersonalityManager

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.4.1 | **Memory context retrieval** — Implement the TODO: retrieve relevant memory fragments from DSNNode to include in prompts. | `PersonalityManager.ts` |
| 2.4.2 | **Conversation history** — Maintain a sliding window of conversation turns. Replace `User: ${content}\nAssistant:` with multi-turn message array. | `PersonalityManager.ts` |
| 2.4.3 | **System prompt configuration** — Support configurable system prompts per mode (chat/code/agent). | `PersonalityManager.ts`, `ConfigManager.ts` |
| 2.4.4 | **Tool/function calling integration** — `processRequest` doesn't support tools; `processChatRequest` does. PersonalityManager should route to the right method based on whether tools are available. | `PersonalityManager.ts` |

### 2.5 ConfigManager

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.5.1 | **Config validation** — Validate loaded config against a JSON schema. Warn on unknown keys; fail on invalid types. | `ConfigManager.ts` |
| 2.5.2 | **Environment variable overrides** — Support `ALEPHNET_PEERS`, `ALEPHNET_LOG_LEVEL`, etc. for container/CI deployment. | `ConfigManager.ts` |
| 2.5.3 | **Config change events** — Emit events on config updates so dependent services can react without polling. | `ConfigManager.ts` |
| 2.5.4 | **Plugin config sections** — Extend `AppConfig` to support arbitrary `plugins: Record<string, unknown>` for plugin-specific config. | `ConfigManager.ts` |

### 2.6 ServiceRegistry

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.6.1 | **Tool listing/introspection API** — `listTools(): { name, description, parameters }[]` for AI agent tool discovery. | `ServiceRegistry.ts` |
| 2.6.2 | **Gateway health monitoring** — Periodic health check of registered gateways; auto-reconnect on failure; status events. | `ServiceRegistry.ts` |
| 2.6.3 | **Implement service search** — Replace stub `search()` with basic tag/category lookup against Gun indices. | `ServiceRegistry.ts` |
| 2.6.4 | **Type-safe tool handlers** — Replace `Function` with `(args: unknown) => Promise<unknown>`. | `ServiceRegistry.ts` |

### 2.7 Trust & Security

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.7.1 | **Implement HeadlessTrustAdapter** — Build a real adapter using Gun bridge for social graph queries, reputation, staking, and coherence. | New `HeadlessTrustAdapter.ts`, `index.ts` |
| 2.7.2 | **Persist trust overrides** — TrustEvaluator's `overrideMap` is in-memory only. Persist to disk or Gun so overrides survive restart. | `TrustEvaluator.ts` |
| 2.7.3 | **Audit logging** — `ProvenanceAuditEventType` is defined but no audit logging exists. Implement structured audit trail for trust decisions, capability checks, and plugin loads. | New `AuditService.ts`, `TrustEvaluator.ts`, `PluginManager.ts` |

### 2.8 DSNNode

| # | Enhancement | Affected Files |
|---|-------------|---------------|
| 2.8.1 | **Expose EnvelopeService** — Add `getEnvelopeService()` so external code doesn't need to create a duplicate instance. | `DSNNode.ts` |
| 2.8.2 | **Error recovery on partial start** — Implement rollback/cleanup if `start()` fails midway. | `DSNNode.ts` |
| 2.8.3 | **Peer reconnection** — Detect Gun peer disconnection and attempt reconnect with backoff. | `DSNNode.ts` |
| 2.8.4 | **Remove unused `options` variable** — `processMessage()` builds `options: AIRequestOptions` but never uses it (delegates to `personalityManager.handleInteraction`). Remove or pass through. | `DSNNode.ts` L106-112 |

---

## 3. vscode-control Plugin Enhancements

### 3.1 Missing Tool Categories

| # | Tool | Extension Method | Description |
|---|------|-----------------|-------------|
| 3.1.1 | `vscode_debug_start` | `debug.startSession` | Start a debug session |
| 3.1.2 | `vscode_debug_stop` | `debug.stopSession` | Stop a debug session |
| 3.1.3 | `vscode_debug_set_breakpoints` | `debug.setBreakpoints` | Set breakpoints in a file |
| 3.1.4 | `vscode_debug_get_breakpoints` | `debug.getBreakpoints` | Get all breakpoints |
| 3.1.5 | `vscode_debug_remove_breakpoints` | `debug.removeBreakpoints` | Remove breakpoints |
| 3.1.6 | `vscode_debug_list_sessions` | `debug.listSessions` | List active debug sessions |
| 3.1.7 | `vscode_git_status` | `git.status` | Get git status |
| 3.1.8 | `vscode_git_diff` | `git.diff` | Get git diff for a file |
| 3.1.9 | `vscode_git_log` | `git.log` | Get git commit log |
| 3.1.10 | `vscode_git_commit` | `git.commit` | Stage and commit changes |
| 3.1.11 | `vscode_git_branches` | `git.branches` | List git branches |
| 3.1.12 | `vscode_git_stage` | `git.stage` | Stage files |
| 3.1.13 | `vscode_git_unstage` | `git.unstage` | Unstage files |
| 3.1.14 | `vscode_git_checkout` | `git.checkout` | Checkout a branch |
| 3.1.15 | `vscode_get_terminal_output` | `terminal.getOutput` | Get terminal output history |
| 3.1.16 | `vscode_get_document_info` | `editor.getDocumentInfo` | Get document metadata |
| 3.1.17 | `vscode_get_completions` | `editor.getCompletions` | Get completion suggestions |
| 3.1.18 | `vscode_get_open_documents` | `state.getOpenDocuments` | Get all open documents with details |
| 3.1.19 | `vscode_get_visible_editors` | `state.getVisibleEditors` | Get visible editor panes |
| 3.1.20 | `vscode_watch_files` | `fs.watchFiles` | Watch files for changes |
| 3.1.21 | `vscode_unwatch_files` | `fs.unwatchFiles` | Stop watching files |

### 3.2 Client Enhancements

| # | Enhancement | Description |
|---|-------------|-------------|
| 3.2.1 | **WSS/TLS support** — Plugin always uses `ws://`. Extension now supports WSS. Add config option for `wss://` connections. |
| 3.2.2 | **Config from secrets** — Read connection token from `context.secrets` instead of only `manifest.alephConfig.configuration`. |
| 3.2.3 | **Connection status tool** — Add `vscode_connection_status` tool returning `{ connected, authenticated, reconnectAttempts }`. |
| 3.2.4 | **Batch request support** — Extension supports JSON-RPC batch requests. Use for compound operations (e.g., open + edit + save). |
| 3.2.5 | **Event forwarding to DSN** — Forward VS Code notifications (file changes, diagnostics) as DSN observations for network awareness. |
| 3.2.6 | **Manifest permissions update** — Add `ai:complete` permission if plugin needs AI access; currently only declares `network:http` and `dsn:register-tool`. |

---

## 4. Testing

| # | Enhancement | Description |
|---|-------------|-------------|
| 4.1 | **Core service unit tests** — No tests exist for: DSNNode, PluginManager, ServiceRegistry, AIProviderManager, ConfigManager, PersonalityManager, TrustEvaluator, TrustGate. |
| 4.2 | **Integration tests** — No tests for the full startup sequence (index.ts → DSNNode → PluginManager → plugin load). |
| 4.3 | **vscode-control plugin tests** — `package.json` lists jest but no test files exist for the plugin itself. |
| 4.4 | **Trust evaluation tests** — Test TrustEvaluator with various social distances, reputation scores, and override combinations. |
| 4.5 | **AI provider failover tests** — Test provider resolution fallback and retry logic. |

---

## 5. Documentation

| # | Enhancement | Description |
|---|-------------|-------------|
| 5.1 | **Headless node setup guide** — Document how to configure and run the headless node, including config.json, ai-settings.json, and peers. |
| 5.2 | **Plugin development guide (headless)** — Document the `PluginContext` API for headless-mode plugins, including available services and limitations (no IPC, no sandbox, no traits). |
| 5.3 | **Architecture overview** — Document the service dependency graph, data flow, and Gun.js integration. |

---

## Summary

| Category | Count |
|----------|-------|
| Critical Bugs | 8 |
| Architecture | 4 |
| Plugin Manager | 8 |
| AI Provider | 7 |
| PersonalityManager | 4 |
| ConfigManager | 4 |
| ServiceRegistry | 4 |
| Trust & Security | 3 |
| DSNNode | 4 |
| vscode-control Plugin | 27 |
| Testing | 5 |
| Documentation | 3 |
| **Total** | **81** |
