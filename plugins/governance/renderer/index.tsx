import React from 'react';
import { Scale } from 'lucide-react';
import { CoherencePanel } from './CoherencePanel';

export const activate = (context: any) => {
    console.log('[Governance Console] Renderer activated');
    const { ui } = context;

    // Register Navigation
    const cleanupNav = ui.registerNavigation({
        id: 'governance-nav',
        label: 'Governance',
        icon: Scale,
        view: {
            id: 'governance-panel',
            name: 'Governance Console',
            icon: Scale,
            component: () => <CoherencePanel context={context} />
        },
        order: 400
    });

    context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    console.log('[Governance Console] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

