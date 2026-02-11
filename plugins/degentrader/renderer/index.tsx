import React from 'react';

const TradeDashboard = ({ context }: { context: any }) => {
  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Degen Trader</h1>
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl mb-2">Portfolio Overview</h2>
        <div className="text-3xl font-mono text-green-400">$12,450.00</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <button className="bg-green-600 p-3 rounded text-center font-bold hover:bg-green-500">BUY</button>
        <button className="bg-red-600 p-3 rounded text-center font-bold hover:bg-red-500">SELL</button>
      </div>
    </div>
  );
};

export const activate = (context: any) => {
  console.log('[DegenTrader] Renderer Activated');
  
  context.registerComponent('sidebar:view:degentrader', {
    id: 'degentrader-dashboard',
    component: () => <TradeDashboard context={context} />
  });
};
