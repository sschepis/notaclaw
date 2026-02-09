"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlephAIService = void 0;
class AlephAIService {
    constructor() {
        this.geminiKey = process.env.GEMINI_API_KEY || '';
        if (!this.geminiKey) {
            console.warn('[AlephAI] GEMINI_API_KEY not found in environment. AI calls will fail.');
        }
    }
    async complete(request) {
        if (!this.geminiKey)
            throw new Error('AlephAI: Missing API Key');
        // Default to Gemini 2.5 Flash if not specified
        const model = request.model || 'gemini-2.5-flash-preview-09-2025';
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: request.userPrompt }] }],
                    systemInstruction: request.systemPrompt ? { parts: [{ text: request.systemPrompt }] } : undefined,
                    generationConfig: {
                        responseMimeType: request.jsonMode ? "application/json" : "text/plain",
                        temperature: request.temperature ?? 0.7
                    }
                })
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`AlephAI Error ${response.status}: ${err}`);
            }
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return { text, raw: data };
        }
        catch (error) {
            console.error('[AlephAI] Request failed:', error);
            throw error;
        }
    }
}
exports.AlephAIService = AlephAIService;
