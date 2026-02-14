export function activate(context: any) {
  console.log('[Swarm Controller] Main process activated');

  context.on('ready', () => {
    console.log('[Swarm Controller] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Swarm Controller] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });

  if (context.traits) {
    context.traits.register({
      id: 'swarm-control',
      name: 'Swarm Control',
      description: 'Coordinate multiple agents.',
      instruction: 'You can coordinate a swarm of agents. Use this to delegate tasks, manage sub-agents, or orchestrate complex multi-step workflows involving multiple specialized entities.',
      activationMode: 'dynamic',
      triggerKeywords: ['swarm', 'agents', 'delegate', 'coordinate', 'multi-agent', 'orchestrate']
    });
  }
}

export function deactivate() {
  console.log('[Swarm Controller] Deactivated');
}
