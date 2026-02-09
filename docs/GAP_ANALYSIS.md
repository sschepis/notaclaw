# Gap Analysis: Design vs. Implementation

This document provides a comprehensive analysis of functionality and features specified in the design documents (`./design/`) that are not yet implemented or are only partially implemented in the application code.

---

## Executive Summary

The application has a solid foundational structure with most core interfaces and skeleton implementations in place. However, significant gaps exist between the detailed design specifications and actual implementation, particularly in:

1. **Cryptographic Identity** - Real Ed25519 key generation and KeyTriplet derivation
2. **Network Integration** - Actual Gun.js and AlephNet connectivity
3. **Observability** - No metrics, tracing, or structured logging
4. **Advanced SRIA Features** - Full Active Inference implementation
5. **Agentic Workflows** - Event-triggered tasks and full service monetization
6. **Testing Coverage** - Partial test coverage for implemented features

---

## 1. Core Identity & Cryptography

### Design Specification (design/02-integration.md, design/16-security.md)

The design specifies a complete cryptographic identity system:
- **KeyTriplet Generation**: Ed25519 keypair → SHA-256 hash → Prime factorization → Resonance field calculation
- **Dual-Layer Identity**: Gun.js SEA layer + AlephNet KeyTriplet
- **Prime-Resonant Identity**: Actual derivation of resonance field from public key bytes
- **Body Prime Calculation**: `selectBodyPrimes(seed, count)` using modular arithmetic

### Current Implementation

**File**: [`src/core/DSNNode.ts`](src/core/DSNNode.ts:49)
```typescript
private generateMockKeyTriplet(): KeyTriplet {
  return {
    pub: 'mock-pub-key',
    resonance: Array(16).fill(0),
    fingerprint: 'mock-fingerprint'
  };
}
```

**File**: [`src/infra/Security.ts`](src/infra/Security.ts:378)
```typescript
export async function computeResonanceField(publicKey: Uint8Array): Promise<number[]> {
  // Implemented but not integrated into DSNNode
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Ed25519 Key Generation | Full spec | Mock only | **HIGH** |
| Resonance Field Derivation | `computeResonanceField()` exists | Not integrated | **HIGH** |
| Prime-Resonant Fingerprint | 16-char from primes | Static mock | **HIGH** |
| SEA/Gun.js Integration | Dual-layer auth | Not implemented | **MEDIUM** |
| Key Storage/Recovery | Encrypted backup | Not implemented | **MEDIUM** |

---

## 2. Network & Mesh Connectivity

### Design Specification (design/02-integration.md, design/18-dependencies.md)

- **Gun.js Peers**: Real peer discovery and connection
- **AlephNet Bootstrap**: WebSocket connection to bootstrap nodes
- **Heartbeat Protocol**: Publish node status to mesh every 30s
- **Peer Discovery**: Dynamic mesh topology updates

### Current Implementation

**File**: [`src/core/DSNNode.ts`](src/core/DSNNode.ts:84)
```typescript
async joinMesh(options?: { gatewayUrl?: string }): Promise<{ peers: string[] }> {
  // Mock bootstrap response
  const peers = [
    'https://peer1.alephnet.com/gun',
    'https://peer2.alephnet.com/gun'
  ];
  // ...
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Real Gun.js Initialization | `require('gun')({...})` | Not done | **HIGH** |
| Bootstrap Connection | HTTP/WS to gateway | Mock URLs | **HIGH** |
| Peer Announcement | `mesh.get(nodeId).put(config)` | Commented out | **MEDIUM** |
| Dynamic Peer Discovery | DHT-style lookup | Not implemented | **MEDIUM** |
| Heartbeat Publication | Gun sync | Stub only | **LOW** |

---

## 3. SRIA Engine (Active Inference)

### Design Specification (design/05-agentic-requirements.md, design/07-typescript-definitions.md)

The design specifies a full Active Inference agent:
- **Perceive**: Observation → Belief update using Bayesian inference
- **Decide**: Free energy minimization with expected free energy calculation
- **Act**: Policy selection based on epistemic/pragmatic value
- **Learn**: Quaternion rotation in belief space, entropy trajectory
- **Attention Mechanism**: Prime-aligned layer weighting
- **GMF Contribution**: Consolidate insights to Global Memory Field

### Current Implementation

**File**: [`src/core/SRIAEngine.ts`](src/core/SRIAEngine.ts:67)
```typescript
async perceive(input: any): Promise<void> {
  // Mock: Reduce free energy slightly
  this.state.freeEnergy *= 0.95; 
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Bayesian Belief Updates | Full posterior calculation | Simple decrement | **HIGH** |
| Expected Free Energy | G = ambiguity - info_gain | Not implemented | **HIGH** |
| Policy Selection | Softmax over EFE | Hardcoded logic | **HIGH** |
| Quaternion Belief Rotation | Hamilton product | Simple increment | **MEDIUM** |
| Attention Layer Weights | Per-layer SMF alignment | Empty object | **MEDIUM** |
| GMF Contribution | On consolidation | Stub only | **MEDIUM** |
| Epoch Management | Sleep/wake cycles | Basic check | **LOW** |
| Prime Alignment | Belief-to-prime mapping | Not implemented | **LOW** |

---

## 4. Tasks System

### Design Specification (design/08-tasks.md)

Comprehensive task automation:
- **Schedule Types**: CRON, INTERVAL, EVENT, MANUAL
- **Event Triggers**: Pattern matching on event streams
- **Service Integration**: Task→Service call chains
- **Concurrency Control**: Max concurrent, queue management
- **Output Storage**: Conversation, GMF, Content Store, Webhooks

### Current Implementation

**File**: [`src/core/TaskManager.ts`](src/core/TaskManager.ts:164)
```typescript
// 3. Mock Execution (Integration with SRIA would happen here)
const result = { 
    output: `Simulated output for ${task.name}`, 
    coherence: 0.95,
    smf: new Array(16).fill(0) 
}; // Mock result
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| SRIA Integration | `sriaEngine.process()` | Mock result | **HIGH** |
| Event-Triggered Tasks | Pattern subscription | Not implemented | **HIGH** |
| Service Call Chain | `serviceManager.call()` | Not integrated | **MEDIUM** |
| Concurrency Limits | `maxConcurrent` check | Not enforced | **MEDIUM** |
| Output to GMF | `contributeToGMF` | Not implemented | **MEDIUM** |
| Output to Content Store | `toContentStore` | Not implemented | **MEDIUM** |
| Webhook Delivery | `webhookUrl` | Not implemented | **LOW** |
| Full Cron Syntax | Range/step expressions | Partial | **LOW** |

---

## 5. Services Layer

### Design Specification (design/09-services.md)

Complete service monetization:
- **Pricing Models**: FREE, PER_CALL, SUBSCRIPTION, STAKE_GATED, HYBRID
- **Subscription Management**: Tier-based access, renewal
- **SLA Enforcement**: Uptime monitoring, response time tracking
- **Revenue Distribution**: Provider/Network/Stakers split
- **Rate Limiting**: Per-minute/hour/day/burst limits
- **Health Checks**: Instance health monitoring

### Current Implementation

**File**: [`src/services/ServiceManager.ts`](src/services/ServiceManager.ts:275)
```typescript
private async executeRpc(instance: ServiceInstance, endpoint: any, input: any): Promise<any> {
    // Stub
    console.log(`Executing ${endpoint.method} on ${instance.nodeId} for ${endpoint.name}`);
    return { success: true, data: "Mock result" };
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Actual RPC Execution | HTTP/WS/Gun protocols | Mock return | **HIGH** |
| Subscription Management | Tier tracking, renewal | Not implemented | **HIGH** |
| SLA Monitoring | Uptime/latency tracking | Metrics struct only | **MEDIUM** |
| Revenue Distribution | 3-way split | Not implemented | **MEDIUM** |
| Rate Limiting | Per-user/per-service | In Security.ts, not integrated | **MEDIUM** |
| Health Checks | Periodic polling | Stub | **LOW** |
| Protocol Support | REST/GraphQL/gRPC/WS | Placeholder | **LOW** |

---

## 6. Semantic Storage

### Design Specification (design/10-semantic-storage.md)

Content-addressed semantic storage:
- **Chunking**: Configurable size with overlap
- **Entity Extraction**: NER for entities/keywords
- **Version Control**: History tracking, fork support
- **External Storage**: IPFS, IPNS, HTTP references
- **Encryption**: AES-256-GCM, ChaCha20-Poly1305
- **GMF Contribution**: Auto-contribute public content

### Current Implementation

**File**: [`src/storage/SemanticStore.ts`](src/storage/SemanticStore.ts:370)
```typescript
private async fetchCandidateItems(): Promise<ContentItem[]> {
    // Mock fetch of recent items
    return []; 
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Gun Query Implementation | `gun.get().map().once()` | Returns empty | **HIGH** |
| Entity Extraction | NLP pipeline | Not implemented | **MEDIUM** |
| Language Detection | Auto-detect | Hardcoded 'en' | **LOW** |
| Prime Factor Generation | Content→primes | Empty array | **MEDIUM** |
| IPFS Integration | External storage ref | Placeholder | **LOW** |
| Content Encryption | Encrypt before store | Logic exists, not integrated | **MEDIUM** |
| Version Comparison | Diff/merge | Not implemented | **LOW** |

---

## 7. Event System

### Design Specification (design/15-events.md)

Full pub/sub with semantic routing:
- **Semantic Filtering**: SMF similarity threshold
- **Event Replay**: Historical event retrieval
- **Correlation/Causation**: Request tracing
- **Priority Queuing**: CRITICAL > HIGH > NORMAL > LOW
- **TTL Expiration**: Event cleanup

### Current Implementation

**File**: [`src/infra/EventBus.ts`](src/infra/EventBus.ts:174)
```typescript
if (pattern.semantic && event.semantic) {
  if (pattern.semantic.domain && event.semantic.domain !== pattern.semantic.domain) return false;
  if (pattern.semantic.smfSimilarity) {
     // Logic needs embedding service access or helper
  }
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| SMF Similarity Filtering | Cosine threshold | Not computed | **MEDIUM** |
| Event Replay | Query by time range | Not implemented | **MEDIUM** |
| Priority Queuing | Process order | All same priority | **LOW** |
| TTL Cleanup | Background job | Not implemented | **LOW** |
| Gun Broadcast | Multi-node publish | Commented out | **MEDIUM** |

---

## 8. Wallet & Economics

### Design Specification (design/12-wallet-economics.md)

Complete token economics:
- **Unstaking**: Time-locked unstake with unlock period
- **Reward Calculation**: Based on stake duration, tier, participation
- **Coherence Staking**: Stake on claims, earn/lose based on consensus
- **Transaction History**: Full audit trail
- **Tier Benefits**: Speed multipliers, access levels

### Current Implementation

**File**: [`src/infra/Wallet.ts`](src/infra/Wallet.ts:306)
- Staking implemented ✓
- Transfers implemented ✓
- Payment authorization implemented ✓

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Unstaking Flow | Request → Lock → Release | Not implemented | **HIGH** |
| Reward Calculation | Complex formula | Not implemented | **HIGH** |
| Coherence Staking | SUPPORT/CONTEST flow | Types only | **MEDIUM** |
| Transaction History Query | Filter/paginate | Not implemented | **LOW** |
| Tier Benefit Enforcement | Throughout system | Partial | **MEDIUM** |

---

## 9. Consensus Protocol

### Design Specification (design/02-integration.md)

Coherent-Commit Protocol:
- **Network Broadcast**: Proposal to all peers
- **Vote Collection**: Gather weighted votes
- **Stake Slashing**: Penalize incorrect votes
- **Merkle Proofs**: State verification

### Current Implementation

**File**: [`src/core/Consensus.ts`](src/core/Consensus.ts:139)
- Vote weight calculation implemented ✓
- Proposal evaluation implemented ✓
- Local coherence check implemented ✓

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Network Broadcast | Gun pub/sub | Not implemented | **HIGH** |
| Vote Collection | Async gather | Local only | **HIGH** |
| Stake Slashing | Post-consensus penalty | Not implemented | **MEDIUM** |
| Merkle Proofs | State hash chain | Simple hash | **LOW** |

---

## 10. Observability

### Design Specification (design/17-observability.md)

Comprehensive monitoring:
- **Structured Logging**: JSON format, levels, context
- **Metrics**: Prometheus-compatible, histograms, gauges
- **Tracing**: OpenTelemetry spans, distributed context
- **Dashboards**: Grafana templates
- **Alerting**: Rule-based notifications

### Current Implementation

**No dedicated observability implementation exists.**

```typescript
// Current logging pattern:
console.log(`[SRIA] Perceiving: ${JSON.stringify(input).substring(0, 50)}...`);
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Structured Logger | Winston/Pino | `console.log` | **HIGH** |
| Metrics Registry | Prometheus client | Not implemented | **HIGH** |
| Trace Context | OpenTelemetry SDK | Not implemented | **MEDIUM** |
| Dashboard Configs | Grafana JSON | Not implemented | **LOW** |
| Alert Rules | Prometheus rules | Not implemented | **LOW** |

---

## 11. Error Recovery

### Design Specification (design/14-error-recovery.md)

Resilient error handling:
- **Dead Letter Queue**: Failed message storage
- **Compensation Actions**: Rollback mechanisms
- **State Snapshots**: Recovery points
- **Graceful Degradation**: Fallback modes

### Current Implementation

**File**: [`src/infra/ErrorManager.ts`](src/infra/ErrorManager.ts:161)
- Error classes implemented ✓
- Circuit breaker implemented ✓
- Retry with backoff implemented ✓

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Dead Letter Queue | Persistent storage | Not implemented | **MEDIUM** |
| Compensation Actions | Transaction rollback | Not implemented | **MEDIUM** |
| State Snapshots | Recovery checkpoints | GMF snapshots only | **LOW** |
| Fallback Modes | Degraded operation | Not implemented | **LOW** |

---

## 12. Security

### Design Specification (design/16-security.md)

Defense in depth:
- **Input Sanitization**: Context-aware escaping
- **Request Signing**: Ed25519 signatures
- **Replay Protection**: Nonce/timestamp checks
- **Audit Logging**: Security event trail
- **Key Rotation**: Periodic key updates

### Current Implementation

**File**: [`src/infra/Security.ts`](src/infra/Security.ts:84)
- Access control implemented ✓
- Rate limiting implemented ✓
- Signature verification implemented ✓
- Encryption service implemented ✓

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Audit Logging | Security events | Not implemented | **MEDIUM** |
| Key Rotation | Scheduled rotation | Not implemented | **MEDIUM** |
| Input Validation | Schema enforcement | Partial | **LOW** |
| Content Security Policy | Web context | N/A (backend) | **N/A** |

---

## 13. AlephGunBridge Integration

### Design Specification (design/02-integration.md)

Central orchestration:
- **SMF Projection**: Real embedding + projection
- **Request Routing**: Full mesh query
- **Coherence Verification**: Cryptographic proof
- **GMF Sync**: Bidirectional Gun↔GMF

### Current Implementation

**File**: [`src/core/AlephGunBridge.ts`](src/core/AlephGunBridge.ts:21)
```typescript
projectToSMF(graphPath: string, data: any): number[] {
  // TODO: Implement actual SMF projection
  const smf = new Array(16).fill(0);
  // Simple mock: hash the path to seed the vector
}
```

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| Real SMF Projection | EmbeddingService | Mock hash | **HIGH** |
| Mesh Query for Routing | Gun DHT | Mock peers | **HIGH** |
| Cryptographic Coherence | Signature verify | Basic threshold | **MEDIUM** |
| Bidirectional GMF Sync | Gun subscriptions | Stub | **MEDIUM** |
| SRIA Event Handling | Full lifecycle | Switch stubs | **MEDIUM** |

---

## 14. Electron Client & UI

### Design Specification (design/19-electron-client.md)

The "Resonant Terminal" interface:
- **IPC Bridge**: Full bi-directional communication (Main ↔ Renderer)
- **State Management**: Zustand store synced with Main process
- **Visualizations**: Real SMF Radar Charts, Agent Free Energy graphs
- **Chat**: Functional messaging with "Resonance" tuning
- **Wallet**: Real-time balance and staking UI

### Current Implementation

**File**: [`client/src/renderer/components/layout/ChatView.tsx`](client/src/renderer/components/layout/ChatView.tsx)
- Uses static `MOCK_MESSAGES`
- No connection to backend

**File**: [`client/src/renderer/components/layout/Inspector.tsx`](client/src/renderer/components/layout/Inspector.tsx)
- Static placeholders for charts and wallet

**File**: [`client/src/renderer/components/ui/InputDeck.tsx`](client/src/renderer/components/ui/InputDeck.tsx)
- Local state only (mode, resonance)
- No IPC calls

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| IPC Wiring | `window.electronAPI` calls | Defined but unused | **CRITICAL** |
| State Sync | Zustand store | Missing | **CRITICAL** |
| Real Chat | Send/Receive via Gun | Mock data | **HIGH** |
| SMF Visualization | Radar Chart | Placeholder div | **HIGH** |
| Agent HUD | Free Energy Graph | Missing | **HIGH** |
| Wallet UI | Real Balance/Staking | Static text | **MEDIUM** |
| Canvas Mode | Infinite Canvas | "Coming Soon" | **LOW** |

---

## 15. Testing Coverage

### Design Specification (design/17-observability.md, implicit)

- **Unit Tests**: All core functions
- **Integration Tests**: Component interactions
- **E2E Tests**: Full workflow validation

### Current Implementation

Tests exist for:
- `tests/core/AlephGunBridge.test.ts`
- `tests/core/Consensus.test.ts`
- `tests/core/DSNNode.test.ts`
- `tests/core/GMF.test.ts`
- `tests/core/SRIAEngine.test.ts`
- `tests/core/TaskManager.test.ts`
- `tests/services/EmbeddingService.test.ts`

### Gaps

| Feature | Design | Implementation | Priority |
|---------|--------|----------------|----------|
| SkillRegistry Tests | Unit tests | Missing | **MEDIUM** |
| ServiceManager Tests | Integration | Missing | **MEDIUM** |
| SemanticStore Tests | Query/store | Missing | **MEDIUM** |
| EventBus Tests | Pub/sub | Missing | **MEDIUM** |
| Wallet Tests | Economics | Missing | **HIGH** |
| Security Tests | Access control | Missing | **HIGH** |
| E2E Tests | Full flow | Missing | **LOW** |

---

## 16. Missing Components

### Components in Design but Not Implemented

| Component | Design Reference | Notes |
|-----------|------------------|-------|
| **ReputationService** | design/12-wallet-economics.md | Track node/user reputation |
| **HealthCheckService** | design/09-services.md | Monitor service instances |
| **MetricsCollector** | design/17-observability.md | Prometheus metrics |
| **TracingProvider** | design/17-observability.md | OpenTelemetry integration |
| **AuditLogger** | design/16-security.md | Security audit trail |
| **DeadLetterQueue** | design/14-error-recovery.md | Failed message storage |
| **SubscriptionManager** | design/09-services.md | Service subscriptions |
| **RewardCalculator** | design/12-wallet-economics.md | Staking rewards |

---

## Priority Summary

### Critical (P0) - Required for Core Functionality
1. Real KeyTriplet generation with Ed25519
2. Gun.js network initialization
3. SRIA Active Inference (belief updates, EFE)
4. Network broadcast for consensus
5. Observability (structured logging, metrics)
6. **UI: IPC Wiring & State Sync**

### High (P1) - Required for Production Use
1. Service RPC execution
2. Task→SRIA integration
3. Event-triggered tasks
4. Unstaking and rewards
5. Full GMF sync
6. **UI: Real Chat Integration**
7. **UI: SMF Visualization**

### Medium (P2) - Enhanced Functionality
1. Subscription management
2. Rate limiting integration
3. Dead letter queue
4. SMF similarity filtering
5. Audit logging
6. **UI: Wallet & Agent HUD**

### Low (P3) - Nice to Have
1. Full cron syntax
2. IPFS integration
3. Key rotation
4. Grafana dashboards
5. **UI: Canvas Mode**

---

## Recommended Implementation Order

1. **Phase 1: Core Infrastructure**
   - Real Gun.js initialization and peer connection
   - Ed25519 key generation and KeyTriplet derivation
   - Structured logging framework
   - Basic Prometheus metrics
   - **UI: IPC Bridge & Zustand Store Setup**

2. **Phase 2: Agentic System**
   - SRIA Active Inference implementation
   - Task→SRIA integration
   - Event-triggered task execution
   - GMF contribution on consolidation
   - **UI: Real Chat & Input Deck Wiring**

3. **Phase 3: Economics**
   - Unstaking flow
   - Reward calculation
   - Coherence staking
   - Subscription management
   - **UI: Wallet & Staking Interface**

4. **Phase 4: Network**
   - Consensus broadcast/collection
   - Real mesh routing
   - GMF synchronization
   - Service RPC protocols
   - **UI: SMF Visualization & Agent HUD**

5. **Phase 5: Hardening**
   - Full test coverage
   - Audit logging
   - Dead letter queue
   - Tracing integration
