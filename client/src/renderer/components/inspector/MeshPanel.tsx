import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { Share2, Activity, Database } from 'lucide-react';

export const MeshPanel: React.FC = () => {
    const { smf, network } = useAppStore();

    const chartData = [
        { subject: 'Cog', A: smf[0] || 0, fullMark: 100 },
        { subject: 'Per', A: smf[1] || 0, fullMark: 100 },
        { subject: 'Tem', A: smf[2] || 0, fullMark: 100 },
        { subject: 'Met', A: smf[3] || 0, fullMark: 100 },
        { subject: 'Soc', A: smf[4] || 0, fullMark: 100 },
        { subject: 'Spa', A: smf[5] || 0, fullMark: 100 },
    ];

    return (
        <div className="space-y-6 p-4">
            {/* SMF Visualization */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <Share2 size={14} className="text-blue-400" />
                        <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">SEMANTIC FIELD</h4>
                    </div>
                </div>
                
                <div className="h-[200px] w-full -ml-2 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                            <PolarGrid stroke="#27272a" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar 
                                name="SMF" 
                                dataKey="A" 
                                stroke="#3b82f6" 
                                strokeWidth={2} 
                                fill="#3b82f6" 
                                fillOpacity={0.2} 
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-0"></div>
            </div>

            {/* Peer List */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Activity size={14} className="text-emerald-400" />
                        <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">NETWORK PEERS</h4>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">{network.peers} Connected</span>
                </div>

                <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-800/50">
                        <span className="col-span-2">Node ID</span>
                        <span className="text-right">Resonance</span>
                    </div>
                    
                    {/* Rows */}
                    <div className="space-y-1">
                        {[
                            { id: '8f7a...2b1c', res: 0.92, color: 'text-purple-400' },
                            { id: '3d4e...9a0f', res: 0.78, color: 'text-blue-400' },
                            { id: '1c2d...5e6f', res: 0.45, color: 'text-zinc-400' },
                        ].map((peer, i) => (
                            <div key={i} className="grid grid-cols-3 text-[10px] py-1.5 hover:bg-zinc-800/50 rounded transition-colors cursor-pointer group">
                                <span className="col-span-2 font-mono text-zinc-400 group-hover:text-zinc-200">{peer.id}</span>
                                <span className={`text-right font-medium ${peer.color}`}>{peer.res.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Bridge Monitor */}
             <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center space-x-2 mb-3">
                    <Database size={14} className="text-amber-400" />
                    <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">BRIDGE MONITOR</h4>
                </div>
                <div className="text-[10px] font-mono space-y-2 text-zinc-500">
                    <div className="flex space-x-2">
                        <span className="text-emerald-500">PUT</span>
                        <span className="truncate">nodes/local/status {'->'} "ONLINE"</span>
                    </div>
                    <div className="flex space-x-2">
                        <span className="text-blue-500">GET</span>
                        <span className="truncate">messages/broadcast/latest</span>
                    </div>
                    <div className="flex space-x-2 opacity-50">
                        <span className="text-zinc-600">ACK</span>
                        <span className="truncate">Confirming write op #4029</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
