import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BrainCircuit, Zap, Activity, Radar } from 'lucide-react';
import { FreeEnergyGraph } from '../visualizations/FreeEnergyGraph';
import { SMFRadarChart } from '../visualizations/SMFRadarChart';

export const CortexPanel: React.FC = () => {
    const { agent, smf } = useAppStore();

    return (
        <div className="space-y-6 p-4">
            {/* Agent State Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${agent.state === 'Idle' ? 'bg-zinc-800 text-zinc-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        <BrainCircuit size={18} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Current State</h4>
                        <span className="text-sm font-medium text-zinc-100">{agent.state}</span>
                    </div>
                </div>
                <div className="text-right">
                    <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Uptime</h4>
                    <span className="text-xs font-mono text-zinc-300">00:42:15</span>
                </div>
            </div>

            {/* Free Energy Graph */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center space-x-2 mb-3">
                    <Activity size={14} className="text-emerald-400" />
                    <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">FREE ENERGY MINIMIZATION</h4>
                </div>
                <FreeEnergyGraph 
                    currentFreeEnergy={agent.freeEnergy}
                    agentState={agent.state}
                    height={120}
                    maxPoints={40}
                />
            </div>

            {/* SMF Radar Chart */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center space-x-2 mb-3">
                    <Radar size={14} className="text-blue-400" />
                    <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">SEDENION MEMORY FIELD (SMF)</h4>
                </div>
                <SMFRadarChart 
                    smf={smf}
                    size="md"
                    showLabels={true}
                    color="#3b82f6"
                    fillOpacity={0.3}
                />
            </div>

            {/* Thought Stream */}
            <div className="bg-black rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[180px]">
                <div className="bg-zinc-900/80 px-3 py-2 border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Zap size={12} className="text-yellow-500" />
                        <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">COGNITIVE STREAM</h4>
                    </div>
                    <span className="text-[9px] text-zinc-600 font-mono">LIVE</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[10px]">
                    <div className="flex space-x-2 opacity-50">
                        <span className="text-zinc-600">[10:42:01]</span>
                        <span className="text-blue-400">PERCEIVE</span>
                        <span className="text-zinc-400">User input detected via IPC channel 'message'.</span>
                    </div>
                    <div className="flex space-x-2 opacity-75">
                        <span className="text-zinc-600">[10:42:02]</span>
                        <span className="text-purple-400">ANALYZE</span>
                        <span className="text-zinc-400">Intent analysis: Requesting debug tools. Confidence: 0.98.</span>
                    </div>
                    <div className="flex space-x-2">
                        <span className="text-zinc-600">[10:42:03]</span>
                        <span className="text-yellow-400">DECIDE</span>
                        <span className="text-zinc-300">Action selected: <span className="text-white bg-zinc-800 px-1 rounded">OpenInspector()</span></span>
                    </div>
                    <div className="flex space-x-2 border-l-2 border-green-500 pl-2 mt-2">
                        <span className="text-green-500">&gt;&gt;</span>
                        <span className="text-green-400">Executing state transition: IDLE -&gt; ACTING</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-3">
                <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 px-3 rounded-lg border border-zinc-700 transition-colors flex items-center justify-center space-x-2">
                    <Zap size={12} />
                    <span>Inject Stimuli</span>
                </button>
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs py-2 px-3 rounded-lg border border-red-500/30 transition-colors flex items-center justify-center space-x-2">
                    <Activity size={12} />
                    <span>Force Sleep</span>
                </button>
            </div>
        </div>
    );
};
