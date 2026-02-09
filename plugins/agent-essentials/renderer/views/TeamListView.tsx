import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { useAlephStore } from 'alephnet';

export const TeamListView: React.FC = () => {
  const {
    agents: { agents, teams },
    createTeam, setActiveTeam
  } = useAlephStore();
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const handleCreateTeam = async () => {
    if (!teamName.trim() || selectedAgentIds.length === 0) return;
    await createTeam(teamName, selectedAgentIds);
    setTeamName('');
    setSelectedAgentIds([]);
    setShowCreateTeam(false);
  };

  const toggleAgentSelection = (id: string) => {
    setSelectedAgentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button size="sm" onClick={() => setShowCreateTeam(!showCreateTeam)} className="h-6 text-[10px] bg-purple-600 px-2"><Plus size={10} className="mr-1" /> New Team</Button>
      </div>

      <AnimatePresence>
        {showCreateTeam && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 bg-purple-900/10 rounded-lg border border-purple-500/10 space-y-2 mb-3">
              <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
              <h5 className="text-[10px] text-gray-500">Select agents:</h5>
              <div className="space-y-1">
                {agents.map((a: any) => (
                  <label key={a.id} className="flex items-center gap-2 p-1 rounded hover:bg-white/5 cursor-pointer text-xs text-gray-300">
                    <input type="checkbox" checked={selectedAgentIds.includes(a.id)} onChange={() => toggleAgentSelection(a.id)} className="accent-purple-500" />
                    {a.name}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateTeam} disabled={!teamName.trim() || selectedAgentIds.length === 0} className="h-6 text-[10px] bg-purple-600">Create</Button>
                <Button size="sm" onClick={() => setShowCreateTeam(false)} className="h-6 text-[10px] bg-gray-700">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {teams.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-xs"><Users size={24} className="mx-auto mb-2 opacity-40" /><p>No teams created yet.</p></div>
      ) : (
        teams.map((team: any, i: number) => (
          <motion.div key={team.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => setActiveTeam(team.id)}
            className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-purple-400" />
              <span className="text-sm font-medium text-white">{team.name}</span>
            </div>
            <p className="text-[10px] text-gray-500">{team.agentIds.length} agents</p>
          </motion.div>
        ))
      )}
    </>
  );
};