import { Config, RunnerOptions } from '../types';
import { AIError } from './AIError';
import { runWithDepth } from './runWithDepth';
import { EnhancedEventEmitter } from './utils';
import { Logger } from './simpleLogger';
import { httpClient } from './httpClient';
import { IAlephAI } from '../types';

export function createAIAssistantRunner(config: Config, options: RunnerOptions = {}, logger: Logger, ai?: IAlephAI) {
    const runner: any = new EnhancedEventEmitter();
    runner.config = config;
    runner.context = {};
    runner.state = options.state || {};
    runner.httpClient = httpClient.create(ai);
    runner.options = {
        maxDepth: options.maxDepth || 10,
        timeout: options.timeout || 30000,
        retryAttempts: options.retryAttempts || 3,
        retryDelay: options.retryDelay || 1000,
        defaultProvider: options.defaultProvider || config.providers[0].name,
        cycleProviders: false
    };
    runner.logger = logger;
    logger.info('AIAssistantRunner initialized', { options: runner.options });
    
    runner.emit('initialized', { runner });
    
    return runner;
}

export async function run(runner: any, promptName: string, initialArgs: Record<string, any>, providerName?: string): Promise<any> {
    const providers = [providerName || runner.options.defaultProvider, ...runner.config.providers.map((p: any) => p.name).filter((p: any) => p !== (providerName || runner.options.defaultProvider))];
    
    runner.emit('runStart', { promptName, initialArgs, providerName });

    for (const provider of providers) {
        try {
            runner.logger.info('Attempting run with provider', { promptName, provider });
            runner.emit('providerAttempt', { provider, promptName });
            
            const selectedProvider = getProvider(runner, provider);
            const result = await runWithDepth(runner, promptName, initialArgs, selectedProvider, 0);
            
            runner.emit('runComplete', { result, provider, promptName });
            return result;
        } catch (error) {
            if (error instanceof AIError) {
                const eventContext = { error, promptName, provider };
                const shouldContinue = runner.emit('aiError', eventContext);
                
                runner.logger.error('AIError occurred', { error: error.message, details: error.details, stack: error.stack });
                
                if (!shouldContinue || provider === providers[providers.length - 1]) {
                    throw error; // Throw error if it's the last provider or if the event handler prevented continuation
                }
            } else {
                const eventContext = { error, promptName, provider };
                const shouldContinue = runner.emit('unexpectedError', eventContext);
                
                runner.logger.error('Unexpected error during execution', { error: (error as Error).message, stack: (error as Error).stack });
                
                if (!shouldContinue || provider === providers[providers.length - 1]) {
                    throw new AIError('Unexpected error during execution', error);
                }
            }
            if(runner.options.cycleProviders) {
                runner.logger.warn('Provider failed, trying next provider', { failedProvider: provider });
                runner.emit('providerFailed', { provider, promptName });
            } else {
                // throw new AIError('An error occurred', error);
                throw error;
            }
        }
    }
    
    const allProvidersFailedError = new AIError('All providers failed');
    runner.emit('allProvidersFailed', { error: allProvidersFailedError, promptName });
    throw allProvidersFailedError;
}

function getProvider(runner: any, name: string): Config['providers'][0] {
    const provider = runner.config.providers.find((p: any) => p.name === name);
    if (!provider) {
        const error = new AIError(`Provider "${name}" not found`);
        runner.emit('providerNotFound', { name, availableProviders: runner.config.providers.map((p: any) => p.name), error });
        runner.logger.error('Provider not found', { name, availableProviders: runner.config.providers.map((p: any) => p.name) });
        throw error;
    }
    return provider;
}
