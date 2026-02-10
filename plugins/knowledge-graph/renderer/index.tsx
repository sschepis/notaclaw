import React from 'react';
import { Network, Search, Plus, Trash2, GitBranch, Database } from 'lucide-react';
import { MemoryPanel } from './MemoryPanel';

export const activate = (context: any) => {
    console.log('[Knowledge Graph Explorer] Renderer activated');
    const { ui, useAppStore } = context;

    const cleanups: Array<() => void> = [];

    // Register Navigation
    if (ui?.registerNavigation) {
        cleanups.push(ui.registerNavigation({
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
        }));
    }

    // Register Commands for Command Menu
    if (ui?.registerCommand) {
        cleanups.push(ui.registerCommand({
            id: 'knowledge-graph:open',
            label: 'Open Knowledge Graph',
            icon: Network,
            category: 'Knowledge Graph',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('knowledge-graph-panel');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'knowledge-graph:search',
            label: 'Search Knowledge Graph',
            icon: Search,
            category: 'Knowledge Graph',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('knowledge-graph-panel');
                // Could trigger search mode
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'knowledge-graph:add-entity',
            label: 'Add Entity to Graph',
            icon: Plus,
            category: 'Knowledge Graph',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('knowledge-graph-panel');
                // Could trigger add entity modal
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'knowledge-graph:query',
            label: 'Query Knowledge Graph',
            icon: Database,
            category: 'Knowledge Graph',
            action: () => {
                context.ipc?.invoke?.('knowledge-graph:query', {});
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'knowledge-graph:traverse',
            label: 'Traverse Related Entities',
            icon: GitBranch,
            category: 'Knowledge Graph',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('knowledge-graph-panel');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'knowledge-graph:clear',
            label: 'Clear Knowledge Graph',
            icon: Trash2,
            category: 'Knowledge Graph',
            action: () => {
                context.ipc?.invoke?.('knowledge-graph:clear');
            }
        }));
    }

    context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
    console.log('[Knowledge Graph Explorer] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

