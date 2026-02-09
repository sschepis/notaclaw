import React, { useEffect, useState } from 'react';
import { useAlephStore } from 'alephnet';
import { AgentListView } from './views/AgentListView';
import { AgentDetailView } from './views/AgentDetailView';
import { TeamListView } from './views/TeamListView';
import { TeamDetailView } from './views/TeamDetailView';
import { LogView } from './views/LogView';

type Tab = 'agents' | 'teams' | 'log';

export const AgentsPanel: React.FC = () => {
  const {
    agents: { activeAgentId, activeTeamId },
    loadAgents, loadTeams, setActiveAgent, setActiveTeam,
  } = useAlephStore();
  const [tab, setTab] = useState<Tab>('agents');

  useEffect(() => { loadAgents(); loadTeams(); }, []);

  // Agent detail view
  if (activeAgentId) {
    return <AgentDetailView agentId={activeAgentId} onBack={() => setActiveAgent(null)} />;
  }

  // Team detail view
  if (activeTeamId) {
    return <TeamDetailView teamId={activeTeamId} onBack={() => setActiveTeam(null)} />;
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-white/5 bg-white/5">
        {(['agents', 'teams', 'log'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors relative ${tab === t ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {t} {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'agents' && <AgentListView />}
        {tab === 'teams' && <TeamListView />}
        {tab === 'log' && <LogView />}
      </div>
    </div>
  );
};