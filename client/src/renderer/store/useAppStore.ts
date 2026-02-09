import { create } from 'zustand';
import { MessageType } from '../components/ui/MessageBubble';
import { AIConversation, AIMessage } from '../../shared/alephnet-types';
import { applyTheme, Theme, DEFAULT_CUSTOM_THEME } from '../themes';

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
}

interface WalletState {
  balance: number;
  staked: number;
}

interface AgentState {
  state: 'Idle' | 'Perceiving' | 'Minimizing Free Energy' | 'Acting';
  freeEnergy: number;
}

interface NetworkState {
  nodeId: string;
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
  peers: number;
  latency: number;
}

interface Agent {
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

// Re-export Conversation for UI compatibility, mapped from AIConversation
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

interface AppState {
  // Data
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  openConversationIds: string[];
  
  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  wallet: WalletState;
  agent: AgentState; // Local agent
  activeAgents: Agent[]; // Remote agents
  smf: number[]; // 16-dim vector
  network: NetworkState;
  hasIdentity: boolean;
  activeSidebarView: 'explorer' | 'extensions' | 'settings' | 'friends' | 'tasks' | 'messages' | 'groups' | 'memory' | 'coherence' | 'agents' | 'secrets' | 'connections' | 'services';
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

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  startDraftConversation: () => void; // New action
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  closeConversation: (id: string) => void;
  
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  
  addMessage: (msg: Message, conversationId?: string) => Promise<void>;
  updateMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  deleteMessagesAfter: (id: string) => void; // Local only for now
  setWallet: (wallet: WalletState) => void;
  setAgentState: (agent: AgentState) => void;
  setActiveAgents: (agents: Agent[]) => void;
  setSMF: (smf: number[]) => void;
  setNetwork: (network: Partial<NetworkState>) => void;
  setHasIdentity: (hasIdentity: boolean) => void;
  setActiveSidebarView: (view: 'explorer' | 'extensions' | 'settings' | 'friends' | 'tasks' | 'messages' | 'groups' | 'memory' | 'coherence' | 'agents' | 'secrets' | 'connections' | 'services') => void;
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
}

// Helpers
const toAIMessage = (msg: Message): AIMessage => ({
    id: msg.id,
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content,
    timestamp: new Date(msg.timestamp).getTime(),
    attachments: msg.attachments
});

const fromAIMessage = (msg: AIMessage): Message => ({
    id: msg.id,
    content: msg.content,
    type: 'perceptual', // Default to perceptual
    sender: msg.role === 'user' ? 'user' : 'agent',
    timestamp: new Date(msg.timestamp).toISOString(),
    attachments: msg.attachments
});

const fromAIConversation = (conv: AIConversation): Conversation => ({
    id: conv.id,
    title: conv.title,
    messages: (conv.messages || []).map(fromAIMessage),
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt
});

export const useAppStore = create<AppState>((set, get) => ({
  conversations: {},
  activeConversationId: null,
  openConversationIds: [],
  tabs: [],
  activeTabId: null,
  wallet: { balance: 0, staked: 0 },
  agent: { state: 'Idle', freeEnergy: 0 },
  activeAgents: [],
  smf: new Array(16).fill(0),
  network: { nodeId: '', status: 'OFFLINE', peers: 0, latency: 0 },
  hasIdentity: false,
  activeSidebarView: 'explorer',
  isTerminalOpen: false,
  navOrder: (() => {
    try {
      const saved = localStorage.getItem('navOrder');
      const defaultOrder = ['explorer', 'extensions', 'chat-mode', 'messages', 'groups', 'memory', 'coherence', 'agents', 'connections', 'services'];
      
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.includes('connections')) {
            // Also ensure services is added if missing from legacy saved state
            if (!parsed.includes('services')) {
                return [...parsed, 'connections', 'services'];
            }
            return [...parsed, 'connections'];
        }
        if (Array.isArray(parsed) && !parsed.includes('services')) {
            return [...parsed, 'services'];
        }
        return parsed;
      }
      
      return defaultOrder;
    } catch {
      return ['explorer', 'extensions', 'chat-mode', 'messages', 'groups', 'memory', 'coherence', 'agents', 'connections', 'services'];
    }
  })(),
  customTheme: (() => {
    try {
      const saved = localStorage.getItem('customTheme');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_THEME;
    } catch {
      return DEFAULT_CUSTOM_THEME;
    }
  })(),
  theme: (() => {
    const theme = localStorage.getItem('theme') || 'default';
    let customTheme = DEFAULT_CUSTOM_THEME;
    try {
       const savedCustom = localStorage.getItem('customTheme');
       if (savedCustom) customTheme = JSON.parse(savedCustom);
    } catch {}
    applyTheme(theme, customTheme); // Apply immediately on load
    return theme;
  })(),
  setTheme: (theme) => {
    const { customTheme } = get();
    applyTheme(theme, customTheme); // Apply immediately on change
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  setCustomTheme: (customTheme) => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
    set({ customTheme });
    if (get().theme === 'custom') {
      applyTheme('custom', customTheme);
    }
  },
  updateCustomTheme: (colors) => {
    const current = get().customTheme;
    const updated = {
      ...current,
      colors: { ...current.colors, ...colors }
    };
    get().setCustomTheme(updated);
  },
  setNavOrder: (order) => {
    localStorage.setItem('navOrder', JSON.stringify(order));
    set({ navOrder: order });
  },
  
  // Layout Actions
  layoutAction: null,
  setLayoutAction: (action) => set({ layoutAction: action }),

  // Chat UI State
  isGenerating: false,
  generationProgress: null,
  pendingAttachments: [],
  abortController: null,
  editingMessageId: null,
  selectedModel: null,

  loadConversations: async () => {
      try {
          const list = await window.electronAPI.aiConversationList();
          const conversations: Record<string, Conversation> = {};
          list.forEach(c => {
              conversations[c.id] = fromAIConversation(c);
          });
          set({ conversations });
      } catch (err) {
          console.error('Failed to load conversations:', err);
      }
  },

  startDraftConversation: () => {
    const draftId = `draft-${Date.now()}`;
    const newConversation: Conversation = {
        id: draftId,
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    set(state => {
        const newTab: Tab = {
            id: draftId,
            type: 'chat',
            title: 'New Chat'
        };
        return {
            conversations: { ...state.conversations, [draftId]: newConversation },
            activeConversationId: draftId,
            openConversationIds: [...state.openConversationIds, draftId],
            tabs: [...state.tabs, newTab],
            activeTabId: draftId
        };
    });
  },

  createConversation: async (title) => {
    try {
        const aiConv = await window.electronAPI.aiConversationCreate({ title });
        const newConversation = fromAIConversation(aiConv);
        
        set(state => {
            const newTab: Tab = {
                id: newConversation.id,
                type: 'chat',
                title: newConversation.title || 'New Chat'
            };
            return {
                conversations: { ...state.conversations, [newConversation.id]: newConversation },
                activeConversationId: newConversation.id,
                openConversationIds: [...state.openConversationIds, newConversation.id],
                tabs: [...state.tabs, newTab],
                activeTabId: newConversation.id
            };
        });
        return newConversation.id;
    } catch (err) {
        console.error('Failed to create conversation:', err);
        return '';
    }
  },

  deleteConversation: async (id) => {
      try {
          await window.electronAPI.aiConversationDelete({ id });
          set(state => {
            const { [id]: deleted, ...rest } = state.conversations;
            return { 
                conversations: rest,
                activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
                openConversationIds: state.openConversationIds.filter(cid => cid !== id)
            };
          });
      } catch (err) {
          console.error('Failed to delete conversation:', err);
      }
  },

  setActiveConversationId: (id) => set(state => {
      if (!id) return { activeConversationId: null, activeTabId: null };
      
      const isOpen = state.openConversationIds.includes(id);
      const tabExists = state.tabs.some(t => t.id === id);
      
      let newTabs = state.tabs;
      if (!tabExists) {
          const conv = state.conversations[id];
          if (conv) {
              newTabs = [...state.tabs, { id, type: 'chat', title: conv.title }];
          }
      }

      return {
          activeConversationId: id,
          openConversationIds: isOpen ? state.openConversationIds : [...state.openConversationIds, id],
          activeTabId: id,
          tabs: newTabs
      };
  }),

  closeConversation: (id) => set(state => {
      const newOpenIds = state.openConversationIds.filter(cid => cid !== id);
      const newTabs = state.tabs.filter(t => t.id !== id);
      
      let newActiveId = state.activeConversationId;
      if (state.activeConversationId === id) {
          newActiveId = newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null;
      }
      
      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === id) {
          newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }

      return {
          openConversationIds: newOpenIds,
          activeConversationId: newActiveId,
          tabs: newTabs,
          activeTabId: newActiveTabId
      };
  }),

  openTab: (tab) => set(state => {
      const exists = state.tabs.some(t => t.id === tab.id);
      const tabs = exists ? state.tabs : [...state.tabs, tab];
      
      // Sync legacy state if chat
      const openConversationIds = tab.type === 'chat' && !state.openConversationIds.includes(tab.id)
          ? [...state.openConversationIds, tab.id]
          : state.openConversationIds;

      return {
          tabs,
          activeTabId: tab.id,
          openConversationIds,
          activeConversationId: tab.type === 'chat' ? tab.id : state.activeConversationId
      };
  }),

  closeTab: (id) => set(state => {
      const newTabs = state.tabs.filter(t => t.id !== id);
      
      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === id) {
          newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      
      // Sync legacy
      const newOpenConversationIds = state.openConversationIds.filter(cid => cid !== id);
      const newActiveConversationId = state.activeConversationId === id ? (newOpenConversationIds[newOpenConversationIds.length - 1] || null) : state.activeConversationId;

      return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
          openConversationIds: newOpenConversationIds,
          activeConversationId: newActiveConversationId
      };
  }),

  setActiveTabId: (id) => set(state => {
      const tab = state.tabs.find(t => t.id === id);
      // Sync legacy state
      const activeConversationId = tab?.type === 'chat' ? id : (tab ? null : state.activeConversationId);
      
      return {
          activeTabId: id,
          activeConversationId
      };
  }),

  updateConversationTitle: async (id, title) => {
      try {
          await window.electronAPI.aiConversationUpdateTitle({ id, title });
          set(state => ({
            conversations: {
                ...state.conversations,
                [id]: { ...state.conversations[id], title }
            }
          }));
      } catch (err) {
          console.error('Failed to update title:', err);
      }
  },

  addMessage: async (msg, conversationId) => {
    let targetId = conversationId || get().activeConversationId;
    
    if (!targetId) {
        // Create new draft conversation first if none exists
        get().startDraftConversation();
        targetId = get().activeConversationId;
        if (!targetId) return;
    }

    // Check if target is a draft
    if (targetId.startsWith('draft-')) {
        // Create real conversation
        // Use message content as title (truncated)
        const title = msg.content.substring(0, 30) || 'New Chat';
        
        try {
            const aiConv = await window.electronAPI.aiConversationCreate({ title });
            const newConversation = fromAIConversation(aiConv);
            const realId = newConversation.id;
            
            // Replace draft with real conversation in store
            set(state => {
                // Remove draft
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [targetId!]: draft, ...restConversations } = state.conversations;
                
                // Create new tab replacing the draft tab
                const newTabs = state.tabs.map(t => 
                    t.id === targetId ? { ...t, id: realId, title: newConversation.title } : t
                );
                
                // Update open/active IDs
                const newOpenIds = state.openConversationIds.map(id => id === targetId ? realId : id);
                
                return {
                    conversations: { ...restConversations, [realId]: newConversation },
                    activeConversationId: realId,
                    openConversationIds: newOpenIds,
                    tabs: newTabs,
                    activeTabId: realId
                };
            });
            
            // Update targetId to use real ID for message addition
            targetId = realId;
            
        } catch (err) {
            console.error('Failed to create real conversation from draft:', err);
            return;
        }
    }

    // Update local state immediately for responsiveness
    set((state) => {
        const conversation = state.conversations[targetId!];
        if (!conversation) return state;
        if (conversation.messages.some(m => m.id === msg.id)) return state;

        return {
            conversations: {
                ...state.conversations,
                [targetId!]: {
                    ...conversation,
                    messages: [...conversation.messages, msg],
                    updatedAt: Date.now()
                }
            }
        };
    });

    // Persist to backend
    try {
        await window.electronAPI.aiConversationAddMessage({
            conversationId: targetId!,
            message: toAIMessage(msg)
        });
    } catch (err) {
        console.error('Failed to persist message:', err);
        // TODO: Rollback local state on error?
    }
  },

  updateMessage: async (id, content) => {
    const conversationId = get().activeConversationId;
    if (!conversationId) return;
    
    // Optimistic update
    set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return state;

        return {
            conversations: {
                ...state.conversations,
                [conversationId]: {
                    ...conversation,
                    messages: conversation.messages.map(msg =>
                        msg.id === id ? { ...msg, content } : msg
                    )
                }
            }
        };
    });

    try {
        await window.electronAPI.aiConversationUpdateMessage({ conversationId, messageId: id, content });
    } catch (err) {
        console.error('Failed to update message:', err);
    }
  },

  deleteMessage: async (id) => {
    const conversationId = get().activeConversationId;
    if (!conversationId) return;
    
    // Optimistic update
    set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return state;

        return {
            conversations: {
                ...state.conversations,
                [conversationId]: {
                    ...conversation,
                    messages: conversation.messages.filter(msg => msg.id !== id)
                }
            }
        };
    });

    try {
        await window.electronAPI.aiConversationDeleteMessage({ conversationId, messageId: id });
    } catch (err) {
        console.error('Failed to delete message:', err);
    }
  },

  deleteMessagesAfter: (id) => set((state) => {
    const conversationId = state.activeConversationId;
    if (!conversationId) return state;
    
    const conversation = state.conversations[conversationId];
    if (!conversation) return state;

    const index = conversation.messages.findIndex(msg => msg.id === id);
    if (index === -1) return state;

    return {
        conversations: {
            ...state.conversations,
            [conversationId]: {
                ...conversation,
                messages: conversation.messages.slice(0, index + 1)
            }
        }
    };
  }),

  setWallet: (wallet) => set({ wallet }),
  setAgentState: (agent) => set({ agent }),
  setActiveAgents: (activeAgents) => set({ activeAgents }),
  setSMF: (smf) => set({ smf }),
  setNetwork: (network) => set((state) => ({ network: { ...state.network, ...network } })),
  setHasIdentity: (hasIdentity) => set({ hasIdentity }),
  setActiveSidebarView: (view) => set({ activeSidebarView: view }),
  setIsTerminalOpen: (isOpen) => set({ isTerminalOpen: isOpen }),
  
  // Chat UI Actions
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  addPendingAttachment: (attachment) => set((state) => ({
    pendingAttachments: [...state.pendingAttachments, attachment]
  })),
  removePendingAttachment: (id) => set((state) => ({
    pendingAttachments: state.pendingAttachments.filter(a => a.id !== id)
  })),
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
  setAbortController: (abortController) => set({ abortController }),
  setEditingMessageId: (editingMessageId) => set({ editingMessageId }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}));
