import { Config } from '../../types';

export const vertexAnthropic: Config['providers'][0] = {
    name: "vertex-anthropic",
    url: "https://us-east5-aiplatform.googleapis.com/v1/projects/silent-blade-417120/locations/us-east5/publishers/anthropic/models/claude-3-5-sonnet@20240620:rawPredict",
    headers: {
        "Authorization": `Bearer ${process.env.VERTEX_API_KEY}`,
        "Content-Type": "application/json"
    },
    requestObject: {
        getMessage: (message: any) => ({
            role: message.role, content: {
                type: 'text',
                text: message.content
            }
        }),
        getOptions: (options: any) => ({
            anthropic_version: "vertex-2023-10-16",
            max_tokens: options.maxTokens,
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
