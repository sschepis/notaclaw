
import React, { useState, useEffect } from 'react';

export const Dashboard = ({ context }: { context: any }) => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({ minScore: 0.7, maxOpenPositions: 5, allocationPct: 0.1 });

    const fetchStatus = async () => {
        const result = await context.ipc.invoke('degentrader:get-status');
        setStatus(result);
        // Only set config on first load or if you want to sync, but for now local state drives the form
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleEngine = async () => {
        setLoading(true);
        if (status?.active) {
            await context.ipc.invoke('degentrader:stop');
        } else {
            await context.ipc.invoke('degentrader:start');
        }
        await fetchStatus();
        setLoading(false);
    };

    const toggleStrategy = async (name: string, enabled: boolean) => {
        await context.ipc.invoke('degentrader:toggle-strategy', { name, enabled });
        fetchStatus();
    };

    const updateConfig = async () => {
        await context.ipc.invoke('degentrader:update-config', config);
        alert('Configuration updated!');
    };

    if (!status) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Status</h2>
                    <button
                        onClick={toggleEngine}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg font-bold ${
                            status.active 
                                ? 'bg-red-500 hover:bg-red-600' 
                                : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                        {status.active ? 'STOP TRADING' : 'START TRADING'}
                    </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-black/20 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm">Total Trades</div>
                        <div className="text-2xl font-mono">{status.performance.totalTrades}</div>
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm">Win Rate</div>
                        <div className="text-2xl font-mono">
                            {status.performance.totalTrades > 0 
                                ? ((status.performance.profitableTrades / status.performance.totalTrades) * 100).toFixed(1) 
                                : 0}%
                        </div>
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm">Profit (Paper)</div>
                        <div className={`text-2xl font-mono ${status.performance.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {status.performance.totalProfit.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4">Strategies</h2>
                    <div className="space-y-2">
                        {status.strategies.map((s: any) => (
                            <div key={s.name} className="flex justify-between items-center bg-black/20 p-3 rounded">
                                <div>
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-gray-400">{s.description}</div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-sm text-gray-400">Weight: {s.weight.toFixed(2)}</div>
                                    <button
                                        onClick={() => toggleStrategy(s.name, !s.enabled)}
                                        className={`w-10 h-6 rounded-full transition-colors relative ${s.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${s.enabled ? 'left-5' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4">Configuration</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Min Confidence Score (0.0 - 1.0)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={config.minScore}
                                onChange={(e) => setConfig({ ...config, minScore: parseFloat(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Max Open Positions</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={config.maxOpenPositions}
                                onChange={(e) => setConfig({ ...config, maxOpenPositions: parseInt(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Allocation per Trade (0.0 - 1.0)</label>
                            <input
                                type="number"
                                step="0.05"
                                min="0.01"
                                max="1.0"
                                value={config.allocationPct}
                                onChange={(e) => setConfig({ ...config, allocationPct: parseFloat(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>
                        <button
                            onClick={updateConfig}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
                        >
                            Update Config
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h2 className="text-xl font-bold mb-4">Trade History</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 border-b border-white/10">
                                <th className="p-2">Time</th>
                                <th className="p-2">Symbol</th>
                                <th className="p-2">Chain</th>
                                <th className="p-2">Entry</th>
                                <th className="p-2">Exit</th>
                                <th className="p-2">PnL</th>
                                <th className="p-2">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {status.history && status.history.length > 0 ? (
                                status.history.map((t: any) => (
                                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-2">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                        <td className="p-2 font-bold">{t.symbol}</td>
                                        <td className="p-2">{t.chain}</td>
                                        <td className="p-2">${t.entryPrice.toFixed(4)}</td>
                                        <td className="p-2">${t.exitPrice.toFixed(4)}</td>
                                        <td className={`p-2 font-bold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {(t.pnl * 100).toFixed(2)}%
                                        </td>
                                        <td className="p-2 text-gray-400">{t.reason}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center text-gray-500">No closed trades yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
