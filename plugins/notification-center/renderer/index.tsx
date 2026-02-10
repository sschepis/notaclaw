import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, BellOff, BellRing } from 'lucide-react';

export const activate = (context: any) => {
    console.log('[Notification Center] Renderer activated');
    const { ui, useAppStore } = context;

    const NotificationPanel = () => {
        const [notifications, setNotifications] = useState<any[]>([]);

        useEffect(() => {
            const fetchNotifications = async () => {
                if (context.ipc && context.ipc.invoke) {
                    const list = await context.ipc.invoke('notifications:list');
                    setNotifications(list);
                }
            };
            fetchNotifications();

            // Listen for new notifications
            if (context.ipc && context.ipc.on) {
                context.ipc.on('notification:new', (notif: any) => {
                    setNotifications(prev => [notif, ...prev]);
                });
            }
        }, []);

        const markRead = async (id: string) => {
            if (context.ipc && context.ipc.invoke) {
                await context.ipc.invoke('notifications:markRead', { id });
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }
        };

        const clearAll = async () => {
            if (context.ipc && context.ipc.invoke) {
                await context.ipc.invoke('notifications:clear');
                setNotifications([]);
            }
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Notifications</h2>
                    <button onClick={clearAll} className="text-xs text-gray-400 hover:text-white">Clear All</button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                    {notifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            onClick={() => markRead(notif.id)}
                            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                notif.read ? 'bg-white/5 border-transparent opacity-60' : 'bg-white/10 border-blue-500/30'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-bold uppercase ${
                                    notif.type === 'error' ? 'text-red-400' : 
                                    notif.type === 'success' ? 'text-green-400' : 
                                    notif.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                }`}>{notif.type}</span>
                                <span className="text-[10px] text-gray-500">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <h3 className="text-sm font-medium mb-1">{notif.title}</h3>
                            <p className="text-xs text-gray-300">{notif.message}</p>
                        </div>
                    ))}
                    {notifications.length === 0 && <div className="text-center text-gray-500 mt-8">No notifications</div>}
                </div>
            </div>
        );
    };

    const NotificationCenterButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'notification-center';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('notification-center')}
                title="Notification Center"
            >
                NOT
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'notification-center-nav',
        component: NotificationCenterButton
    });

    context.registerComponent('sidebar:view:notification-center', {
        id: 'notification-center-panel',
        component: NotificationPanel
    });

    // Register Commands for Command Menu
    const cleanups: Array<() => void> = [];

    if (ui?.registerCommand) {
        cleanups.push(ui.registerCommand({
            id: 'notifications:open',
            label: 'Open Notification Center',
            icon: Bell,
            category: 'Notifications',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('notification-center');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'notifications:mark-all-read',
            label: 'Mark All Notifications as Read',
            icon: CheckCheck,
            category: 'Notifications',
            action: () => {
                context.ipc?.invoke?.('notifications:markAllRead');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'notifications:clear-all',
            label: 'Clear All Notifications',
            icon: Trash2,
            category: 'Notifications',
            action: () => {
                context.ipc?.invoke?.('notifications:clear');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'notifications:mute',
            label: 'Mute Notifications',
            icon: BellOff,
            category: 'Notifications',
            action: () => {
                context.ipc?.invoke?.('notifications:mute');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'notifications:unmute',
            label: 'Unmute Notifications',
            icon: BellRing,
            category: 'Notifications',
            action: () => {
                context.ipc?.invoke?.('notifications:unmute');
            }
        }));
    }

    context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
    console.log('[Notification Center] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};
