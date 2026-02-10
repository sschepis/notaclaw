import { IAlephAI } from '../types';

export const httpClient = {
    create: (ai?: IAlephAI) => ({
        post: async (url: string, data: any, config: any) => {
            // Intercept calls to AlephAI virtual endpoint
            if (url === 'aleph-ai://complete' && ai) {
                // Simplified mapping: assumes last message is user prompt
                const lastMsg = data.messages[data.messages.length - 1];
                const systemMsg = data.messages.find((m: any) => m.role === 'system');
                
                try {
                    const response = await ai.complete({
                        userPrompt: lastMsg?.content || '', 
                        systemPrompt: systemMsg?.content,
                        jsonMode: data.response_format?.type === 'json_object',
                        model: data.model
                    });
                    
                    // Map AlephAI response back to OpenAI-like format expected by provider config
                    return {
                        data: {
                            choices: [{
                                message: {
                                    content: response.text,
                                    function_call: null // TODO: Handle tools mapping
                                }
                            }]
                        },
                        status: 200,
                        statusText: 'OK'
                    };
                } catch (e: any) {
                    throw new Error(`AlephAI Bridge Error: ${e.message}`);
                }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(config?.headers || {})
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }

            const json = await response.json();
            return {
                data: json,
                status: response.status,
                statusText: response.statusText
            };
        }
    })
};
