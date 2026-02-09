import { useAppStore } from '../../../src/renderer/store/useAppStore';

// Mock window.electronAPI
const mockElectronAPI = {
  aiConversationCreate: jest.fn().mockResolvedValue({
    id: 'conv-1',
    title: 'New Conversation',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),
  aiConversationAddMessage: jest.fn().mockResolvedValue(true),
  aiConversationList: jest.fn().mockResolvedValue([]),
  aiConversationDelete: jest.fn().mockResolvedValue({ deleted: true }),
  aiConversationUpdate: jest.fn().mockResolvedValue({
    id: 'conv-1',
    title: 'Updated Title',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

// Helper to reset store to initial state
const resetStore = () => {
  useAppStore.setState({
    conversations: {},
    activeConversationId: null,
    isOnboarded: false,
    wallet: { balance: 0, staked: 0 },
    agent: { state: 'Idle', freeEnergy: 0 },
    activeAgents: [],
    smf: new Array(16).fill(0),
    network: { peers: 0, latency: 0, nodeId: '', status: 'OFFLINE' },
    hasIdentity: false,
    activeSidebarView: 'explorer',
    loadingConversations: false,
    loadingMessages: false,
  });
};

describe('useAppStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('should have empty conversations object', () => {
      expect(useAppStore.getState().conversations).toEqual({});
    });

    it('should have zero wallet balance', () => {
      expect(useAppStore.getState().wallet.balance).toBe(0);
      expect(useAppStore.getState().wallet.staked).toBe(0);
    });

    it('should have idle agent state', () => {
      expect(useAppStore.getState().agent.state).toBe('Idle');
    });

    it('should have 16-dimensional SMF vector', () => {
      expect(useAppStore.getState().smf).toHaveLength(16);
    });

    it('should not have identity', () => {
      expect(useAppStore.getState().hasIdentity).toBe(false);
    });
  });

  describe('conversation management', () => {
    it('should create a conversation', async () => {
      const convId = await useAppStore.getState().createConversation('Test Conversation');
      
      expect(convId).toBe('conv-1');
      expect(mockElectronAPI.aiConversationCreate).toHaveBeenCalled();
    });

    it('should set active conversation id', () => {
      // Create a conversation first
      useAppStore.setState({
        conversations: {
          'conv-1': {
            id: 'conv-1',
            title: 'Test',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        }
      });
      
      useAppStore.getState().setActiveConversationId('conv-1');
      
      expect(useAppStore.getState().activeConversationId).toBe('conv-1');
    });

    it('should add message to conversation', async () => {
      // Setup: Create conversation with active ID
      useAppStore.setState({
        conversations: {
          'conv-1': {
            id: 'conv-1',
            title: 'Test',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        },
        activeConversationId: 'conv-1'
      });
      
      const message = {
        id: 'msg-1',
        content: 'Hello',
        type: 'cognitive' as const,
        sender: 'user' as const,
        timestamp: new Date().toISOString(),
      };
      
      await useAppStore.getState().addMessage(message);
      
      const conversation = useAppStore.getState().conversations['conv-1'];
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe('Hello');
    });
  });

  describe('setWallet', () => {
    it('should update wallet state', () => {
      const wallet = { balance: 100, staked: 50 };
      
      useAppStore.getState().setWallet(wallet);
      
      expect(useAppStore.getState().wallet).toEqual(wallet);
    });
  });

  describe('setAgentState', () => {
    it('should update agent state', () => {
      const agent = { state: 'Perceiving' as const, freeEnergy: 0.5 };
      
      useAppStore.getState().setAgentState(agent);
      
      expect(useAppStore.getState().agent).toEqual(agent);
    });

    it('should support all agent states', () => {
      const states: Array<'Idle' | 'Perceiving' | 'Minimizing Free Energy' | 'Acting'> = [
        'Idle',
        'Perceiving',
        'Minimizing Free Energy',
        'Acting',
      ];
      
      states.forEach(state => {
        useAppStore.getState().setAgentState({ state, freeEnergy: 0 });
        expect(useAppStore.getState().agent.state).toBe(state);
      });
    });
  });

  describe('setActiveAgents', () => {
    it('should update active agents list', () => {
      const agents = [
        { id: '1', name: 'Agent 1', status: 'idle' as const, type: 'analyst' },
        { id: '2', name: 'Agent 2', status: 'busy' as const, type: 'writer' },
      ];
      
      useAppStore.getState().setActiveAgents(agents);
      
      expect(useAppStore.getState().activeAgents).toEqual(agents);
    });
  });

  describe('setSMF', () => {
    it('should update SMF vector', () => {
      const smf = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      
      useAppStore.getState().setSMF(smf);
      
      expect(useAppStore.getState().smf).toEqual(smf);
    });
  });

  describe('setNetwork', () => {
    it('should update network state', () => {
      const network = { peers: 5, latency: 100, nodeId: 'node-1', status: 'ONLINE' as const };
      
      useAppStore.getState().setNetwork(network);
      
      expect(useAppStore.getState().network).toEqual(network);
    });
  });

  describe('setHasIdentity', () => {
    it('should update identity flag', () => {
      expect(useAppStore.getState().hasIdentity).toBe(false);
      
      useAppStore.getState().setHasIdentity(true);
      
      expect(useAppStore.getState().hasIdentity).toBe(true);
    });
  });

  describe('setActiveSidebarView', () => {
    it('should update active sidebar view', () => {
      expect(useAppStore.getState().activeSidebarView).toBe('explorer');
      
      useAppStore.getState().setActiveSidebarView('extensions');
      
      expect(useAppStore.getState().activeSidebarView).toBe('extensions');
    });

    it('should support all sidebar views', () => {
      const views: Array<'explorer' | 'extensions' | 'settings'> = [
        'explorer',
        'extensions',
        'settings',
      ];
      
      views.forEach(view => {
        useAppStore.getState().setActiveSidebarView(view);
        expect(useAppStore.getState().activeSidebarView).toBe(view);
      });
    });
  });
});
