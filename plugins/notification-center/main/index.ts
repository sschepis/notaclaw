export interface PluginContext {
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  ipc: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
    on: (channel: string, handler: (args: any) => Promise<void>) => void;
    send: (channel: string, ...args: any[]) => void;
  };
  dsn: {
    registerTool: (metadata: any, handler: (args: any) => Promise<any>) => void;
  };
  traits?: {
    register: (trait: any) => void;
  };
  on: (event: string, handler: () => void) => void;
}

interface NotificationAction {
  id: string;
  label: string;
  action: string;
  data?: any;
}

interface Notification {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  source?: string;
  read: boolean;
  actions?: NotificationAction[];
  data?: any;
}

interface NotificationSettings {
  maxHistory: number;
  soundEnabled: boolean;
  soundVolume: number;
  dndEnabled: boolean;
  desktopNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  maxHistory: 100,
  soundEnabled: true,
  soundVolume: 0.5,
  dndEnabled: false,
  desktopNotifications: false,
};

export const activate = async (context: PluginContext) => {
  console.log('[Notification Center] Main process activated');

  let notifications: Notification[] = [];
  let settings: NotificationSettings = { ...DEFAULT_SETTINGS };

  // Load from storage
  try {
    if (context.storage) {
        const storedNotifications = await context.storage.get('notifications');
        if (Array.isArray(storedNotifications)) {
        notifications = storedNotifications;
        }
        const storedSettings = await context.storage.get('settings');
        if (storedSettings) {
        settings = { ...DEFAULT_SETTINGS, ...storedSettings };
        }
    }
  } catch (err) {
    console.error('[Notification Center] Failed to load storage:', err);
  }

  const persist = async () => {
    try {
      if (context.storage) {
        await context.storage.set('notifications', notifications);
        await context.storage.set('settings', settings);
      }
    } catch (err) {
      console.error('[Notification Center] Failed to save storage:', err);
    }
  };

  // IPC Handlers

  context.ipc.on('notify', async (data: Partial<Notification>) => {
     // Logic to add notification
     const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      title: data.title || 'Notification',
      message: data.message || '',
      type: data.type || 'info',
      priority: data.priority || 'medium',
      category: data.category || 'system',
      source: data.source || 'unknown',
      read: false,
      actions: data.actions || [],
      data: data.data
    };

    // Deduplication (simple: same title and message within 2 seconds)
    const duplicate = notifications.find(n => 
        n.title === notification.title && 
        n.message === notification.message && 
        n.timestamp > notification.timestamp - 2000
    );

    if (duplicate) return;

    notifications.unshift(notification);
    if (notifications.length > settings.maxHistory) {
        notifications = notifications.slice(0, settings.maxHistory);
    }

    await persist();

    context.ipc.send('notification:new', notification);
  });

  context.ipc.handle('notifications:list', async () => {
    return notifications;
  });

  context.ipc.handle('notifications:markRead', async (data: { id?: string, ids?: string[] }) => {
    let updated = false;
    if (data.id) {
        const n = notifications.find(x => x.id === data.id);
        if (n && !n.read) {
            n.read = true;
            updated = true;
            context.ipc.send('notification:update', n);
        }
    } else if (data.ids) {
        data.ids.forEach(id => {
            const n = notifications.find(x => x.id === id);
            if (n && !n.read) {
                n.read = true;
                updated = true;
                context.ipc.send('notification:update', n);
            }
        });
    }
    if (updated) await persist();
    return { success: true };
  });

  context.ipc.handle('notifications:markAllRead', async () => {
    let updated = false;
    notifications.forEach(n => {
        if (!n.read) {
            n.read = true;
            updated = true;
        }
    });
    if (updated) {
        await persist();
        context.ipc.send('notifications:allRead', {});
    }
    return { success: true };
  });

  context.ipc.handle('notifications:delete', async (data: { id?: string, ids?: string[] }) => {
    const initialLength = notifications.length;
    if (data.id) {
        notifications = notifications.filter(n => n.id !== data.id);
    } else if (data.ids) {
        notifications = notifications.filter(n => !data.ids?.includes(n.id));
    }
    if (notifications.length !== initialLength) {
        await persist();
        context.ipc.send('notifications:listUpdated', notifications);
    }
    return { success: true };
  });

  context.ipc.handle('notifications:clear', async () => {
    notifications = [];
    await persist();
    context.ipc.send('notifications:cleared', {});
    return { success: true };
  });
  
  context.ipc.handle('notifications:getSettings', async () => {
      return settings;
  });

  context.ipc.handle('notifications:updateSettings', async (newSettings: Partial<NotificationSettings>) => {
      settings = { ...settings, ...newSettings };
      await persist();
      context.ipc.send('notifications:settingsUpdated', settings);
      return settings;
  });

    // DSN Tool Registration
    if (context.dsn && context.dsn.registerTool) {
        context.dsn.registerTool({
            name: 'send_notification',
            description: 'Send a notification to the user',
            executionLocation: 'SERVER',
            version: '1.0.0',
            semanticDomain: 'meta',
            primeDomain: [2],
            smfAxes: [0, 0, 0, 0],
            requiredTier: 'Neophyte',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    message: { type: 'string' },
                    type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
                },
                required: ['title', 'message']
            }
        }, async (args: any) => {
             const notification: Notification = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                title: args.title,
                message: args.message,
                type: args.type || 'info',
                priority: args.priority || 'medium',
                category: 'agent',
                source: 'dsn',
                read: false
            };
            
             notifications.unshift(notification);
             if (notifications.length > settings.maxHistory) {
                notifications = notifications.slice(0, settings.maxHistory);
            }
            await persist();
            context.ipc.send('notification:new', notification);
            return { success: true, id: notification.id };
        });
    }

    if (context.traits) {
      context.traits.register({
        id: 'notification-center',
        name: 'Notifications',
        description: 'Send alerts and notifications.',
        instruction: 'You can send notifications to the user using `send_notification`. Use this for alerts, important updates, or when a task is completed.',
        activationMode: 'dynamic',
        triggerKeywords: ['notify', 'alert', 'message', 'inform', 'warn', 'notification']
      });
    }

  context.on('ready', () => {
    console.log('[Notification Center] Ready');
  });
};

export const deactivate = () => {
  console.log('[Notification Center] Deactivated');
};
