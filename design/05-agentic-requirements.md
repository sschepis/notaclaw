# Agentic Requirements (AlephNet-Enhanced)

This document maps the agentic requirements to the integrated Gun.js + AlephNet stack.

## Requirement 1 & 2: Agentic Behavior & Hybrid Tool Calls (SRIA-Powered)

We use the Graph as a **Semantic Tuple Space**. The SRIA Agent and Client both watch `pending_tool_calls` with semantic routing.

### Server Tool Logic (AlephNet DSNNode + SRIA)

```javascript
// DSNNode running SRIA agent on 'server-alpha'
const dsnNode = new DSNNode({ 
  semanticDomain: 'cognitive',
  specialize: true 
});

// Subscribe filtered by semantic domain
gun.get('conversations').map().on(async (conv, convId) => {
   // Check relevance to this node's expertise
   const relevance = dsnNode.sync.localField.calculateRelevance(conv.metadata.smfSignature);
   if (relevance < 0.3) return; // Not our domain
   
   const pending = conv.pending_tool_calls;
   if (isServerTool(pending)) {
       // Use AlephNet action system
       const result = await alephnet.actions[pending.tool](pending.arguments);
       
       // Compute semantic signature of result
       const resultSmf = alephnet.actions.think({ text: JSON.stringify(result) });
       
       // Write result with coherence proof
       gun.get('conversations').get(convId)
          .get('tool_results').set({ 
            id: pending.id, 
            result: result,
            smfSignature: resultSmf.embedding,
            executorId: dsnNode.nodeId
          });
   }
});
```

### Client Tool Logic (Browser with AlephNet Lite)

```javascript
// Client Code with semantic awareness
import { actions as alephActions } from '@sschepis/alephnet-node/browser';

gun.get('conversations').get(currentConvId).get('pending_tool_calls').map().on(async (call) => {
   if (call.side === 'CLIENT' && call.status === 'pending') {
       // 1. Execute Local Tool with semantic context
       let result;
       if (call.tool === 'get_geolocation') {
           result = await navigator.geolocation.getCurrentPosition(...);
       } else if (call.tool === 'wallet_sign') {
           // AlephNet wallet integration
           const wallet = alephActions.getWallet();
           result = await wallet.sign(call.arguments.message);
       }

       // 2. Compute semantic signature
       const resultSmf = alephActions.think({ text: JSON.stringify(result) });

       // 3. Write Result to Graph with semantic proof
       gun.get('conversations').get(currentConvId)
          .get('tool_results').set({ 
            id: call.id, 
            result: result,
            smfSignature: resultSmf.embedding,
            executorId: clientNodeId
          });
   }
});
```

*Enhanced durability + semantic verification.* If the client is offline, the Agent waits. When client reconnects, it sees the request, executes it, and syncs the semantically-signed result back.

## Requirement 5: AlephNet Skill Registry

AlephNet provides a semantic skill registry that maps to the OpenClaw abstraction:

```javascript
// Register a skill with semantic metadata
gun.get('skills').get('weather_api').put({
  name: 'weather_api',
  description: 'Get current weather for a location',
  executionLocation: 'SERVER',
  parameters: { /* JSONSchema */ },
  
  // AlephNet semantic metadata
  semanticDomain: 'perceptual',     // Observing the world
  primeDomain: [2, 3, 5],           // Low primes = basic perception
  smfAxes: [0, 1, 2, 3],            // Coherence, identity, duality, structure
  requiredTier: 'Neophyte'          // Minimum staking tier
});
```

## Requirement 6: Named Servers & Semantic Mesh Routing

AlephNet adds **expertise-based routing** on top of Gun's namespace routing.

### Semantic Routing Example

**User Request:** "Analyze this research paper." (High-complexity cognitive task)

```javascript
// AlephGunBridge determines optimal routing
const requestSmf = alephnet.actions.think({ text: request });

// Find nodes with matching semantic domain
const candidates = [];
gun.get('nodes').map().once((node, nodeId) => {
  if (node.status === 'ONLINE' && node.alephnet.semanticDomain === 'cognitive') {
    const relevance = calculateRelevance(requestSmf, node.alephnet.smfAxes);
    candidates.push({ nodeId, relevance, load: node.loadIndex });
  }
});

// Route to best candidate (high relevance, low load)
const target = candidates
  .sort((a, b) => (b.relevance * 0.7 + (100 - b.load) * 0.3) - 
                  (a.relevance * 0.7 + (100 - a.load) * 0.3))[0];

gun.get('nodes').get(target.nodeId).get('inbox').set(request);
```

### Prime-Domain Routing (for consensus proposals)

```javascript
// Route proposal to nodes with overlapping prime domains
const proposalPrimes = [7, 11, 13]; // Extracted from semantic object
const targets = dsnNode.sync.channel.routeProposal({ 
  object: semanticObject, 
  primes: proposalPrimes 
});
// Returns nodes whose primeDomain overlaps with proposalPrimes
```

## Coherence Network Integration

Agents can submit claims, stake tokens, and earn rewards:

```javascript
// Submit a claim through the mesh
const claim = await alephnet.actions['coherence.submit']({
  title: 'LLM Response Quality',
  content: response.text,
  evidence: [{ type: 'smf', data: response.smf }]
});

// Stake on claim accuracy
await alephnet.actions['coherence.stake']({
  claimId: claim.id,
  amount: 10,
  vote: 'SUPPORT'
});
```
