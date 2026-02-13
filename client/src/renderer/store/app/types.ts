import { MessageType } from '../../components/ui/MessageBubble';
import { Theme } from '../../themes';

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'file';
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string; // For image previews
  content?: string; // For text content
}

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  sender: 'user' | 'agent';
  timestamp: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface WalletState {
  balance: number;
  staked: number;
}

export interface AgentState {
  state: 'Idle' | 'Perceiving' | 'Minimizing Free Energy' | 'Acting';
  freeEnergy: number;
}

export interface NetworkState {
  nodeId: string;
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR' | 'RECONNECTING' | 'DISCONNECTED';
  peers: number;
  latency: number;
  error?: string | null;
  alephnetConnected?: boolean;
  dsnStatus?: string;
  tier?: string;
  version?: string;
  connectedAt?: number;
  uptime?: number;
}

export interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'offline';
  type: string; // 'analyst', 'writer', etc.
}

export interface GenerationProgress {
  status: string;
  step: number;
  totalSteps?: number;
  details?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Tab {
  id: string;
  type: 'chat' | 'group' | 'feed' | 'file' | 'extension';
  title: string;
  data?: any;
}

export type SidebarView = 'explorer' | 'extensions' | 'settings' | 'friends' | 'tasks' | 'messages' | 'groups' | 'memory' | 'coherence' | 'agents' | 'secrets' | 'connections' | 'services' | 'marketplace';

import { AgentTask } from '../../../shared/agent-types';

export interface AppState {
  // Data
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  openConversationIds: string[];
  loadingConversations: boolean;
  
  // Agent Tasks
  activeTaskByConversation: Record<string, AgentTask>;
  
  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  wallet: WalletState;
  agent: AgentState; // Local agent
  activeAgents: Agent[]; // Remote agents
  smf: number[]; // 16-dim vector
  network: NetworkState;
  hasIdentity: boolean;
  workspacePath: string | null;
  activeSidebarView: SidebarView;
  isTerminalOpen: boolean;
  navOrder: string[];
  theme: string;
  customTheme: Theme;
  
  // Chat UI State
  isGenerating: boolean;
  generationProgress: GenerationProgress | null;
  pendingAttachments: Attachment[];
  abortController: AbortController | null;
  editingMessageId: string | null;
  selectedModel: string | null;

  // Layout Actions
  layoutAction: { type: 'open', component: string, name: string, icon?: string, props?: any } | null;
  setLayoutAction: (action: { type: 'open', component: string, name: string, icon?: string, props?: any } | null) => void;

  // Scroll Signal
  scrollSignal: number;
  triggerScrollToBottom: () => void;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversationMessages: (id: string) => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  startDraftConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  closeConversation: (id: string) => void;
  
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  updateTabData: (id: string, data: Partial<Tab['data']>) => void;
  
  addMessage: (msg: Message, conversationId?: string) => Promise<void>;
  updateMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  deleteMessagesAfter: (id: string) => void; // Local only for now
  
  // Session State Persistence
  saveSessionState: () => Promise<void>;
  restoreSessionState: () => Promise<void>;
  setWallet: (wallet: WalletState) => void;
  setAgentState: (agent: AgentState) => void;
  setActiveAgents: (agents: Agent[]) => void;
  setSMF: (smf: number[]) => void;
  setNetwork: (network: Partial<NetworkState>) => void;
  setHasIdentity: (hasIdentity: boolean) => void;
  setWorkspacePath: (path: string | null) => void;
  setActiveSidebarView: (view: SidebarView) => void;
  setIsTerminalOpen: (isOpen: boolean) => void;
  setNavOrder: (order: string[]) => void;
  setTheme: (theme: string) => void;
  setCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (colors: Partial<Theme['colors']>) => void;
  
  // Chat UI Actions
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  addPendingAttachment: (attachment: Attachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  setAbortController: (controller: AbortController | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setSelectedModel: (model: string | null) => void;
  loadSelectedModelFromSettings: () => Promise<void>;

  // Agent Task Actions
  startAgentTask: (conversationId: string, message: string, metadata: any) => Promise<string>;
  stopAgentTask: (taskId: string) => Promise<void>;
  respondToAgent: (taskId: string, response: string) => Promise<void>;
  handleTaskUpdate: (task: AgentTask) => void;
}
