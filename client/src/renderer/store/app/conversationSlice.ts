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

const normalizeTitle = (title?: string | null): string => {
    const trimmed = (title ?? '').trim();
    return trimmed.length > 0 ? trimmed : 'Chat';
};

const fromAIConversation = (conv: AIConversation): Conversation => ({
    id: conv.id,
    title: normalizeTitle(conv.title),
    messages: (conv.messages || []).map(fromAIMessage),
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt
});

export interface ConversationSlice {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  openConversationIds: string[];
  loadingConversations: boolean;
  loadConversations: () => Promise<void>;
  loadConversationMessages: (id: string) => Promise<void>;
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
  saveSessionState: () => Promise<void>;
  restoreSessionState: () => Promise<void>;
}

export const createConversationSlice: StateCreator<AppState, [], [], ConversationSlice> = (set, get) => ({
  conversations: {},
  activeConversationId: null,
  openConversationIds: [],
  loadingConversations: false,

  loadConversations: async () => {
      set({ loadingConversations: true } as any);
      try {
          const list = await window.electronAPI.aiConversationList();
          const conversations: Record<string, Conversation> = {};
          list.forEach(c => {
              conversations[c.id] = fromAIConversation(c);
          });
          set({ conversations, loadingConversations: false } as any);
          console.log(`[ConversationSlice] Loaded ${list.length} conversations`);
      } catch (err) {
          console.error('Failed to load conversations:', err);
          set({ loadingConversations: false } as any);
      }
  },

  loadConversationMessages: async (id: string) => {
      const conv = get().conversations[id];
      if (!conv) {
          console.warn(`[ConversationSlice] Cannot load messages - conversation ${id} not found`);
          return;
      }
      
      // If messages are already loaded, skip
      if (conv.messages.length > 0) {
          console.log(`[ConversationSlice] Messages already loaded for ${id} (${conv.messages.length} msgs)`);
          return;
      }

      try {
          console.log(`[ConversationSlice] Loading messages for conversation ${id}...`);
          const fullConv = await window.electronAPI.aiConversationGet({ id });
          if (fullConv && fullConv.messages?.length > 0) {
              set(state => ({
                  conversations: {
                      ...state.conversations,
                      [id]: {
                          ...state.conversations[id],
                          messages: fullConv.messages.map(fromAIMessage),
                          updatedAt: fullConv.updatedAt
                      }
                  }
              }));
              console.log(`[ConversationSlice] Loaded ${fullConv.messages.length} messages for ${id}`);
          } else {
              console.log(`[ConversationSlice] No messages found for ${id}`);
          }
      } catch (err) {
          console.error(`Failed to load messages for conversation ${id}:`, err);
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
        // Auto-save session state
        get().saveSessionState();
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
          // Auto-save session state
          get().saveSessionState();
      } catch (err) {
          console.error('Failed to delete conversation:', err);
      }
  },

  setActiveConversationId: (id) => {
      set(state => {
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
      });

      // Load messages for the newly active conversation (lazy loading)
      if (id && !id.startsWith('draft-')) {
          get().loadConversationMessages(id);
      }

      // Auto-save session state
      get().saveSessionState();
  },

  closeConversation: (id) => {
      set(state => {
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
      });
      // Auto-save session state
      get().saveSessionState();
  },

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

    // ─── Draft-to-Real Transition ─────────────────────────────────
    if (targetId.startsWith('draft-')) {
        const draftId = targetId;
        const title = msg.content.substring(0, 30) || 'Chat';
        
        try {
            // 1. Create the real conversation in the backend (persisted to GunDB + local JSON)
            const aiConv = await window.electronAPI.aiConversationCreate({ title });
            const realId = aiConv.id;
            
            // 2. IMMEDIATELY persist the first message to the backend
            await window.electronAPI.aiConversationAddMessage({
                conversationId: realId,
                message: toAIMessage(msg)
            });
            
            // 3. Update the UI state atomically: replace draft with real conversation
            const newConversation = fromAIConversation(aiConv);
            newConversation.messages = [msg]; // Include the first message in UI state
            
            set(state => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [draftId]: _draft, ...restConversations } = state.conversations;
                
                const newTabs = state.tabs.map(t => 
                    t.id === draftId ? { ...t, id: realId, title: newConversation.title } : t
                );
                
                const newOpenIds = state.openConversationIds.map(id => id === draftId ? realId : id);
                
                return {
                    conversations: { ...restConversations, [realId]: newConversation },
                    activeConversationId: realId,
                    openConversationIds: newOpenIds,
                    tabs: newTabs,
                    activeTabId: realId
                };
            });
            
            // 4. Save session state with the real ID
            get().saveSessionState();
            
            console.log(`[ConversationSlice] Draft ${draftId} promoted to ${realId} with first message persisted`);
            
            // Message is already persisted above, so we return early
            // (don't fall through to the normal persist path below)
            
            // Implicit memory promotion for user messages
            if (msg.sender === 'user' && window.electronAPI.memoryProcessForPromotion) {
                try {
                    const promotions = await window.electronAPI.memoryProcessForPromotion({
                        content: msg.content,
                        role: 'user',
                        conversationId: realId
                    });
                    if (promotions && promotions.length > 0) {
                        console.log(`Auto-promoted ${promotions.length} memory fragment(s) from message`);
                    }
                } catch (err) {
                    console.warn('Implicit memory promotion failed:', err);
                }
            }
            
            return;
            
        } catch (err) {
            console.error('Failed to create real conversation from draft:', err);
            return;
        }
    }

    // ─── Normal Message Add (non-draft) ───────────────────────────
    
    // Update UI state optimistically
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

    // Persist to backend (GunDB + local JSON)
    try {
        await window.electronAPI.aiConversationAddMessage({
            conversationId: targetId!,
            message: toAIMessage(msg)
        });
    } catch (err) {
        console.error('Failed to persist message:', err);
    }

    // Auto-save session state after adding message
    get().saveSessionState();

    // Implicit memory promotion: scan user messages for promotable content
    if (msg.sender === 'user' && window.electronAPI.memoryProcessForPromotion) {
        try {
            const promotions = await window.electronAPI.memoryProcessForPromotion({
                content: msg.content,
                role: 'user',
                conversationId: targetId!
            });
            if (promotions && promotions.length > 0) {
                console.log(`Auto-promoted ${promotions.length} memory fragment(s) from message`);
            }
        } catch (err) {
            // Non-fatal: don't block chat flow for promotion failures
            console.warn('Implicit memory promotion failed:', err);
        }
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

  // ─── Session State Persistence ─────────────────────────────────────────

  saveSessionState: async () => {
      const { activeConversationId, openConversationIds } = get();
      try {
          await window.electronAPI.aiConversationSaveSessionState({
              activeConversationId,
              openConversationIds: openConversationIds.filter(id => !id.startsWith('draft-'))
          });
      } catch (err) {
          console.error('Failed to save conversation session state:', err);
      }
  },

  restoreSessionState: async () => {
      try {
          const sessionState = await window.electronAPI.aiConversationLoadSessionState();
          if (!sessionState) return;

          const { activeConversationId, openConversationIds } = sessionState;
          const conversations = get().conversations;

          // Check for missing conversations and try to fetch them
          const missingIds = openConversationIds.filter(id => !conversations[id]);
          if (missingIds.length > 0) {
              console.log(`[ConversationSlice] Attempting to recover ${missingIds.length} missing conversations...`);
              await Promise.all(missingIds.map(async (id) => {
                  try {
                      const conv = await window.electronAPI.aiConversationGet({ id });
                      if (conv) {
                          set(state => ({
                              conversations: {
                                  ...state.conversations,
                                  [id]: fromAIConversation(conv)
                              }
                          }));
                      }
                  } catch (e) {
                      console.warn(`Failed to recover conversation ${id}:`, e);
                  }
              }));
          }

          // Re-fetch conversations from state after potential recovery
          const updatedConversations = get().conversations;

          // Filter to only IDs that still exist in loaded conversations
          const validOpenIds = openConversationIds.filter(id => updatedConversations[id]);
          const validActiveId = activeConversationId && updatedConversations[activeConversationId]
              ? activeConversationId
              : (validOpenIds.length > 0 ? validOpenIds[validOpenIds.length - 1] : null);

          // Build tabs for open conversations
          const tabs: Tab[] = validOpenIds.map(id => ({
              id,
              type: 'chat' as const,
              title: updatedConversations[id]?.title || 'Chat'
          }));

          set({
              activeConversationId: validActiveId,
              openConversationIds: validOpenIds,
              tabs,
              activeTabId: validActiveId
          });

          // Load messages for the active conversation
          if (validActiveId) {
              get().loadConversationMessages(validActiveId);
          }

          console.log(`[ConversationSlice] Restored session state: active=${validActiveId}, open=[${validOpenIds.join(',')}]`);
      } catch (err) {
          console.error('Failed to restore conversation session state:', err);
      }
  },
});
