import { WorkflowConfig, RunnerOptions, WorkflowContext } from './types';
import { AIError } from './AIError';
import { runWithDepth } from './runWithDepth';
import { EnhancedEventEmitter } from './utils';
import { Logger } from './simpleLogger';
import { WorkflowState } from './WorkflowState';

export function createAIAssistantRunner(
    config: WorkflowConfig, 
    deps: WorkflowContext, 
    options: RunnerOptions = {}, 
    logger: Logger
) {
    const runner: any = new EnhancedEventEmitter();
    runner.config = config;
    runner.context = deps;
    
    // Initialize WorkflowState
    runner.state = new WorkflowState(deps.dsnNode, options.state, options.sessionId);

    runner.options = {
        maxDepth: options.maxDepth || 10,
        timeout: options.timeout || 30000,
        retryAttempts: options.retryAttempts || 3,
        retryDelay: options.retryDelay || 1000,
        defaultProvider: options.defaultProvider || 'default',
        cycleProviders: false
    };
    runner.logger = logger;
    logger.info('AIAssistantRunner initialized', { options: runner.options });
    
    runner.emit('initialized', { runner });
    
    // Attach run method to the instance for easier usage
    runner.run = (promptName: string, initialArgs: Record<string, any>, providerName?: string) => {
        return run(runner, promptName, initialArgs, providerName);
    };

    return runner;
}

export async function run(runner: any, promptName: string, initialArgs: Record<string, any>, providerName?: string): Promise<any> {
    const provider = providerName || runner.options.defaultProvider;
    
    if (runner.options.workflowName) {
        await runner.state.initialize(runner.options.workflowName);
    }

    runner.emit('runStart', { promptName, initialArgs, providerName: provider });

    try {
        runner.logger.info('Attempting run', { promptName, provider });
        runner.emit('providerAttempt', { provider, promptName });
        
        // We pass the provider ID string directly now
        const result = await runWithDepth(runner, promptName, initialArgs, provider, 0);
        
        runner.emit('runComplete', { result, provider, promptName });
        return result;
    } catch (error) {
        if (error instanceof AIError) {
            const eventContext = { error, promptName, provider };
            const shouldContinue = runner.emit('aiError', eventContext);
            
            runner.logger.error('AIError occurred', { error: error.message, details: error.details, stack: error.stack });
            
            throw error;
        } else {
            const eventContext = { error, promptName, provider };
            const shouldContinue = runner.emit('unexpectedError', eventContext);
            
            runner.logger.error('Unexpected error during execution', { error: (error as Error).message, stack: (error as Error).stack });
            
            throw new AIError('Unexpected error during execution', error);
        }
    }
}
