import React, { useEffect, useState } from 'react';

export const GatewayPanel = ({ context }: { context: any }) => {
    const [status, setStatus] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [port, setPort] = useState(3000);

    useEffect(() => {
        const fetchStatus = async () => {
            const data = await context.ipc.invoke('gateway:get-status');
            if (data) {
                setStatus(data.status);
                setPort(data.port);
                setLogs(data.logs);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [context]);

    const handleSavePort = async () => {
        await context.ipc.invoke('gateway:set-port', { port: Number(port) });
        // Refresh
        const data = await context.ipc.invoke('gateway:get-status');
        if (data) {
            setStatus(data.status);
            setPort(data.port);
        }
    };

    return (
        <div className="flex flex-col h-full p-4 text-white">
            <h2 className="text-xl font-bold mb-4">API Gateway</h2>
            
            <div className="bg-white/5 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {status ? status.toUpperCase() : 'UNKNOWN'}
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Port</label>
                    <input 
                        type="number" 
                        value={port} 
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm w-24 text-white"
                    />
                    <button 
                        onClick={handleSavePort}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-colors"
                    >
                        Update
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-black/20 rounded-lg p-2 overflow-hidden flex flex-col">
                <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Request Log</h3>
                <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
                    {logs.map((log, i) => (
                        <div key={i} className={`p-1.5 rounded ${log.type === 'error' ? 'bg-red-500/10 text-red-300' : 'hover:bg-white/5'}`}>
                            <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            {log.message}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-gray-600 italic p-2">No logs yet</div>}
                </div>
            </div>
        </div>
    );
};
