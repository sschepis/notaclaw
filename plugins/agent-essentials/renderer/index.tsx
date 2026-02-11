import React from 'react';
import { Bot, Users, Plus, List } from 'lucide-react';
import { AgentsPanel } from './AgentsPanel';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';

export const activate = (context: RendererPluginContext) => {
    console.log('[Agent Essentials] Renderer activated');
    const { React, useAppStore, ui } = context;

    const AgentEssentialsButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'agents';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('agents')}
                title="Agent Essentials"
            >
                AE
            </button>
        );
    };

    const cleanups: Array<() => void> = [];

    // Register Stage View
    if (context.ui.registerStageView) {
        cleanups.push(context.ui.registerStageView({
            id: 'agent-essentials-panel',
            name: 'Agent Essentials',
            icon: Bot,
            component: AgentsPanel
        }));

        // Register Navigation
        cleanups.push(context.ui.registerNavigation({
            id: 'agent-essentials-nav',
            label: 'Agents',
            icon: Bot,
            view: {
                id: 'agent-essentials-panel',
                name: 'Agent Essentials',
                icon: Bot,
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
            id: 'agent-essentials:open-agents',
            label: 'Open Agents Panel',
            icon: Bot,
            category: 'Agent Essentials',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('agents');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'agent-essentials:list-agents',
            label: 'List Active Agents',
            icon: List,
            category: 'Agent Essentials',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('agents');
                // Trigger list view if available
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'agent-essentials:create-agent',
            label: 'Create New Agent',
            icon: Plus,
            category: 'Agent Essentials',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('agents');
                // Could trigger a create agent modal
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'agent-essentials:manage-teams',
            label: 'Manage Agent Teams',
            icon: Users,
            category: 'Agent Essentials',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('agents');
                // Navigate to teams view
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
