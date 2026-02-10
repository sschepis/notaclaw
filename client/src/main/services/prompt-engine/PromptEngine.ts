import { PromptContext, PromptEngineConfig, RunnerOptions } from './types';
import { PromptBuilder } from './PromptBuilder';
import { promptRegistry } from './PromptRegistry';
import { interpolate, safeEvaluate, EnhancedEventEmitter } from './utils';
import { AIError } from './AIError';

export class PromptEngine extends EnhancedEventEmitter {
    private config: PromptEngineConfig;
    private state: Record<string, any> = {};

    constructor(config: PromptEngineConfig) {
        super();
        this.config = config;
    }

    async execute(promptName: string, args: Record<string, any>, options: RunnerOptions = {}): Promise<any> {
        const template = promptRegistry.get(promptName);
        if (!template) {
            throw new AIError(`Prompt template '${promptName}' not found`);
        }

        // Merge state
        this.state = { ...this.state, ...options.state, ...args };

        // 1. Build System Prompt
        const context: PromptContext = {
            agentId: 'system',
            mode: 'full',
            workspaceDir: process.cwd(),
            state: this.state,
            tools: this.config.tools,
            runtime: {
                os: process.platform,
                time: new Date().toISOString(),
                model: options.defaultProvider || 'default'
            }
        };

        const builder = new PromptBuilder(context);
        
        if (this.config.tools && this.config.tools.length > 0) {
            builder.addToolDefinitions(this.config.tools);
        }

        // Add template content
        builder.addSection({
            id: 'template-system',
            priority: 50,
            content: interpolate(template.system, { ...args, state: this.state })
        });

        // Add response format instruction
        if (template.responseFormat && template.responseFormat !== 'text') {
            builder.addSection({
                id: 'response-format',
                priority: 10,
                content: `RESPONSE FORMAT: Respond using a raw JSON object with format ${JSON.stringify(template.responseFormat)}. Do NOT surround your JSON with codeblocks.`
            });
        }

        const systemPrompt = await builder.build();
        const userMessage = interpolate(template.user, { ...args, state: this.state });

        // 2. Prepare Request
        const provider = this.config.providers.find(p => p.name === (options.defaultProvider || this.config.defaultProvider));
        if (!provider) throw new AIError('No provider available');

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        // Format tools
        // In this simplified version, we assume tools are handled via the prompt description (handled by PromptBuilder)
        // or via native tool calling if supported by provider.
        // For now, let's assume the provider handles native tools if we pass them.
        const tools = provider.toolFormat.formatTools(this.config.tools);

        this.emit('requestStart', { promptName, messages, tools });

        // 3. Execute
        let response;
        try {
            console.log('[PromptEngine] Sending request to provider...');
            response = await provider.request({
                messages,
                tools,
                options: provider.requestObject.getOptions(options)
            });
            console.log('[PromptEngine] Got response:', JSON.stringify(response, null, 2).substring(0, 500));
        } catch (error) {
            console.error('[PromptEngine] Request error:', error);
            this.emit('requestError', { error });
            throw new AIError('Provider request failed', error);
        }

        // 4. Parse Response
        const content = provider.responseFormat.getContent(response);
        console.log('[PromptEngine] Extracted content:', content?.substring(0, 200));
        let parsedContent;
        
        if (!template.responseFormat || template.responseFormat === 'text') {
            parsedContent = { text: content };
        } else {
            try {
                parsedContent = JSON.parse(content || '{}');
            } catch (error) {
                throw new AIError('Invalid JSON response', { content });
            }
        }

        // Update state
        this.state = { ...this.state, ...parsedContent };

        // 5. Handle Tool Calls (if any)
        const toolCall = provider.responseFormat.getToolCall(response);
        console.log('[PromptEngine] Tool call detected:', toolCall ? JSON.stringify(toolCall) : 'none');
        if (toolCall) {
            const toolName = toolCall.function.name;
            let toolArgs: any;
            try {
                toolArgs = JSON.parse(toolCall.function.arguments);
            } catch {
                toolArgs = toolCall.function.arguments || {};
            }
            
            this.emit('toolCall', { toolName, toolArgs });
            
            const toolDef = this.config.tools.find(t => t.function.name === toolName);
            console.log('[PromptEngine] Looking for tool:', toolName, 'Found:', !!toolDef, 'Has script:', !!(toolDef?.function?.script));
            if (toolDef && toolDef.function.script) {
                try {
                    console.log('[PromptEngine] Executing tool:', toolName, 'with args:', JSON.stringify(toolArgs));
                    const result = await toolDef.function.script(toolArgs, context);
                    console.log('[PromptEngine] Tool result:', JSON.stringify(result)?.substring(0, 500));
                    
                    // Return the tool result for the caller to handle re-prompting
                    // Include any text from the initial response as well
                    return { 
                        text: parsedContent.text || '', 
                        toolResult: result,
                        toolName: toolName,
                        raw: response
                    };
                } catch (err) {
                    console.error('[PromptEngine] Tool execution error:', err);
                    throw new AIError(`Tool execution failed: ${toolName}`, err);
                }
            } else {
                console.warn('[PromptEngine] Tool not found:', toolName);
                // Tool not found - return an error message
                return {
                    text: `[Error] Tool "${toolName}" not found or has no implementation.`,
                    toolResult: null,
                    raw: response
                };
            }
        }

        // 6. Handle 'Then' Logic
        if (template.then) {
            for (const [condition, action] of Object.entries(template.then)) {
                const interpolatedCondition = interpolate(condition, { ...parsedContent, state: this.state });
                if (safeEvaluate(interpolatedCondition, { ...parsedContent, state: this.state })) {
                    if (action.prompt) {
                        const nextArgs = interpolate(action.arguments, { ...parsedContent, state: this.state });
                        return this.execute(action.prompt, nextArgs, options);
                    } else if (action.function) {
                        // Execute function directly if registered as a tool
                        const funcName = action.function;
                        const funcArgs = interpolate(action.arguments, { ...parsedContent, state: this.state });
                        const toolDef = this.config.tools.find(t => t.function.name === funcName);
                        if (toolDef && toolDef.function.script) {
                            return toolDef.function.script(funcArgs, context);
                        }
                    }
                }
            }
        }

        return parsedContent;
    }
}
