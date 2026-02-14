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
  console.log('[Semantic Whiteboard] Main process activated');
  
  context.on('ready', () => {
    console.log('[Semantic Whiteboard] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Semantic Whiteboard] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });

  if (context.traits) {
    context.traits.register({
      id: 'semantic-whiteboard',
      name: 'Whiteboard Visualization',
      description: 'Collaborative whiteboard for visualizing concepts.',
      instruction: 'You can use the semantic whiteboard to visualize concepts, draw diagrams, or collaborate on ideas visually. This helps in spatial reasoning and planning.',
      activationMode: 'dynamic',
      triggerKeywords: ['whiteboard', 'draw', 'diagram', 'visualize', 'sketch', 'plan', 'canvas']
    });
  }
};

export const deactivate = () => {
  console.log('[Semantic Whiteboard] Deactivated');
};
