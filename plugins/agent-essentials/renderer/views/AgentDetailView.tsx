import React, { useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Bot, Play, Square, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from 'alephnet';

const MotionDiv = motion.div as React.FC<HTMLMotionProps<'div'> & { className?: string; children?: React.ReactNode }>;

interface AgentDetailViewProps {
  agentId: string;
  onBack: () => void;
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({ agentId, onBack }) => {
  const {
    agents: { agents, stepLog },
    summonAgent, stepAgent, dismissAgent, runAgent, deleteAgent
  } = useAlephStore();
  
  const [stepInput, setStepInput] = useState('');

  const agent = agents.find((a: any) => a.id === agentId);
  if (!agent) return null;
  
  const recentSteps = stepLog.filter((s: any) => s.agentId === agentId).slice(-20);

  const handleStep = async () => {
    if (!stepInput.trim()) return;
    await stepAgent(agentId, stepInput.trim());
    setStepInput('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
        <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft size={14} className="text-gray-400" /></button>
        <Bot size={16} className={agent.status === 'active' ? 'text-emerald-400' : 'text-gray-500'} />
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{agent.name}</span>
          <p className="text-[10px] text-gray-500 capitalize">{agent.status} {agent.templateId && `• ${agent.templateId}`}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 p-3 border-b border-white/5">
        {agent.status === 'idle' && (
          <Button size="sm" onClick={() => summonAgent(agent.id)} className="h-7 text-[10px] bg-emerald-600"><Play size={10} className="mr-1" /> Summon</Button>
        )}
        {agent.status === 'active' && (
          <>
            <Button size="sm" onClick={() => dismissAgent(agent.id)} className="h-7 text-[10px] bg-amber-600"><Square size={10} className="mr-1" /> Dismiss</Button>
            <Button size="sm" onClick={() => runAgent(agent.id, 50)} className="h-7 text-[10px] bg-purple-600"><Zap size={10} className="mr-1" /> Auto-Run</Button>
          </>
        )}
        <Button size="sm" onClick={() => deleteAgent(agent.id)} className="h-7 text-[10px] bg-red-600/30 text-red-400 ml-auto">Delete</Button>
      </div>

      {/* Goal Priors */}
      <div className="p-3 border-b border-white/5">
        <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Goal Priors</h4>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(agent.goalPriors).map(([key, val]) => (
            <span key={key} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">{key}: {val as any}</span>
          ))}
        </div>
      </div>

      {/* Step Input */}
      {agent.status === 'active' && (
        <div className="p-3 border-b border-white/5">
          <div className="flex gap-2">
            <input value={stepInput} onChange={e => setStepInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStep()}
              placeholder="Send observation to agent..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
            <Button size="sm" onClick={handleStep} disabled={!stepInput.trim()} className="h-7 px-2 bg-blue-600"><Zap size={10} /></Button>
          </div>
        </div>
      )}

      {/* Step Log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Step Log</h4>
        {recentSteps.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-xs">No steps recorded yet.</div>
        ) : (
          recentSteps.map((step: any, i: number) => (
            <MotionDiv key={`${step.timestamp}-${i}`} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono">
              <div className="flex justify-between mb-0.5">
                <span className="text-blue-400">ACTION</span>
                <span className="text-gray-600">{new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-gray-300">{step.action}</p>
              <div className="flex gap-3 mt-1 text-gray-500">
                <span>FE: <span className="text-purple-400">{step.freeEnergy.toFixed(3)}</span></span>
                {step.learningUpdates.length > 0 && <span className="text-emerald-400">+{step.learningUpdates.length} learned</span>}
              </div>
            </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
};