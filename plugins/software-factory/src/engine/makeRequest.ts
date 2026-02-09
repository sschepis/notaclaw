import { Config } from '../types';
import { AIError } from './AIError';

export async function makeRequestWithRetry(runner: any, provider: Config['providers'][0], messages: any[], tools: any[], attempt: number = 1): Promise<any> {
    const context = {
        provider: provider.name,
        url: provider.url,
        attempt: attempt,
        messageCount: messages.length,
        toolCount: tools.length,
        maxAttempts: runner.options.retryAttempts
    };

    try {
        runner.emit('makeRequestAttempt', context);
        runner.logger.debug(`[makeRequestWithRetry] Attempting request to provider`, context);
        return await makeRequest(runner, provider, messages, tools);
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
            return makeRequestWithRetry(runner, provider, messages, tools, attempt + 1);
        }
        const maxRetryContext = {
            ...context,
            error: (error as Error).message,
            stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n') // Only log first 3 lines of stack trace
        };
        runner.emit('makeRequestMaxRetryReached', maxRetryContext);
        runner.logger.error('[makeRequestWithRetry] Max retry attempts reached', maxRetryContext);
        throw error;
    }
}

async function makeRequest(runner: any, provider: Config['providers'][0], messages: any[], tools: any[]): Promise<any> {
    const requestBody = provider.request({
        messages,
        tools,
        ...provider.requestObject.getOptions({})
    });

    const context = {
        provider: provider.name,
        url: provider.url,
        messageCount: messages.length,
        toolCount: tools.length
    };

    runner.emit('makeRequestStart', context);
    runner.logger.info(`[makeRequest] Sending request to provider`, context);

    try {
        const response = await runner.httpClient.post(provider.url, requestBody, { headers: provider.headers });

        const responseContext = {
            ...context,
            status: response.status,
            statusText: response.statusText,
            dataKeys: Object.keys(response.data),
            dataPreview: JSON.stringify(response.data).substring(0, 100) + '...'
        };

        runner.emit('makeRequestSuccess', responseContext);
        runner.logger.debug('[makeRequest] Provider response received', responseContext);

        return response.data;
    } catch (error) {
        const errorContext = {
            ...context,
            error: (error as Error).message,
            stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n') // Only log first 3 lines of stack trace
        };
        runner.emit('makeRequestError', errorContext);
        runner.logger.error('[makeRequest] Error making request to provider', errorContext);
        throw new AIError('Error making request to provider', error);
    }
}
