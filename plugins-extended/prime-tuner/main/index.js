
module.exports = {
  activate: (context) => {
    console.log('[Prime Tuner] Main process activated');
    
    context.on('ready', () => {
      console.log('[Prime Tuner] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Prime Tuner] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Prime Tuner] Deactivated');
  }
};
