# Core Integration: AlephNet as First-Class Citizen

## Key Integration Points

| Gun.js Component | AlephNet Equivalent | Bridge Behavior |
|-----------------|---------------------|-----------------|
| SEA Keypair | KeyTriplet (Priv, Pub, Res) | Derive KeyTriplet from SEA; use resonance key for semantic trust |
| Graph Node | SemanticObject | Project graph writes to SMF axes; extract NormalForm |
| Mesh Peer | DSNNode | Every Gun peer is a DSNNode with semantic domain specialization |
| Graph Sync | GMF Delta Sync | Coherence-gated writes; accept only if consensus passes |
| Conversation | DurableAgentState + SRIA Session | Agent state includes SRIA lifecycle and SMF snapshot |
| Tool Call | AlephNet Action | Route to specialized peers by prime-domain expertise |

## The Core Concept: "Semantic State Synchronization"

Instead of simple graph writes, the system performs **semantic-aware state synchronization**:

### Client Side

Writes a `UserRequest` node to the graph. The Bridge layer:
1. Encodes the request through SMF (16-dimensional semantic projection)
2. Attaches a `resonanceKey` derived from content
3. Routes to semantically-specialized server nodes

### Server Side (Agent + SRIA)

1. Subscribes to requests matching its `semanticDomain` (perceptual/cognitive/temporal/meta)
2. SRIA engine processes: Perceive → Decide → Act → Learn cycle
3. Writes `AgentResponse` with semantic coherence proof
4. Response is GMF-verified before acceptance

### Client Response

Automatically sees the `AgentResponse` appear because:
1. Subscribed to conversation node
2. Response includes SMF signature for semantic verification
3. Can validate coherence locally

## Critical Technical Considerations

### Loop Prevention ("The Ghost in the Machine")

One risk with Gun.js + SRIA is **infinite loops**. We add three layers of protection:

**Layer 1: Strict Idempotency & State Flags**
```javascript
// Message status lifecycle
const MessageStatus = {
  USER_SENT: 'user_sent',
  AGENT_ACKED: 'agent_acked',
  PERCEIVING: 'perceiving',
  DECIDING: 'deciding',
  ACTING: 'acting',
  LEARNING: 'learning',
  COMPLETE: 'complete'
};

// Agent only acts on specific statuses
const ACTIONABLE_STATUSES = ['user_sent', 'tool_result_ready'];
```

**Layer 2: SRIA Free Energy Threshold**
```javascript
// SRIA stops when free energy is minimized
if (sria.session.freeEnergy < 0.1) {
  sria.dismiss(); // End session
  return;
}
```

**Layer 3: Epoch-Based Termination**
```javascript
// Max iterations per conversation turn
if (state.iterationCount >= state.maxIterations) {
  state.status = 'TIMEOUT';
  return;
}
```

### Semantic Coherence Guarantees

AlephNet adds semantic verification to prevent hallucination propagation:

```javascript
// Before accepting any agent response into GMF
const proposal = new Proposal(semanticObject, {
  tickProof: { tickNumber, coherence: 0.87, valid: true },
  smfHash: computeSmfHash(currentSmf)
});

const evaluation = protocol.evaluate(proposal, localState, votes);

if (!evaluation.accepted) {
  // Reject incoherent response
  console.log('Rejected:', evaluation.reason);
  // Options: retry with different LLM, request human review, fallback
}
```

### Prime-Domain Consensus

For network-wide knowledge, we use weighted voting:

```javascript
// Coherent-Commit Protocol with wisdom aggregation
const voteWeight = protocol.calculateVoteWeight(nodeId, proposal);
// Weight based on:
// 1. Expertise overlap with proposal's prime-domain
// 2. Historical vote accuracy
// 3. Semantic domain alignment

// Proposal accepted if weighted redundancy >= threshold
if (weightedRedundancy >= 0.6) {
  gmf.insert(proposal.object, weight, { consensus: true });
}
```
