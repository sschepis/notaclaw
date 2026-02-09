export type Config = {
    providers: Array<{
        name: string;
        url: string;
        headers: Record<string, string>;
        requestObject: {
            getMessage: (message: any) => { role: string; content: string | { type: string; text: string } };
            getOptions: (options: any) => Record<string, any>;
        };
        request: (request: any) => any;
        toolFormat: {
            formatTools: (tools: any[]) => any[];
            formatTool?: (tool: any) => any;
        };
        responseFormat: {
            getContent: (response: any) => string | undefined;
            getToolCall: (response: any) => any;
        };
    }>;
    defaultProvider?: string;
    tools: Array<{
        type: string;
        function: {
            name: string;
            description?: string;
            parameters: {
                type: string;
                properties: Record<string, {
                    type: string;
                    description?: string;
                    properties?: Record<string, {
                        type: string;
                        description?: string;
                    }>;
                }>;
                required: string[];
            };
            script: (parameters: any, context: any) => Promise<any>;
        };
    }>;
    prompts: Array<{
        name: string;
        system: string;
        user: string;
        requestFormat: Record<string, string>;
        responseFormat: Record<string, any>;
        tools?: Array<string | { funcName: (parameters: any, context: any) => any }>;
        then: Record<string, {
            prompt?: string;
            function?: string;
            arguments: any;
        }>;
    }>;
};

export interface RunnerOptions {
    maxDepth?: number;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    defaultProvider?: string;
    cycleProviders?: boolean;
    state?: Record<string, any>;
}

export interface IAlephAI {
    complete(options: {
        userPrompt: string;
        systemPrompt?: string;
        jsonMode?: boolean;
        model?: string;
        temperature?: number;
    }): Promise<{ text: string; raw: any }>;
}

export interface PluginDSN {
    registerTool(definition: any, handler: (params: any) => Promise<any>): void;
    registerService(definition: any, handler: any): void;
    publishObservation(content: string, smf: number[]): void;
    getIdentity(): Promise<any>;
}
