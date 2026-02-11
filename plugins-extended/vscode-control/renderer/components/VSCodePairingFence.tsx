import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * VSCodePairingFence — Inline pairing form rendered from a ```vscode-pairing code fence.
 * 
 * Accepts a JSON config in the fence content:
 * ```vscode-pairing
 * { "host": "127.0.0.1", "port": 19876 }
 * ```
 * 
 * Or can be empty for defaults:
 * ```vscode-pairing
 * ```
 */

interface PairingConfig {
    host?: string;
    port?: number;
    title?: string;
}

interface ConnectionStatus {
    connected: boolean;
    authenticated: boolean;
    paired: boolean;
    host: string;
    port: number;
    deviceId?: string;
    pairedAt?: string;
}

// Mini SVG icons
const Icons = {
    VSCode: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.583 2.291l-5.52 5.052L7.26 3.64l-4.26 2.1v12.52l4.26 2.1 4.803-3.703 5.52 5.052 4.417-2.146V4.437l-4.417-2.146zM7.26 14.58V9.42l3.31 2.58-3.31 2.58zm10.323 2.24L13.6 12l3.983-4.82v9.64z" />
        </svg>
    ),
    Link: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    ),
    Unlink: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
    Check: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    Refresh: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    ),
    Settings: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Shield: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
};

const StatusDot: React.FC<{ color: string; pulse?: boolean }> = ({ color, pulse }) => (
    <span className={`inline-block w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VSCodePairingFence: React.FC<{ block: any }> = ({ block }) => {
    // Parse config from fence content
    const config: PairingConfig = React.useMemo(() => {
        try {
            const raw = (block.content || '').trim();
            if (raw && raw.startsWith('{')) {
                return JSON.parse(raw);
            }
        } catch { /* ignore */ }
        return {};
    }, [block.content]);

    const [host, setHost] = useState(config.host || '127.0.0.1');
    const [port, setPort] = useState(config.port || 19876);
    const [pairingCode, setPairingCode] = useState('');
    const [status, setStatus] = useState<ConnectionStatus | null>(null);
    const [isPairing, setIsPairing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [step, setStep] = useState<'connect' | 'pair' | 'done'>('connect');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const codeInputRef = useRef<HTMLInputElement>(null);

    // Poll status
    const refreshStatus = useCallback(async () => {
        try {
            const result = await (window as any).electronAPI?.ipc?.invoke('vscode-control:status', {});
            if (result) {
                setStatus(result);
                // Auto-advance steps
                if (result.paired && result.authenticated) {
                    setStep('done');
                } else if (result.connected) {
                    if (step === 'connect') setStep('pair');
                }
            }
        } catch {
            // IPC may not be available
        }
    }, [step]);

    useEffect(() => {
        refreshStatus();
        pollRef.current = setInterval(refreshStatus, 3000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [refreshStatus]);

    // Apply config changes
    const applyConfig = useCallback(async () => {
        try {
            await (window as any).electronAPI?.ipc?.invoke('vscode-control:config', { host, port });
            setError(null);
            setSuccessMsg('Connection settings updated');
            setTimeout(() => setSuccessMsg(null), 3000);
            refreshStatus();
        } catch (e: any) {
            setError(e?.message || 'Failed to update config');
        }
    }, [host, port, refreshStatus]);

    // Pair
    const handlePair = useCallback(async () => {
        if (pairingCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }
        setIsPairing(true);
        setError(null);
        try {
            const result = await (window as any).electronAPI?.ipc?.invoke('vscode-control:pair', {
                code: pairingCode,
            });
            if (result?.success) {
                setPairingCode('');
                setSuccessMsg(result.message || 'Paired successfully!');
                setStep('done');
                refreshStatus();
            } else {
                setError(result?.message || 'Pairing failed');
            }
        } catch (e: any) {
            setError(e?.message || 'Pairing failed');
        } finally {
            setIsPairing(false);
        }
    }, [pairingCode, refreshStatus]);

    // Unpair
    const handleUnpair = useCallback(async () => {
        try {
            await (window as any).electronAPI?.ipc?.invoke('vscode-control:unpair', {});
            setStep('pair');
            setSuccessMsg(null);
            refreshStatus();
        } catch (e: any) {
            setError(e?.message || 'Unpair failed');
        }
    }, [refreshStatus]);

    // Focus code input when step changes to pair
    useEffect(() => {
        if (step === 'pair' && codeInputRef.current) {
            codeInputRef.current.focus();
        }
    }, [step]);

    const statusColor = status?.authenticated ? 'bg-green-500' :
        status?.connected ? 'bg-yellow-500' :
            'bg-red-500';

    const statusLabel = status?.authenticated ? 'Connected & Authenticated' :
        status?.connected ? 'Connected (not authenticated)' :
            'Disconnected';

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-blue-500/30 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 shadow-lg shadow-blue-500/5">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border-b border-blue-500/20">
                <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                    <Icons.VSCode />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white leading-tight">
                        {config.title || 'VS Code Pairing'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <StatusDot color={statusColor} pulse={!!status?.connected} />
                        <span className="text-[11px] text-gray-400">{statusLabel}</span>
                    </div>
                </div>
                <button
                    onClick={refreshStatus}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Refresh status"
                >
                    <Icons.Refresh />
                </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                {/* Step indicator */}
                <div className="flex items-center gap-2">
                    {['connect', 'pair', 'done'].map((s, i) => {
                        const isActive = step === s;
                        const isDone = ['connect', 'pair', 'done'].indexOf(step) > i;
                        return (
                            <React.Fragment key={s}>
                                {i > 0 && (
                                    <div className={`flex-1 h-px ${isDone || isActive ? 'bg-blue-500/50' : 'bg-gray-700'}`} />
                                )}
                                <div
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                                        isActive ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                            isDone ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                'bg-gray-800/50 text-gray-500 border border-gray-700/50'
                                    }`}
                                    onClick={() => {
                                        if (isDone || isActive) setStep(s as any);
                                    }}
                                >
                                    {isDone ? <Icons.Check /> : <span className="w-4 text-center">{i + 1}</span>}
                                    <span>{s === 'connect' ? 'Connect' : s === 'pair' ? 'Pair' : 'Ready'}</span>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Step: Connect */}
                {step === 'connect' && (
                    <div className="space-y-3">
                        <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                            <div className="flex items-center gap-2 mb-3">
                                <Icons.Settings />
                                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Connection Settings</span>
                            </div>
                            <div className="grid grid-cols-[1fr_100px] gap-2">
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Host</label>
                                    <input
                                        type="text"
                                        value={host}
                                        onChange={(e) => setHost(e.target.value)}
                                        className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
                                        placeholder="127.0.0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Port</label>
                                    <input
                                        type="number"
                                        value={port}
                                        onChange={(e) => setPort(parseInt(e.target.value) || 19876)}
                                        className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
                                        placeholder="19876"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    await applyConfig();
                                    if (status?.connected) {
                                        setStep('pair');
                                    }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <Icons.Link />
                                <span>Connect</span>
                            </button>
                            <button
                                onClick={() => setStep('pair')}
                                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-gray-600/50"
                            >
                                Skip →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Pair */}
                {step === 'pair' && (
                    <div className="space-y-3">
                        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                            <div className="flex items-center gap-2 mb-3">
                                <Icons.Shield />
                                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Device Pairing</span>
                            </div>

                            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                Open VS Code → <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] font-mono">Cmd+Shift+P</kbd> → <span className="text-blue-400">Pair a Device</span> → enter the code below:
                            </p>

                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <input
                                        ref={codeInputRef}
                                        type="text"
                                        value={pairingCode}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                            setPairingCode(val);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && pairingCode.length === 6) {
                                                handlePair();
                                            }
                                        }}
                                        placeholder="000000"
                                        maxLength={6}
                                        className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder-gray-600"
                                    />
                                    {pairingCode.length === 6 && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <StatusDot color="bg-green-500" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handlePair}
                                    disabled={isPairing || pairingCode.length !== 6}
                                    className={`px-5 py-3 rounded-lg font-medium text-sm transition-all shadow-lg ${
                                        isPairing || pairingCode.length !== 6
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
                                    }`}
                                >
                                    {isPairing ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                                <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                                            </svg>
                                            Pairing…
                                        </span>
                                    ) : 'Pair'}
                                </button>
                            </div>
                        </div>

                        {/* Advanced toggle */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                        >
                            <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Advanced settings
                        </button>

                        {showAdvanced && (
                            <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 space-y-2">
                                <div className="grid grid-cols-[1fr_100px] gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Host</label>
                                        <input
                                            type="text"
                                            value={host}
                                            onChange={(e) => setHost(e.target.value)}
                                            className="w-full bg-gray-900/60 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Port</label>
                                        <input
                                            type="number"
                                            value={port}
                                            onChange={(e) => setPort(parseInt(e.target.value) || 19876)}
                                            className="w-full bg-gray-900/60 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={applyConfig}
                                    className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Done */}
                {step === 'done' && (
                    <div className="space-y-3">
                        <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-400 mt-0.5">
                                    <Icons.Check />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-green-300 mb-1">Paired & Connected</h4>
                                    <div className="space-y-1.5 text-[11px]">
                                        {status?.deviceId && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Device ID</span>
                                                <span className="text-gray-300 font-mono truncate ml-2">{status.deviceId}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Endpoint</span>
                                            <span className="text-gray-300 font-mono">{status?.host || host}:{status?.port || port}</span>
                                        </div>
                                        {status?.pairedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Paired</span>
                                                <span className="text-gray-300">{new Date(status.pairedAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleUnpair}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20"
                            >
                                <Icons.Unlink />
                                Unpair
                            </button>
                            <button
                                onClick={() => setStep('connect')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium rounded-lg transition-colors border border-gray-700/50"
                            >
                                <Icons.Settings />
                                Settings
                            </button>
                        </div>
                    </div>
                )}

                {/* Error / success messages */}
                {error && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-900/20 border border-red-500/30 rounded-lg text-xs text-red-400">
                        <span className="shrink-0">⚠️</span>
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-300">✕</button>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-center gap-2 p-2.5 bg-green-900/20 border border-green-500/30 rounded-lg text-xs text-green-400">
                        <Icons.Check />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Instructions footer */}
                {step !== 'done' && (
                    <div className="text-[10px] text-gray-600 border-t border-gray-800 pt-3 space-y-1">
                        <p className="font-medium text-gray-500">Quick setup:</p>
                        <ol className="list-decimal list-inside space-y-0.5 ml-1">
                            <li>Install <span className="text-blue-400/80">Aleph Agent Control</span> extension in VS Code</li>
                            <li>Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[9px] font-mono">Cmd+Shift+P</kbd> → run <span className="text-blue-400/80">Pair a Device</span></li>
                            <li>Enter the 6-digit code above</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
};
