import Ajv from 'ajv'; 
import { Config } from '../types';
import { AIError } from './AIError';
import { formatMessages } from './formatMessages';
import { formatTools } from './formatTools';
import { makeRequestWithRetry } from './makeRequest';
import { executeFunction } from './executeFunction';
import { interpolate } from './utils';

export async function executePromptWithTimeout(runner: any, prompt: Config['prompts'][0], args: Record<string, any>, provider: Config['providers'][0]): Promise<any> {
    return new Promise((resolve, reject) => {
        const context = {
            prompt: prompt.name,
            timeout: runner.options.timeout,
            argsKeys: Object.keys(args),
            provider: provider.name
        };

        const timeoutId = setTimeout(() => {
            runner.emit('executionTimeout', context);
            runner.logger.error('[executePromptWithTimeout] Execution timeout', context);
            reject(new AIError('Execution timeout'));
        }, runner.options.timeout);

        executePrompt(runner, prompt, args, provider)
            .then(({ result, state }) => {
                runner.state = state;
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

async function executePrompt(runner: any, prompt: Config['prompts'][0], args: Record<string, any>, provider: Config['providers'][0]): Promise<{ result: any, state: any }> {
    const context = {
        promptName: prompt.name,
        argsKeys: Object.keys(args),
        providerName: provider.name
    };

    runner.emit('executePromptStart', context);
    runner.logger.debug(`[executePrompt] Starting prompt execution`, context);

    // Initialize work_products array and primaryTask if not present
    if (!runner.state) {
        runner.state = {};
    }
    if (!runner.state.work_products) {
        runner.state.work_products = [];
    }
    if (!runner.state.primaryTask) {
        runner.state.primaryTask = args.query || args.primaryTask || '';
    }

    // Include work_products and primaryTask in the args for formatMessages
    const messagesArgs = { ...args, state: runner.state };

    const messages = formatMessages(runner, prompt, messagesArgs);
    const tools = formatTools(runner, prompt.tools, provider);

    runner.emit('makeRequest', { ...context, messagesCount: messages.length, toolsCount: tools.length });
    const response = await makeRequestWithRetry(runner, provider, messages, tools);
    const content = provider.responseFormat.getContent(response);

    let parsedContent;
    try {
        parsedContent = JSON.parse(content || '{}');
        runner.emit('responseParseSuccess', { ...context, contentKeys: Object.keys(parsedContent) });
    } catch (error) {
        const parseErrorContext = {
            ...context,
            error: (error as Error).message,
            contentPreview: content ? content.substring(0, 100) + '...' : 'Empty content'
        };
        runner.emit('responseParseError', parseErrorContext);
        runner.logger.error('[executePrompt] Failed to parse JSON response', parseErrorContext);
        throw new AIError('Invalid JSON response from LLM');
    }

    // Validate the parsed content against the response format
    const ajv = new Ajv();
    const validate = ajv.compile(prompt.responseFormat);
    if (!validate(parsedContent)) {
        const validationErrorContext = {
            ...context,
            errors: validate.errors,
            contentKeys: Object.keys(parsedContent)
        };
        runner.emit('responseValidationError', validationErrorContext);
        runner.logger.error('[executePrompt] Response validation failed', validationErrorContext);
        throw new AIError('Response validation failed', validate.errors);
    }

    // Update state with parsed content
    runner.state = { ...runner.state, ...parsedContent };

    const toolCalls = provider.responseFormat.getToolCall?.(response);

    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        if (typeof toolCall.function?.name === 'undefined' || typeof toolCall.function?.arguments === 'undefined') {
            const invalidToolCallContext = {
                ...context,
                toolCallKeys: Object.keys(toolCall),
                functionKeys: toolCall.function ? Object.keys(toolCall.function) : 'undefined'
            };
            runner.emit('invalidToolCallStructure', invalidToolCallContext);
            runner.logger.error('[executePrompt] Invalid tool call structure', invalidToolCallContext);
            throw new AIError('Invalid tool call structure');
        }

        const toolCallContext = {
            ...context,
            toolName: toolCall.function.name,
            argumentKeys: Object.keys(toolCall.function.arguments)
        };
        runner.emit('toolCallDetected', toolCallContext);
        runner.logger.info(`[executePrompt] Tool call detected: ${toolCall.function.name}`, toolCallContext);

        try {
            const parsedArguments = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeFunction(runner, toolCall.function.name, parsedArguments);
            
            // Add tool call result to work_products
            runner.state.work_products.push({
                tool: toolCall.function.name,
                arguments: parsedArguments,
                result: toolResult
            });
            
            if (toolCall.function.name === 'completeTask') {
                runner.state.taskCompleted = true;
                const completionContext = { ...context, toolResult, taskCompleted: true };
                runner.emit('taskCompleted', completionContext);
                return { result: { ...toolResult, taskCompleted: true }, state: runner.state };
            }
            
            return executePrompt(runner, prompt, { ...args, toolResult }, provider);
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

    // Handle the "then" section based on the prompt's configuration
    for (const [condition, action] of Object.entries(prompt.then)) {
        const interpolatedCondition = interpolate(condition, { ...parsedContent, state: runner.state });
        if (new Function('state', `return ${interpolatedCondition}`)(runner.state)) {
            if ('prompt' in action) {
                const nextPrompt = runner.config.prompts.find((p: any) => p.name === action.prompt);
                if (!nextPrompt) {
                    const nextPromptErrorContext = { ...context, nextPromptName: action.prompt };
                    runner.emit('nextPromptNotFound', nextPromptErrorContext);
                    throw new AIError(`Next prompt "${action.prompt}" not found`);
                }
                const nextArgs = Object.entries(action.arguments).reduce((acc: any, [key, value]) => {
                    acc[key] = interpolate(value as string, { ...parsedContent, state: runner.state });
                    return acc;
                }, {});
                const nextPromptContext = { ...context, nextPromptName: action.prompt, nextArgsKeys: Object.keys(nextArgs) };
                runner.emit('nextPromptExecution', nextPromptContext);
                return executePrompt(runner, nextPrompt, nextArgs, provider);
            } else if ('function' in action) {
                const functionArgs = Object.entries(action.arguments).reduce((acc: any, [key, value]) => {
                    acc[key] = interpolate(value as string, { ...parsedContent, state: runner.state });
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
