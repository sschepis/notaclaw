
import React, { useState, useEffect } from 'react';
import { Dashboard } from './Dashboard';
import { WalletSetup } from './WalletSetup';

export const activate = (context: any) => {
    console.log('[DegenTrader] Renderer activated');

    const MainPanel = () => {
        const [view, setView] = useState('dashboard');

        return (
            <div className="h-full flex flex-col bg-gray-900 text-white">
                <div className="flex border-b border-white/10 p-4">
                    <h1 className="text-xl font-bold mr-8">Degen Trader 🚀</h1>
                    <div className="flex space-x-4">
                        <button 
                            onClick={() => setView('dashboard')}
                            className={`px-3 py-1 rounded ${view === 'dashboard' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
                        >
                            Dashboard
                        </button>
                        <button 
                            onClick={() => setView('wallets')}
                            className={`px-3 py-1 rounded ${view === 'wallets' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
                        >
                            Wallets
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                    {view === 'dashboard' ? (
                        <Dashboard context={context} />
                    ) : (
                        <WalletSetup context={context} />
                    )}
                </div>
            </div>
        );
    };

    const SidebarIcon = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'degentrader';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('degentrader')}
                title="Degen Trader"
            >
                📈
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'degentrader-nav',
        component: SidebarIcon
    });

    context.registerComponent('sidebar:view:degentrader', {
        id: 'degentrader-panel',
        component: MainPanel
    });
};
