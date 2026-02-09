import React, { useState } from 'react';

export const activate = (context: any) => {
    console.log('[Reputation Manager] Renderer activated');

    const ReputationPanel = () => {
        const [reputation, setReputation] = useState(750);
        const [feedback, setFeedback] = useState<any[]>([
            { id: 1, from: 'Alice', score: 5, comment: 'Great collaboration!', timestamp: Date.now() - 100000 },
            { id: 2, from: 'Bob', score: 4, comment: 'Good work, slight delay.', timestamp: Date.now() - 200000 }
        ]);

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Reputation</h2>
                
                <div className="bg-white/5 p-6 rounded-lg mb-6 text-center border border-white/10">
                    <div className="text-sm text-gray-400 mb-2">Your Trust Score</div>
                    <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        {reputation}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Rank: Magus</div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Recent Feedback</h3>
                    <div className="space-y-3">
                        {feedback.map((item) => (
                            <div key={item.id} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-blue-300">{item.from}</span>
                                    <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center mb-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className={`text-xs ${i < item.score ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-300">{item.comment}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const ReputationManagerButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'reputation-manager';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('reputation-manager')}
                title="Reputation Manager"
            >
                REP
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'reputation-manager-nav',
        component: ReputationManagerButton
    });

    context.registerComponent('sidebar:view:reputation-manager', {
        id: 'reputation-manager-panel',
        component: ReputationPanel
    });
};
