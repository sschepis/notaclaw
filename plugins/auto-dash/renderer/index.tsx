import React from 'react';
import { LayoutDashboard, Activity, RefreshCw, Settings2, Play } from 'lucide-react';
import { AutoDashView } from './AutoDashView';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';

export const activate = (context: RendererPluginContext) => {
    console.log('[AutoDash] Renderer activated');
    const { useAppStore, ui } = context;

    const cleanups: Array<() => void> = [];

    // Register Sidebar Navigation Item
    if (ui?.registerNavigation && ui?.registerStageView) {
        cleanups.push(ui.registerStageView({
            id: 'autodash-panel',
            name: 'AutoDash',
            icon: LayoutDashboard,
            component: () => <AutoDashView context={context} />
        }));

        cleanups.push(ui.registerNavigation({
            id: 'autodash-nav',
            label: 'AutoDash',
            icon: LayoutDashboard,
            view: {
                id: 'autodash-panel',
                name: 'AutoDash',
                icon: LayoutDashboard,
                component: () => <AutoDashView context={context} />
            },
            order: 50
        }));
    } else {
        console.warn('[AutoDash] New UI API not available');
    }

    // Register Commands for Command Menu
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
                context.ipc?.send?.('autodash:refresh', {});
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

    (context as any)._cleanups = cleanups;
};

export const deactivate = (context: RendererPluginContext) => {
    console.log('[AutoDash] Renderer deactivated');
    if ((context as any)._cleanups) {
        (context as any)._cleanups.forEach((cleanup: any) => cleanup());
    }
};
