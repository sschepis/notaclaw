import React from 'react';
import { HardDrive } from 'lucide-react';
import { AgentsPanel } from './AgentsPanel';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';
import { setIpc } from './ipc';

export const activate = (context: RendererPluginContext) => {
    console.log('[Agent Essentials] Renderer activated');
    const { React, useAppStore, ui } = context;
    
    // Set IPC for components to use
    setIpc(context.ipc);

    const cleanups: Array<() => void> = [];

    // Register Stage View
    if (context.ui.registerStageView) {
        cleanups.push(context.ui.registerStageView({
            id: 'agent-essentials-panel',
            name: 'System',
            icon: HardDrive,
            component: AgentsPanel
        }));

        // Register Navigation
        cleanups.push(context.ui.registerNavigation({
            id: 'agent-essentials-nav',
            label: 'System',
            icon: HardDrive,
            view: {
                id: 'agent-essentials-panel',
                name: 'System',
                icon: HardDrive,
                component: AgentsPanel
            },
            order: 20
        }));
    } else {
        // Fallback or legacy handling if needed, but we are upgrading
        console.warn('[Agent Essentials] New UI API not available');
    }

    // Register Commands for Command Menu
    if (ui?.registerCommand) {
        cleanups.push(ui.registerCommand({
            id: 'agent-essentials:open-system',
            label: 'Open System Monitor',
            icon: HardDrive,
            category: 'System',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('agents'); // Keeping 'agents' view ID for now to avoid breaking other things, but label is System
            }
        }));
    }

    (context as any)._cleanups = cleanups;
};

export const deactivate = (context: RendererPluginContext) => {
    console.log('[Agent Essentials] Renderer deactivated');
    if ((context as any)._cleanups) {
        (context as any)._cleanups.forEach((cleanup: any) => cleanup());
    }
};

