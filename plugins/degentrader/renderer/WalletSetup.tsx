
import React, { useState, useEffect } from 'react';

export const WalletSetup = ({ context }: { context: any }) => {
    const [wallets, setWallets] = useState<any>({});
    const [chain, setChain] = useState('ETH');
    const [privateKey, setPrivateKey] = useState('');
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchWallets = async () => {
        const result = await context.ipc.invoke('degentrader:get-wallets');
        setWallets(result);
    };

    useEffect(() => {
        fetchWallets();
    }, []);

    const handleImport = async () => {
        if (!privateKey || !label) return;
        setLoading(true);
        setMessage('');

        try {
            const result = await context.ipc.invoke('degentrader:import-wallet', {
                chain,
                privateKey,
                label
            });

            if (result.success) {
                setMessage(`Wallet imported: ${result.address}`);
                setPrivateKey('');
                setLabel('');
                fetchWallets();
            } else {
                setMessage(`Error: ${result.error}`);
            }
        } catch (err: any) {
            setMessage(`Error: ${err.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h2 className="text-xl font-bold mb-4">Import Wallet</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Chain</label>
                        <select 
                            value={chain} 
                            onChange={(e) => setChain(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                        >
                            <option value="ETH">Ethereum</option>
                            <option value="SOL">Solana</option>
                            <option value="BASE">Base</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Label</label>
                        <input 
                            type="text" 
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="My Main Wallet"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Private Key</label>
                        <input 
                            type="password" 
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="0x..."
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                        />
                    </div>
                    <button 
                        onClick={handleImport}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
                    >
                        {loading ? 'Importing...' : 'Import Wallet'}
                    </button>
                    {message && (
                        <div className={`p-2 rounded text-sm ${message.startsWith('Error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h2 className="text-xl font-bold mb-4">Your Wallets</h2>
                {Object.entries(wallets).map(([chainName, chainWallets]: [string, any]) => (
                    <div key={chainName} className="mb-4">
                        <h3 className="text-sm font-bold text-gray-400 mb-2">{chainName}</h3>
                        <div className="space-y-2">
                            {chainWallets.length === 0 ? (
                                <div className="text-gray-500 text-sm italic">No wallets added</div>
                            ) : (
                                chainWallets.map((w: any) => (
                                    <div key={w.address} className="bg-black/20 p-3 rounded flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{w.label}</div>
                                            <div className="text-xs text-gray-400 font-mono">{w.address.substring(0, 6)}...{w.address.substring(w.address.length - 4)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
