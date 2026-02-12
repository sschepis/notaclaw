import Ajv from 'ajv'; 
import { WorkflowConfig } from './types';
import { AIError } from './AIError';
import { formatMessages } from './formatMessages';
import { formatTools } from './formatTools';
import { makeRequestWithRetry } from './makeRequest';
import { executeFunction } from './executeFunction';
import { interpolate } from './utils';

export async function executePromptWithTimeout(runner: any, prompt: WorkflowConfig['prompts'][0], args: Record<string, any>, providerId: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const context = {
            prompt: prompt.name,
            timeout: runner.options.timeout,
            argsKeys: Object.keys(args),
            provider: providerId
        };

        const timeoutId = setTimeout(() => {
            runner.emit('executionTimeout', context);
            runner.logger.error('[executePromptWithTimeout] Execution timeout', context);
            reject(new AIError('Execution timeout'));
        }, runner.options.timeout);

        executePrompt(runner, prompt, args, providerId)
            .then(({ result, state }) => {
                runner.emit('executionComplete', { ...context, result });
                resolve(result);
            })
            .catch(error => {
                runner.emit('executionError', { ...context, error });
                reject(error);
            })
            .finally(() => clearTimeout(timeoutId));
    });
}

async function executePrompt(runner: any, prompt: WorkflowConfig['prompts'][0], args: Record<string, any>, providerId: string): Promise<{ result: any, state: any }> {
    const context = {
        promptName: prompt.name,
        argsKeys: Object.keys(args),
        providerName: providerId
    };

    runner.emit('executePromptStart', context);
    runner.logger.debug(`[executePrompt] Starting prompt execution`, context);

    // Initialize state defaults
    if (!runner.state.get('work_products')) {
        runner.state.set('work_products', []);
    }
    if (!runner.state.get('primaryTask')) {
        runner.state.set('primaryTask', args.query || args.primaryTask || '');
    }

    const currentState = runner.state.getAll();
    const messagesArgs = { ...args, state: currentState };

    const messages = formatMessages(runner, prompt, messagesArgs);
    const tools = formatTools(runner, prompt.tools);

    runner.emit('makeRequest', { ...context, messagesCount: messages.length, toolsCount: tools.length });
    const response = await makeRequestWithRetry(runner, providerId, messages, tools);
    
    let parsedContent: any = {};
    if (response.content) {
        try {
            let contentStr = response.content.trim();
            if (contentStr.startsWith('```json')) {
                contentStr = contentStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (contentStr.startsWith('```')) {
                contentStr = contentStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            parsedContent = JSON.parse(contentStr || '{}');
            runner.emit('responseParseSuccess', { ...context, contentKeys: Object.keys(parsedContent) });
        } catch (error) {
            if (!response.toolCalls || response.toolCalls.length === 0) {
                const parseErrorContext = {
                    ...context,
                    error: (error as Error).message,
                    contentPreview: response.content ? response.content.substring(0, 100) + '...' : 'Empty content'
                };
                runner.emit('responseParseError', parseErrorContext);
                runner.logger.error('[executePrompt] Failed to parse JSON response', parseErrorContext);
            }
        }
    }

    // Validate if parsed content exists
    if (Object.keys(parsedContent).length > 0) {
        const ajv = new Ajv();
        const validate = ajv.compile(prompt.responseFormat);
        if (!validate(parsedContent)) {
            if (!response.toolCalls || response.toolCalls.length === 0) {
                const validationErrorContext = {
                    ...context,
                    errors: validate.errors,
                    contentKeys: Object.keys(parsedContent)
                };
                runner.emit('responseValidationError', validationErrorContext);
                runner.logger.error('[executePrompt] Response validation failed', validationErrorContext);
                throw new AIError('Response validation failed', validate.errors);
            }
        }
        runner.state.update(parsedContent);
    }

    if (response.toolCalls && response.toolCalls.length > 0) {
        const toolCall = response.toolCalls[0];
        
        const toolCallContext = {
            ...context,
            toolName: toolCall.name,
            argumentKeys: Object.keys(toolCall.arguments)
        };
        runner.emit('toolCallDetected', toolCallContext);
        runner.logger.info(`[executePrompt] Tool call detected: ${toolCall.name}`, toolCallContext);

        try {
            const toolResult = await executeFunction(runner, toolCall.name, toolCall.arguments);
            
            const workProducts = runner.state.get('work_products') || [];
            workProducts.push({
                tool: toolCall.name,
                arguments: toolCall.arguments,
                result: toolResult
            });
            runner.state.set('work_products', workProducts);
            
            if (toolCall.name === 'completeTask') {
                runner.state.set('taskCompleted', true);
                const completionContext = { ...context, toolResult, taskCompleted: true };
                runner.emit('taskCompleted', completionContext);
                return { result: { ...toolResult, taskCompleted: true }, state: runner.state };
            }
            
            return executePrompt(runner, prompt, { ...args, toolResult }, providerId);
        } catch (error) {
            const toolErrorContext = {
                ...toolCallContext,
                error: (error as Error).message,
                stack: (error as Error).stack
            };
            runner.emit('toolExecutionError', toolErrorContext);
            runner.logger.error('[executePrompt] Error executing tool', toolErrorContext);
            throw new AIError('Error executing tool', error);
        }
    }

    const executionResultContext = {
        ...context,
        resultKeys: Object.keys(parsedContent),
        resultPreview: JSON.stringify(parsedContent).substring(0, 100) + '...'
    };
    runner.emit('promptExecutionResult', executionResultContext);
    runner.logger.debug('[executePrompt] Prompt execution result', executionResultContext);

    const updatedState = runner.state.getAll();

    for (const [condition, action] of Object.entries(prompt.then)) {
        const interpolatedCondition = interpolate(condition, { ...parsedContent, state: updatedState });
        if (new Function('state', `return ${interpolatedCondition}`)(updatedState)) {
            if ('prompt' in action) {
                const nextPrompt = runner.config.prompts.find((p: any) => p.name === action.prompt);
                if (!nextPrompt) {
                    const nextPromptErrorContext = { ...context, nextPromptName: action.prompt };
                    runner.emit('nextPromptNotFound', nextPromptErrorContext);
                    throw new AIError(`Next prompt "${action.prompt}" not found`);
                }
                const nextArgs = Object.entries(action.arguments).reduce((acc: any, [key, value]) => {
                    acc[key] = interpolate(value as string, { ...parsedContent, state: updatedState });
                    return acc;
                }, {});
                const nextPromptContext = { ...context, nextPromptName: action.prompt, nextArgsKeys: Object.keys(nextArgs) };
                runner.emit('nextPromptExecution', nextPromptContext);
                return executePrompt(runner, nextPrompt, nextArgs, providerId);
            } else if ('function' in action) {
                const functionArgs = Object.entries(action.arguments).reduce((acc: any, [key, value]) => {
                    acc[key] = interpolate(value as string, { ...parsedContent, state: updatedState });
                    return acc;
                }, {});
                const nextFunctionContext = {
                    ...context,
                    nextStep: {
                        type: 'function',
                        name: action.function,
                        argumentKeys: Object.keys(functionArgs)
                    }
                };
                runner.emit('nextFunctionExecution', nextFunctionContext);
                runner.logger.debug('[executePrompt] Next step evaluation', nextFunctionContext);
                const functionResult = await executeFunction(runner, action.function || '', functionArgs);
                return { result: functionResult, state: runner.state };
            }
        }
    }

    return { result: parsedContent, state: runner.state };
}
