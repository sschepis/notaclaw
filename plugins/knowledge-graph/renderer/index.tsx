import React from 'react';
import { Network } from 'lucide-react';
import { MemoryPanel } from './MemoryPanel';

export const activate = (context: any) => {
    console.log('[Knowledge Graph Explorer] Renderer activated');
    const { ui } = context;

    // Register Navigation
    const cleanupNav = ui.registerNavigation({
        id: 'knowledge-graph-nav',
        label: 'Knowledge Graph',
        icon: Network,
        view: {
            id: 'knowledge-graph-panel',
            name: 'Knowledge Graph Explorer',
            icon: Network,
            component: () => <MemoryPanel context={context} />
        },
        order: 600
    });

    context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    console.log('[Knowledge Graph Explorer] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

