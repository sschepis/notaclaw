import React, { useState, useEffect } from 'react';

type SessionState = 'IDLE' | 'OBSERVING' | 'ACTING' | 'LOCKED';

export const SessionStatus: React.FC = () => {
    const [state, setState] = useState<SessionState>('IDLE');
    const [snapshot, setSnapshot] = useState<string | null>(null);

    useEffect(() => {
        const checkState = async () => {
            try {
                const api = window.electronAPI as any;
                const currentState = await api?.sessionGetState?.();
                if (currentState) setState(currentState);
            } catch {
                // Session API not available
            }
        };

        const interval = setInterval(checkState, 1000);
        return () => clearInterval(interval);
    }, []);

    const toggleSession = async () => {
        const api = window.electronAPI as any;
        if (state === 'IDLE') {
            await api?.sessionStart?.();
            setState('OBSERVING');
        } else {
            await api?.sessionStop?.();
            setState('IDLE');
        }
    };

    const takeSnapshot = async () => {
        const api = window.electronAPI as any;
        const shot = await api?.sessionSnapshot?.();
        setSnapshot(shot || null);
    };

    return (
        <div className="p-4 bg-gray-800 rounded-lg text-white border border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                        state === 'IDLE' ? 'bg-gray-500' :
                        state === 'OBSERVING' ? 'bg-blue-500 animate-pulse' :
                        state === 'ACTING' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
                    }`} />
                    <span className="font-mono font-bold text-sm tracking-wider">{state}</span>
                </div>
                <button 
                    onClick={toggleSession}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                        state === 'IDLE' 
                        ? 'bg-green-600 hover:bg-green-500' 
                        : 'bg-red-600 hover:bg-red-500'
                    }`}
                >
                    {state === 'IDLE' ? 'Connect' : 'Sever'}
                </button>
            </div>
            
            {state !== 'IDLE' && (
                <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>VISION FEED</span>
                        <button onClick={takeSnapshot} className="hover:text-white">
                            Refresh
                        </button>
                    </div>
                    {snapshot ? (
                        <div className="relative border-2 border-blue-500/50 rounded overflow-hidden bg-black aspect-video">
                            <img src={snapshot} alt="AI Vision" className="w-full h-full object-cover opacity-80" />
                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-scanline opacity-20"></div>
                        </div>
                    ) : (
                        <div className="h-24 bg-black/50 rounded flex items-center justify-center text-gray-600 text-xs">
                            NO SIGNAL
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
