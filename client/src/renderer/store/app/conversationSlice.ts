import { StateCreator } from 'zustand';
import { AppState, Conversation, Message, Tab } from './types';
import { AIConversation, AIMessage } from '../../../shared/alephnet-types';

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

export interface ConversationSlice {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  openConversationIds: string[];
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  startDraftConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  closeConversation: (id: string) => void;
  addMessage: (msg: Message, conversationId?: string) => Promise<void>;
  updateMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  deleteMessagesAfter: (id: string) => void;
}

export const createConversationSlice: StateCreator<AppState, [], [], ConversationSlice> = (set, get) => ({
  conversations: {},
  activeConversationId: null,
  openConversationIds: [],

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
        title: 'Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    set(state => {
        const newTab: Tab = {
            id: draftId,
            type: 'chat',
            title: 'Chat'
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
                title: newConversation.title || 'Chat'
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
        get().startDraftConversation();
        targetId = get().activeConversationId;
        if (!targetId) return;
    }

    if (targetId.startsWith('draft-')) {
        const title = msg.content.substring(0, 30) || 'Chat';
        
        try {
            const aiConv = await window.electronAPI.aiConversationCreate({ title });
            const newConversation = fromAIConversation(aiConv);
            const realId = newConversation.id;
            
            set(state => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [targetId!]: draft, ...restConversations } = state.conversations;
                
                const newTabs = state.tabs.map(t => 
                    t.id === targetId ? { ...t, id: realId, title: newConversation.title } : t
                );
                
                const newOpenIds = state.openConversationIds.map(id => id === targetId ? realId : id);
                
                return {
                    conversations: { ...restConversations, [realId]: newConversation },
                    activeConversationId: realId,
                    openConversationIds: newOpenIds,
                    tabs: newTabs,
                    activeTabId: realId
                };
            });
            
            targetId = realId;
            
        } catch (err) {
            console.error('Failed to create real conversation from draft:', err);
            return;
        }
    }

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

    try {
        await window.electronAPI.aiConversationAddMessage({
            conversationId: targetId!,
            message: toAIMessage(msg)
        });
    } catch (err) {
        console.error('Failed to persist message:', err);
    }
  },

  updateMessage: async (id, content) => {
    const conversationId = get().activeConversationId;
    if (!conversationId) return;
    
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
});
