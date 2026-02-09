# AlephNet Node Migration: Trust & Provenance

This document outlines the strategy for migrating the Code Provenance & Web of Trust implementation from the Electron client to the shared `alephnet-node` library. This ensures that all network participants (headless nodes, CLI tools, servers) can verify provenance and enforce trust using the same core logic.

## 1. Core Types

The following types and interfaces will be moved to `alephnet-node/src/types`.

### `trust-types.ts` (Move 100%)
The entire file `client/src/shared/trust-types.ts` should be moved. It contains:
- **Artifact Types**: `ArtifactType`
- **Identity**: `AuthorIdentity`
- **Envelopes**: `SignedEnvelope`, `Endorsement`, `ResonanceProof`
- **Trust**: `TrustLevel`, `TrustAssessment`, `TrustFactors`
- **Capabilities**: `Capability`, `CapabilityDecision`
- **Constants**: `TRUST_WEIGHTS`, `TRUST_THRESHOLDS`, `SOCIAL_DISTANCE_SCORES`

### Dependencies to Migrate
The following types currently reside in `alephnet-types.ts` but are required by the trust system. They should be moved to `alephnet-node/src/types/core-types.ts` (or similar):
- **`KeyTriplet`**: Required for signing and identity verification.
- **`StakingTier`**: Required for trust scoring (weight 0.15).

## 2. Core Services & Logic

### SignedEnvelopeService
**Source**: `client/src/main/services/SignedEnvelopeService.ts`
**Destination**: `alephnet-node/src/services/SignedEnvelopeService.ts`

**Changes Required:**
1.  **Abstract Crypto**: The current implementation uses Node.js `crypto` directly. To support future browser/edge usage, this must be abstracted behind an `ICryptoProvider`.
    -   Create `ICryptoProvider` interface (SHA-256, Ed25519 sign/verify).
    -   Provide `NodeCryptoProvider` implementation using `node:crypto`.
2.  **Remove `IdentityManager` Dependency**: The service currently injects `IdentityManager` to get keys for signing.
    -   **Change**: The `create` and `endorse` methods should accept a `Signer` interface or `KeyTriplet` directly. The service should be stateless regarding "current user".
    -   **New Signature**: `create(payload, identity: KeyTriplet, ...)`

### TrustEvaluator
**Source**: `client/src/main/services/TrustEvaluator.ts`
**Destination**: `alephnet-node/src/services/TrustEvaluator.ts`

**Changes Required:**
1.  **Abstract Data Sources**: The scoring logic depends on social graph and reputation data.
    -   Ensure `ISocialGraphProvider` and `IReputationProvider` are exported from `alephnet-node/src/interfaces`.
2.  **Remove `IdentityManager` & `DomainManager`**:
    -   **Change**: Pass "own identity" (for self-trust check) into the `evaluate` method or constructor configuration.
    -   **Change**: `DomainManager` usage (for common domain check) should be part of `ISocialGraphProvider` or a new `IDomainProvider`.

### TrustGate
**Source**: `client/src/main/services/TrustGate.ts`
**Destination**: `alephnet-node/src/services/TrustGate.ts`

**Changes Required:**
1.  **Configurable Matrix**: The `CAPABILITY_MATRIX` is currently hardcoded.
    -   **Change**: Allow injecting a custom capability matrix in the constructor, defaulting to the standard AlephNet matrix if not provided. This allows different node types (e.g., a headless runner vs. a UI client) to have different security policies.

## 3. Interfaces & Abstractions

Create `alephnet-node/src/interfaces/index.ts` to define the contracts required by the core services.

```typescript
export interface ICryptoProvider {
  sha256(data: string): string;
  sign(data: string, privateKey: string): string;
  verify(data: string, signature: string, publicKey: string): boolean;
}

export interface ISocialGraphProvider {
  getFriends(): Promise<Array<{ id: string; publicKey: string }>>;
  getFriendsOfFriend(friendPub: string): Promise<Array<{ id: string; publicKey: string }>>;
  // Added to replace direct DomainManager dependency
  getCommonDomains(fingerprint: string): Promise<string[]>;
}

export interface IReputationProvider {
  getReputation(publicKey: string): Promise<number>;
  getStakingTier(publicKey: string): Promise<StakingTier>;
  getCoherenceScore(contentHash: string): Promise<number>;
}
```

## 4. Client Refactoring Plan

After the `alephnet-node` library is published/linked:

1.  **Delete** `client/src/shared/trust-types.ts`.
2.  **Update Imports**: Point all references to `@alephnet/node`.
3.  **Implement Adapters**:
    -   Update `AlephNetTrustAdapter` to implement the new `ISocialGraphProvider` (including `getCommonDomains`).
    -   Create `ClientCryptoProvider` (wrapping `node:crypto` or `window.crypto`).
4.  **Instantiate Services**:
    -   `SignedEnvelopeService` becomes a thin wrapper or is instantiated with `ClientCryptoProvider`.
    -   `TrustEvaluator` is instantiated with the `AlephNetTrustAdapter`.
5.  **Keep Client-Specific Logic**:
    -   `PluginManager` stays in client.
    -   `AlephNetTrustAdapter` stays in client (it binds the abstract logic to the concrete DSN client).

## 5. Migration Checklist

- [ ] **Step 1: Scaffolding**
    - [ ] Create `alephnet-node` package structure if not exists.
    - [ ] Set up `tsconfig.json` for ESM/CJS dual build.

- [ ] **Step 2: Types**
    - [ ] Move `trust-types.ts`.
    - [ ] Extract `KeyTriplet` and `StakingTier` to `core-types.ts`.

- [ ] **Step 3: Crypto Abstraction**
    - [ ] Define `ICryptoProvider`.
    - [ ] Implement `NodeCryptoProvider`.

- [ ] **Step 4: Logic Migration**
    - [ ] Port `SignedEnvelopeService` (stateless, provider-based).
    - [ ] Port `TrustEvaluator` (provider-based).
    - [ ] Port `TrustGate` (configurable).

- [ ] **Step 5: Client Update**
    - [ ] `npm install @alephnet/node` (or link).
    - [ ] Refactor client services to use shared library.
    - [ ] Verify unit tests pass in both projects.
