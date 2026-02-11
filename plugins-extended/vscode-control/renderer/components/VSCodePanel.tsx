import React, { useState, useEffect } from 'react';
import { RendererPluginContext } from '../../../../src/shared/plugin-types';
import { PairingView } from './PairingView';
import { LogView } from './LogView';
import { StatusBadge } from './StatusBadge';

interface VSCodePanelProps {
    context: RendererPluginContext;
}

export const VSCodePanel: React.FC<VSCodePanelProps> = ({ context }) => {
    const [activeTab, setActiveTab] = useState<'pairing' | 'logs'>('pairing');
    const [status, setStatus] = useState({
        paired: false,
        connected: false,
        authenticated: false,
        host: '127.0.0.1',
        port: 19876
    });

    const refreshStatus = async () => {
        try {
            const newStatus = await context.ipc.invoke('vscode-control:status', {});
            setStatus(newStatus);
        } catch (e) {
            console.error('Failed to fetch status:', e);
        }
    };

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg leading-tight">VS Code Control</h2>
                        <div className="text-xs text-gray-400 font-mono">
                            {status.host}:{status.port}
                        </div>
                    </div>
                </div>
                <StatusBadge 
                    connected={status.connected} 
                    authenticated={status.authenticated} 
                    paired={status.paired} 
                />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('pairing')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'pairing'
                            ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                    Pairing
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'logs'
                            ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                    Logs
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'pairing' ? (
                    <PairingView 
                        context={context} 
                        status={status} 
                        onRefreshStatus={refreshStatus} 
                    />
                ) : (
                    <LogView context={context} />
                )}
            </div>
        </div>
    );
};
