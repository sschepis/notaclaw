import { AIProviderManager } from './AIProviderManager';
import { AIRequestOptions, AIResponse } from '../shared/ai-types';

// ---------------------------------------------------------------------------
// Conversation History (2.4.2)
// ---------------------------------------------------------------------------

export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ConversationSession {
    id: string;
    messages: ConversationMessage[];
    createdAt: number;
    lastActiveAt: number;
    metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// System Prompt Templates (2.4.3)
// ---------------------------------------------------------------------------

export interface SystemPromptTemplate {
    id: string;
    name: string;
    content: string;
    /** content types this template applies to, or '*' for all */
    appliesTo: string[];
}

const DEFAULT_SYSTEM_PROMPTS: SystemPromptTemplate[] = [
    {
        id: 'default-chat',
        name: 'Default Chat',
        content: 'You are a helpful assistant running as a headless node in the Resonant Terminal network. Answer questions clearly and concisely.',
        appliesTo: ['chat'],
    },
    {
        id: 'default-code',
        name: 'Code Assistant',
        content: 'You are an expert programmer. Write clean, well-documented code. Explain your reasoning when asked.',
        appliesTo: ['code'],
    },
    {
        id: 'default-agent',
        name: 'Agent Mode',
        content: 'You are an autonomous agent in the Resonant Terminal distributed network. You have access to tools and can execute tasks. Think step by step, use tools when appropriate, and report results clearly.',
        appliesTo: ['agent'],
    },
];

// Maximum messages to keep per session (sliding window)
const MAX_HISTORY_LENGTH = 50;

// Maximum concurrent sessions
const MAX_SESSIONS = 20;

export class PersonalityManager {
    private aiManager: AIProviderManager;
    private sessions: Map<string, ConversationSession> = new Map();
    private systemPrompts: SystemPromptTemplate[] = [...DEFAULT_SYSTEM_PROMPTS];
    private customSystemPrompt: string | null = null;

    constructor(aiManager: AIProviderManager) {
        this.aiManager = aiManager;
    }

    // -----------------------------------------------------------------------
    // System Prompt Management (2.4.3)
    // -----------------------------------------------------------------------

    /**
     * Get the system prompt for a given content type.
     */
    getSystemPrompt(contentType: string): string {
        // Custom override takes priority
        if (this.customSystemPrompt) return this.customSystemPrompt;

        const template = this.systemPrompts.find(
            t => t.appliesTo.includes(contentType) || t.appliesTo.includes('*')
        );
        return template?.content || DEFAULT_SYSTEM_PROMPTS[0].content;
    }

    /**
     * Set a custom system prompt that overrides all templates.
     */
    setCustomSystemPrompt(prompt: string | null): void {
        this.customSystemPrompt = prompt;
    }

    /**
     * Add or update a system prompt template.
     */
    upsertSystemPromptTemplate(template: SystemPromptTemplate): void {
        const idx = this.systemPrompts.findIndex(t => t.id === template.id);
        if (idx >= 0) {
            this.systemPrompts[idx] = template;
        } else {
            this.systemPrompts.push(template);
        }
    }

    /**
     * List all system prompt templates.
     */
    listSystemPromptTemplates(): SystemPromptTemplate[] {
        return [...this.systemPrompts];
    }

    // -----------------------------------------------------------------------
    // Conversation Session Management (2.4.2)
    // -----------------------------------------------------------------------

    /**
     * Create or retrieve a conversation session.
     */
    getOrCreateSession(sessionId: string, metadata?: Record<string, unknown>): ConversationSession {
        let session = this.sessions.get(sessionId);
        if (!session) {
            // Evict oldest if at capacity
            if (this.sessions.size >= MAX_SESSIONS) {
                this.evictOldestSession();
            }
            session = {
                id: sessionId,
                messages: [],
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
                metadata,
            };
            this.sessions.set(sessionId, session);
        }
        return session;
    }

    /**
     * Add a message to a session's history.
     */
    addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): void {
        const session = this.getOrCreateSession(sessionId);
        session.messages.push({ role, content, timestamp: Date.now() });
        session.lastActiveAt = Date.now();

        // Sliding window: keep last N messages (always preserve system messages)
        if (session.messages.length > MAX_HISTORY_LENGTH) {
            const systemMsgs = session.messages.filter(m => m.role === 'system');
            const nonSystemMsgs = session.messages.filter(m => m.role !== 'system');
            session.messages = [...systemMsgs, ...nonSystemMsgs.slice(-MAX_HISTORY_LENGTH + systemMsgs.length)];
        }
    }

    /**
     * Get conversation history for a session.
     */
    getHistory(sessionId: string): ConversationMessage[] {
        return this.sessions.get(sessionId)?.messages || [];
    }

    /**
     * Clear a session's history.
     */
    clearSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    /**
     * List active session IDs.
     */
    listSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    private evictOldestSession(): void {
        let oldest: string | null = null;
        let oldestTime = Infinity;
        for (const [id, session] of this.sessions) {
            if (session.lastActiveAt < oldestTime) {
                oldestTime = session.lastActiveAt;
                oldest = id;
            }
        }
        if (oldest) this.sessions.delete(oldest);
    }

    // -----------------------------------------------------------------------
    // Interaction Handler (enhanced with history + system prompts)
    // -----------------------------------------------------------------------

    /**
     * Handles interaction with the AI provider.
     * 
     * Now supports:
     * - System prompt injection based on content type (2.4.3)
     * - Conversation history via sessionId (2.4.2)
     * 
     * @param content - The user message or task input.
     * @param metadata - Context metadata (providerId, model, resonance, mode, sessionId).
     */
    async handleInteraction(content: string, metadata: any): Promise<AIResponse> {
        try {
            const contentType = metadata.mode === 'Code' ? 'code' : (metadata.mode === 'Agent' ? 'agent' : 'chat');

            const options: AIRequestOptions = {
                contentType,
                providerId: metadata.providerId,
                model: metadata.model,
                temperature: metadata.resonance ? metadata.resonance / 100 : 0.7,
                maxTokens: metadata.maxTokens || 2048
            };

            const systemPrompt = this.getSystemPrompt(contentType);

            // Session-based conversation with history
            if (metadata.sessionId) {
                const session = this.getOrCreateSession(metadata.sessionId, { mode: metadata.mode });

                // Inject system prompt if session is new
                if (session.messages.length === 0) {
                    this.addMessage(metadata.sessionId, 'system', systemPrompt);
                }

                // Add user message to history
                this.addMessage(metadata.sessionId, 'user', content);

                // Build messages array for chat API
                const messages = session.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                }));

                console.log(`[PersonalityManager] Chat request (session=${metadata.sessionId}, ${messages.length} msgs, model=${options.model || 'default'})`);

                const response = await this.aiManager.processChatRequest(messages, metadata.tools || [], options);

                // Record assistant response in history
                if (response.content) {
                    this.addMessage(metadata.sessionId, 'assistant', response.content);
                }

                return response;
            }

            // Stateless single-turn with system prompt
            const prompt = `${systemPrompt}\n\nUser: ${content}\nAssistant:`;

            console.log(`[PersonalityManager] Processing request with model ${options.model || 'default'}`);
            
            return await this.aiManager.processRequest(prompt, options);
        } catch (error) {
            console.error('[PersonalityManager] Error handling interaction:', error);
            return {
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                model: metadata.model || 'unknown',
                providerId: metadata.providerId || 'system',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
        }
    }
}
