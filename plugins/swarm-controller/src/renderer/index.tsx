import React, { useState } from 'react';

export const activate = (context: any) => {
    console.log('[Swarm Controller] Renderer activated');

    const SwarmPanel = () => {
        const [agents, setAgents] = useState([
            { id: 'agent-1', name: 'Researcher', status: 'idle', task: '' },
            { id: 'agent-2', name: 'Writer', status: 'working', task: 'Drafting report' },
            { id: 'agent-3', name: 'Reviewer', status: 'idle', task: '' }
        ]);
        const [taskInputFor, setTaskInputFor] = useState<string | null>(null);
        const [taskInputValue, setTaskInputValue] = useState('Processing new directive...');

        const spawnAgent = () => {
            const id = `agent-${agents.length + 1}`;
            setAgents([...agents, { id, name: `Agent ${agents.length + 1}`, status: 'idle', task: '' }]);
        };

        const assignTask = (id: string) => {
            setTaskInputFor(id);
            setTaskInputValue('Processing new directive...');
        };

        const submitTask = (id: string) => {
            const task = taskInputValue.trim();
            if (!task) return;
            setTaskInputFor(null);

            setAgents(agents.map(a => a.id === id ? { ...a, status: 'working', task } : a));
            setTimeout(() => {
                setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'idle', task: '' } : a));
            }, 5000);
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Swarm Controller</h2>
                    <button 
                        onClick={spawnAgent}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    >
                        + Spawn Agent
                    </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {agents.map((agent) => (
                        <div key={agent.id} className="bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${agent.status === 'working' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                    <h3 className="font-bold text-sm text-blue-300">{agent.name}</h3>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                    agent.status === 'working' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                                }`}>{agent.status}</span>
                            </div>
                            
                            {agent.task ? (
                                <div className="text-xs text-gray-300 mb-2">
                                    <span className="text-gray-500">Current Task:</span> {agent.task}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic mb-2">No active task</div>
                            )}

                            {taskInputFor === agent.id && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={taskInputValue}
                                        onChange={e => setTaskInputValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitTask(agent.id); if (e.key === 'Escape') setTaskInputFor(null); }}
                                        autoFocus
                                        className="flex-1 bg-white/10 text-white px-2 py-1 rounded text-xs border border-white/20 outline-none focus:border-blue-500"
                                        placeholder="Enter task..."
                                    />
                                    <button
                                        onClick={() => submitTask(agent.id)}
                                        className="px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors"
                                    >
                                        Go
                                    </button>
                                    <button
                                        onClick={() => setTaskInputFor(null)}
                                        className="px-2 bg-white/10 hover:bg-white/20 text-gray-400 rounded text-xs transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2 mt-2">
                                <button 
                                    onClick={() => assignTask(agent.id)}
                                    disabled={agent.status === 'working' || taskInputFor === agent.id}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-1 rounded text-xs transition-colors disabled:opacity-50"
                                >
                                    Assign Task
                                </button>
                                <button className="px-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors">
                                    Stop
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const SwarmControllerButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'swarm-controller';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('swarm-controller')}
                title="Swarm Controller"
            >
                SWM
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'swarm-controller-nav',
        component: SwarmControllerButton
    });

    context.registerComponent('sidebar:view:swarm-controller', {
        id: 'swarm-controller-panel',
        component: SwarmPanel
    });
};
