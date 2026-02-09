import React from 'react';
import { AgentsPanel } from './AgentsPanel';

export const activate = (context: any) => {
    console.log('[Agent Essentials] Renderer activated');
    const { React, useAppStore } = context;

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

    // Register Nav Item
    context.registerComponent('sidebar:nav-item', {
        id: 'agent-essentials-nav',
        component: AgentEssentialsButton
    });

    // Register Main View
    context.registerComponent('sidebar:view:agents', {
        id: 'agent-essentials-panel',
        component: AgentsPanel
    });
};
