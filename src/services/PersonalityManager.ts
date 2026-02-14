import { AIProviderManager } from './AIProviderManager';
import { AIRequestOptions, AIResponse } from '@notaclaw/core/ai-types';
import { TraitDefinition } from '@notaclaw/core/trait-types';

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
    private traits: Map<string, TraitDefinition> = new Map();

    constructor(aiManager: AIProviderManager) {
        this.aiManager = aiManager;
    }

    // -----------------------------------------------------------------------
    // Trait Management (New)
    // -----------------------------------------------------------------------

    registerTrait(trait: TraitDefinition): void {
        this.traits.set(trait.id, trait);
        console.log(`[PersonalityManager] Registered trait: ${trait.name} (${trait.id})`);
    }

    unregisterTrait(traitId: string): void {
        this.traits.delete(traitId);
    }

    getTrait(traitId: string): TraitDefinition | undefined {
        return this.traits.get(traitId);
    }

    listTraits(): TraitDefinition[] {
        return Array.from(this.traits.values());
    }

    // -----------------------------------------------------------------------
    // System Prompt Management (2.4.3)
    // -----------------------------------------------------------------------

    /**
     * Get the base system prompt for a given content type.
     */
    getBaseSystemPrompt(contentType: string): string {
        // Custom override takes priority
        if (this.customSystemPrompt) return this.customSystemPrompt;

        const template = this.systemPrompts.find(
            t => t.appliesTo.includes(contentType) || t.appliesTo.includes('*')
        );
        return template?.content || DEFAULT_SYSTEM_PROMPTS[0].content;
    }

    /**
     * Decorate an existing system prompt with active traits.
     */
    decorateSystemPrompt(basePrompt: string, context: { text?: string; activeTraits?: string[] } = {}): string {
        const traitInstructions: string[] = [];

        // Sort traits by priority (descending)
        const sortedTraits = Array.from(this.traits.values()).sort((a, b) => (b.priority || 10) - (a.priority || 10));

        for (const trait of sortedTraits) {
            let active = false;

            if (trait.activationMode === 'global') {
                active = true;
            } else if (trait.activationMode === 'dynamic' && context.text && trait.triggerKeywords) {
                // Check if any keyword matches
                const lowerText = context.text.toLowerCase();
                if (trait.triggerKeywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
                    active = true;
                }
            } else if (context.activeTraits && context.activeTraits.includes(trait.id)) {
                active = true;
            }

            if (active) {
                traitInstructions.push(`### ${trait.name}\n${trait.instruction}`);
            }
        }

        if (traitInstructions.length > 0) {
            return `${basePrompt}\n\n## Capabilities & Traits\n${traitInstructions.join('\n\n')}`;
        }

        return basePrompt;
    }

    /**
     * Assemble the final system prompt by mixing base prompt + traits.
     */
    assembleSystemPrompt(contentType: string, context: { text?: string; activeTraits?: string[] } = {}): string {
        const basePrompt = this.getBaseSystemPrompt(contentType);
        return this.decorateSystemPrompt(basePrompt, context);
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

            // Replaced getSystemPrompt with assembleSystemPrompt
            const systemPrompt = this.assembleSystemPrompt(contentType, { 
                text: content,
                activeTraits: metadata.activeTraits
            });

            // Session-based conversation with history
            if (metadata.sessionId) {
                const session = this.getOrCreateSession(metadata.sessionId, { mode: metadata.mode });

                // Inject system prompt if session is new OR if we want to update it (for dynamic traits)
                // For simplicity, we only inject at start, but a sophisticated agent might update the system message.
                // Here, we overwrite the FIRST message if it's 'system' to keep traits fresh.
                if (session.messages.length > 0 && session.messages[0].role === 'system') {
                    session.messages[0].content = systemPrompt;
                } else if (session.messages.length === 0) {
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
