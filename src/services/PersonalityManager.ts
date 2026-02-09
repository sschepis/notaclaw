import { AIProviderManager } from './AIProviderManager';
import { AIRequestOptions, AIResponse } from '../shared/ai-types';

export class PersonalityManager {
    private aiManager: AIProviderManager;

    constructor(aiManager: AIProviderManager) {
        this.aiManager = aiManager;
    }

    /**
     * Handles interaction with the AI provider.
     * 
     * In the headless node, this is a simplified version of the client's PersonalityManager.
     * It currently bypasses complex memory context retrieval and personality switching,
     * focusing on direct task execution and response generation.
     * 
     * @param content - The user message or task input.
     * @param metadata - Context metadata (providerId, model, resonance, mode).
     */
    async handleInteraction(content: string, metadata: any): Promise<AIResponse> {
        try {
            const options: AIRequestOptions = {
                contentType: metadata.mode === 'Code' ? 'code' : (metadata.mode === 'Agent' ? 'agent' : 'chat'),
                providerId: metadata.providerId,
                model: metadata.model,
                temperature: metadata.resonance ? metadata.resonance / 100 : 0.7,
                maxTokens: 2048
            };

            // TODO: Implement memory context retrieval via DSNNode if needed for tasks.
            // For now, we rely on the prompt containing sufficient context.

            // Construct a basic prompt structure
            const prompt = `User: ${content}\nAssistant:`;

            console.log(`[PersonalityManager] Processing request with model ${options.model || 'default'}`);
            
            return await this.aiManager.processRequest(prompt, options);
        } catch (error) {
            console.error('[PersonalityManager] Error handling interaction:', error);
            return {
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                model: metadata.model || 'unknown',
                providerId: metadata.providerId || 'system',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
        }
    }
}
