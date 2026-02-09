import React from 'react';

export interface LogEntry {
    id: string;
    timestamp: number;
    type: 'VISION' | 'ACTION' | 'SYSTEM';
    message: string;
}

export const ActionLog: React.FC<{ logs?: LogEntry[] }> = ({ logs = [] }) => {
    return (
        <div className="bg-gray-900 rounded-lg p-2 text-xs font-mono h-48 overflow-y-auto border border-gray-700">
            {logs.length === 0 ? (
                <div className="text-gray-600 italic text-center mt-4">No actions recorded</div>
            ) : (
                logs.map(log => (
                    <div key={log.id} className="mb-1">
                        <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`ml-2 ${
                            log.type === 'VISION' ? 'text-blue-400' :
                            log.type === 'ACTION' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                            {log.type === 'VISION' ? '👁️' : log.type === 'ACTION' ? '⚡' : 'ℹ️'}
                        </span>
                        <span className="ml-2 text-gray-300">{log.message}</span>
                    </div>
                ))
            )}
        </div>
    );
};
