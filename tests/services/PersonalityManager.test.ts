import { PersonalityManager } from '../../src/services/PersonalityManager';
import { AIProviderManager } from '../../src/services/AIProviderManager';
import { TraitDefinition } from '../../src/shared/trait-types';

jest.mock('../../src/services/AIProviderManager');

describe('PersonalityManager', () => {
    let personalityManager: PersonalityManager;
    let mockAiManager: jest.Mocked<AIProviderManager>;

    beforeEach(() => {
        mockAiManager = new AIProviderManager() as jest.Mocked<AIProviderManager>;
        personalityManager = new PersonalityManager(mockAiManager);
    });

    describe('Trait Management', () => {
        const testTrait: TraitDefinition = {
            id: 'test-trait',
            name: 'Test Trait',
            description: 'A test trait',
            instruction: 'Always speak in rhymes.',
            activationMode: 'global',
            priority: 10
        };

        it('should register a trait', () => {
            personalityManager.registerTrait(testTrait);
            const traits = personalityManager.listTraits();
            expect(traits).toContainEqual(testTrait);
            expect(personalityManager.getTrait('test-trait')).toEqual(testTrait);
        });

        it('should unregister a trait', () => {
            personalityManager.registerTrait(testTrait);
            personalityManager.unregisterTrait('test-trait');
            expect(personalityManager.getTrait('test-trait')).toBeUndefined();
        });
    });

    describe('System Prompt Assembly', () => {
        const basePrompt = 'You are a helpful assistant.';

        it('should return base prompt when no traits are registered', () => {
            const result = personalityManager.assembleSystemPrompt('chat');
            // Depending on default prompts, but essentially checks it returns *something* reasonable
            expect(result).toContain('You are a helpful assistant');
        });

        it('should inject global traits', () => {
            personalityManager.registerTrait({
                id: 'global-trait',
                name: 'Global',
                description: '',
                instruction: 'GLOBAL_INSTRUCTION',
                activationMode: 'global'
            });

            const result = personalityManager.assembleSystemPrompt('chat');
            expect(result).toContain('GLOBAL_INSTRUCTION');
            expect(result).toContain('### Global');
        });

        it('should inject dynamic traits when triggered', () => {
            personalityManager.registerTrait({
                id: 'dynamic-trait',
                name: 'Dynamic',
                description: '',
                instruction: 'DYNAMIC_INSTRUCTION',
                activationMode: 'dynamic',
                triggerKeywords: ['trigger', 'keyword']
            });

            // Should not appear without trigger
            const resultNoTrigger = personalityManager.assembleSystemPrompt('chat', { text: 'nothing here' });
            expect(resultNoTrigger).not.toContain('DYNAMIC_INSTRUCTION');

            // Should appear with trigger
            const resultTrigger = personalityManager.assembleSystemPrompt('chat', { text: 'this contains a trigger keyword' });
            expect(resultTrigger).toContain('DYNAMIC_INSTRUCTION');
        });

        it('should inject manual traits when requested', () => {
            personalityManager.registerTrait({
                id: 'manual-trait',
                name: 'Manual',
                description: '',
                instruction: 'MANUAL_INSTRUCTION',
                activationMode: 'manual'
            });

            const result = personalityManager.assembleSystemPrompt('chat', { activeTraits: ['manual-trait'] });
            expect(result).toContain('MANUAL_INSTRUCTION');
        });

        it('should respect priority order', () => {
            personalityManager.registerTrait({
                id: 'low-prio',
                name: 'Low',
                description: '',
                instruction: 'LOW',
                activationMode: 'global',
                priority: 1
            });
            personalityManager.registerTrait({
                id: 'high-prio',
                name: 'High',
                description: '',
                instruction: 'HIGH',
                activationMode: 'global',
                priority: 100
            });

            const result = personalityManager.assembleSystemPrompt('chat');
            const lowIndex = result.indexOf('LOW');
            const highIndex = result.indexOf('HIGH');
            
            // Higher priority should appear first in the instructions list
            expect(highIndex).toBeLessThan(lowIndex);
        });
    });
});
