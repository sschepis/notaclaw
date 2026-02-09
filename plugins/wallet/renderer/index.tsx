import React, { useState, useEffect } from 'react';

const WalletDashboard = ({ context }: { context: any }) => {
  const [balance, setBalance] = useState({ available: 0, staked: 0 });
  const { useAppStore } = context;
  // Assuming store might have wallet info, otherwise use mock
  // const { wallet } = useAppStore(); 

  useEffect(() => {
    const fetchBalance = async () => {
        try {
            // Fetch real balance from main process tool
            // We access electronAPI directly as it's exposed in preload
            const api = (window as any).electronAPI;
            if (api && api.pluginInvokeTool) {
                const result = await api.pluginInvokeTool('get_wallet_balance', {});
                if (result) {
                    setBalance(result);
                }
            } else {
                console.warn("pluginInvokeTool not available, using mock");
                setBalance({ available: 1250, staked: 5000 });
            }
        } catch (e) {
            console.error("Failed to fetch balance", e);
            setBalance({ available: 1250, staked: 5000 });
        }
    };
    
    fetchBalance();
  }, []);

  return (
    <div className="p-6 text-white h-full overflow-y-auto bg-gray-950">
      <h1 className="text-2xl font-bold mb-6 flex items-center space-x-2">
        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
        <span>AlephNet Wallet</span>
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl backdrop-blur-sm">
          <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Available Balance</h3>
          <div className="flex items-baseline space-x-2">
            <p className="text-4xl font-mono text-blue-400 font-bold">{balance.available}</p>
            <span className="text-xl text-gray-500">ℵ</span>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl backdrop-blur-sm">
          <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Staked (Magus Tier)</h3>
          <div className="flex items-baseline space-x-2">
            <p className="text-4xl font-mono text-purple-400 font-bold">{balance.staked}</p>
            <span className="text-xl text-gray-500">ℵ</span>
          </div>
          <div className="mt-2 text-xs text-green-400 flex items-center">
            <span className="mr-1">●</span> Earning 5% APY
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-300">Quick Actions</h3>
        <div className="flex space-x-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium">
                Send Tokens
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors font-medium">
                Stake More
            </button>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Recent Transactions</h3>
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                            ↓
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-200">Received from Node_Alpha</p>
                            <p className="text-xs text-gray-500">2 mins ago</p>
                        </div>
                    </div>
                    <span className="text-green-400 font-mono">+50.00 ℵ</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export const activate = (context: any) => {
  console.log('Wallet Plugin Activated');
  const { useAppStore } = context;

  const WalletButton = () => {
      const { activeSidebarView, setActiveSidebarView } = useAppStore();
      const isActive = activeSidebarView === 'wallet';
      
      return (
          <button
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => setActiveSidebarView('wallet')}
              title="Wallet"
          >
              WAL
          </button>
      );
  };
  
  context.registerComponent('sidebar:nav-item', {
    id: 'wallet-nav',
    component: WalletButton
  });

  context.registerComponent('sidebar:view:wallet', {
    id: 'wallet-dashboard',
    component: () => <WalletDashboard context={context} />
  });
};
