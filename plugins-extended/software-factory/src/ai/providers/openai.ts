import { Config } from '../../types';

export const openai: Config['providers'][0] = {
    name: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
    },
    requestObject: {
        getMessage: (message: any) => ({ role: message.role, content: message.content }),
        getOptions: (options: any) => ({
            model: 'gpt-4o',
        }),
    },
    request: (request: any) => {
        // specify that we want json format as a response
        request.response_format = { type: "json_object" };
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
                        parameters: tool.function.parameters
                    }
                };
            }
            return undefined;
        }).filter((tool: any) => tool !== undefined),
    },
    responseFormat: {
        getContent: (response: any) => response.choices[0].message.content,
        getToolCall: (response: any) => response.choices[0].message.function_call,
    }
};
