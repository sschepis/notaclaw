# Reference Tables

Quick reference tables for the AlephNet-Integrated Durable Agent Mesh.

## Semantic Domain Reference

| Domain | Axes | Description | Prime Partition |
|--------|------|-------------|-----------------|
| **Perceptual** | 0-3 | Sensory input, raw data | 2, 3, 5, 7 |
| **Cognitive** | 4-7 | Reasoning, analysis | 11, 13, 17, 19 |
| **Temporal** | 8-11 | Time, causality, sequence | 23, 29, 31, 37 |
| **Meta** | 12-15 | Self-reference, abstraction | 41, 43, 47, 53 |

## SMF Axis Mapping

| Axis | Domain | Meaning | Example Values |
|------|--------|---------|----------------|
| 0 | Perceptual | Visual salience | Image brightness, UI prominence |
| 1 | Perceptual | Auditory prominence | Speech clarity, sound level |
| 2 | Perceptual | Spatial orientation | Position, layout |
| 3 | Perceptual | Motion/change | Animation, transitions |
| 4 | Cognitive | Logical complexity | Reasoning depth |
| 5 | Cognitive | Emotional valence | Sentiment, mood |
| 6 | Cognitive | Certainty | Confidence level |
| 7 | Cognitive | Relevance | Context match |
| 8 | Temporal | Immediacy | Urgency, recency |
| 9 | Temporal | Duration | Time span |
| 10 | Temporal | Periodicity | Recurring patterns |
| 11 | Temporal | Causal weight | Cause-effect strength |
| 12 | Meta | Self-reference | Introspection depth |
| 13 | Meta | Abstraction level | Concept generality |
| 14 | Meta | Coherence | Internal consistency |
| 15 | Meta | Network consensus | GMF agreement |

## Staking Tiers

| Tier | Stake Range | Capabilities | Gas Limit | Rate Limit |
|------|-------------|--------------|-----------|------------|
| **Neophyte** | 0-99 | Read-only, basic queries | 10/day | 100/hour |
| **Adept** | 100-999 | Write, propose to GMF | 100/day | 500/hour |
| **Magus** | 1000-9999 | Full node, expertise routing | 1000/day | 2000/hour |
| **Archon** | 10000+ | Validator, governance voting | Unlimited | 10000/hour |

## Message Roles

| Role | Source | Purpose | Gun Path |
|------|--------|---------|----------|
| `system` | Agent config | Persona, constraints | `messages/system` |
| `user` | Human input | User requests | `messages/{id}` |
| `assistant` | LLM output | Agent responses | `messages/{id}` |
| `tool` | Tool execution | Tool results | `toolResults/{id}` |

## Lifecycle States

### SRIA Lifecycle

| State | Description | Transitions To |
|-------|-------------|----------------|
| `DORMANT` | Inactive, minimal memory | `PERCEIVING` |
| `PERCEIVING` | Processing input, building beliefs | `DECIDING` |
| `DECIDING` | Evaluating actions, free energy minimization | `ACTING` |
| `ACTING` | Executing chosen action | `LEARNING` |
| `LEARNING` | Updating beliefs, memory consolidation | `PERCEIVING`, `CONSOLIDATING` |
| `CONSOLIDATING` | Deep memory integration | `SLEEPING` |
| `SLEEPING` | Background processing, GMF sync | `DORMANT`, `PERCEIVING` |

### Agent State

| Status | Description | Triggers |
|--------|-------------|----------|
| `IDLE` | Waiting for input | User message, scheduled task |
| `PROCESSING` | Executing agent loop | — |
| `AWAITING_CLIENT` | Client-side tool pending | Client tool execution |
| `AWAITING_SERVER_TOOL` | Server-side tool pending | Server tool execution |

### Task Execution Status

| Status | Description |
|--------|-------------|
| `PENDING` | Queued for execution |
| `VALIDATING` | Pre-execution validation |
| `RUNNING` | Currently executing |
| `AWAITING_SERVICE` | Waiting for service response |
| `COMPLETED` | Successfully completed |
| `FAILED` | Failed with error |
| `CANCELLED` | User cancelled |
| `TIMEOUT` | Exceeded time limit |

### Service Status

| Status | Description |
|--------|-------------|
| `DRAFT` | Not yet published |
| `ACTIVE` | Available for use |
| `DEPRECATED` | Will be removed soon |
| `SUSPENDED` | Temporarily unavailable |

## Execution Context

| Context | Location | Capabilities |
|---------|----------|--------------|
| `SERVER` | Node backend | Full system access, LLM calls |
| `CLIENT` | Browser/client | DOM access, local storage |

## Graph Paths Reference

### Core Paths

```
gun.get('nodes')                    → Node registry
gun.get('users')                    → User profiles
gun.get('skills')                   → Skill definitions
gun.get('conversations')            → Conversation data
gun.get('tasks')                    → Task definitions
gun.get('services')                 → Service registry
gun.get('content')                  → Content store
gun.get('gmf')                      → GMF state
gun.get('coherence')                → Coherence claims/stakes
```

### Node Structure

```
gun.get('nodes').get(nodeId)
├── config: DSNNodeConfig
├── status: NodeStatus
├── skills: string[]
├── peers: string[]
└── metrics: NodeMetrics
```

### Conversation Structure

```
gun.get('conversations').get(convId)
├── metadata
│   ├── ownerPub
│   ├── ownerKeyTriplet
│   ├── title
│   ├── createdAt
│   ├── semanticDomain
│   └── smfSignature
├── messages
│   └── {msgId}: ChatMessage
├── state: DurableAgentState
├── toolResults
│   └── {callId}: ToolResult
└── sria: SRIASessionState
```

## Bootstrap Configuration

### Development

```javascript
{
  bootstrapUrl: 'ws://localhost:8765',
  gunPeers: ['http://localhost:8765/gun'],
  tickIntervalMs: 10000,
  consensusThreshold: 0.5,
  environment: 'development'
}
```

### Production

```javascript
{
  bootstrapUrl: 'wss://bootstrap.alephnet.io',
  gunPeers: [
    'https://relay1.alephnet.io/gun',
    'https://relay2.alephnet.io/gun',
    'https://relay3.alephnet.io/gun'
  ],
  tickIntervalMs: 1000,
  consensusThreshold: 0.67,
  environment: 'production'
}
```

## Protocol Reference

### Coherent-Commit Protocol

| Phase | Duration | Action |
|-------|----------|--------|
| Proposal | 1 tick | Submit proposal with SMF |
| Voting | 2 ticks | Nodes vote with stake weight |
| Consensus | 1 tick | Calculate weighted agreement |
| Commit | 1 tick | Write to GMF if threshold met |

### PRRC Channel

| Component | Type | Description |
|-----------|------|-------------|
| Channel ID | string | Unique channel identifier |
| Prime Set | number[] | Primes defining expertise |
| Phase Reference | number | Synchronization phase |
| Relevance Threshold | number | Minimum score to route |

## Error Codes

| Code | Category | Description |
|------|----------|-------------|
| `E_ACCESS_DENIED` | Access | Insufficient permissions |
| `E_TIER_REQUIRED` | Access | Higher staking tier needed |
| `E_COHERENCE_LOW` | Validation | Coherence below threshold |
| `E_SMF_MISMATCH` | Validation | SMF verification failed |
| `E_GMF_REJECT` | Consensus | GMF proposal rejected |
| `E_SERVICE_UNAVAIL` | Service | Service not available |
| `E_RATE_LIMIT` | Rate | Rate limit exceeded |
| `E_GAS_DEPLETED` | Economics | Insufficient gas balance |
| `E_TIMEOUT` | Execution | Operation timed out |
| `E_SRIA_LOOP` | Agent | Infinite loop detected |

## Aleph Token Economics

| Action | Cost | Recipient |
|--------|------|-----------|
| Node registration | 100 ALEPH | Network |
| Skill registration | 10 ALEPH | Network |
| Service registration | 50 ALEPH | Network |
| GMF proposal | 1-10 ALEPH | Validators |
| Task execution | Variable | Service providers |
| Content storage | 0.01 ALEPH/KB | Storage nodes |

| Reward | Amount | Trigger |
|--------|--------|---------|
| Validation | 0.1 ALEPH | Per tick participation |
| Consensus | 1 ALEPH | Successful proposal |
| Staking | 5% APY | Proportional to stake |
| Reputation | Variable | Positive interactions |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial integrated design |
| 1.1.0 | 2024-02 | Added Tasks, Services, Content Store |
