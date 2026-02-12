import { activate } from '../src/index';

const mockContext = {
    dsn: {
        registerTool: jest.fn(),
        publishObservation: jest.fn()
    }
};

// Mock ChatEngine
jest.mock('../src/ChatEngine', () => {
    return {
        ChatEngine: jest.fn().mockImplementation(() => {
            return {
                init: jest.fn().mockResolvedValue({}),
                identityManager: {
                    getUser: jest.fn().mockReturnValue({ id: 'did:test', name: 'TestUser' })
                },
                networkManager: {
                    getPeerId: jest.fn().mockReturnValue('QmTestPeerId')
                },
                createConversation: jest.fn().mockResolvedValue({ id: 'conv_1', participants: ['did:test'] }),
                sendMessage: jest.fn().mockResolvedValue({ id: 'msg_1', content: 'hello' }),
                getMessages: jest.fn().mockResolvedValue([{ id: 'msg_1', content: 'hello' }])
            };
        })
    };
});

describe('Entangled Chat', () => {
    let tools: any = {};
    let handlers: any = {};

    beforeEach(() => {
        jest.clearAllMocks();
        tools = {};
        handlers = {};
        
        // @ts-ignore
        mockContext.dsn.registerTool.mockImplementation((tool: any, handler: any) => {
            tools[tool.name] = tool;
            handlers[tool.name] = handler;
        });
    });

    test('should register tools', () => {
        activate(mockContext as any);
        expect(mockContext.dsn.registerTool).toHaveBeenCalledTimes(5);
        expect(tools['initializeIdentity']).toBeDefined();
        expect(tools['createConversation']).toBeDefined();
        expect(tools['sendMessage']).toBeDefined();
        expect(tools['getMessages']).toBeDefined();
        expect(tools['getNetworkState']).toBeDefined();
    });

    test('initializeIdentity should call chatEngine.init', async () => {
        activate(mockContext as any);
        const handler = handlers['initializeIdentity'];
        const result = await handler({ username: 'Alice' });
        expect(result.status).toBe('success');
        expect(result.user).toBeDefined();
    });

    test('createConversation should return conversation', async () => {
        activate(mockContext as any);
        const handler = handlers['createConversation'];
        const result = await handler({ participants: ['Bob'], type: 'direct' });
        expect(result.status).toBe('success');
        expect(result.conversation.id).toBe('conv_1');
    });

    test('sendMessage should return message', async () => {
        activate(mockContext as any);
        const handler = handlers['sendMessage'];
        const result = await handler({ conversationId: 'conv_1', content: 'Hello' });
        expect(result.status).toBe('success');
        expect(result.message.content).toBe('hello');
    });
});
