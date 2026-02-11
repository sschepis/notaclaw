
interface Feedback {
  id: string;
  from: string;
  score: number;
  comment: string;
  timestamp: number;
}

interface ReputationData {
  score: number;
  rank: string;
  feedback: Feedback[];
}

interface IpcHandler {
  on(channel: string, listener: (data: any) => void): void;
  send(channel: string, data: any): void;
  handle(channel: string, handler: (data: any) => Promise<any>): void;
}

interface PluginContext {
  ipc: IpcHandler;
  on(event: string, listener: () => void): void;
}

class ReputationManager {
  private data: ReputationData;

  constructor() {
    // Initial dummy data
    this.data = {
      score: 750,
      rank: 'Magus',
      feedback: [
        { id: '1', from: 'Alice', score: 5, comment: 'Great collaboration!', timestamp: Date.now() - 100000 },
        { id: '2', from: 'Bob', score: 4, comment: 'Good work, slight delay.', timestamp: Date.now() - 200000 }
      ]
    };
  }

  getReputation() {
    return this.data;
  }

  addFeedback(item: Omit<Feedback, 'id' | 'timestamp'>) {
    const feedback: Feedback = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...item
    };
    this.data.feedback.unshift(feedback);
    
    // Simple score update logic
    this.data.score = Math.min(1000, Math.max(0, this.data.score + (item.score - 3) * 10));
    return feedback;
  }
}

export const activate = (context: PluginContext) => {
  console.log('[Reputation Manager] Main process activated');
  const manager = new ReputationManager();

  context.ipc.handle('reputation:get', async () => {
    return manager.getReputation();
  });

  context.ipc.handle('reputation:add-feedback', async (item: any) => {
    return manager.addFeedback(item);
  });

  context.on('ready', () => {
    console.log('[Reputation Manager] Ready');
  });
};

export const deactivate = () => {
  console.log('[Reputation Manager] Deactivated');
};
