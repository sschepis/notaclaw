import React, { useEffect, useState } from 'react';

export const activate = (context) => {
    console.log('[Federated Trainer] Renderer activated');

    const TrainerView = () => {
        const [rounds, setRounds] = useState([]);
        const [showNewRoundForm, setShowNewRoundForm] = useState(false);
        const [newRound, setNewRound] = useState({ modelId: '', datasetQuery: '', epochs: 1 });

        useEffect(() => {
            context.ipc.send('get-rounds');
            context.ipc.on('training-update', (updatedRounds) => {
                setRounds(updatedRounds);
            });
        }, []);

        const startRound = () => {
            if (!newRound.modelId) return;
            context.ipc.send('start-round', newRound);
            setShowNewRoundForm(false);
            setNewRound({ modelId: '', datasetQuery: '', epochs: 1 });
        };

        return (
            <div className="p-4 h-full overflow-y-auto text-white">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Federated Trainer</h1>
                    <button 
                        onClick={() => setShowNewRoundForm(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
                    >
                        + New Round
                    </button>
                </div>
                
                {showNewRoundForm && (
                    <div className="mb-6 border border-white/10 p-4 rounded bg-white/5 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold mb-4">Start New Training Round</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Model ID</label>
                                <input 
                                    value={newRound.modelId}
                                    onChange={e => setNewRound({...newRound, modelId: e.target.value})}
                                    placeholder="e.g. llama-3-8b-quantized"
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Dataset Query</label>
                                <input 
                                    value={newRound.datasetQuery}
                                    onChange={e => setNewRound({...newRound, datasetQuery: e.target.value})}
                                    placeholder="e.g. docs/*.md"
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Epochs</label>
                                <input 
                                    type="number"
                                    value={newRound.epochs}
                                    onChange={e => setNewRound({...newRound, epochs: parseInt(e.target.value)})}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button 
                                    onClick={() => setShowNewRoundForm(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={startRound}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
                                >
                                    Start
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {rounds.length === 0 ? (
                    <div className="text-gray-400 text-center mt-10">
                        No active training rounds.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rounds.map(round => (
                            <div key={round.id} className="border border-white/10 p-4 rounded bg-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-lg">{round.modelId}</h3>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        round.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        round.status === 'training' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                        {round.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 mb-2">
                                    Participants: {round.participants}
                                </div>
                                <div className="w-full bg-gray-700 h-2 rounded overflow-hidden">
                                    <div 
                                        className="bg-blue-500 h-full transition-all duration-500" 
                                        style={{width: `${round.progress || 0}%`}}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const TrainerButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'federated-trainer';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('federated-trainer')}
                title="Federated Trainer"
            >
                🧠
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'federated-trainer-nav',
        component: TrainerButton
    });

    context.registerComponent('sidebar:view:federated-trainer', {
        id: 'federated-trainer-panel',
        component: TrainerView
    });
};
