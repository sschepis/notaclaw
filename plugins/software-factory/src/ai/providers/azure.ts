import { Config } from '../../types';

export const azure: Config['providers'][0] = {
    name: "azure",
    url: "https://nomyxazureopenai.openai.azure.com/openai/deployments/gpt4me/chat/completions?api-version=2023-05-15",
    headers: {
        "api-key": process.env.AZURE_API_KEY || '',
        "Content-Type": "application/json"
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
        // specify that we want json format as a response
        request.response_format = { type: "json_object" };
        return request;
    },
    toolFormat: {
        formatTools: (tools: any) => tools.map((tool: any) => {
            return tool && tool.getOpenAISchema()
        }).filter((tool: any) => tool !== undefined),
    },
    responseFormat: {
        getContent: (response: any) => response.choices[0].message.content,
        getToolCall: (response: any) => response.choices[0].message.function_call,
    }
};
