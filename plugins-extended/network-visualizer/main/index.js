
module.exports = {
  activate: (context) => {
    console.log('[Network Visualizer] Main process activated');
    
    context.on('ready', () => {
      console.log('[Network Visualizer] Ready');
    });

    // Example IPC handler
    context.ipc.on('ping', (data) => {
      console.log('[Network Visualizer] Received ping:', data);
      context.ipc.send('pong', { message: 'Hello from main process!' });
    });
  },
  
  deactivate: () => {
    console.log('[Network Visualizer] Deactivated');
  }
};
