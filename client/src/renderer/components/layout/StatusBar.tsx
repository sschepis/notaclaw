import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Terminal } from 'lucide-react';

export const StatusBar: React.FC = () => {
    const { network, isTerminalOpen, setIsTerminalOpen } = useAppStore();
    
    const isOnline = network.status === 'ONLINE';
    const isConnecting = network.status === 'CONNECTING';
    
    // Display short node ID (first 16 chars like fingerprint)
    const shortNodeId = network.nodeId ? network.nodeId.substring(0, 16) : '—';

    return (
        <div className="shrink-0 h-5 bg-card border-t border-border flex items-center justify-between px-3 text-[9px] text-muted-foreground font-mono select-none z-50">
            <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-500' : 
                        isConnecting ? 'bg-amber-500 animate-pulse' : 
                        'bg-red-500'
                    }`} />
                    <span>NET: {network.status}</span>
                </div>
                <div>
                    PEERS: {network.peers}
                </div>
                <div>
                    LAT: {network.latency}ms
                </div>
            </div>
            
            <div className="flex items-center space-x-3">
                 <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-primary rounded-full"></span>
                    ID: {shortNodeId}
                 </span>
                 <span className="flex items-center gap-1"><span className="w-1 h-1 bg-secondary rounded-full"></span>MEM: 2.4G</span>
                 <span className="flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full"></span>CPU: 12%</span>
                 <span className="flex items-center gap-1"><span className="w-1 h-1 bg-amber-500 rounded-full"></span>LAT: {network.latency}ms</span>
                 
                 <button 
                    onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    className={`flex items-center gap-1 hover:text-foreground transition-colors ${isTerminalOpen ? 'text-primary' : ''}`}
                    title="Toggle Terminal"
                 >
                    <Terminal size={10} />
                    <span>TERM</span>
                 </button>

                 <span>v0.1.0</span>
            </div>
        </div>
    );
};
