export interface AlephAIRequest {
    systemPrompt?: string;
    userPrompt: string;
    temperature?: number;
    model?: string;
    jsonMode?: boolean;
}

export interface AlephAIResponse {
    text: string;
    raw?: any;
}

export interface IAlephAI {
    complete(request: AlephAIRequest): Promise<AlephAIResponse>;
}

export interface PluginContext {
    dsn: {
        registerTool(toolDefinition: any, handler: Function): void;
    };
    ai: IAlephAI;
}
