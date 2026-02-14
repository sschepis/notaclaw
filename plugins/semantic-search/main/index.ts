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
  console.log('[Semantic Search] Main process activated');
  
  context.on('ready', () => {
    console.log('[Semantic Search] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Semantic Search] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });

  if (context.traits) {
    context.traits.register({
      id: 'semantic-search',
      name: 'Semantic Knowledge Search',
      description: 'Search for information using semantic queries.',
      instruction: 'You can search the knowledge base using semantic queries. Use this when you need to find information, documents, or context that might not be exact keyword matches but is conceptually related.',
      activationMode: 'dynamic',
      triggerKeywords: ['search', 'find', 'query', 'lookup', 'semantic', 'concept', 'meaning', 'related to']
    });
  }
};

export const deactivate = () => {
  console.log('[Semantic Search] Deactivated');
};
