import { Config } from '../../types';

export const anthropic: Config['providers'][0] = {
    name: "anthropic",
    url: "https://api.anthropic.com/v1/complete",
    headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || '',
        "anthropic-version": "2023-06-01"
    },
    requestObject: {
        getMessage: (message: any) => ({ role: message.role, content: message.content }),
        getOptions: (options: any) => ({
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            stream: options.stream
        }),
    },
    request: (request: any) => {
        if (request.messages[0].role === 'system') {
            request.system = request.messages[0].content;
            request.messages.shift();
            return request;
        }
        return request;
    },
    toolFormat: {
        formatTools: (tools: any) => tools.map((tool: any) => {
            if (tool && typeof tool === 'object' && tool.type === 'function') {
                return {
                    type: 'function',
                    function: {
                        name: tool.function.name,
                        description: tool.function.description,
                        input_schema: tool.function.parameters
                    }
                };
            }
            return undefined;
        }).filter((tool: any) => tool !== undefined),
    },
    responseFormat: {
        getContent: (response: any) => response.content.find((item: any) => item.type === "text")?.text,
        getToolCall: (response: any) => response.content.find((item: any) => item.type === "tool_use"),
    }
};
