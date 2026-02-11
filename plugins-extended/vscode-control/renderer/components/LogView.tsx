import React, { useState, useEffect, useRef } from 'react';
import { RendererPluginContext } from '../../../../src/shared/plugin-types';

interface LogEntry {
    id: string;
    timestamp: number;
    type: 'connection' | 'auth' | 'tool-call' | 'tool-result' | 'error' | 'notification';
    message: string;
    details?: Record<string, unknown>;
}

interface LogViewProps {
    context: RendererPluginContext;
}

export const LogView: React.FC<LogViewProps> = ({ context }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Subscribe to logs
        const handleLog = (entry: LogEntry) => {
            setLogs(prev => [...prev, entry].slice(-500)); // Keep last 500 logs
        };

        context.ipc.on('vscode-control:log', handleLog);

        return () => {
            // Cleanup listener if possible (depends on IPC implementation)
        };
    }, []);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.type === filter;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'connection': return '🔌';
            case 'auth': return '🔑';
            case 'tool-call': return '🔧';
            case 'tool-result': return '✅';
            case 'error': return '❌';
            case 'notification': return '🔔';
            default: return '•';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'connection': return 'text-cyan-400';
            case 'auth': return 'text-yellow-400';
            case 'tool-call': return 'text-blue-400';
            case 'tool-result': return 'text-green-400';
            case 'error': return 'text-red-400';
            case 'notification': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b border-gray-700 bg-gray-800/50">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-xs text-white rounded px-2 py-1 outline-none focus:border-blue-500"
                >
                    <option value="all">All Events</option>
                    <option value="connection">Connection</option>
                    <option value="auth">Auth</option>
                    <option value="tool-call">Tool Calls</option>
                    <option value="error">Errors</option>
                </select>

                <div className="flex-1" />

                <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2 py-1 text-xs rounded border ${
                        autoScroll
                            ? 'bg-blue-900/30 border-blue-700 text-blue-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                >
                    Auto-scroll
                </button>

                <button
                    onClick={() => setLogs([])}
                    className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700"
                >
                    Clear
                </button>
            </div>

            {/* Log List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-1 bg-gray-900"
            >
                {filteredLogs.length === 0 && (
                    <div className="text-center text-gray-500 py-8 italic">
                        No logs to display
                    </div>
                )}
                
                {filteredLogs.map((log) => (
                    <div key={log.id} className="group hover:bg-white/5 p-1 rounded">
                        <div className="flex items-start gap-2">
                            <span className="text-gray-500 shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="shrink-0 w-4 text-center">{getIcon(log.type)}</span>
                            <div className="flex-1 min-w-0">
                                <span className={`${getTypeColor(log.type)} font-medium mr-2`}>
                                    {log.type}
                                </span>
                                <span className="text-gray-300 break-words">{log.message}</span>
                                
                                {log.details && (
                                    <pre className="mt-1 text-gray-500 overflow-x-auto text-[10px] hidden group-hover:block">
                                        {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
