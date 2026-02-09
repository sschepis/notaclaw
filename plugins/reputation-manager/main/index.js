
module.exports = {
  activate: (context) => {
    console.log('[Reputation Manager] Main process activated');
    
    context.on('ready', () => {
      console.log('[Reputation Manager] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Reputation Manager] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Reputation Manager] Deactivated');
  }
};
