/**
 * MomentaryContextService - Generates and manages compressed situational summaries
 * 
 * After each AI exchange, this service produces a "momentary context" — a compact
 * object that captures:
 * 1. The overarching goal/task the user is pursuing
 * 2. What was just accomplished in this turn
 * 3. The predicted next step / likely follow-up
 * 4. Suggested next actions the user might take (2-4 clickable options)
 *
 * This replaces shipping full conversation history by acting as a compressed,
 * continuously-updated "working memory". Combined with on-demand MemoryField
 * queries, it gives the AI sufficient context without the token cost of the
 * full transcript.
 */

import { AIProviderManager } from './AIProviderManager';
import { AIRequestOptions } from '../../shared/ai-types';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MomentaryContext {
    /** The overarching task/intent the user is pursuing */
    goal: string;
    /** What was just accomplished in this exchange */
    accomplishment: string;
    /** Predicted next step or likely follow-up topic */
    predictedNext: string;
    /** 2-4 suggested next actions the user might take */
    suggestedActions: string[];
    /** When this context was generated */
    timestamp: number;
    /** Number of exchanges this context has been maintained across */
    turnCount: number;
}

/** The prompt used to generate momentary context */
const CONTEXT_GENERATION_PROMPT = `You are a context summarization engine. Given a user message, an AI response, and optionally a previous context summary, produce a JSON object that captures the current conversational state.

Your output MUST be a valid JSON object with these exact fields:
{
  "goal": "The overarching task or intent the user is pursuing (1-2 sentences)",
  "accomplishment": "What was just accomplished or discussed in this exchange (1 sentence)",
  "predictedNext": "What the user is likely to ask or do next (1 sentence)",
  "suggestedActions": ["2-4 short, actionable follow-up suggestions the user might click"]
}

Rules:
- Be concise. Each field should be 1-2 sentences max.
- suggestedActions should be natural language phrases a user would type, not commands.
- suggestedActions should be diverse — don't repeat variations of the same thing.
- If the conversation is exploratory/open-ended, the goal should reflect that.
- Output ONLY the JSON object. No markdown, no explanation, no code fences.`;

// ─── Service ──────────────────────────────────────────────────────────────

export class MomentaryContextService {
    /** In-memory cache of momentary contexts per conversation */
    private contexts: Map<string, MomentaryContext> = new Map();
    private aiManager: AIProviderManager;

    constructor(aiManager: AIProviderManager) {
        this.aiManager = aiManager;
    }

    /**
     * Generate a new momentary context after an exchange.
     * This is called asynchronously after the response is sent to the user —
     * it does NOT block the response delivery.
     */
    async generateContext(
        conversationId: string,
        userMessage: string,
        aiResponse: string,
        providerId?: string
    ): Promise<MomentaryContext> {
        const previous = this.contexts.get(conversationId);
        
        // Build the user prompt with all relevant context
        let userPrompt = `User message: "${userMessage.substring(0, 500)}"

AI response: "${aiResponse.substring(0, 1000)}"`;

        if (previous) {
            userPrompt += `

Previous context summary:
- Goal: ${previous.goal}
- Last accomplishment: ${previous.accomplishment}
- Predicted next: ${previous.predictedNext}
- Turn count: ${previous.turnCount}`;
        }

        try {
            const options: AIRequestOptions = {
                contentType: 'chat',
                providerId,
                temperature: 0.3,  // Low temperature for consistent summaries
                maxTokens: 300,    // Context should be compact
            };

            const result = await this.aiManager.processRequest(
                `${CONTEXT_GENERATION_PROMPT}\n\n${userPrompt}`,
                options
            );

            const parsed = this.parseContextResponse(result.content);
            const context: MomentaryContext = {
                goal: parsed.goal || 'General conversation',
                accomplishment: parsed.accomplishment || 'Responded to user query',
                predictedNext: parsed.predictedNext || 'Continue discussion',
                suggestedActions: parsed.suggestedActions || [],
                timestamp: Date.now(),
                turnCount: (previous?.turnCount || 0) + 1,
            };

            // Cache the context
            this.contexts.set(conversationId, context);
            return context;

        } catch (err) {
            console.warn('[MomentaryContextService] Failed to generate context:', err);
            
            // Return a minimal fallback context
            const fallback: MomentaryContext = {
                goal: previous?.goal || 'General conversation',
                accomplishment: 'Responded to user query',
                predictedNext: 'Continue discussion',
                suggestedActions: [],
                timestamp: Date.now(),
                turnCount: (previous?.turnCount || 0) + 1,
            };
            this.contexts.set(conversationId, fallback);
            return fallback;
        }
    }

    /**
     * Get the current momentary context for a conversation.
     * Returns null if no context has been generated yet.
     */
    getContext(conversationId: string): MomentaryContext | null {
        return this.contexts.get(conversationId) || null;
    }

    /**
     * Format the momentary context as a string suitable for injection
     * into a system prompt.
     */
    formatForPrompt(conversationId: string): string {
        const ctx = this.contexts.get(conversationId);
        if (!ctx) return '';

        return `
## Current Conversation Context
- **Goal**: ${ctx.goal}
- **Last Exchange**: ${ctx.accomplishment}
- **Likely Next**: ${ctx.predictedNext}
- **Turn Count**: ${ctx.turnCount}
- **Context Age**: ${Math.round((Date.now() - ctx.timestamp) / 1000)}s ago
`;
    }

    /**
     * Clear the momentary context for a conversation (e.g., when conversation is deleted).
     */
    clearContext(conversationId: string): void {
        this.contexts.delete(conversationId);
    }

    /**
     * Parse the AI response into a MomentaryContext-compatible object.
     * Handles various response formats gracefully.
     */
    private parseContextResponse(content: string): Partial<MomentaryContext> {
        try {
            // Strip any markdown code fences the AI might have included
            let cleaned = content.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }
            
            const parsed = JSON.parse(cleaned);
            
            // Validate suggestedActions is an array of strings
            if (parsed.suggestedActions && Array.isArray(parsed.suggestedActions)) {
                parsed.suggestedActions = parsed.suggestedActions
                    .filter((a: any) => typeof a === 'string' && a.trim())
                    .slice(0, 4); // Max 4 suggestions
            } else {
                parsed.suggestedActions = [];
            }
            
            return parsed;
        } catch {
            console.warn('[MomentaryContextService] Failed to parse context response:', content?.substring(0, 200));
            return {};
        }
    }
}
