
interface Notification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

interface IpcHandler {
  on(channel: string, listener: (data: any) => void): void;
  send(channel: string, data: any): void;
  handle(channel: string, handler: (data: any) => Promise<any>): void;
}

interface PluginContext {
  ipc: IpcHandler;
  on(event: string, listener: () => void): void;
}

export const activate = (context: PluginContext) => {
  const notifications: Notification[] = [];

  console.log('[Notification Center] Main process activated');

  // IPC to receive notifications from other parts of the system
  context.ipc.on('notify', (data: Partial<Notification>) => {
    const notification: Notification = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      title: data.title || 'Notification',
      message: data.message || '',
      type: data.type || 'info', // info, success, warning, error
      read: false
    };

    notifications.unshift(notification);
    if (notifications.length > 100) notifications.pop();

    // Broadcast to renderer
    context.ipc.send('notification:new', notification);
  });

  context.ipc.handle('notifications:list', async () => {
    return notifications;
  });

  context.ipc.handle('notifications:markRead', async ({ id }: { id: string }) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      return { success: true };
    }
    return { success: false };
  });

  context.ipc.handle('notifications:clear', async () => {
    notifications.length = 0;
    return { success: true };
  });

  context.on('ready', () => {
    console.log('[Notification Center] Ready');

    // Test notification
    setTimeout(() => {
      context.ipc.send('notification:new', {
        id: 'test-1',
        timestamp: Date.now(),
        title: 'Welcome',
        message: 'Notification Center is active.',
        type: 'success',
        read: false
      });
    }, 2000);
  });
};

export const deactivate = () => {
  console.log('[Notification Center] Deactivated');
};
