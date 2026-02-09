# Master Task List: Notaclaw & AlephNet Client

This document tracks all active development tasks required to bring the `notaclaw` backend and `alephnet-client` frontend to a releasable state.

> **Status Legend:**
> - [ ] To Do
> - [x] Done
> - [/] In Progress

## 🚨 Critical Path (Phase 1: Alpha Release)

These tasks block core functionality. The system cannot operate without them.

### 1. Identity & Cryptography
- [ ] **Implement Ed25519 Key Generation**: Replace `mock-pub-key` in `DSNNode.ts` with real `sodium` or `noble-ed25519` keypair generation.
- [ ] **Implement Resonance Field**: Integrate `computeResonanceField` into the node identity creation flow.
- [ ] **Generate Fingerprint**: Replace static mock with real `selectBodyPrimes` calculation.

### 2. Networking (Gun.js & Mesh)
- [ ] **Initialize Gun.js**: Replace mock peer list with actual `Gun({ peers: ... })` initialization in `DSNNode.ts`.
- [ ] **Peer Discovery**: Implement bootstrap connection to known AlephNet gateways.
- [ ] **Heartbeat**: Implement the 30s heartbeat publication to the mesh.

### 3. SRIA Engine (Active Inference)
- [ ] **Belief Updates**: Replace the `freeEnergy *= 0.95` stub with real Bayesian belief updates.
- [ ] **Expected Free Energy (EFE)**: Implement G = ambiguity - info_gain calculation.
- [ ] **Policy Selection**: Implement softmax selection over policies based on EFE.

### 4. Client IPC & State (The "Brain-Body" Connection)
- [ ] **Main Process IPC**: Implement `onMessage`, `onStateChange`, and `approveTool` handlers in `client/electron/main/index.ts`.
- [ ] **Preload Bridge**: Expose these methods securely in `client/electron/preload/index.ts`.
- [ ] **Zustand Store**: Create `client/src/renderer/store/useAppStore.ts` to manage:
    - `messages` (Chat history)
    - `agentState` (Perceiving/Deciding/Acting)
    - `wallet` (Balance/Stake)
    - `network` (Peer count)
- [ ] **Store Integration**: Connect IPC events to the Zustand store in `App.tsx`.

### 5. Basic UI Wiring
- [ ] **Chat Input**: Connect `InputDeck.tsx` to `window.electronAPI.sendMessage`.
- [ ] **Chat Display**: Connect `ChatView.tsx` to the Zustand `messages` store (replace `MOCK_MESSAGES`).
- [ ] **Agent Status**: Display real "Perceiving/Acting" status in the UI (e.g., in `AgentHUD`).

---

## 🛠 Functional Features (Phase 2: Beta Release)

These tasks make the system useful and robust.

### 6. Economics & Wallet
- [ ] **Unstaking Logic**: Implement the request → lock → release flow.
- [ ] **Reward Calculation**: Implement the formula based on stake duration/tier.
- [ ] **Wallet UI**: Connect "Stake" button to backend function; display real balance.

### 7. Services & Tasks
- [ ] **RPC Execution**: Replace `console.log` stub in `ServiceManager` with actual HTTP/WS/Gun calls.
- [ ] **Task -> SRIA Integration**: Connect `TaskManager` execution to the `sriaEngine.process()` loop.
- [ ] **Event Triggers**: Implement pattern matching for event-driven tasks.

### 8. Observability
- [ ] **Structured Logging**: Replace `console.log` with a proper logger (e.g., `pino` or `winston`) that outputs JSON.
- [ ] **Metrics**: Add a basic Prometheus client to track:
    - `active_peers`
    - `sria_free_energy`
    - `messages_processed`

---

## 🎨 Polish & Advanced (Phase 3: Post-Launch)

These tasks improve UX and add "wow" factor.

### 9. Advanced Visualizations
- [ ] **SMF Radar Chart**: Implement real-time 16-dim visualization in `Inspector.tsx` using `recharts`.
- [ ] **Free Energy Graph**: Plot the agent's free energy minimization over time.
- [ ] **Log Stream**: Show real-time tool execution logs in the UI Inspector.

### 10. Hardening
- [ ] **Dead Letter Queue**: Persist failed messages for retry.
- [ ] **Audit Logging**: Securely log all critical security events (key usage, staking).
- [ ] **Test Coverage**: Add unit tests for `SkillRegistry`, `ServiceManager`, and `Wallet`.

---

### 11. Plugin Architecture Refactor
- [x] **Fix `hello-world` Plugin**: Ensure main entry point exists.
- [x] **Fix Client Dependencies**: Align `@sschepis/alephnet-node` version.
- [ ] **Consolidate PluginManager**: Merge `src/core/PluginManager.ts` and `client/src/main/services/PluginManager.ts` into a shared core.
- [ ] **Harden Sandbox**: Replace `new Function` in `PluginLoader.ts` with a secure sandbox (e.g., iframe or QuickJS).
- [ ] **Full IPC Support**: Implement `ipc.handle` in renderer `PluginLoader` to allow plugins to handle main process requests.

## 📝 Immediate Next Steps
1. **Fix Identity**: The system needs a real "self" before it can join the network.
2. **Fix Networking**: The system needs to talk to peers to be useful.
3. **Wire UI**: You can't verify anything without a working terminal.
