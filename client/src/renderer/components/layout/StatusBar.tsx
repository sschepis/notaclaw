import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Terminal, Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

/** Format an uptime duration from milliseconds into a human-readable string */
function formatUptime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    if (min < 60) return `${min}m ${totalSec % 60}s`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ${min % 60}m`;
    const days = Math.floor(hr / 24);
    return `${days}d ${hr % 24}h`;
}

export const StatusBar: React.FC = () => {
    const { network, setLayoutAction } = useAppStore();

    const isOnline = network.status === 'ONLINE';
    const isConnecting = network.status === 'CONNECTING' || network.status === 'RECONNECTING';
    const isError = network.status === 'ERROR';

    // Display short node ID (first 16 chars like fingerprint)
    const shortNodeId = network.nodeId ? network.nodeId.substring(0, 16) : '—';

    // Compute live uptime
    const uptime = useMemo(() => {
        if (!network.connectedAt) return null;
        return Date.now() - network.connectedAt;
    }, [network.connectedAt]);

    // Status dot color
    const statusDotClass = isOnline
        ? 'bg-emerald-500'
        : isConnecting
            ? 'bg-amber-500 animate-pulse'
            : isError
                ? 'bg-red-500 animate-pulse'
                : 'bg-red-500';

    // Status icon for the tooltip trigger
    const StatusIcon = isOnline ? Wifi : isConnecting ? Loader2 : isError ? AlertTriangle : WifiOff;

    // Status label in the footer
    const statusLabel = network.status === 'RECONNECTING' ? 'RECONN' : network.status;

    return (
        <div className="shrink-0 h-5 bg-card border-t border-border flex items-center justify-between px-3 text-[9px] text-muted-foreground font-mono select-none z-50">
            <div className="flex items-center space-x-3">
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center space-x-1.5 cursor-default">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                                <StatusIcon size={9} className={isConnecting ? 'animate-spin' : ''} />
                                <span>ALEPH: {statusLabel}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs p-0">
                            <div className="bg-popover border border-border rounded-md shadow-lg text-xs font-mono min-w-[220px]">
                                {/* Header */}
                                <div className={`px-3 py-1.5 border-b border-border flex items-center gap-2 ${
                                    isOnline ? 'text-emerald-400' :
                                    isError ? 'text-red-400' :
                                    isConnecting ? 'text-amber-400' :
                                    'text-muted-foreground'
                                }`}>
                                    <StatusIcon size={12} className={isConnecting ? 'animate-spin' : ''} />
                                    <span className="font-semibold">AlephNet — {network.status}</span>
                                </div>

                                {/* Details */}
                                <div className="px-3 py-2 space-y-1 text-[10px]">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Node ID</span>
                                        <span className="text-foreground">{network.nodeId || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Peers</span>
                                        <span className="text-foreground">{network.peers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Latency</span>
                                        <span className="text-foreground">{network.latency}ms</span>
                                    </div>
                                    {network.tier && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tier</span>
                                            <span className="text-foreground">{network.tier}</span>
                                        </div>
                                    )}
                                    {network.version && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Version</span>
                                            <span className="text-foreground">{network.version}</span>
                                        </div>
                                    )}
                                    {network.dsnStatus && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">DSN</span>
                                            <span className="text-foreground">{network.dsnStatus}</span>
                                        </div>
                                    )}
                                    {network.connectedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Connected</span>
                                            <span className="text-foreground">
                                                {new Date(network.connectedAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )}
                                    {uptime !== null && isOnline && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Uptime</span>
                                            <span className="text-foreground">{formatUptime(uptime)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Error section */}
                                {network.error && (
                                    <div className="px-3 py-2 border-t border-border bg-red-500/10">
                                        <div className="flex items-center gap-1.5 text-red-400 mb-1">
                                            <AlertTriangle size={10} />
                                            <span className="font-semibold text-[10px]">Error</span>
                                        </div>
                                        <p className="text-red-300 text-[10px] leading-tight break-words">
                                            {network.error}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
                    onClick={() => setLayoutAction({ type: 'open', component: 'bottom-panel-terminal', name: 'Terminal', icon: 'terminal' })}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    title="Open Terminal"
                 >
                    <Terminal size={10} />
                    <span>TERM</span>
                 </button>

                 <span>v0.1.0</span>
            </div>
        </div>
    );
};
