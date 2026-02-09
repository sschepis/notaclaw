
module.exports = {
  activate: (context) => {
    console.log('[Notification Center] Main process activated');
    
    const notifications = [];

    // IPC to receive notifications from other parts of the system
    context.ipc.on('notify', (data) => {
        const notification = {
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

    context.ipc.handle('notifications:markRead', async ({ id }) => {
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
  },
  
  deactivate: () => {
    console.log('[Notification Center] Deactivated');
  }
};
