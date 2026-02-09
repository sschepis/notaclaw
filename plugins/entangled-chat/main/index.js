
class Peer {
    constructor(id, topics = []) {
        this.id = id;
        this.topics = new Set(topics);
        this.status = 'connected';
        this.latency = Math.floor(Math.random() * 50) + 10;
    }

    matches(topics) {
        // Returns true if this peer is interested in ANY of the message topics
        for (const t of topics) {
            if (this.topics.has(t)) return true;
        }
        return false;
    }
}

class EntanglementManager {
  constructor() {
    this.localTopics = new Set(['general']);
    this.peers = new Map();
    this.messages = [];
    
    // Seed some mock peers
    this.addPeer('node_alpha', ['physics', 'quantum', 'general']);
    this.addPeer('node_beta', ['ai', 'general']);
    this.addPeer('node_gamma', ['crypto', 'privacy']);
  }

  addPeer(id, topics) {
      this.peers.set(id, new Peer(id, topics));
  }

  setLocalTopics(topics) {
    this.localTopics = new Set(topics);
    console.log(`[Entanglement] Local topics updated: ${Array.from(this.localTopics).join(', ')}`);
  }

  broadcast(content, topics) {
    const msgId = 'msg_' + Date.now();
    const timestamp = Date.now();
    const message = { id: msgId, content, topics, sender: 'me', timestamp };
    
    // Store locally
    this.messages.push(message);

    // Route to peers
    let sentCount = 0;
    const recipients = [];
    
    for (const peer of this.peers.values()) {
        if (peer.matches(topics)) {
            console.log(`[Entanglement] Routing message to ${peer.id} (Matched topics)`);
            
            // Send via DSN observation as a placeholder for P2P routing
            if (context.dsn && context.dsn.publishObservation) {
                context.dsn.publishObservation(JSON.stringify({
                    type: 'entangled-message',
                    to: peer.id,
                    content,
                    topics
                }), []);
            }

            recipients.push(peer.id);
            sentCount++;
        }
    }

    return { 
        status: 'sent', 
        messageId: msgId, 
        recipientCount: sentCount,
        recipients 
    };
  }

  getMessages() {
      return this.messages;
  }

  getPeers() {
      return Array.from(this.peers.values()).map(p => ({
          id: p.id,
          topics: Array.from(p.topics),
          status: p.status,
          latency: p.latency
      }));
  }
}

export function activate(context) {
  console.log('[Entangled Chat] Activating...');
  
  const manager = new EntanglementManager();

  context.dsn.registerTool({
    name: 'updateTopics',
    description: 'Updates the local node subscription topics',
    parameters: {
      type: 'object',
      properties: {
        topics: { type: 'array', items: { type: 'string' } }
      },
      required: ['topics']
    }
  }, async (args) => {
    manager.setLocalTopics(args.topics);
    return { status: 'success', topics: args.topics };
  });

  context.dsn.registerTool({
    name: 'sendMessage',
    description: 'Sends a message to peers interested in specific topics',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        topics: { type: 'array', items: { type: 'string' } }
      },
      required: ['content', 'topics']
    }
  }, async (args) => {
    return manager.broadcast(args.content, args.topics);
  });

  context.dsn.registerTool({
    name: 'getNetworkState',
    description: 'Returns current peers and messages',
    parameters: { type: 'object', properties: {} }
  }, async () => {
      return {
          peers: manager.getPeers(),
          messages: manager.getMessages()
      };
  });

  console.log('[Entangled Chat] Activated.');
}
