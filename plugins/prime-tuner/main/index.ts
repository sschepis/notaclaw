export interface PluginContext {
  on(event: string, callback: () => void): void;
  ipc: {
    on(channel: string, callback: (data: any) => void): void;
    send(channel: string, data: any): void;
  };
  traits?: {
    register: (trait: any) => void;
  };
  [key: string]: any;
}

export const activate = (context: PluginContext) => {
  console.log('[Prime Tuner] Main process activated');
  
  context.on('ready', () => {
    console.log('[Prime Tuner] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Prime Tuner] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });

  if (context.traits) {
    context.traits.register({
      id: 'prime-tuner',
      name: 'Prime Tuning',
      description: 'Fine-tune models and primes.',
      instruction: 'You can use the Prime Tuner to fine-tune AI models and "primes" (specialized agent configurations). Use this to improve performance on specific tasks or domains.',
      activationMode: 'dynamic',
      triggerKeywords: ['tune', 'fine-tune', 'model', 'training', 'prime', 'optimize', 'performance']
    });
  }
};

export const deactivate = () => {
  console.log('[Prime Tuner] Deactivated');
};
