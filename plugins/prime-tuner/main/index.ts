export interface PluginContext {
  on(event: string, callback: () => void): void;
  ipc: {
    on(channel: string, callback: (data: any) => void): void;
    send(channel: string, data: any): void;
  };
  [key: string]: any;
}

export const activate = (context: PluginContext) => {
  console.log('[Prime Tuner] Main process activated');
  
  context.on('ready', () => {
    console.log('[Prime Tuner] Ready');
  });

  // Example IPC handler
  context.ipc.on('ping', (data: any) => {
    console.log('[Prime Tuner] Received ping:', data);
    context.ipc.send('pong', { message: 'Hello from main process!' });
  });
};

export const deactivate = () => {
  console.log('[Prime Tuner] Deactivated');
};
