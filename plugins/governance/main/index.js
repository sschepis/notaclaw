
module.exports = {
  activate: (context) => {
    console.log('[Governance Console] Main process activated');
    
    context.on('ready', () => {
      console.log('[Governance Console] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Governance Console] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Governance Console] Deactivated');
  }
};
