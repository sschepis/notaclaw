
module.exports = {
  activate: (context) => {
    console.log('[Theme Studio] Main process activated');
    
    context.on('ready', () => {
      console.log('[Theme Studio] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Theme Studio] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Theme Studio] Deactivated');
  }
};
