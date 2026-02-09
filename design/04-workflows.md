# Workflows: Offline-First, Durable, & Semantically Coherent

This document describes the key workflows in the AlephNet-Gun mesh.

## Scenario: The "Disconnect" (Enhanced)

This solves the "close browser, reopen later" problem with **added semantic verification**.

### Step-by-Step Flow

1. **User (Offline):** Types "Draft a report on quantum computing."

2. **Client App:** 
   ```javascript
   // Gun write + AlephNet semantic encoding
   const smf = alephnet.actions.think({ text: "Draft a report...", depth: 'quick' });
   gun.get('conv_id').get('messages').set({ 
     text: "Draft a report on quantum computing",
     smf: smf.embedding,
     resonanceKey: smf.resonanceKey,
     status: 'pending'
   });
   ```
   * *Result:* Data saved to `localStorage` with semantic signature.

3. **User:** Closes browser. (Request is "pending" locally).

4. **User:** Opens browser 2 hours later (Online).

5. **Gun.js:** Detects connection to Mesh Relay (AlephNet DSNNode).

6. **AlephGunBridge:** 
   * Pushes pending messages to server
   * Routes to server with matching `semanticDomain` (e.g., 'cognitive' for report writing)
   * Server verifies resonance key before accepting

## Scenario: The "SRIA Agent Loop"

### Step-by-Step Flow

1. **Server DSNNode:** Listens to `gun.get('conversations')` filtered by semantic domain.

2. **Trigger:** Detects new message matching its prime-domain expertise.

3. **SRIA Awakening:**
   ```javascript
   // Server-side SRIA engine activation
   const sria = agentManager.get(conversationId);
   if (sria.lifecycleState === 'DORMANT') {
     sria.summon({ 
       resonanceKey: message.resonanceKey,
       initialContext: message.text 
     });
   }
   ```

4. **SRIA Perceive → Decide → Act → Learn:**
   ```javascript
   // Full SRIA step with semantic awareness
   const result = sria.fullStep(
     message.text,  // observation
     getAvailableActions()  // possible actions including tools
   );
   
   // result.decision.action might be a tool call
   if (result.decision.action.type === 'TOOL_CALL') {
     gun.get('conv_id').get('pending_tool_calls').set({
       tool: result.decision.action.tool,
       arguments: result.decision.action.arguments,
       side: result.decision.action.executionLocation,
       smfContext: sria.session.currentBeliefs
     });
   }
   ```

5. **Coherence Verification:** Before writing response:
   ```javascript
   // AlephNet coherence check
   const coherence = protocol.checkLocalEvidence(proposal, {
     smf: sria.smf,
     coherence: sria.session.freeEnergy < 0.5 ? 0.8 : 0.5
   });
   
   if (coherence.passed) {
     gun.get('conv_id').get('messages').set({
       role: 'agent',
       text: response,
       smf: responseSmf,
       coherenceProof: { coherence: coherence.evidence }
     });
   }
   ```

6. **SRIA Learning:** Agent updates its memory phases and quaternion state:
   ```javascript
   // After action, SRIA learns
   sria.emit('learned', {
     quaternionDelta: learning.quaternionDelta,
     epochAdvance: learning.epochAdvance
   });
   
   // Sync learning to GMF for network-wide knowledge
   if (learning.shouldContribute) {
     gmf.insert(semanticObject, weight, { nodeId, smf });
   }
   ```

## AlephNet-Enhanced Durability: Agent Runner

```typescript
// DSNNode Agent Runner (AlephNet-Enhanced)
class AlephAgentRunner {
  constructor(gun, dsnNode, agentManager) {
    this.gun = gun;
    this.dsnNode = dsnNode;
    this.agentManager = agentManager;
    this.bridge = new AlephGunBridge(gun, dsnNode, agentManager);
  }
  
  async run() {
    // 1. Subscribe with semantic filtering
    this.gun.get('conversations').map().on(async (conv, convId) => {
      const state = conv?.state;
      if (!state) return;
      
      // 2. Filter by assigned server AND semantic domain
      if (state.assignedServerId !== this.dsnNode.nodeId) return;
      
      const relevance = this.dsnNode.sync.localField.calculateRelevance(
        conv.metadata?.smfSignature
      );
      if (relevance < 0.3) return; // Not our semantic domain
      
      // 3. Get or create SRIA agent for this conversation
      let sria = this.agentManager.get(convId);
      
      // 4. Switch on state
      switch (state.status) {
        case 'PROCESSING':
          if (sria && sria.lifecycleState !== 'DORMANT') {
            await this.resumeSRIA(sria, conv);
          } else {
            await this.startProcessing(convId, conv);
          }
          break;
          
        case 'AWAITING_SERVER_TOOL':
          const tool = Object.values(state.pendingTools)[0];
          if (tool && tool.target === 'SERVER') {
            const result = await this.executeServerTool(tool);
            await this.writeToolResult(convId, tool.callId, result);
          }
          break;
          
        case 'AWAITING_CLIENT':
          // Sleep - cost = 0
          if (sria && sria.session?.freeEnergy < 0.1) {
            await this.consolidateSRIA(sria, convId);
          }
          break;
          
        case 'IDLE':
          const lastMsg = this.getLastUserMessage(conv.messages);
          if (lastMsg && lastMsg.status === 'user_sent') {
            await this.handleNewMessage(convId, lastMsg, conv);
          }
          break;
      }
    });
  }
}
```

## Client Disconnect Recovery

**If the Client disconnects while state is `AWAITING_CLIENT`:**

1. The Server SRIA is in `SLEEPING` or `DORMANT` state (cost = 0).
2. The State in Gun is frozen at `AWAITING_CLIENT`.
3. SRIA's `session.freeEnergy` and `entropyTrajectory` are persisted.
4. Client reconnects → Reads State → Sees `pendingTools` → Executes → Writes `ToolResult` with `smfSignature` → Wakes Server.
5. Server SRIA resumes from persisted state, continuing the Perceive→Decide→Act→Learn cycle.
