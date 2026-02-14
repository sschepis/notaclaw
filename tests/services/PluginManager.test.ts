import { PluginManager } from '../../src/services/PluginManager';
import { PersonalityManager } from '../../src/services/PersonalityManager';
import { TraitDefinition } from '../../src/shared/trait-types';

// Mock dependencies
const mockDSNNode = { getConfig: jest.fn() } as any;
const mockAIManager = {} as any;
const mockSecretsManager = {} as any;
const mockEnvelopeService = {} as any;
const mockTrustEvaluator = {} as any;
const mockTrustGate = {} as any;
const mockServiceRegistry = {} as any;

describe('PluginManager', () => {
    let pluginManager: PluginManager;
    let mockPersonalityManager: jest.Mocked<PersonalityManager>;

    beforeEach(() => {
        mockPersonalityManager = {
            registerTrait: jest.fn(),
            unregisterTrait: jest.fn(),
            getTrait: jest.fn()
        } as any;

        pluginManager = new PluginManager(
            mockDSNNode,
            mockAIManager,
            mockSecretsManager,
            mockEnvelopeService,
            mockTrustEvaluator,
            mockTrustGate,
            mockServiceRegistry,
            mockPersonalityManager
        );
    });

    describe('Context Creation (Traits)', () => {
        // We need to access the private method or inspect the context passed to plugins.
        // Since executePlugin is protected, we can subclass or just look at how it creates context.
        // But better is to simulate a plugin loading or inspect the context creation logic via a spy/mock if possible.
        // Or simply trust the types? No, we need runtime verification.
        
        // We can access the protected createContextWithDecisions via type casting or subclassing for test.
        it('should expose traits.register in plugin context', () => {
            // @ts-ignore - Accessing protected method for testing
            const context = pluginManager.createContextWithDecisions({ id: 'test-plugin' } as any);
            
            expect(context.traits).toBeDefined();
            expect(typeof context.traits.register).toBe('function');
        });

        it('should delegate trait registration to PersonalityManager with source attribution', () => {
            // @ts-ignore
            const context = pluginManager.createContextWithDecisions({ id: 'test-plugin' } as any);
            
            const trait: TraitDefinition = {
                id: 'my-trait',
                name: 'My Trait',
                description: 'Desc',
                instruction: 'Do stuff',
                activationMode: 'global'
            };

            context.traits.register(trait);

            expect(mockPersonalityManager.registerTrait).toHaveBeenCalledWith(expect.objectContaining({
                ...trait,
                source: 'test-plugin'
            }));
        });

        it('should allow unregistering own traits', () => {
            // @ts-ignore
            const context = pluginManager.createContextWithDecisions({ id: 'test-plugin' } as any);
            
            mockPersonalityManager.getTrait.mockReturnValue({ source: 'test-plugin' } as any);

            context.traits.unregister('my-trait');

            expect(mockPersonalityManager.unregisterTrait).toHaveBeenCalledWith('my-trait');
        });

        it('should prevent unregistering other plugins traits', () => {
            // @ts-ignore
            const context = pluginManager.createContextWithDecisions({ id: 'test-plugin' } as any);
            
            mockPersonalityManager.getTrait.mockReturnValue({ source: 'other-plugin' } as any);

            context.traits.unregister('other-trait');

            expect(mockPersonalityManager.unregisterTrait).not.toHaveBeenCalled();
        });
    });
});
