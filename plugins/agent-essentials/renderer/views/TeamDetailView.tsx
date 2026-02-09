import React, { useState } from 'react';
import { Users, Play, Square, Zap, ArrowLeft, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from 'alephnet';

interface TeamDetailViewProps {
  teamId: string;
  onBack: () => void;
}

export const TeamDetailView: React.FC<TeamDetailViewProps> = ({ teamId, onBack }) => {
  const {
    agents: { agents, teams, stepLog },
    summonTeam, stepTeam, dismissTeam
  } = useAlephStore();
  
  const [teamStepInput, setTeamStepInput] = useState('');

  const team = teams.find((t: any) => t.id === teamId);
  if (!team) return null;

  const handleTeamStep = async () => {
    if (!teamStepInput.trim()) return;
    await stepTeam(teamId, teamStepInput.trim());
    setTeamStepInput('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
        <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft size={14} className="text-gray-400" /></button>
        <Users size={16} className="text-purple-400" />
        <div className="flex-1">
          <span className="text-sm font-medium text-white">{team.name}</span>
          <p className="text-[10px] text-gray-500">{team.agentIds.length} agents</p>
        </div>
      </div>

      <div className="flex gap-2 p-3 border-b border-white/5">
        <Button size="sm" onClick={() => summonTeam(team.id)} className="h-7 text-[10px] bg-emerald-600"><Play size={10} className="mr-1" /> Summon All</Button>
        <Button size="sm" onClick={() => dismissTeam(team.id)} className="h-7 text-[10px] bg-amber-600"><Square size={10} className="mr-1" /> Dismiss All</Button>
      </div>

      {/* Members */}
      <div className="p-3 border-b border-white/5">
        <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Members</h4>
        <div className="space-y-1">
          {team.agentIds.map((id: string) => {
            const a = agents.find((ag: any) => ag.id === id);
            return (
              <div key={id} className="flex items-center gap-2 p-1.5 rounded bg-white/5 text-xs">
                <Bot size={12} className={a?.status === 'active' ? 'text-emerald-400' : 'text-gray-500'} />
                <span className="text-gray-300">{a?.name ?? id}</span>
                <span className="text-[9px] text-gray-500 capitalize ml-auto">{a?.status ?? 'unknown'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Step */}
      <div className="p-3 border-b border-white/5">
        <div className="flex gap-2">
          <input value={teamStepInput} onChange={e => setTeamStepInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTeamStep()}
            placeholder="Send collective observation..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          <Button size="sm" onClick={handleTeamStep} disabled={!teamStepInput.trim()} className="h-7 px-2 bg-purple-600"><Zap size={10} /></Button>
        </div>
      </div>

      {/* Team step log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {stepLog.filter((s: any) => team.agentIds.includes(s.agentId)).slice(-20).map((step: any, i: number) => (
          <div key={`${step.timestamp}-${i}`} className="p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono">
            <div className="flex justify-between mb-0.5">
              <span className="text-purple-400">{agents.find((a: any) => a.id === step.agentId)?.name ?? step.agentId}</span>
              <span className="text-gray-600">{new Date(step.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-gray-300">{step.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
};