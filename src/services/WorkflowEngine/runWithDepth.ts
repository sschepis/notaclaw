import { WorkflowConfig } from './types';
import { AIError } from './AIError';
import { interpolateArgs, evaluateConditions } from './utils';
import { executePromptWithTimeout } from './executePrompt';
import { executeFunction } from './executeFunction';

export async function runWithDepth(runner: any, promptName: string, args: Record<string, any>, providerId: string, depth: number): Promise<any> {
    const context = {
        prompt: promptName,
        depth: depth,
        provider: providerId,
        argsKeys: Object.keys(args)
    };

    runner.emit('runWithDepthStart', context);

    runner.logger.debug(`[runWithDepth] Starting execution`, context);

    if (depth >= runner.options.maxDepth) {
        const maxDepthContext = {
            ...context,
            currentDepth: depth,
            maxDepth: runner.options.maxDepth
        };
        runner.emit('maxDepthReached', maxDepthContext);
        runner.logger.warn(`[runWithDepth] Max depth reached`, maxDepthContext);
        throw new AIError('Max depth reached');
    }

    const currentPrompt = getPrompt(runner, promptName);
    if (!currentPrompt) {
        const promptNotFoundContext = {
            ...context,
            requestedPrompt: promptName,
            availablePrompts: runner.config.prompts.map((p: any) => p.name).join(', ')
        };
        runner.emit('promptNotFound', promptNotFoundContext);
        runner.logger.error(`[runWithDepth] Prompt not found`, promptNotFoundContext);
        throw new AIError(`Prompt "${promptName}" not found`);
    }

    const executeContext = {
        ...context,
        promptSystem: currentPrompt.system.substring(0, 50) + '...'
    };
    runner.emit('executePrompt', executeContext);
    runner.logger.info(`[runWithDepth] Executing prompt: ${currentPrompt.name}`, executeContext);

    const result = await executePromptWithTimeout(runner, currentPrompt, args, providerId);
    
    const resultContext = {
        ...context,
        resultKeys: Object.keys(result),
        resultPreview: JSON.stringify(result).substring(0, 100) + '...'
    };
    runner.emit('promptExecutionCompleted', resultContext);
    runner.logger.debug(`[runWithDepth] Prompt execution completed`, resultContext);

    const currentState = runner.state.getAll();
    const nextStep = evaluateConditions(currentPrompt.then, { ...result, state: currentState });
    const nextStepContext = {
        ...context,
        nextStepType: nextStep.type,
        nextStepName: nextStep.type === 'prompt' ? nextStep.name : nextStep.type === 'function' ? nextStep.name : 'None'
    };
    runner.emit('nextStepEvaluated', nextStepContext);
    runner.logger.debug(`[runWithDepth] Next step evaluation`, nextStepContext);

    if (nextStep.type === 'prompt') {
        const interpolatedArgs = interpolateArgs(nextStep.arguments, { ...result, state: currentState });
        return runWithDepth(runner, nextStep.name, interpolatedArgs, providerId, depth + 1);
    } else if (nextStep.type === 'function') {
        const interpolatedArgs = interpolateArgs(nextStep.arguments, { ...result, state: currentState });
        return executeFunction(runner, nextStep.name, interpolatedArgs);
    } else {
        runner.emit('runWithDepthComplete', { ...context, result });
        return result;
    }
}

function getPrompt(runner: any, name: string): WorkflowConfig['prompts'][0] | undefined {
    const prompt = runner.config.prompts.find((p: any) => p.name === name);
    if (!prompt) {
        const promptNotFoundContext = {
            requestedPrompt: name,
            availablePrompts: runner.config.prompts.map((p: any) => p.name).join(', ')
        };
        runner.emit('getPromptFailed', promptNotFoundContext);
        runner.logger.warn(`[getPrompt] Prompt not found`, promptNotFoundContext);
    }
    return prompt;
}
