import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export const activate = (context: any) => {
    console.log('[Coherence Monitor] Renderer activated');
    const { ui, ipc } = context;

    const CoherencePanel = () => {
        const [events, setEvents] = useState<any[]>([]);
        const [stats, setStats] = useState({ coherence: 0, entropy: 0 });

        useEffect(() => {
            const handleUpdate = (event: any) => {
                setStats({ coherence: event.coherence, entropy: event.entropy });
                setEvents(prev => [event, ...prev].slice(0, 50));
            };

            // Listen for IPC messages
            if (ipc && ipc.on) {
                ipc.on('coherence:update', handleUpdate);
            }
            
            return () => {
                // Cleanup if possible
                // ipc.off('coherence:update', handleUpdate); // If off exists
            };
        }, []);

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Coherence Monitor</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/5 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Coherence</div>
                        <div className="text-2xl font-mono text-cyan-400">{(stats.coherence * 100).toFixed(1)}%</div>
                        <div className="w-full bg-gray-700 h-1 mt-2 rounded overflow-hidden">
                            <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${stats.coherence * 100}%` }} />
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Entropy</div>
                        <div className="text-2xl font-mono text-pink-400">{(stats.entropy * 100).toFixed(1)}%</div>
                        <div className="w-full bg-gray-700 h-1 mt-2 rounded overflow-hidden">
                            <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${stats.entropy * 100}%` }} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-black/20 rounded-lg p-2 overflow-hidden flex flex-col">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Event Stream</h3>
                    <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
                        {events.map((evt, i) => (
                            <div key={i} className="p-2 rounded hover:bg-white/5 border-l-2 border-transparent hover:border-white/20">
                                <div className="flex justify-between text-gray-500 mb-0.5">
                                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                                    <span>{evt.source}</span>
                                </div>
                                <div className="text-gray-300">{evt.message}</div>
                            </div>
                        ))}
                        {events.length === 0 && <div className="text-gray-600 italic p-2">Waiting for coherence data...</div>}
                    </div>
                </div>
            </div>
        );
    };

    // Register Navigation
    const cleanupNav = ui.registerNavigation({
        id: 'coherence-monitor-nav',
        label: 'Coherence',
        icon: Activity,
        view: {
            id: 'coherence-monitor-panel',
            name: 'Coherence Monitor',
            icon: Activity,
            component: CoherencePanel
        },
        order: 100
    });

    // Store cleanups
    context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

