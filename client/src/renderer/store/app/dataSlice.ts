import { StateCreator } from 'zustand';
import { AppState, WalletState, AgentState, Agent, NetworkState } from './types';

export interface DataSlice {
  wallet: WalletState;
  agent: AgentState;
  activeAgents: Agent[];
  smf: number[];
  network: NetworkState;
  hasIdentity: boolean;
  workspacePath: string | null;

  setWallet: (wallet: WalletState) => void;
  setAgentState: (agent: AgentState) => void;
  setActiveAgents: (agents: Agent[]) => void;
  setSMF: (smf: number[]) => void;
  setNetwork: (network: Partial<NetworkState>) => void;
  setHasIdentity: (hasIdentity: boolean) => void;
  setWorkspacePath: (path: string | null) => void;
}

export const createDataSlice: StateCreator<AppState, [], [], DataSlice> = (set) => ({
  wallet: { balance: 0, staked: 0 },
  agent: { state: 'Idle', freeEnergy: 0 },
  activeAgents: [],
  smf: new Array(16).fill(0),
  network: { nodeId: '', status: 'OFFLINE', peers: 0, latency: 0 },
  hasIdentity: false,
  workspacePath: null,

  setWallet: (wallet) => set({ wallet }),
  setAgentState: (agent) => set({ agent }),
  setActiveAgents: (activeAgents) => set({ activeAgents }),
  setSMF: (smf) => set({ smf }),
  setNetwork: (network) => set((state) => ({ network: { ...state.network, ...network } })),
  setHasIdentity: (hasIdentity) => set({ hasIdentity }),
  setWorkspacePath: (workspacePath) => set({ workspacePath }),
});
