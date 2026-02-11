import React, { useState, useEffect } from 'react';
import { RendererPluginContext } from '../../../../src/shared/plugin-types';

interface PairingViewProps {
    context: RendererPluginContext;
    status: any;
    onRefreshStatus: () => void;
}

export const PairingView: React.FC<PairingViewProps> = ({ context, status, onRefreshStatus }) => {
    const [pairingCode, setPairingCode] = useState('');
    const [isPairing, setIsPairing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState({ host: '127.0.0.1', port: 19876 });

    useEffect(() => {
        // Load initial config
        context.ipc.invoke('vscode-control:config', {}).then((cfg: any) => {
            if (cfg) setConfig(cfg);
        });
    }, []);

    const handlePair = async () => {
        if (pairingCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setIsPairing(true);
        setError(null);

        try {
            const result = await context.ipc.invoke('vscode-control:pair', { code: pairingCode });
            if (result.success) {
                setPairingCode('');
                onRefreshStatus();
            } else {
                setError(result.message || 'Pairing failed');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Pairing failed');
        } finally {
            setIsPairing(false);
        }
    };

    const handleUnpair = async () => {
        if (confirm('Are you sure you want to unpair? You will need to re-pair to connect again.')) {
            await context.ipc.invoke('vscode-control:unpair', {});
            onRefreshStatus();
        }
    };

    const handleConfigChange = (key: string, value: string | number) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        context.ipc.invoke('vscode-control:config', newConfig);
    };

    if (status.paired) {
        return (
            <div className="flex flex-col gap-4 p-4">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-lg font-medium text-white mb-2">Paired Device</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Device ID:</span>
                            <span className="text-gray-200 font-mono text-sm">{status.deviceId || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Paired At:</span>
                            <span className="text-gray-200 text-sm">
                                {status.pairedAt ? new Date(status.pairedAt).toLocaleString() : 'Unknown'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Host:</span>
                            <span className="text-gray-200 font-mono text-sm">{config.host}:{config.port}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleUnpair}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                        Unpair Device
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4">
            {/* Connection Config */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Connection Settings</h3>
                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Host</label>
                        <input
                            type="text"
                            value={config.host}
                            onChange={(e) => handleConfigChange('host', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Port</label>
                        <input
                            type="number"
                            value={config.port}
                            onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Pairing Input */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Pairing</h3>
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 space-y-4">
                    <p className="text-sm text-gray-300">
                        Enter the 6-digit code displayed in VS Code to pair this agent.
                    </p>
                    
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={pairingCode}
                            onChange={(e) => setPairingCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-center text-xl tracking-widest font-mono text-white focus:border-blue-500 outline-none placeholder-gray-600"
                        />
                        <button
                            onClick={handlePair}
                            disabled={isPairing || pairingCode.length !== 6}
                            className={`px-6 py-2 rounded font-medium transition-colors ${
                                isPairing || pairingCode.length !== 6
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {isPairing ? 'Pairing...' : 'Pair'}
                        </button>
                    </div>

                    {error && (
                        <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/50 p-2 rounded">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">How to Connect</h3>
                <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1 ml-1">
                    <li>Install <strong>Aleph Agent Control</strong> in VS Code</li>
                    <li>Open Command Palette (<code className="bg-gray-800 px-1 rounded">Cmd+Shift+P</code>)</li>
                    <li>Run <code className="text-blue-400">Pair a Device</code></li>
                    <li>Enter the displayed code above</li>
                </ol>
            </div>
        </div>
    );
};
