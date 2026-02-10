import React, { useState } from 'react';
import { 
  Bot, 
  Zap, 
  Square, 
  MoreVertical, 
  ChevronRight, 
  Plus, 
  Users,
  Trash2,
  MessageSquare
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
} from '../ui/dropdown-menu';
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
    <div className="relative flex h-2 w-2">
      {pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}></span>}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`}></span>
    </div>
  );
};

const FreeEnergyMiniBar: React.FC<{ value: number; trend?: 'up' | 'down' | 'stable' }> = ({ value, trend }) => {
  const width = Math.min(Math.max(value * 100, 0), 100);
  const color = value < 0.3 ? 'bg-emerald-500' : value < 0.7 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[60px]">
      <div className="h-0.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {trend && (
        <span className={`text-[8px] ${trend === 'down' ? 'text-emerald-400' : trend === 'up' ? 'text-red-400' : 'text-gray-500'}`}>
          {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'}
        </span>
      )}
    </div>
  );
};

interface AgentCardProps {
  agent: SRIAAgent;
  onOpenDetail: (id: string) => void;
  stepLog: AgentStepResult[];
  selected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ 
  agent, onOpenDetail, stepLog, selected, onSelect, onContextMenu 
}) => {
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
    <div 
      className={`group bg-card hover:bg-muted/30 border rounded transition-all overflow-hidden ${selected ? 'border-primary ring-1 ring-primary bg-muted/20' : 'border-border'}`}
      onClick={(e) => {
        onSelect(agent.id, e.metaKey || e.ctrlKey);
      }}
      onContextMenu={(e) => onContextMenu(e, agent.id)}
    >
      {/* Header Row - Ultra Compact */}
      <div className="flex items-center gap-1.5 px-2 py-1 cursor-pointer">
        <StatusDot status={agent.status} freeEnergy={freeEnergy} />
        
        <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">{agent.name}</span>
        
        {agent.status === 'active' && (
          <FreeEnergyMiniBar value={freeEnergy} trend={trend} />
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronRight size={12} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-muted">
                <MoreVertical size={12} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-popover border-border">
              {agent.status !== 'active' ? (
                <DropdownMenuItem onClick={() => summonAgent(agent.id)}>
                  <Zap className="mr-2 h-3 w-3 text-emerald-400" /> Summon
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => dismissAgent(agent.id)}>
                  <Square className="mr-2 h-3 w-3 text-amber-400" /> Dismiss
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => deleteAgent(agent.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3 w-3" /> Delete
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
            onClick={e => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 space-y-1.5">
              {/* Beliefs Preview */}
              <div className="space-y-0.5">
                <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">Beliefs</p>
                {agent.beliefs.slice(0, 2).map(b => (
                  <div key={b.id} className="text-[10px] flex items-center gap-1">
                    <span className="truncate flex-1 text-muted-foreground">{b.content}</span>
                    <span className="text-muted-foreground/60">{b.probability.toFixed(2)}</span>
                  </div>
                ))}
                {agent.beliefs.length === 0 && (
                  <p className="text-[9px] text-muted-foreground/60 italic">No beliefs yet</p>
                )}
              </div>

              {/* Step Controls */}
              {agent.status === 'active' && (
                <div className="flex gap-1">
                  <input 
                    value={stepInput}
                    onChange={e => setStepInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStep()}
                    placeholder="Observation..." 
                    className="flex-1 bg-muted/20 border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <Button size="sm" onClick={handleStep} className="h-5 px-1.5 bg-primary/80 hover:bg-primary text-[9px] text-primary-foreground">
                    <Zap size={9} />
                  </Button>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-5 text-[9px] border-border hover:bg-muted text-muted-foreground"
                onClick={() => onOpenDetail(agent.id)}
              >
                Full Detail
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
    loading,
    loadAgents, loadTeams, createTeam
  } = useAlephStore();
  const { setLayoutAction, createConversation } = useAppStore();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; agentIds: string[] } | null>(null);

  // Initial load
  React.useEffect(() => {
    loadAgents();
    loadTeams();
  }, []);

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const isLoading = loading['agents'] || loading['teams'];

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

  const handleSelect = (id: string, multi: boolean) => {
    const newSelection = new Set(multi ? selectedIds : []);
    if (multi && selectedIds.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    let targetIds = [id];
    if (selectedIds.has(id)) {
      // If right-clicked on a selected item, use current selection
      targetIds = Array.from(selectedIds);
    } else {
      // If right-clicked on unselected item, select it (exclusive)
      setSelectedIds(new Set([id]));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      agentIds: targetIds
    });
  };

  const handleChat = async () => {
    if (!contextMenu) return;
    const { agentIds } = contextMenu;
    
    if (agentIds.length === 1) {
      // Single Agent Chat
      const agent = agents.find(a => a.id === agentIds[0]);
      if (agent) {
        await createConversation(`Chat with ${agent.name}`);
        // TODO: Associate agent with conversation and switch to chat view
      }
    } else {
      // Group Chat
      const names = agentIds.map(id => agents.find(a => a.id === id)?.name).join(', ');
      await createConversation(`Group: ${names.substring(0, 30)}...`);
      // TODO: Associate agents with conversation and switch to chat view
    }
    setContextMenu(null);
  };

  const handleCreateTeam = async () => {
    if (!contextMenu) return;
    const { agentIds } = contextMenu;
    if (agentIds.length < 2) return;

    await createTeam(`Team ${teams.length + 1}`, agentIds);
    setContextMenu(null);
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground relative">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bot className="text-primary" size={14} />
          <h2 className="font-semibold text-xs tracking-wide">SRIA Agents</h2>
          {selectedIds.size > 0 && (
            <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded-full">
              {selectedIds.size}
            </span>
          )}
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-5 w-5 p-0 hover:bg-muted rounded"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus size={12} className="text-muted-foreground" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
        
        {/* Agents List */}
        <div className="space-y-1">
          {agents.length === 0 && isLoading ? (
             <div className="text-center py-4 text-muted-foreground text-xs">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-4 px-3 border border-dashed border-border rounded">
              <Bot className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground mb-2">No agents yet</p>
              <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)} className="text-[10px] h-6">
                Create Agent
              </Button>
            </div>
          ) : (
            agents.map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onOpenDetail={handleOpenDetail}
                stepLog={stepLog}
                selected={selectedIds.has(agent.id)}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
              />
            ))
          )}
        </div>

        {/* Teams Section */}
        <div className="space-y-1">
          <div 
            className="flex items-center justify-between cursor-pointer group py-0.5"
            onClick={() => setTeamsExpanded(!teamsExpanded)}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
              <Users size={10} />
              <span>Teams</span>
            </div>
            <ChevronRight 
              size={10} 
              className={`text-muted-foreground transition-transform ${teamsExpanded ? 'rotate-90' : ''}`} 
            />
          </div>

          <AnimatePresence>
            {teamsExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1"
              >
                {teams.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic px-1">No teams configured.</p>
                ) : (
                  teams.map(team => (
                    <div key={team.id} className="px-2 py-1 bg-card border border-border rounded flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{team.name}</span>
                        <span className="text-[9px] text-muted-foreground">{team.agentIds.length}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <ChevronRight size={12} className="text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
                <Button variant="ghost" size="sm" className="w-full text-[10px] text-muted-foreground hover:text-foreground justify-start px-1 h-5">
                  <Plus size={10} className="mr-1" /> Create Team
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreateAgentDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Context Menu Portal */}
      {contextMenu && (
        <div 
          className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-md p-1 animate-in fade-in-80 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={handleChat}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {contextMenu.agentIds.length > 1 ? 'Start Group Chat' : 'Chat with Agent'}
          </div>
          
          {contextMenu.agentIds.length > 1 && (
             <div 
              className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={handleCreateTeam}
            >
              <Users className="mr-2 h-4 w-4" />
              Create Team
            </div>
          )}

          <div className="h-px bg-border my-1" />
          
          <div 
            className="flex items-center px-2 py-1.5 text-sm text-destructive rounded hover:bg-destructive/10 cursor-pointer"
            onClick={() => {
              // Handle delete multiple
              setContextMenu(null);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {contextMenu.agentIds.length > 1 ? `(${contextMenu.agentIds.length})` : ''}
          </div>
        </div>
      )}
    </div>
  );
};
