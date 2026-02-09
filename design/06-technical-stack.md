# Technical Stack for the "AlephNet-Gun Mesh"

## Mesh Topology

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         ALEPHNET-GUN MESH TOPOLOGY                         │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│    │   Browser    │     │   Browser    │     │   Browser    │            │
│    │   Client     │     │   Client     │     │   Client     │            │
│    │  ──────────  │     │  ──────────  │     │  ──────────  │            │
│    │  Gun.js      │     │  Gun.js      │     │  Gun.js      │            │
│    │  AlephLite   │     │  AlephLite   │     │  AlephLite   │            │
│    │  KeyTriplet  │     │  KeyTriplet  │     │  KeyTriplet  │            │
│    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│           │                    │                    │                     │
│           └────────────────────┼────────────────────┘                     │
│                                │                                          │
│                    ┌───────────▼───────────┐                             │
│                    │   Gun.js Mesh Layer   │                             │
│                    │   (WebSocket/HTTP)    │                             │
│                    └───────────┬───────────┘                             │
│                                │                                          │
│    ┌───────────────────────────┼───────────────────────────┐             │
│    │                           │                           │             │
│    ▼                           ▼                           ▼             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│  │  DSNNode Alpha  │   │  DSNNode Beta   │   │  DSNNode Gamma  │        │
│  │  (perceptual)   │◄─►│  (cognitive)    │◄─►│  (temporal)     │        │
│  │  ────────────── │   │  ────────────── │   │  ────────────── │        │
│  │  Gun.js Peer    │   │  Gun.js Peer    │   │  Gun.js Peer    │        │
│  │  SRIA Engine    │   │  SRIA Engine    │   │  SRIA Engine    │        │
│  │  SMF [0-3]      │   │  SMF [4-7]      │   │  SMF [8-11]     │        │
│  │  Primes 2-29    │   │  Primes 31-71   │   │  Primes 73-113  │        │
│  │  LLM: GPT-4     │   │  LLM: Claude-3  │   │  LLM: Llama     │        │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘        │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
│                    ┌────────────▼────────────┐                          │
│                    │  PRRC Channel (Prime-   │                          │
│                    │  Resonant Comm Layer)   │                          │
│                    └────────────┬────────────┘                          │
│                                 │                                        │
│                    ┌────────────▼────────────┐                          │
│                    │ Global Memory Field     │                          │
│                    │ (Coherent-Commit GMF)   │                          │
│                    └─────────────────────────┘                          │
│                                                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

## 1. The DSNNode (Server)

* **Node.js** running `gun` (server peer) + `@sschepis/alephnet-node` (DSNNode).
* **Radix Storage:** Gun's file storage + AlephNet GMF persistence.
* **SRIA Engine:** Summonable Resonant Intelligent Agent for agentic processing.
* **Semantic Specialization:** Each node has a `semanticDomain` and `primeDomain`.
* **LLM Integration:** Multiple provider support (OpenAI, Anthropic, local Llama).

```javascript
// Server DSNNode initialization
const gun = Gun({ file: 'data', web: httpServer });
const dsnNode = new DSNNode({ 
  nodeId: 'server-alpha',
  semanticDomain: 'cognitive',
  specialize: true,
  networkSize: 3,
  nodeIndex: 0
});

const agentManager = new AgentManager();
const teamManager = new TeamManager({ agentManager });

// Bridge Gun events to AlephNet
const bridge = new AlephGunBridge(gun, dsnNode, agentManager);
await dsnNode.start();
await dsnNode.joinMesh(); // Connect to aleph.bot bootstrap
```

## 2. The Client (Browser)

* **Gun.js** (loaded via CDN or bundler).
* **AlephNet-Lite:** Browser-compatible subset of AlephNet.
* **KeyTriplet:** Prime-resonant identity (derived from SEA keypair).
* **IndexedDB:** For local persistence (Gun) + SMF cache (AlephNet).

```javascript
// Browser client initialization
const gun = Gun(['wss://server-alpha.example.com/gun']);
const sea = Gun.SEA;

// Generate AlephNet identity from SEA
const seaPair = await sea.pair();
const keyTriplet = await AlephLite.deriveKeyTriplet(seaPair);
const clientNode = new AlephLite.LiteNode({ keyTriplet });

// Bridge for semantic-aware writes
const bridge = new AlephLite.GunBridge(gun, clientNode);
```

## 3. Security (SEA + KeyTriplet)

* Gun's **SEA** handles classical auth (encryption, signing).
* AlephNet **KeyTriplet** adds resonance-based trust verification.
* Combined schema:

```javascript
// Schema: Conversations writable by owner + assigned server
const rules = {
  'conversations': {
    '.write': (data, key, msg, soul) => {
      const conv = gun.get(soul);
      // Classical: SEA signature verification
      const seaValid = SEA.verify(msg.signature, msg.pub);
      // Resonant: KeyTriplet resonance check
      const resonanceValid = keyTriplet.verifyResonance(msg.resonanceKey);
      return seaValid && resonanceValid;
    }
  }
};
```

## 4. Bootstrap & Mesh Joining

To join the AlephNet mesh, nodes use the bootstrap endpoint:

```javascript
// Default bootstrap URL
const ROOT_NODE_BOOTSTRAP_URL = 
  'https://wrochovhpqrxiypqamcv.supabase.co/functions/v1/alephnet-root/bootstrap';

// Join the mesh
const dsnNode = new DSNNode({ 
  nodeId: generateNodeId(),
  semanticDomain: 'cognitive'
});

await dsnNode.start();
const bootstrapData = await dsnNode.joinMesh({
  gatewayUrl: 'https://my-node.example.com:31337'
});

// bootstrapData contains peer list for initial connections
for (const peer of bootstrapData.peers) {
  gun.opt({ peers: [...gun._.opt.peers, peer.gatewayUrl] });
}
```
