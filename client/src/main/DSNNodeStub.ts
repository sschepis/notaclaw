import { EventEmitter } from 'events';
import { AIProviderManager } from './services/AIProviderManager';

// Stub for the actual DSNNode from alephnet-node
// In the real implementation, we would import the actual class or a wrapper around it.

export class DSNNodeStub extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private wallet = { balance: 1000, staked: 500 };
  private smf = new Array(16).fill(0).map(() => Math.random() * 100);
  private agentState = { state: 'Idle', freeEnergy: 0.8 };
  private aiManager: AIProviderManager;

  constructor(aiManager: AIProviderManager) {
    super();
    this.aiManager = aiManager;
    console.log('DSNNodeStub initialized');
  }

  async start() {
    console.log('DSNNodeStub started');
    this.startSimulation();
  }

  async stop() {
    console.log('DSNNodeStub stopped');
    if (this.interval) clearInterval(this.interval);
  }

  async stakeTokens(amount: number): Promise<boolean> {
    if (this.wallet.balance >= amount) {
        this.wallet.balance -= amount;
        this.wallet.staked += amount;
        this.emit('wallet-update', this.wallet);
        return true;
    }
    return false;
  }

  async processMessage(content: string, metadata: any) {
    console.log('Processing message:', content, metadata);
    
    // Use AI Manager to process the request
    try {
      this.agentState = { state: 'Perceiving', freeEnergy: this.agentState.freeEnergy };
      this.emit('agent-state-update', this.agentState);

      const response = await this.aiManager.processRequest(content, {
        contentType: 'chat', // default to chat for now, could be inferred
        // model: metadata.model // if we had model selection in UI
      });

      if (response.providerId === 'webllm') {
        this.emit('request-local-inference', {
            content,
            model: response.model
        });
        return;
      }

      this.agentState = { state: 'Acting', freeEnergy: Math.max(0, this.agentState.freeEnergy - 0.1) };
      this.emit('agent-state-update', this.agentState);

      this.emit('message', {
          id: Date.now().toString(),
          content: response.content,
          type: 'cognitive',
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString(),
          provider: response.providerId,
          model: response.model
      });

      // Update SMF based on "processing"
      this.smf = this.smf.map(v => Math.max(0, Math.min(100, v + (Math.random() - 0.5) * 10)));
      this.emit('smf-update', this.smf);

      setTimeout(() => {
           this.agentState.state = 'Idle';
           this.emit('agent-state-update', this.agentState);
      }, 2000);

    } catch (error) {
      console.error('Error processing message:', error);
      this.emit('message', {
        id: Date.now().toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'system',
        sender: 'system',
        timestamp: new Date().toLocaleTimeString()
      });
      this.agentState.state = 'Idle';
      this.emit('agent-state-update', this.agentState);
    }
  }

  async handleLocalResponse(content: string) {
    this.agentState = { state: 'Acting', freeEnergy: Math.max(0, this.agentState.freeEnergy - 0.1) };
    this.emit('agent-state-update', this.agentState);

    this.emit('message', {
        id: Date.now().toString(),
        content: content,
        type: 'cognitive',
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString(),
        provider: 'webllm',
        model: 'local'
    });

    // Update SMF based on "processing"
    this.smf = this.smf.map(v => Math.max(0, Math.min(100, v + (Math.random() - 0.5) * 10)));
    this.emit('smf-update', this.smf);

    setTimeout(() => {
            this.agentState.state = 'Idle';
            this.emit('agent-state-update', this.agentState);
    }, 2000);
  }

  private startSimulation() {
    this.interval = setInterval(() => {
        // Random network fluctuations
        this.emit('network-update', {
            peers: 5 + Math.floor(Math.random() * 5),
            latency: 20 + Math.floor(Math.random() * 30)
        });

        // Occasional passive updates
        if (Math.random() > 0.7) {
            this.emit('wallet-update', this.wallet);
        }
    }, 3000);
    
    // Initial emit
    setTimeout(() => {
        this.emit('wallet-update', this.wallet);
        this.emit('smf-update', this.smf);
        this.emit('agent-state-update', this.agentState);
    }, 1000);
  }
}
