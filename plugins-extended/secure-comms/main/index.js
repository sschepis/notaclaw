
module.exports = {
  activate: (context) => {
    console.log('[Secure Comms] Main process activated');
    
    context.on('ready', () => {
      console.log('[Secure Comms] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Secure Comms] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Secure Comms] Deactivated');
  }
};
