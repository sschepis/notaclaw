
module.exports = {
  activate: (context) => {
    console.log('[Swarm Controller] Main process activated');
    
    context.on('ready', () => {
      console.log('[Swarm Controller] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Swarm Controller] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Swarm Controller] Deactivated');
  }
};
