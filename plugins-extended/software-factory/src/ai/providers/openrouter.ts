import { Config } from '../../types';
import { AIError } from '../../engine/AIError';

declare const process: any;

export const openrouter: Config['providers'][0] = {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    },
    request: (request: any) => {
        request.response_format = { type: "json_object" };
        return request;
    },
    requestObject: {
        getMessage: (message: any) => ({ role: message.role, content: message.content }),
        getOptions: (options: any) => ({
            model: options.model,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            stream: options.stream
        }),
    },
    toolFormat: {
        formatTools: (tools: any) => tools.map((tool: any) => {
            if (tool && typeof tool === 'object' && tool.type === 'function') {
                return {
                    type: 'function',
                    function: {
                        name: tool.function.name,
                        description: tool.function.description,
                        parameters: tool.function.parameters
                    }
                };
            }
            return undefined;
        }).filter((tool: any) => tool !== undefined),
    },
    responseFormat: {
        getContent: (response: any) => {
            if (response.error) {
                throw new AIError(`OpenRouter API Error: ${response.error.message}`, response.error);
            }
            if (!response.choices || response.choices.length === 0) {
                throw new AIError('OpenRouter API returned an empty response');
            }
            return response.choices[0].message.content;
        },
        getToolCall: (response: any) => {
            if (response.error) {
                throw new AIError(`OpenRouter API Error: ${response.error.message}`, response.error);
            }
            if (!response.choices || response.choices.length === 0) {
                throw new AIError('OpenRouter API returned an empty response');
            }
            return response.choices[0].message.tool_calls;
        },
    }
};
