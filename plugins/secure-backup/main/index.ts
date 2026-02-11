export interface PluginContext {
  on(event: string, callback: () => void): void;
  ipc: {
    on(channel: string, callback: (data: any) => void): void;
    send(channel: string, data: any): void;
  };
  [key: string]: any;
}

export const activate = (context: PluginContext) => {
  console.log('[Secure Backup] Main process activated');
  
  context.on('ready', () => {
    console.log('[Secure Backup] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Secure Backup] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });
};

export const deactivate = () => {
  console.log('[Secure Backup] Deactivated');
};
