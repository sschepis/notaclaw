import { Context } from './types';

class Peer {
    id: string;
    topics: Set<string>;
    status: string;
    latency: number;

    constructor(id: string, topics: string[] = []) {
        this.id = id;
        this.topics = new Set(topics);
        this.status = 'connected';
        this.latency = Math.floor(Math.random() * 50) + 10;
    }

    matches(topics: string[]): boolean {
        for (const t of topics) {
            if (this.topics.has(t)) return true;
        }
        return false;
    }
}

class EntanglementManager {
  private localTopics: Set<string>;
  private peers: Map<string, Peer>;
  private messages: any[];
  private context: Context;

  constructor(context: Context) {
    this.context = context;
    this.localTopics = new Set(['general']);
    this.peers = new Map();
    this.messages = [];
    
    // Seed some mock peers
    this.addPeer('node_alpha', ['physics', 'quantum', 'general']);
    this.addPeer('node_beta', ['ai', 'general']);
    this.addPeer('node_gamma', ['crypto', 'privacy']);
  }

  addPeer(id: string, topics: string[]) {
      this.peers.set(id, new Peer(id, topics));
  }

  setLocalTopics(topics: string[]) {
    this.localTopics = new Set(topics);
    console.log(`[Entanglement] Local topics updated: ${Array.from(this.localTopics).join(', ')}`);
  }

  broadcast(content: string, topics: string[]) {
    const msgId = 'msg_' + Date.now();
    const timestamp = Date.now();
    const message = { id: msgId, content, topics, sender: 'me', timestamp };
    
    // Store locally
    this.messages.push(message);

    let sentCount = 0;
    const recipients: string[] = [];
    
    for (const peer of this.peers.values()) {
        if (peer.matches(topics)) {
            console.log(`[Entanglement] Routing message to ${peer.id} (Matched topics)`);
            
            // Send via DSN observation as a placeholder for P2P routing
            if (this.context.dsn && this.context.dsn.publishObservation) {
                this.context.dsn.publishObservation(JSON.stringify({
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

export function activate(context: Context) {
  console.log('[Entangled Chat] Activating...');
  
  const manager = new EntanglementManager(context);

  context.dsn.registerTool({
    name: 'updateTopics',
    description: 'Updates the local node subscription topics',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        topics: { type: 'array', items: { type: 'string' } }
      },
      required: ['topics']
    },
    semanticDomain: 'social',
    primeDomain: [11],
    smfAxes: [0.5, 0.5],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async (args: { topics: string[] }) => {
    manager.setLocalTopics(args.topics);
    return { status: 'success', topics: args.topics };
  });

  context.dsn.registerTool({
    name: 'sendMessage',
    description: 'Sends a message to peers interested in specific topics',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        topics: { type: 'array', items: { type: 'string' } }
      },
      required: ['content', 'topics']
    },
    semanticDomain: 'social',
    primeDomain: [11, 7],
    smfAxes: [0.8, 0.4],
    requiredTier: 'Initiate',
    version: '1.0.0'
  }, async (args: { content: string, topics: string[] }) => {
    return manager.broadcast(args.content, args.topics);
  });

  context.dsn.registerTool({
    name: 'getNetworkState',
    description: 'Returns current peers and messages',
    executionLocation: 'SERVER',
    parameters: { type: 'object', properties: {} },
    semanticDomain: 'social',
    primeDomain: [11],
    smfAxes: [0.4],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async () => {
      return {
          peers: manager.getPeers(),
          messages: manager.getMessages()
      };
  });

  console.log('[Entangled Chat] Activated.');
}
