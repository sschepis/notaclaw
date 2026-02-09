import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Zap, 
  Play, 
  Square, 
  Settings,
  Activity,
  Brain,
  Target,
  Eye,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlephStore } from '../../store/useAlephStore';
import { Button } from '../ui/button';
import { FreeEnergyGraph } from '../visualizations/FreeEnergyGraph';
import { SMFRadarChart } from '../visualizations/SMFRadarChart';
import { AgentStepResult } from '../../../shared/alephnet-types';

interface AgentDetailStageProps {
  agentId: string;
  onBack: () => void;
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

const LifecyclePipeline: React.FC<{ currentState: string }> = ({ currentState }) => {
  const states = ['DORMANT', 'PERCEIVING', 'DECIDING', 'ACTING', 'LEARNING', 'CONSOLIDATING', 'SLEEPING'];
  
  return (
    <div className="flex items-center justify-between w-full px-4 py-6 bg-white/5 rounded-lg border border-white/5 relative overflow-hidden">
      {/* Connector Line */}
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-800 -z-0" />
      
      {states.map((state, i) => {
        const isActive = state === currentState;
        const isPast = states.indexOf(currentState) > i;
        
        return (
          <div key={state} className="relative z-10 flex flex-col items-center gap-2">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.2 : 1,
                borderColor: isActive ? '#3b82f6' : isPast ? '#10b981' : '#374151',
                backgroundColor: isActive ? '#1e3a8a' : isPast ? '#064e3b' : '#111827'
              }}
              className="w-4 h-4 rounded-full border-2 transition-colors duration-300"
            />
            <span className={`text-[10px] font-medium tracking-wider ${isActive ? 'text-blue-400' : isPast ? 'text-emerald-500' : 'text-gray-600'}`}>
              {state}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const BeliefBar: React.FC<{ content: string; probability: number; entropy: number }> = ({ content, probability, entropy }) => (
  <div className="group relative">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-300 truncate max-w-[70%]">{content}</span>
      <div className="flex gap-3 text-[10px] font-mono">
        <span className="text-blue-400">P: {probability.toFixed(2)}</span>
        <span className="text-purple-400">H: {entropy.toFixed(2)}</span>
      </div>
    </div>
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${probability * 100}%` }}
        className="h-full bg-gradient-to-r from-blue-600 to-purple-500"
      />
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export const AgentDetailStage: React.FC<AgentDetailStageProps> = ({ agentId, onBack }) => {
  const { 
    agents: { agents, stepLog },
    summonAgent, dismissAgent, stepAgent, runAgent
  } = useAlephStore();
  
  const [stepInput, setStepInput] = useState('');
  const [autoRunSteps, setAutoRunSteps] = useState(10);
  const [isRunning, setIsRunning] = useState(false);

  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;

  // Derived state
  const agentLogs = stepLog.filter(s => s.agentId === agentId).slice(-50); // Last 50 steps
  const currentStep = agentLogs[agentLogs.length - 1];
  const currentFE = currentStep?.freeEnergy ?? 0.5;
  const currentState = agent.status === 'active' ? 'PERCEIVING' : 'DORMANT'; // Mock state mapping

  const handleStep = async () => {
    if (!stepInput.trim()) return;
    await stepAgent(agentId, stepInput);
    setStepInput('');
  };

  const handleRun = async () => {
    setIsRunning(true);
    await runAgent(agentId, autoRunSteps);
    setIsRunning(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gray-900/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/10">
            <ArrowLeft size={18} className="text-gray-400" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">{agent.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700/50 text-gray-400'
              }`}>
                {agent.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 font-mono">
              <span>ID: {agent.id.slice(0, 8)}</span>
              <span>•</span>
              <span>Epoch: {agentLogs.length}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {agent.status !== 'active' ? (
            <Button size="sm" onClick={() => summonAgent(agentId)} className="bg-emerald-600 hover:bg-emerald-700">
              <Zap size={14} className="mr-2" /> Summon Agent
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => dismissAgent(agentId)} className="bg-red-900/50 hover:bg-red-800 border border-red-800/50">
              <Square size={14} className="mr-2" /> Dismiss
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* 1. Lifecycle Pipeline */}
          <section>
            <LifecyclePipeline currentState={currentState} />
          </section>

          {/* 2. Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Free Energy Graph */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Free Energy Dynamics</h3>
                </div>
                <span className="text-2xl font-mono font-bold text-emerald-400">{currentFE.toFixed(3)}</span>
              </div>
              <div className="flex-1 min-h-[200px]">
                <FreeEnergyGraph 
                  currentFreeEnergy={currentFE} 
                  agentState={currentState as any}
                  height={200}
                />
              </div>
            </div>

            {/* Belief State */}
            <div className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Active Beliefs</h3>
                </div>
                <span className="text-xs text-gray-500">{agent.beliefs.length} beliefs</span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[200px] custom-scrollbar pr-2">
                {agent.beliefs.length > 0 ? (
                  agent.beliefs.map(b => (
                    <BeliefBar 
                      key={b.id} 
                      content={b.content} 
                      probability={b.probability} 
                      entropy={b.entropy} 
                    />
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                    No beliefs formed yet. Step agent to generate insights.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Attention & Goals Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Goal Priors */}
            <div className="md:col-span-1 bg-white/5 rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-200">Goal Priors</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(agent.goalPriors).map(([goal, weight]) => (
                  <div key={goal} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 capitalize">{goal}</span>
                      <span className="font-mono text-amber-400">{weight.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${weight * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attention / SMF */}
            <div className="md:col-span-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2 self-start">
                <Eye size={16} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">Attention Field</h3>
              </div>
              <div className="flex-1 w-full flex items-center justify-center">
                <SMFRadarChart smf={[]} size="sm" /> {/* TODO: Pass actual SMF from state */}
              </div>
            </div>

            {/* Controls */}
            <div className="md:col-span-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-white" />
                <h3 className="text-sm font-semibold text-gray-200">Step Control</h3>
              </div>
              
              <div className="space-y-3 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Manual Observation</label>
                  <div className="flex gap-2">
                    <input 
                      value={stepInput}
                      onChange={e => setStepInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleStep()}
                      disabled={agent.status !== 'active'}
                      placeholder="Input observation..." 
                      className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                    />
                    <Button size="sm" onClick={handleStep} disabled={agent.status !== 'active'} className="bg-blue-600 hover:bg-blue-700">
                      Step
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-2" />

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold">Auto-Run</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="number" 
                      value={autoRunSteps}
                      onChange={e => setAutoRunSteps(parseInt(e.target.value))}
                      className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white text-center"
                    />
                    <span className="text-xs text-gray-500">steps</span>
                    <Button 
                      size="sm" 
                      onClick={handleRun} 
                      disabled={agent.status !== 'active' || isRunning}
                      className={`flex-1 ${isRunning ? 'bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {isRunning ? 'Running...' : <><Play size={12} className="mr-2" /> Start Run</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 4. Step Log */}
          <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[300px]">
            <div className="p-3 border-b border-white/5 bg-gray-900/30 flex items-center gap-2">
              <MessageSquare size={14} className="text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Execution Log</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-0 font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20 text-gray-500 sticky top-0">
                  <tr>
                    <th className="p-2 font-medium w-24">Time</th>
                    <th className="p-2 font-medium w-24">Action</th>
                    <th className="p-2 font-medium w-20">FE</th>
                    <th className="p-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {agentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-600 italic">No activity recorded.</td>
                    </tr>
                  ) : (
                    [...agentLogs].reverse().map((step, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="p-2 text-gray-500">{new Date(step.timestamp).toLocaleTimeString()}</td>
                        <td className="p-2 text-blue-400 font-bold">{step.action}</td>
                        <td className="p-2 text-emerald-400">{step.freeEnergy.toFixed(3)}</td>
                        <td className="p-2 text-gray-300 truncate max-w-md">
                          {step.learningUpdates.length > 0 
                            ? `Learned: ${step.learningUpdates.join(', ')}` 
                            : <span className="text-gray-600">-</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};