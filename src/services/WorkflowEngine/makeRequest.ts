import { AIProviderManager } from '../AIProviderManager';
import { AIRequestOptions, AIResponse } from '../../shared/ai-types';
import { AIError } from './AIError';

export async function makeRequestWithRetry(
    runner: any, 
    providerId: string, 
    messages: any[], 
    tools: any[], 
    attempt: number = 1
): Promise<AIResponse> {
    const aiManager: AIProviderManager = runner.context.aiManager;
    
    const context = {
        providerId,
        attempt,
        messageCount: messages.length,
        toolCount: tools.length,
        maxAttempts: runner.options.retryAttempts
    };

    try {
        runner.emit('makeRequestAttempt', context);
        runner.logger.debug(`[makeRequestWithRetry] Attempting request`, context);

        const options: AIRequestOptions = {
            contentType: 'agent',
            providerId: providerId === 'default' ? undefined : providerId,
            // model: undefined, // Could be passed in runner options if needed
            temperature: 0.7,
            maxTokens: 4096
        };

        // Use processChatRequest for chat-based interactions with tools
        const response = await aiManager.processChatRequest(messages, tools, options);
        
        runner.emit('makeRequestSuccess', { ...context, response });
        return response;

    } catch (error) {
        if (attempt < runner.options.retryAttempts) {
            const retryContext = {
                ...context,
                error: (error as Error).message,
                nextAttemptIn: `${runner.options.retryDelay}ms`
            };
            runner.emit('makeRequestRetry', retryContext);
            runner.logger.warn(`[makeRequestWithRetry] Request failed, retrying`, retryContext);
            
            await new Promise(resolve => setTimeout(resolve, runner.options.retryDelay));
            return makeRequestWithRetry(runner, providerId, messages, tools, attempt + 1);
        }
        
        const maxRetryContext = {
            ...context,
            error: (error as Error).message,
            stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n')
        };
        runner.emit('makeRequestMaxRetryReached', maxRetryContext);
        runner.logger.error('[makeRequestWithRetry] Max retry attempts reached', maxRetryContext);
        throw error;
    }
}
