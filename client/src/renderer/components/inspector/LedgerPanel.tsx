import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAppStore } from '../../store/useAppStore';

export const LedgerPanel: React.FC = () => {
    const { wallet } = useAppStore();

    const handleStake = () => {
        window.electronAPI.stakeTokens(50).catch(console.error);
    };

    return (
        <div className="space-y-4 p-2">
            <Card className="bg-gray-900 border-gray-700/50 shadow-none">
                <CardContent className="pt-4 pb-4 px-4">
                    <h5 className="text-lg font-bold tracking-tight text-white mb-0.5">
                        {wallet.balance.toLocaleString()} <span className="text-xs font-normal text-gray-500">ALEPH</span>
                    </h5>
                    <p className="font-normal text-gray-500 text-xs">
                        Available Balance
                    </p>
                    <div className="border-t border-gray-800 my-2 pt-2">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">Staked</span>
                            <span className="text-yellow-500/90 font-mono text-xs">{wallet.staked.toLocaleString()}</span>
                        </div>
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white mt-1" onClick={handleStake}>
                        Stake 50 ALEPH
                    </Button>
                </CardContent>
            </Card>

            {/* Economics Stats */}
            <div className="bg-gray-900 rounded-lg p-3 border border-gray-700/50">
                <h4 className="text-[10px] font-uppercase text-gray-500 font-bold mb-2 tracking-wider">ECONOMICS</h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Gas Price</span>
                        <span className="text-gray-200">0.0001 ALEPH/op</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Daily Burn</span>
                        <span className="text-red-400">12.5 ALEPH</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Yield APY</span>
                        <span className="text-green-400">4.2%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
