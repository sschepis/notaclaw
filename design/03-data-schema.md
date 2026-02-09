# Unified Data Graph Schema

We organize the Gun graph to integrate with AlephNet's semantic structures.

## Root Graph Structure

```javascript
// The Root Graph Structure (AlephNet-Enhanced)
gun.get('aleph_mesh')
   .get('nodes')         // DSNNode registry (servers + clients)
   .get('users')         // User profiles with KeyTriplets
   .get('conversations') // Chat data with SRIA state
   .get('gmf')           // Global Memory Field sync
   .get('skills')        // Shared skill registry
   .get('services')      // Network services registry
   .get('tasks')         // Task definitions
   .get('content')       // Semantic content storage
```

## Node Registry (DSNNode)

```javascript
// gun.get('nodes').get(nodeId)
{
  // Gun.js SEA identity
  publicKey: 'SEA_pub_key',
  
  // AlephNet DSNNode identity
  alephnet: {
    nodeId: 'hex_node_id',
    keyTriplet: {
      pub: 'Ed25519_pub',           // Classical public key
      resonance: [0.82, 0.45, ...], // 16-dim resonance field
      fingerprint: 'abc123'
    },
    semanticDomain: 'cognitive',    // perceptual|cognitive|temporal|meta
    primeDomain: [2, 3, 5, 7, 11],  // Prime partition for expertise routing
    smfAxes: [4, 5, 6, 7],          // SMF axes this node specializes in
    sriaCapable: true,              // Has SRIA agent engine
    supportedProviders: ['gpt-4-turbo', 'claude-3-opus']
  },
  
  status: 'ONLINE',
  lastHeartbeat: 1707238800000,
  loadIndex: 42  // 0-100 load metric
}
```

## Conversation Node

```javascript
// gun.get('conversations').get(conversationId)
{
  metadata: {
    owner: 'user_pub_key',
    ownerKeyTriplet: { pub, resonance, fingerprint },
    routed_to: 'server_alpha',
    model_config: 'gpt-4-turbo',
    // AlephNet semantic metadata
    semanticDomain: 'cognitive',
    smfSignature: [0.7, 0.3, ...] // 16-dim conversation signature
  },
  
  messages: {
    'msg_id_1': { 
      role: 'user', 
      text: 'Analyze this...', 
      status: 'synced',
      // AlephNet semantic encoding
      smf: [0.8, 0.2, ...],        // 16-dim encoding of this message
      resonanceKey: { primes: [7, 11, 13], hash: 'abc' }
    },
    'msg_id_2': { 
      role: 'agent', 
      text: 'Based on analysis...', 
      status: 'complete',
      smf: [0.6, 0.4, ...],
      coherenceProof: { tickNumber: 42, coherence: 0.87 }
    }
  },
  
  // SRIA Agent State (AlephNet-enhanced)
  sria: {
    sessionId: 'uuid',
    lifecycleState: 'PERCEIVING', // DORMANT|PERCEIVING|DECIDING|ACTING|LEARNING
    bodyHash: 'prime_body_hash',
    quaternionState: { w: 0.9, x: 0.1, y: 0.2, z: 0.3 },
    currentEpoch: 5,
    freeEnergy: 0.3,
    entropyTrajectory: [0.8, 0.6, 0.4, 0.3]
  },
  
  // Durable Agent State (Gun.js durability)
  state: {
    activeRunId: 'run_uuid',
    status: 'PROCESSING', // IDLE|PROCESSING|AWAITING_CLIENT|AWAITING_SERVER_TOOL
    assignedServerId: 'server_alpha',
    thoughtBuffer: ['Considering approach...'],
    pendingTools: {},
    iterationCount: 3,
    maxIterations: 10
  },
  
  // Tool Results (hybrid Gun + AlephNet)
  toolResults: {
    'call_id': {
      output: {...},
      isError: false,
      executorId: 'node_id',
      smfSignature: [...]  // Semantic signature of result
    }
  }
}
```

## Global Memory Field Sync

```javascript
// gun.get('gmf').get('objects').get(objectId)
{
  semanticObject: {
    id: 'obj_uuid',
    term: { prime: 7 },           // Prime calculus term
    normalForm: 'atomic:7'        // Canonical representation
  },
  weight: 0.95,
  smf: [0.9, 0.1, ...],          // 16-dim semantic position
  insertedAt: 1707238800000,
  proposalId: 'prop_uuid',
  redundancyScore: 0.85           // Network consensus score
}
```

## User Profile

```javascript
// gun.get('users').get(userId)
{
  // Gun.js SEA
  alias: string;
  pub: string;
  settings: string;
  
  // AlephNet identity
  alephnet: {
    nodeId: string;
    keyTriplet: KeyTriplet;
    stakingTier: 'Neophyte' | 'Adept' | 'Magus' | 'Archon';
    alephBalance: number;
    reputation: number;
  };
}
```

## Coherence Network

```javascript
// gun.get('coherence').get('claims').get(claimId)
{
  id: string;
  title: string;
  content: string;
  submitterId: string;
  smfSignature: number[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SYNTHESIZED';
  totalStake: number;
  supportStake: number;
  contestStake: number;
  createdAt: number;
}

// gun.get('coherence').get('stakes').get(stakeId)
{
  id: string;
  claimId: string;
  stakerId: string;
  amount: number;
  vote: 'SUPPORT' | 'CONTEST';
  timestamp: number;
}
```
