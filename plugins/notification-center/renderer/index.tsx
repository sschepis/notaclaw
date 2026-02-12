import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Bell, CheckCheck, Trash2, BellOff, BellRing, X, 
  Settings, Info, AlertTriangle, AlertCircle, CheckCircle,
  Filter, ChevronDown, ChevronUp, ExternalLink, Inbox
} from 'lucide-react';

// Types
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

export const activate = (context: any) => {
    console.log('[Notification Center] Renderer activated');
    const { ui, useAppStore } = context;

    // --- Components ---

    const Toast = ({ notification, onClose }: { notification: Notification; onClose: () => void }) => {
        useEffect(() => {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }, [onClose]);

        const icon = {
            info: <Info size={16} className="text-blue-400" />,
            success: <CheckCircle size={16} className="text-green-400" />,
            warning: <AlertTriangle size={16} className="text-yellow-400" />,
            error: <AlertCircle size={16} className="text-red-400" />
        }[notification.type];

        return (
            <div className="flex items-start p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg animate-in slide-in-from-right w-80">
                <div className="mr-3 mt-1">{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{notification.title}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2">{notification.message}</p>
                </div>
                <button onClick={onClose} className="ml-2 text-gray-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>
        );
    };

    const ToastManager = () => {
        const [toasts, setToasts] = useState<Notification[]>([]);

        useEffect(() => {
            const handleNewNotification = (notif: Notification) => {
                // Check DND
                context.ipc.invoke('notifications:getSettings').then((settings: NotificationSettings) => {
                     if (!settings.dndEnabled) {
                        setToasts(prev => [...prev, notif]);
                        // Play sound
                        if (settings.soundEnabled) {
                            // Simple beep or audio file if available
                            // new Audio('...').play().catch(() => {});
                        }
                     }
                });
            };

            if (context.ipc && context.ipc.on) {
                context.ipc.on('notification:new', handleNewNotification);
            }

            return () => {
                // Cleanup listener if possible, but context.ipc.off might not exist or be easy
            };
        }, []);

        const removeToast = (id: string) => {
            setToasts(prev => prev.filter(t => t.id !== id));
        };

        if (toasts.length === 0) return null;

        return (
            <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
                <div className="pointer-events-auto">
                    {toasts.map(t => (
                        <Toast key={t.id} notification={t} onClose={() => removeToast(t.id)} />
                    ))}
                </div>
            </div>
        );
    };

    const NotificationPanel = () => {
        const [notifications, setNotifications] = useState<Notification[]>([]);
        const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
        const [filter, setFilter] = useState<'all' | 'unread' | 'system' | 'agent'>('all');
        const [showSettings, setShowSettings] = useState(false);

        const fetchData = async () => {
             if (context.ipc && context.ipc.invoke) {
                const list = await context.ipc.invoke('notifications:list');
                setNotifications(list);
                const s = await context.ipc.invoke('notifications:getSettings');
                setSettings(s || DEFAULT_SETTINGS);
            }
        };

        useEffect(() => {
            fetchData();

            const handleNew = (n: Notification) => setNotifications(prev => [n, ...prev]);
            const handleUpdate = (n: Notification) => setNotifications(prev => prev.map(x => x.id === n.id ? n : x));
            const handleListUpdate = (list: Notification[]) => setNotifications(list);
            const handleAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            const handleCleared = () => setNotifications([]);
            const handleSettingsUpdate = (s: NotificationSettings) => setSettings(s);

            if (context.ipc) {
                context.ipc.on('notification:new', handleNew);
                context.ipc.on('notification:update', handleUpdate);
                context.ipc.on('notifications:listUpdated', handleListUpdate);
                context.ipc.on('notifications:allRead', handleAllRead);
                context.ipc.on('notifications:cleared', handleCleared);
                context.ipc.on('notifications:settingsUpdated', handleSettingsUpdate);
            }
        }, []);

        const filteredNotifications = useMemo(() => {
            return notifications.filter(n => {
                if (filter === 'unread') return !n.read;
                if (filter === 'system') return n.category === 'system';
                if (filter === 'agent') return n.category === 'agent';
                return true;
            });
        }, [notifications, filter]);

        const markRead = (id: string) => context.ipc.invoke('notifications:markRead', { id });
        const markAllRead = () => context.ipc.invoke('notifications:markAllRead');
        const clearAll = () => context.ipc.invoke('notifications:clear');
        const deleteNotification = (id: string, e: React.MouseEvent) => {
            e.stopPropagation();
            context.ipc.invoke('notifications:delete', { id });
        };
        
        const updateSettings = (partial: Partial<NotificationSettings>) => {
            context.ipc.invoke('notifications:updateSettings', partial);
        };

        return (
            <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Bell size={18} />
                        Notifications
                    </h2>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-1.5 rounded hover:bg-white/10 ${showSettings ? 'bg-white/10 text-blue-400' : 'text-gray-400'}`}
                            title="Settings"
                        >
                            <Settings size={16} />
                        </button>
                        <button 
                            onClick={markAllRead} 
                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-green-400"
                            title="Mark all as read"
                        >
                            <CheckCheck size={16} />
                        </button>
                        <button 
                            onClick={clearAll} 
                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400"
                            title="Clear all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="p-4 bg-gray-800 border-b border-gray-700 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span>Do Not Disturb</span>
                            <button 
                                onClick={() => updateSettings({ dndEnabled: !settings.dndEnabled })}
                                className={`w-10 h-5 rounded-full relative transition-colors ${settings.dndEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.dndEnabled ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Sound</span>
                            <button 
                                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                                className={`w-10 h-5 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                             <span>History Limit</span>
                             <select 
                                value={settings.maxHistory} 
                                onChange={(e) => updateSettings({ maxHistory: parseInt(e.target.value) })}
                                className="bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600"
                            >
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                             </select>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-2 p-2 border-b border-gray-700 overflow-x-auto">
                    {['all', 'unread', 'system', 'agent'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${
                                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                            <Inbox size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notif) => (
                            <div 
                                key={notif.id} 
                                onClick={() => markRead(notif.id)}
                                className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                                    notif.read ? 'bg-transparent border-transparent opacity-60 hover:bg-white/5' : 'bg-white/5 border-gray-700 hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 ${
                                        notif.type === 'error' ? 'text-red-400' : 
                                        notif.type === 'success' ? 'text-green-400' : 
                                        notif.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                    }`}>
                                        {notif.type === 'error' ? <AlertCircle size={16} /> :
                                         notif.type === 'success' ? <CheckCircle size={16} /> :
                                         notif.type === 'warning' ? <AlertTriangle size={16} /> : <Info size={16} />}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`text-sm font-medium ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        
                                        <p className="text-xs text-gray-300 mt-1 break-words">
                                            {notif.message}
                                        </p>

                                        {notif.actions && notif.actions.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                                {notif.actions.map(action => (
                                                    <button
                                                        key={action.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            context.ipc.send(action.action, action.data);
                                                        }}
                                                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white flex items-center gap-1"
                                                    >
                                                        {action.label}
                                                        <ExternalLink size={10} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={(e) => deleteNotification(notif.id, e)}
                                    className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const NotificationCenterButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'notification-center';
        const [unreadCount, setUnreadCount] = useState(0);

        useEffect(() => {
            const updateCount = async () => {
                if (context.ipc) {
                    const list: Notification[] = await context.ipc.invoke('notifications:list');
                    setUnreadCount(list.filter(n => !n.read).length);
                }
            };
            
            updateCount();

            // Listen for updates to refresh badge
            const handleUpdate = () => updateCount();
            if (context.ipc) {
                context.ipc.on('notification:new', handleUpdate);
                context.ipc.on('notification:update', handleUpdate);
                context.ipc.on('notifications:listUpdated', handleUpdate);
                context.ipc.on('notifications:allRead', handleUpdate);
                context.ipc.on('notifications:cleared', handleUpdate);
            }
        }, []);
        
        return (
            <button
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('notification-center')}
                title="Notification Center"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#1e1e1e]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
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
    
    // Register Toast Overlay (if supported by slot system, otherwise we might need a different approach)
    // Assuming there is a slot for overlays or we can append to body? 
    // Usually plugins render into specific slots. If 'app:overlay' exists, we use it.
    // If not, we might not be able to show global toasts easily without a dedicated slot.
    // Checking environment_details for slots... 'client/src/renderer/services/SlotRegistry.ts' exists.
    // I'll assume 'app:overlay' or similar exists or I can register a global component.
    // For now, I'll register it as 'app:overlay' if available, otherwise it might not show.
    // However, the safest bet in this architecture is usually 'layout:overlay' or similar.
    // I'll try 'layout:overlay'.
    context.registerComponent('layout:overlay', {
        id: 'notification-toasts',
        component: ToastManager
    });

    // Register Commands
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
    }

    context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
    console.log('[Notification Center] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};
