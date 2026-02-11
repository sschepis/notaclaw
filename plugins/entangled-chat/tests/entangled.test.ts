import { activate } from '../src/index';

const mockContext = {
    dsn: {
        registerTool: jest.fn(),
        publishObservation: jest.fn()
    }
};

describe('Entangled Chat', () => {
    let tools: any = {};
    let handlers: any = {};

    beforeEach(() => {
        jest.clearAllMocks();
        tools = {};
        handlers = {};
        
        mockContext.dsn.registerTool.mockImplementation((tool: any, handler: any) => {
            tools[tool.name] = tool;
            handlers[tool.name] = handler;
        });
    });

    test('should register tools', () => {
        activate(mockContext as any);
        expect(mockContext.dsn.registerTool).toHaveBeenCalledTimes(3);
        expect(tools['updateTopics']).toBeDefined();
        expect(tools['sendMessage']).toBeDefined();
        expect(tools['getNetworkState']).toBeDefined();
    });

    test('sendMessage should route to matching peers', async () => {
        activate(mockContext as any);
        const sendMessage = handlers['sendMessage'];
        
        const result = await sendMessage({ content: "Hello Quantum", topics: ["quantum"] });
        
        // node_alpha has topic 'quantum'
        expect(result.recipientCount).toBeGreaterThan(0);
        expect(result.recipients).toContain('node_alpha');
        
        expect(mockContext.dsn.publishObservation).toHaveBeenCalledWith(
            expect.stringContaining('node_alpha'), 
            expect.anything()
        );
    });
});
