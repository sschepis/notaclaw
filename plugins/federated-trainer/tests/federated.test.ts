import { activate } from '../src/index';

const mockContext = {
    storage: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined)
    },
    dsn: {
        registerTool: jest.fn()
    },
    ipc: {
        send: jest.fn(),
        on: jest.fn()
    }
};

describe('Federated Trainer', () => {
    let toolHandler: any = null;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        mockContext.dsn.registerTool.mockImplementation((tool, handler) => {
            if (tool.name === 'startTrainingRound') {
                toolHandler = handler;
            }
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should activate and register tool', async () => {
        activate(mockContext as any);
        expect(mockContext.dsn.registerTool).toHaveBeenCalled();
        expect(toolHandler).toBeDefined();
    });

    test('should start a training round', async () => {
        activate(mockContext as any);
        
        const result = await toolHandler({ modelId: 'gpt-4-finetune', epochs: 5 });
        
        expect(result.status).toBe('round_initiated');
        expect(result.roundId).toContain('rnd_');
        
        // Verify storage was updated
        expect(mockContext.storage.set).toHaveBeenCalledWith(
            'training-rounds',
            expect.objectContaining({
                [result.roundId]: expect.objectContaining({
                    modelId: 'gpt-4-finetune',
                    epochs: 5,
                    status: 'initializing'
                })
            })
        );
        
        // Verify IPC notification
        expect(mockContext.ipc.send).toHaveBeenCalledWith(
            'training-update',
            expect.arrayContaining([
                expect.objectContaining({ modelId: 'gpt-4-finetune' })
            ])
        );
    });
});
