import { formatMessages } from '../../../src/services/WorkflowEngine/formatMessages';
import { PersonalityManager } from '../../../src/services/PersonalityManager';

describe('WorkflowEngine Trait Integration', () => {
    let mockRunner: any;
    let mockPersonalityManager: Partial<PersonalityManager>;

    beforeEach(() => {
        mockPersonalityManager = {
            decorateSystemPrompt: jest.fn((prompt) => prompt + ' [DECORATED]')
        };

        mockRunner = {
            state: {
                primaryTask: 'test task'
            },
            context: {
                personalityManager: mockPersonalityManager
            },
            logger: {
                debug: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            }
        };
    });

    it('should decorate system prompt using PersonalityManager', () => {
        const prompt = {
            name: 'test',
            system: 'Base system prompt',
            user: 'User prompt',
            requestFormat: {},
            responseFormat: {}
        };

        const args = { query: 'test' };

        const messages = formatMessages(mockRunner, prompt as any, args);

        expect(mockPersonalityManager.decorateSystemPrompt).toHaveBeenCalled();
        expect(messages[0].content).toContain('Base system prompt [DECORATED]');
    });

    it('should pass context to decorateSystemPrompt', () => {
        const prompt = {
            name: 'test',
            system: 'System',
            user: 'User',
            requestFormat: {},
            responseFormat: {}
        };

        const args = { 
            query: 'test',
            activeTraits: ['trait1'] 
        };

        formatMessages(mockRunner, prompt as any, args);

        expect(mockPersonalityManager.decorateSystemPrompt).toHaveBeenCalledWith(
            'System',
            expect.objectContaining({
                activeTraits: ['trait1']
            })
        );
    });

    it('should fallback gracefully if PersonalityManager is missing', () => {
        mockRunner.context.personalityManager = undefined;

        const prompt = {
            name: 'test',
            system: 'Base system prompt',
            user: 'User prompt',
            requestFormat: {},
            responseFormat: {}
        };

        const messages = formatMessages(mockRunner, prompt as any, {});
        expect(messages[0].content).toContain('Base system prompt');
        expect(messages[0].content).not.toContain('[DECORATED]');
    });
});
