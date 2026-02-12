import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';
import { getIpc } from '../ipc';

export const SystemMonitor: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ipc = getIpc();

    const fetchStats = async () => {
        if (!ipc) return;
        try {
            const data = await ipc.invoke('sys:info', {});
            setStats(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    if (!stats) {
        return <div className="p-4 text-gray-500">Loading system stats...</div>;
    }

    const { cpu, memory, os, network } = stats;

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 space-y-4 overflow-y-auto">
            {error && <div className="bg-red-500/20 text-red-400 p-2 rounded text-sm">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CPU Card */}
                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2 text-blue-400">
                        <Cpu size={20} className="mr-2" />
                        <h3 className="font-semibold">CPU</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Model:</span>
                            <span className="text-right">{cpu.manufacturer} {cpu.brand}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Cores:</span>
                            <span>{cpu.physicalCores} Physical / {cpu.cores} Logical</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Speed:</span>
                            <span>{cpu.speed} GHz</span>
                        </div>
                        <div className="mt-2">
                            <div className="text-xs text-gray-400 mb-1">Load</div>
                            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-500" 
                                    style={{ width: `${cpu.load}%` }} 
                                />
                            </div>
                            <div className="text-right text-xs mt-1">{cpu.load.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                {/* Memory Card */}
                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2 text-purple-400">
                        <Activity size={20} className="mr-2" />
                        <h3 className="font-semibold">Memory</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total:</span>
                            <span>{(memory.total / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Used:</span>
                            <span>{(memory.used / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Free:</span>
                            <span>{(memory.free / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                        </div>
                         <div className="mt-2">
                            <div className="text-xs text-gray-400 mb-1">Usage</div>
                            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-purple-500 h-full transition-all duration-500" 
                                    style={{ width: `${(memory.used / memory.total) * 100}%` }} 
                                />
                            </div>
                            <div className="text-right text-xs mt-1">{((memory.used / memory.total) * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                {/* OS Card */}
                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2 text-green-400">
                        <HardDrive size={20} className="mr-2" />
                        <h3 className="font-semibold">System</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Platform:</span>
                            <span className="capitalize">{os.platform}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Distro:</span>
                            <span>{os.distro}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Release:</span>
                            <span>{os.release}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Hostname:</span>
                            <span>{os.hostname}</span>
                        </div>
                    </div>
                </div>

                {/* Network Card */}
                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2 text-yellow-400">
                        <Wifi size={20} className="mr-2" />
                        <h3 className="font-semibold">Network</h3>
                    </div>
                    <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                        {network.map((iface: any, idx: number) => (
                            <div key={idx} className="border-b border-white/5 pb-2 last:border-0">
                                <div className="font-medium text-gray-300">{iface.iface}</div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">IPv4:</span>
                                    <span>{iface.ip4}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">MAC:</span>
                                    <span>{iface.mac}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
