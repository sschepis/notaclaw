
module.exports = {
  activate: (context) => {
    console.log('[Secure Backup] Main process activated');
    
    context.on('ready', () => {
      console.log('[Secure Backup] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Secure Backup] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Secure Backup] Deactivated');
  }
};
