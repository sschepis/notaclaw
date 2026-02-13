/**
 * ResonantAgentsView — Consolidated agent management UI.
 *
 * Replaces the previous fragmented agent UI:
 *   - ResonantAgentsPanel (sidebar) → merged here
 *   - CreateAgentDialog → merged here as inline editor
 *   - AgentDetailStage → agent detail pane
 *
 * This component serves as both a sidebar panel AND a stage view,
 * adapting its layout based on where it's rendered.
 */

import React, { useEffect, useState } from 'react';
import { useResonantAgentStore } from '../../store/useResonantAgentStore';
import { useAppStore } from '../../store/useAppStore';
import type {
  ResonantAgent,
  ResonantAgentTeam,
  ResonantAgentTemplate,
  CreateResonantAgentOptions,
  ResonantAgentStatus,
} from '../../../shared/resonant-agent-types';
import {
  Bot,
  Plus,
  Square,
  Trash2,
  Users,
  ChevronRight,
  ChevronDown,
  Zap,
  ZapOff,
  AlertCircle,
  Pencil,
  Send,
  X,
} from 'lucide-react';

// ─── Status Badge ──────────────────────────────────────────────────────────

const statusColors: Record<ResonantAgentStatus, string> = {
  dormant: 'bg-muted-foreground/30',
  active: 'bg-green-500',
  busy: 'bg-yellow-500 animate-pulse',
  error: 'bg-red-500',
};

const statusLabels: Record<ResonantAgentStatus, string> = {
  dormant: 'Dormant',
  active: 'Active',
  busy: 'Working',
  error: 'Error',
};

function StatusBadge({ state }: { state: ResonantAgentStatus }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono">
      <span className={`w-2 h-2 rounded-full ${statusColors[state]}`} />
      {statusLabels[state]}
    </span>
  );
}

// ─── Agent Card ────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: ResonantAgent;
  selected: boolean;
  onClick: () => void;
  onSummon: () => void;
  onDismiss: () => void;
  onDelete: () => void;
}

function AgentCard({ agent, selected, onClick, onSummon, onDismiss, onDelete }: AgentCardProps) {
  return (
    <div
      className={`group p-3 rounded-lg border cursor-pointer transition-all
        ${selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{agent.name}</div>
            <StatusBadge state={agent.status.state} />
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {agent.status.state === 'dormant' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onSummon(); }}
              className="p-1 rounded hover:bg-green-500/20 text-green-500"
              title="Summon"
            >
              <Zap size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="p-1 rounded hover:bg-yellow-500/20 text-yellow-500"
              title="Dismiss"
            >
              <ZapOff size={14} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-red-500/20 text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {agent.description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{agent.description}</p>
      )}
      {agent.status.state === 'busy' && agent.status.activeTaskId && (
        <div className="mt-2 text-[10px] text-yellow-500 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Working on task...
        </div>
      )}
      {agent.status.state === 'error' && agent.status.errorMessage && (
        <div className="mt-2 text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle size={10} />
          {agent.status.errorMessage}
        </div>
      )}
    </div>
  );
}

// ─── Create Agent Dialog ───────────────────────────────────────────────────

interface CreateAgentFormProps {
  templates: ResonantAgentTemplate[];
  onSubmit: (options: CreateResonantAgentOptions) => void;
  onCancel: () => void;
}

function CreateAgentForm({ templates, onSubmit, onCancel }: CreateAgentFormProps) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      templateId: templateId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border border-primary/30 rounded-lg bg-primary/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Plus size={14} className="text-primary" />
          New Resonant Agent
        </h3>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-muted">
          <X size={14} />
        </button>
      </div>

      <div>
        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name..."
          className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none"
          autoFocus
        />
      </div>

      <div>
        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Template</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none"
        >
          <option value="">Custom (blank)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.description}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
          rows={2}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Create Agent
        </button>
      </div>
    </form>
  );
}

// ─── Agent Detail Pane ─────────────────────────────────────────────────────

interface AgentDetailProps {
  agent: ResonantAgent;
  onClose: () => void;
}

function AgentDetail({ agent, onClose }: AgentDetailProps) {
  const { summonAgent, dismissAgent, updateAgent, deleteAgent, startAgentTask } = useResonantAgentStore();
  const activeConversationId = useAppStore(s => s.activeConversationId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(agent.name);
  const [editDesc, setEditDesc] = useState(agent.description);
  const [editPrompt, setEditPrompt] = useState(agent.personality.systemPrompt);
  const [taskMessage, setTaskMessage] = useState('');
  const [taskSending, setTaskSending] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleSave = async () => {
    await updateAgent(agent.id, {
      name: editName,
      description: editDesc,
      personality: { systemPrompt: editPrompt },
    });
    setEditing(false);
  };

  const handleSendTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskMessage.trim()) return;

    const conversationId = activeConversationId || `agent-task-${agent.id}-${Date.now()}`;
    setTaskSending(true);
    setTaskError(null);

    try {
      await startAgentTask({
        agentId: agent.id,
        conversationId,
        message: taskMessage.trim(),
        metadata: {},
      });
      setTaskMessage('');
    } catch (err: any) {
      setTaskError(err.message || 'Failed to start task');
    } finally {
      setTaskSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-primary" />
          <span className="text-sm font-semibold">{agent.name}</span>
          <StatusBadge state={agent.status.state} />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(!editing)} className="p-1.5 rounded hover:bg-muted" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {editing ? (
          <>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase">System Prompt</label>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={6}
                className="w-full mt-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none resize-none font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs rounded border border-border">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Identity */}
            <section>
              <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Identity</h4>
              <p className="text-xs text-muted-foreground">{agent.description || 'No description'}</p>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Created: {new Date(agent.createdAt).toLocaleDateString()} · 
                By: {agent.createdBy}
              </div>
            </section>

            {/* Personality */}
            <section>
              <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Personality</h4>
              <div className="p-2 rounded bg-muted/50 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {agent.personality.systemPrompt}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {agent.personality.traits.map(t => (
                  <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary">{t}</span>
                ))}
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">{agent.personality.style}</span>
              </div>
            </section>

            {/* Capabilities */}
            <section>
              <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Capabilities</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>Max Steps: <span className="text-muted-foreground">{agent.capabilities.maxSteps}</span></div>
                <div>Max Duration: <span className="text-muted-foreground">{Math.round(agent.capabilities.maxDurationMs / 60000)}min</span></div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {agent.capabilities.tools.map(t => (
                  <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-muted font-mono">{t}</span>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {agent.capabilities.permissions.map(p => (
                  <span key={p} className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/10 text-green-500 font-mono">{p}</span>
                ))}
              </div>
            </section>

            {/* Goals */}
            {Object.keys(agent.goalPriors).length > 0 && (
              <section>
                <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Goals</h4>
                <div className="space-y-1">
                  {Object.entries(agent.goalPriors).map(([goal, weight]) => (
                    <div key={goal} className="flex items-center gap-2">
                      <span className="text-xs flex-1">{goal}</span>
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(weight as number) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round((weight as number) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Beliefs */}
            {agent.beliefs.length > 0 && (
              <section>
                <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Beliefs</h4>
                <div className="space-y-1">
                  {agent.beliefs.map(b => (
                    <div key={b.id} className="text-xs p-1.5 rounded bg-muted/50">
                      <div>{b.content}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        P: {b.probability.toFixed(2)} · H: {b.entropy.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Deployment */}
            <section>
              <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Deployment</h4>
              <div className="text-xs">
                Mode: <span className="text-muted-foreground">{agent.deployment.mode}</span>
                {agent.deployment.semanticDomain && (
                  <span> · Domain: {agent.deployment.semanticDomain}</span>
                )}
              </div>
            </section>

            {/* Task Assignment — shown when agent is active */}
            {agent.status.state === 'active' && (
              <section>
                <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Send Task</h4>
                <form onSubmit={handleSendTask} className="space-y-2">
                  <textarea
                    value={taskMessage}
                    onChange={(e) => setTaskMessage(e.target.value)}
                    placeholder="Describe what you want this agent to do..."
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:border-primary focus:outline-none resize-none"
                    disabled={taskSending}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!taskMessage.trim() || taskSending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send size={12} />
                      {taskSending ? 'Sending...' : 'Send Task'}
                    </button>
                  </div>
                  {taskError && (
                    <div className="flex items-center gap-1 text-[10px] text-red-500">
                      <AlertCircle size={10} />
                      {taskError}
                    </div>
                  )}
                </form>
              </section>
            )}

            {/* Busy indicator */}
            {agent.status.state === 'busy' && agent.status.activeTaskId && (
              <section>
                <h4 className="text-[10px] font-mono text-yellow-500 uppercase tracking-wider mb-2">Working</h4>
                <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Agent is processing a task...
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="p-3 border-t border-border flex gap-2">
        {agent.status.state === 'dormant' && (
          <button
            onClick={() => summonAgent(agent.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
          >
            <Zap size={12} /> Summon
          </button>
        )}
        {(agent.status.state === 'active' || agent.status.state === 'error') && (
          <button
            onClick={() => dismissAgent(agent.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded bg-yellow-600 text-white hover:bg-yellow-700"
          >
            <ZapOff size={12} /> Dismiss
          </button>
        )}
        {agent.status.state === 'busy' && (
          <button
            onClick={() => agent.status.activeTaskId && useResonantAgentStore.getState().stopAgentTask(agent.status.activeTaskId)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
          >
            <Square size={12} /> Stop Task
          </button>
        )}
        <button
          onClick={() => deleteAgent(agent.id)}
          className="px-3 py-1.5 text-xs rounded border border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Team Card ─────────────────────────────────────────────────────────────

function TeamCard({ team, agents, onDelete }: { team: ResonantAgentTeam; agents: ResonantAgent[]; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const memberAgents = team.agentIds
    .map(id => agents.find(a => a.id === id))
    .filter(Boolean) as ResonantAgent[];

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Users size={14} className="text-primary" />
          {team.name}
          <span className="text-[10px] text-muted-foreground">({team.agentIds.length})</span>
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100"
          title="Delete team"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-1 pl-6">
          {memberAgents.map(a => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <StatusBadge state={a.status.state} />
              <span>{a.name}</span>
            </div>
          ))}
          {team.description && (
            <p className="text-[10px] text-muted-foreground mt-1">{team.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ResonantAgentsView() {
  const {
    agents,
    teams,
    templates,
    selectedAgentId,
    loading,
    loadAgents,
    loadTemplates,
    loadTeams,
    createAgent,
    summonAgent,
    dismissAgent,
    deleteAgent,
    deleteTeam,
    setSelectedAgentId,
  } = useResonantAgentStore();

  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadAgents();
    loadTemplates();
    loadTeams();
  }, []);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleCreate = async (options: CreateResonantAgentOptions) => {
    try {
      const agent = await createAgent(options);
      setShowCreate(false);
      setSelectedAgentId(agent.id);
    } catch (err: any) {
      console.error('Failed to create agent:', err);
    }
  };

  // Group agents by status
  const activeAgents = agents.filter(a => a.status.state === 'active' || a.status.state === 'busy');
  const dormantAgents = agents.filter(a => a.status.state === 'dormant');
  const errorAgents = agents.filter(a => a.status.state === 'error');

  if (selectedAgent) {
    return (
      <AgentDetail
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Bot size={16} className="text-primary" />
          Resonant Agents
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1.5 rounded hover:bg-primary/20 text-primary"
          title="Create Agent"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Create Form */}
        {showCreate && (
          <CreateAgentForm
            templates={templates}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {loading && agents.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">Loading agents...</div>
        )}

        {!loading && agents.length === 0 && !showCreate && (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No agents yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Create your first agent
            </button>
          </div>
        )}

        {/* Active Agents */}
        {activeAgents.length > 0 && (
          <section>
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Active ({activeAgents.length})
            </h3>
            <div className="space-y-2">
              {activeAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgentId === agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  onSummon={() => summonAgent(agent.id)}
                  onDismiss={() => dismissAgent(agent.id)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Error Agents */}
        {errorAgents.length > 0 && (
          <section>
            <h3 className="text-[10px] font-mono text-red-500 uppercase tracking-wider mb-2">
              Error ({errorAgents.length})
            </h3>
            <div className="space-y-2">
              {errorAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgentId === agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  onSummon={() => summonAgent(agent.id)}
                  onDismiss={() => dismissAgent(agent.id)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Dormant Agents */}
        {dormantAgents.length > 0 && (
          <section>
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Dormant ({dormantAgents.length})
            </h3>
            <div className="space-y-2">
              {dormantAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgentId === agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  onSummon={() => summonAgent(agent.id)}
                  onDismiss={() => dismissAgent(agent.id)}
                  onDelete={() => deleteAgent(agent.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <section>
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Teams ({teams.length})
            </h3>
            <div className="space-y-2">
              {teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  agents={agents}
                  onDelete={() => deleteTeam(team.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ResonantAgentsView;
