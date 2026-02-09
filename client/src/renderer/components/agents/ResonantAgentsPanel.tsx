import React, { useState } from 'react';
import { 
  Bot, 
  Zap, 
  Square, 
  MoreVertical, 
  ChevronRight, 
  Plus, 
  Users,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlephStore } from '../../store/useAlephStore';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/renderer/components/ui/dropdown-menu';
import { CreateAgentDialog } from './CreateAgentDialog';
import { SRIAAgent, AgentStepResult } from '@/shared/alephnet-types';

// ─── Subcomponents ──────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: string; freeEnergy?: number }> = ({ status, freeEnergy }) => {
  let color = 'bg-gray-500';
  let pulse = false;

  if (status === 'active') {
    if (freeEnergy && freeEnergy >= 0.5) {
      color = 'bg-amber-500'; // High free energy (uncertainty)
    } else {
      color = 'bg-emerald-500'; // Low free energy (convergence)
    }
    pulse = true;
  } else if (status === 'dismissed') {
    color = 'bg-red-500';
  }

  return (
    <div className="relative flex h-2.5 w-2.5">
      {pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}></span>}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`}></span>
    </div>
  );
};

const FreeEnergyMiniBar: React.FC<{ value: number; trend?: 'up' | 'down' | 'stable' }> = ({ value, trend }) => {
  const width = Math.min(Math.max(value * 100, 0), 100);
  const color = value < 0.3 ? 'bg-emerald-500' : value < 0.7 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[80px]">
      <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {trend && (
        <span className={`text-[9px] ${trend === 'down' ? 'text-emerald-400' : trend === 'up' ? 'text-red-400' : 'text-gray-500'}`}>
          {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'}
        </span>
      )}
    </div>
  );
};

const AgentCard: React.FC<{ 
  agent: SRIAAgent; 
  onOpenDetail: (id: string) => void;
  stepLog: AgentStepResult[];
}> = ({ agent, onOpenDetail, stepLog }) => {
  const { summonAgent, dismissAgent, deleteAgent, stepAgent } = useAlephStore();
  const [expanded, setExpanded] = useState(false);
  const [stepInput, setStepInput] = useState('');

  // Get latest step for metrics
  const lastStep = stepLog.filter(s => s.agentId === agent.id).slice(-1)[0];
  const freeEnergy = lastStep?.freeEnergy ?? 0.5; // Default if no history
  
  // Determine FE trend
  const history = stepLog.filter(s => s.agentId === agent.id).slice(-5);
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (history.length >= 2) {
    const prev = history[history.length - 2].freeEnergy;
    if (freeEnergy < prev - 0.05) trend = 'down';
    else if (freeEnergy > prev + 0.05) trend = 'up';
  }

  const handleStep = async () => {
    if (!stepInput.trim()) return;
    await stepAgent(agent.id, stepInput);
    setStepInput('');
  };

  return (
    <div className="group bg-card hover:bg-muted/30 border border-border rounded-lg transition-all overflow-hidden">
      {/* Header Row */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <StatusDot status={agent.status} freeEnergy={freeEnergy} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground truncate">{agent.name}</span>
            {agent.status === 'active' && (
              <FreeEnergyMiniBar value={freeEnergy} trend={trend} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {agent.status === 'active' ? 'PERCEIVING' : agent.status} {/* Mock state for now */}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted"
            onClick={() => onOpenDetail(agent.id)}
          >
            <ChevronRight size={14} className="text-muted-foreground" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                <MoreVertical size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-popover border-border">
              {agent.status !== 'active' ? (
                <DropdownMenuItem onClick={() => summonAgent(agent.id)}>
                  <Zap className="mr-2 h-3.5 w-3.5 text-emerald-400" /> Summon
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => dismissAgent(agent.id)}>
                  <Square className="mr-2 h-3.5 w-3.5 text-amber-400" /> Dismiss
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => deleteAgent(agent.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Inline Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-muted/10"
          >
            <div className="p-3 space-y-3">
              {/* Lifecycle Pipeline (Mini) */}
              <div className="flex justify-between items-center px-1">
                {['D','P','D','A','L'].map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                    <span className="text-[8px] text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>

              {/* Beliefs Preview */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium">Top Beliefs</p>
                {agent.beliefs.slice(0, 2).map(b => (
                  <div key={b.id} className="text-xs">
                    <div className="flex justify-between text-muted-foreground mb-0.5">
                      <span className="truncate max-w-[140px]">{b.content}</span>
                      <span>{b.probability.toFixed(2)}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/50 rounded-full" style={{ width: `${b.probability * 100}%` }} />
                    </div>
                  </div>
                ))}
                {agent.beliefs.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No beliefs formed yet.</p>
                )}
              </div>

              {/* Step Controls */}
              {agent.status === 'active' && (
                <div className="flex gap-2">
                  <input 
                    value={stepInput}
                    onChange={e => setStepInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStep()}
                    placeholder="Observation..." 
                    className="flex-1 bg-muted/20 border border-border rounded px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <Button size="sm" onClick={handleStep} className="h-6 px-2 bg-primary/80 hover:bg-primary text-[10px] text-primary-foreground">
                    <Zap size={10} />
                  </Button>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-7 text-xs border-border hover:bg-muted text-muted-foreground"
                onClick={() => onOpenDetail(agent.id)}
              >
                Open Full Detail
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Panel ─────────────────────────────────────────────────────────────

export const ResonantAgentsPanel: React.FC = () => {
  const { 
    agents: { agents, teams, stepLog },
    loadAgents, loadTeams
  } = useAlephStore();
  const { setLayoutAction } = useAppStore();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamsExpanded, setTeamsExpanded] = useState(true);

  // Initial load
  React.useEffect(() => {
    loadAgents();
    loadTeams();
  }, []);

  const handleOpenDetail = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    // Open the stage view for this agent
    setLayoutAction({
      type: 'open',
      component: 'agent-detail',
      name: agent.name.toUpperCase(),
      icon: 'bot',
      props: { agentId }
    });
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="text-primary" size={18} />
          <h2 className="font-semibold text-sm tracking-wide">SRIA Agents</h2>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 w-7 p-0 hover:bg-muted rounded-full"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={16} className="text-muted-foreground" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        
        {/* Agents List */}
        <div className="space-y-2">
          {agents.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-border rounded-lg">
              <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground mb-3">No agents created yet.</p>
              <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)} className="text-xs">
                Create First Agent
              </Button>
            </div>
          ) : (
            agents.map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onOpenDetail={handleOpenDetail}
                stepLog={stepLog}
              />
            ))
          )}
        </div>

        {/* Teams Section */}
        <div className="space-y-2">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setTeamsExpanded(!teamsExpanded)}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
              <Users size={12} />
              <span>Teams</span>
            </div>
            <ChevronRight 
              size={12} 
              className={`text-muted-foreground transition-transform ${teamsExpanded ? 'rotate-90' : ''}`} 
            />
          </div>

          <AnimatePresence>
            {teamsExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                {teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-2">No teams configured.</p>
                ) : (
                  teams.map(team => (
                    <div key={team.id} className="p-3 bg-card border border-border rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{team.name}</div>
                        <div className="text-[10px] text-muted-foreground">{team.agentIds.length} members</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setLayoutAction({
                            type: 'open',
                            component: 'team-detail',
                            name: team.name.toUpperCase(),
                            icon: 'users',
                            props: { teamId: team.id }
                          });
                        }}
                      >
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground justify-start px-2 h-7">
                  <Plus size={12} className="mr-2" /> Create Team
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreateAgentDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
};