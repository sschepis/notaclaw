/**
 * useResonantAgentStore — Renderer-side Zustand store for Resonant Agents.
 *
 * Manages the client-side state for all agent operations:
 *   - Agent list and detail
 *   - Team management
 *   - Templates
 *   - Real-time status updates from main process
 */

import { create } from 'zustand';
import type {
  ResonantAgent,
  ResonantAgentTeam,
  ResonantAgentTemplate,
  CreateResonantAgentOptions,
  UpdateResonantAgentOptions,
  AgentStartTaskParams,
} from '../../shared/resonant-agent-types';

interface ResonantAgentState {
  // Data
  agents: ResonantAgent[];
  teams: ResonantAgentTeam[];
  templates: ResonantAgentTemplate[];
  
  // UI State
  selectedAgentId: string | null;
  selectedTeamId: string | null;
  loading: boolean;
  error: string | null;

  // Actions — Agent CRUD
  loadAgents: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  createAgent: (options: CreateResonantAgentOptions) => Promise<ResonantAgent>;
  updateAgent: (id: string, updates: UpdateResonantAgentOptions) => Promise<ResonantAgent>;
  deleteAgent: (id: string) => Promise<void>;
  duplicateAgent: (id: string, newName: string) => Promise<ResonantAgent>;
  exportAgent: (id: string) => Promise<string>;
  importAgent: (json: string) => Promise<ResonantAgent>;

  // Actions — Agent Lifecycle
  summonAgent: (id: string) => Promise<void>;
  dismissAgent: (id: string) => Promise<void>;
  startAgentTask: (params: AgentStartTaskParams) => Promise<string>;
  stopAgentTask: (taskId: string) => Promise<void>;

  // Actions — Teams
  loadTeams: () => Promise<void>;
  createTeam: (name: string, agentIds: string[], description?: string) => Promise<ResonantAgentTeam>;
  deleteTeam: (id: string) => Promise<void>;

  // Actions — UI
  setSelectedAgentId: (id: string | null) => void;
  setSelectedTeamId: (id: string | null) => void;

  // Actions — Real-time event handling
  handleAgentChanged: (data: any) => void;
}

export const useResonantAgentStore = create<ResonantAgentState>((set) => ({
  agents: [],
  teams: [],
  templates: [],
  selectedAgentId: null,
  selectedTeamId: null,
  loading: false,
  error: null,

  // ─── Agent CRUD ──────────────────────────────────────────────────────

  loadAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await window.electronAPI.resonantAgentList();
      set({ agents, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  loadTemplates: async () => {
    try {
      const templates = await window.electronAPI.resonantTemplatesList();
      set({ templates });
    } catch (err: any) {
      console.error('Failed to load templates:', err);
    }
  },

  createAgent: async (options) => {
    const agent = await window.electronAPI.resonantAgentCreate(options);
    set((state) => ({ agents: [...state.agents, agent] }));
    return agent;
  },

  updateAgent: async (id, updates) => {
    const agent = await window.electronAPI.resonantAgentUpdate({ id, updates });
    set((state) => ({
      agents: state.agents.map(a => a.id === id ? agent : a),
    }));
    return agent;
  },

  deleteAgent: async (id) => {
    await window.electronAPI.resonantAgentDelete({ id });
    set((state) => ({
      agents: state.agents.filter(a => a.id !== id),
      selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
    }));
  },

  duplicateAgent: async (id, newName) => {
    const agent = await window.electronAPI.resonantAgentDuplicate({ id, newName });
    set((state) => ({ agents: [...state.agents, agent] }));
    return agent;
  },

  exportAgent: async (id) => {
    return window.electronAPI.resonantAgentExport({ id });
  },

  importAgent: async (json) => {
    const agent = await window.electronAPI.resonantAgentImport({ json });
    set((state) => ({ agents: [...state.agents, agent] }));
    return agent;
  },

  // ─── Agent Lifecycle ─────────────────────────────────────────────────

  summonAgent: async (id) => {
    const agent = await window.electronAPI.resonantAgentSummon({ id });
    set((state) => ({
      agents: state.agents.map(a => a.id === id ? agent : a),
    }));
  },

  dismissAgent: async (id) => {
    await window.electronAPI.resonantAgentDismiss({ id });
    set((state) => ({
      agents: state.agents.map(a =>
        a.id === id
          ? { ...a, status: { state: 'dormant' as const } }
          : a
      ),
    }));
  },

  startAgentTask: async (params) => {
    return window.electronAPI.resonantAgentStartTask(params);
  },

  stopAgentTask: async (taskId) => {
    await window.electronAPI.resonantAgentStopTask({ taskId });
  },

  // ─── Teams ───────────────────────────────────────────────────────────

  loadTeams: async () => {
    try {
      const teams = await window.electronAPI.resonantTeamList();
      set({ teams });
    } catch (err: any) {
      console.error('Failed to load teams:', err);
    }
  },

  createTeam: async (name, agentIds, description) => {
    const team = await window.electronAPI.resonantTeamCreate({ name, agentIds, description });
    set((state) => ({ teams: [...state.teams, team] }));
    return team;
  },

  deleteTeam: async (id) => {
    await window.electronAPI.resonantTeamDelete({ id });
    set((state) => ({
      teams: state.teams.filter(t => t.id !== id),
      selectedTeamId: state.selectedTeamId === id ? null : state.selectedTeamId,
    }));
  },

  // ─── UI ──────────────────────────────────────────────────────────────

  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setSelectedTeamId: (id) => set({ selectedTeamId: id }),

  // ─── Real-time Event Handling ────────────────────────────────────────

  handleAgentChanged: (data) => {
    const { type, agent, agentId } = data;
    set((state) => {
      switch (type) {
        case 'created':
          return { agents: [...state.agents, agent] };
        case 'updated':
        case 'summoned':
        case 'busy':
          return {
            agents: state.agents.map(a => a.id === agent.id ? agent : a),
          };
        case 'deleted':
          return {
            agents: state.agents.filter(a => a.id !== agentId),
            selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
          };
        case 'dismissed':
          return {
            agents: state.agents.map(a =>
              a.id === agentId
                ? { ...a, status: { state: 'dormant' as const } }
                : a
            ),
          };
        case 'taskCompleted':
          return {
            agents: state.agents.map(a =>
              a.id === data.agentId
                ? { ...a, status: { state: 'active' as const, lastActiveAt: Date.now() } }
                : a
            ),
          };
        default:
          return state;
      }
    });
  },
}));
