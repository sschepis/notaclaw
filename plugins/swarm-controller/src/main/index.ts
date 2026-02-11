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
}

export function deactivate() {
  console.log('[Swarm Controller] Deactivated');
}
