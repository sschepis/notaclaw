import { PersonalityManager } from '../../../src/main/services/PersonalityManager';
import { AIProviderManager } from '../../../src/main/services/AIProviderManager';
import { AlephNetClient } from '../../../src/main/services/AlephNetClient';
import { ConversationManager } from '../../../src/main/services/ConversationManager';

// Mock dependencies
jest.mock('../../../src/main/services/AIProviderManager');
jest.mock('../../../src/main/services/AlephNetClient');
jest.mock('../../../src/main/services/ConversationManager');

describe('PersonalityManager', () => {
    let personalityManager: PersonalityManager;
    let mockAI: jest.Mocked<AIProviderManager>;
    let mockClient: jest.Mocked<AlephNetClient>;
    let mockConvManager: jest.Mocked<ConversationManager>;

    beforeEach(() => {
        mockAI = new AIProviderManager() as jest.Mocked<AIProviderManager>;
        mockClient = new AlephNetClient(null as any, null as any, null as any, null as any) as jest.Mocked<AlephNetClient>;
        mockConvManager = new ConversationManager(null as any, null as any) as jest.Mocked<ConversationManager>;
        
        personalityManager = new PersonalityManager(mockAI);
        personalityManager.setAlephNetClient(mockClient);
        personalityManager.setConversationManager(mockConvManager);
    });

    describe('getCorePersonality', () => {
        it('should create core personality if not found', async () => {
            mockClient.memoryList.mockResolvedValue([]);
            mockClient.memoryCreate.mockResolvedValue({ id: 'core-id', name: 'Core Personality' } as any);
            mockClient.memoryStore.mockResolvedValue({} as any);

            const result = await personalityManager.getCorePersonality();

            expect(mockClient.memoryCreate).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Core Personality',
                scope: 'user'
            }));
            expect(result.id).toBe('core-id');
        });

        it('should return existing core personality', async () => {
            mockClient.memoryList.mockResolvedValue([{ id: 'existing-id', name: 'Core Personality' } as any]);

            const result = await personalityManager.getCorePersonality();

            expect(mockClient.memoryCreate).not.toHaveBeenCalled();
            expect(result.id).toBe('existing-id');
        });
    });

    describe('handleInteraction', () => {
        it('should orchestrate interaction correctly', async () => {
            // Setup mocks
            mockClient.memoryList.mockResolvedValue([{ id: 'core-id', name: 'Core Personality' } as any]);
            mockClient.memoryQuery.mockResolvedValueOnce({ fragments: [{ content: 'System Prompt', significance: 1 } as any] }); // Core query
            mockConvManager.getConversation.mockResolvedValue({ id: 'conv-1', memoryFieldId: 'mem-1' } as any);
            mockClient.memoryQuery.mockResolvedValueOnce({ fragments: [{ content: 'Context 1', timestamp: 100 } as any] }); // Context query
            
            mockAI.processRequest.mockResolvedValue({
                content: 'AI Response',
                model: 'gpt-4',
                providerId: 'openai',
                usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
            });

            const response = await personalityManager.handleInteraction('User Input', { conversationId: 'conv-1' });

            // Verify
            expect(mockAI.processRequest).toHaveBeenCalledWith(
                expect.stringContaining('System Prompt'),
                expect.any(Object)
            );
            expect(mockAI.processRequest).toHaveBeenCalledWith(
                expect.stringContaining('Context 1'),
                expect.any(Object)
            );
            expect(mockClient.memoryStore).toHaveBeenCalledTimes(2); // User input + AI response
            expect(response.content).toBe('AI Response');
        });
    });

    describe('setCorePersonalityLock', () => {
        it('should call memoryUpdate with locked status', async () => {
            mockClient.memoryList.mockResolvedValue([{ id: 'core-id', name: 'Core Personality' } as any]);
            mockClient.memoryUpdate.mockResolvedValue({} as any);

            await personalityManager.setCorePersonalityLock(true);

            expect(mockClient.memoryUpdate).toHaveBeenCalledWith({
                fieldId: 'core-id',
                updates: { locked: true }
            });
        });
    });
});
