import { AIProvider } from '../types';
import { AIProviderManager } from '../../AIProviderManager';
import { AIRequestOptions } from '../../../../shared/ai-types';

export class AIProviderManagerAdapter implements AIProvider {
    name: string;
    url: string = '';
    headers: Record<string, string> = {};
    
    constructor(private manager: AIProviderManager, private providerId: string) {
        this.name = providerId;
    }

    requestObject = {
        getMessage: (msg: any) => ({ role: msg.role, content: msg.content }),
        getOptions: (opts: any) => opts
    };

    request = async (req: any) => {
        const options: AIRequestOptions = {
            contentType: 'chat',
            providerId: this.providerId,
            model: req.options?.model,
            temperature: req.options?.temperature,
            maxTokens: req.options?.maxTokens
        };

        console.log('[AIProviderManagerAdapter] Processing chat request...');
        
        // Pass messages directly — they may contain multimodal content objects
        // (e.g., { text, imageAttachments } instead of plain string content)
        const response = await this.manager.processChatRequest(req.messages, req.tools || [], options);
        console.log('[AIProviderManagerAdapter] Raw response content:', response.content?.substring(0, 200));
        console.log('[AIProviderManagerAdapter] Tool calls:', response.toolCalls ? JSON.stringify(response.toolCalls) : 'none');
        
        return {
            text: response.content,
            raw: response,
            toolCalls: response.toolCalls
        };
    };

    toolFormat = {
        formatTools: (tools: any[]) => tools,
        formatTool: (tool: any) => tool
    };

    responseFormat = {
        getContent: (res: any) => res.text,
        getToolCall: (res: any) => {
            if (res.toolCalls && res.toolCalls.length > 0) {
                // Vercel AI SDK returns toolCalls array
                // We map the first one to our expected format
                const call = res.toolCalls[0];
                return {
                    function: {
                        name: call.function?.name || call.name, // Vercel AI SDK structure varies by provider sometimes
                        arguments: typeof call.function?.arguments === 'string'
                            ? call.function.arguments
                            : (call.args ? JSON.stringify(call.args) : '{}')
                    }
                };
            }
            return null;
        }
    };
}
