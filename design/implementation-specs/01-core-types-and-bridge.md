# Implementation Spec: Core Types & AlephGunBridge

## 1. Overview
This specification details the implementation of the core AlephNet interfaces, including the `KeyTriplet` identity system, the `AlephGunBridge` for mesh interaction, and the `DSNNode` configuration. These components form the foundation for the decentralized and semantic capabilities of the application.

## 2. Updated Core Types (`client/src/shared/types.ts`)

We need to replace the basic types with the comprehensive definitions from `design/07-typescript-definitions.md`.

### 2.1 Key Interfaces to Add
*   `ExecutionContext`, `SemanticDomain`, `MessageRole`
*   `SkillDefinition`, `ToolCallIntent`, `ToolResult`
*   `KeyTriplet` (Ed25519 + Resonance)
*   `DSNNodeConfig`
*   `AlephMeshGraph` schema (Nodes, Users, Skills, Conversations, GMF)
*   `SRIASessionState`, `DurableAgentState`

### 2.2 KeyTriplet Implementation Details
The `KeyTriplet` is the cryptographic identity.
*   **Pub**: Ed25519 public key (Base64).
*   **Resonance**: A 16-float array representing the node's semantic "vibration".
*   **Fingerprint**: First 16 chars of the SHA-256 hash of the public key.

## 3. AlephGunBridge Service (`client/src/main/services/AlephGunBridge.ts`)

This service bridges the Electron Main process with the Gun.js mesh.

### 3.1 Dependencies
*   `gun`: The decentralized database engine.
*   `sea`: Security, Encryption, Authorization (Gun's crypto layer).

### 3.2 Interface
```typescript
export interface AlephGunBridge {
  initialize(dsnNode: DSNNodeConfig): Promise<void>;
  
  // Graph Operations
  put(path: string, data: any): Promise<void>;
  get(path: string): Promise<any>;
  subscribe(path: string, callback: (data: any) => void): () => void;
  
  // Semantic Operations
  projectToSMF(data: any): number[]; // Calculate resonance
  
  // Identity
  authenticate(triplet: KeyTriplet): Promise<void>;
}
```

## 4. DSNNode Implementation (`client/src/main/services/DSNNode.ts`)

Replaces `DSNNodeStub.ts`.

### 4.1 Responsibilities
*   Manage the `KeyTriplet` identity.
*   Maintain the `DSNNodeConfig` (status, load, capabilities).
*   Heartbeat mechanism to the mesh.
*   Manage the `AlephGunBridge` instance.

### 4.2 State Machine
*   `OFFLINE`: Initial state.
*   `BOOTSTRAPPING`: Connecting to peers.
*   `ONLINE`: Active and participating in the mesh.
*   `DRAINING`: Shutting down, finishing active tasks.

## 5. Implementation Plan

1.  **Update `types.ts`**: Copy and adapt definitions from Design 07.
2.  **Update `IdentityManager`**:
    *   Switch from `crypto` (RSA) to `sodium-native` or `ed25519-supercop` (or Gun's `SEA`) for Ed25519.
    *   Implement `generateResonance()` (random 16-float vector for now).
3.  **Create `AlephGunBridge`**:
    *   Initialize Gun instance.
    *   Implement basic `put`/`get`.
4.  **Upgrade `DSNNode`**:
    *   Integrate `IdentityManager` and `AlephGunBridge`.
    *   Implement real heartbeat logic.
