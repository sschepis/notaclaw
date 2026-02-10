import React from 'react';
import { LayoutDashboard, Activity, RefreshCw, Settings2, Play } from 'lucide-react';
import { AutoDashView } from './AutoDashView';

export const activate = (context: any) => {
    console.log('[AutoDash] Renderer activated');
    const { React, useAppStore, ui } = context;

    // 1. Create the Sidebar Button Component
    const AutoDashButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'autodash';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('autodash')}
                title="AutoDash"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
            </button>
        );
    };

    const cleanups: Array<() => void> = [];

    // 2. Register Sidebar Navigation Item
    if (ui?.registerNavigation) {
        cleanups.push(ui.registerNavigation({
            id: 'autodash-nav',
            label: 'AutoDash',
            icon: LayoutDashboard,
            view: {
                id: 'autodash-view',
                name: 'AutoDash',
                icon: LayoutDashboard,
                component: () => <AutoDashView context={context} />
            },
            order: 50
        }));
    }

    // 3. Register Sidebar Component (Legacy/Alternative method if navigation registration isn't enough)
    // Some systems separate the button from the view logic
    if (context.registerComponent) {
         context.registerComponent('sidebar:nav-item', {
            id: 'autodash-nav-btn',
            component: AutoDashButton
        });
        
        context.registerComponent('sidebar:view:autodash', {
            id: 'autodash-panel',
            component: () => <AutoDashView context={context} />
        });
    }

    // 4. Register Commands for Command Menu
    if (ui?.registerCommand) {
        cleanups.push(ui.registerCommand({
            id: 'autodash:open-dashboard',
            label: 'Open AutoDash Dashboard',
            icon: LayoutDashboard,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'autodash:view-metrics',
            label: 'View Dashboard Metrics',
            icon: Activity,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'autodash:refresh',
            label: 'Refresh Dashboard',
            icon: RefreshCw,
            category: 'AutoDash',
            action: () => {
                // Trigger dashboard refresh
                context.ipc?.send?.('autodash:refresh');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'autodash:run-action',
            label: 'Run Dashboard Action',
            icon: Play,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'autodash:configure',
            label: 'Configure Dashboard Widgets',
            icon: Settings2,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));
    }

    context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
    console.log('[AutoDash] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};
