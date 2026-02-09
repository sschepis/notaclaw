import { AIProviderManager } from './AIProviderManager';
import { AlephNetClient } from './AlephNetClient';
import { ConversationManager } from './ConversationManager';
import { AIRequestOptions, AIResponse } from '../../shared/ai-types';
import { MemoryField, MemoryFragment } from '../../shared/alephnet-types';
import { PromptEngine } from './prompt-engine/PromptEngine';
import { promptRegistry } from './prompt-engine/PromptRegistry';
import { AIProviderManagerAdapter } from './prompt-engine/adapters/AIProviderManagerAdapter';
import { ToolDefinition } from './prompt-engine/types';
import * as fs from 'fs';
import * as path from 'path';

export interface Personality {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    traits: string[];
    capabilities: string[];
    contextScope: string;
    intentKeywords?: string[];
}

export class PersonalityManager {
    private aiManager: AIProviderManager;
    private alephNetClient: AlephNetClient | null = null;
    private conversationManager: ConversationManager | null = null;
    private corePersonalityId: string | null = null;
    private personalities: Map<string, Personality> = new Map();

    constructor(aiManager: AIProviderManager) {
        this.aiManager = aiManager;
        this.loadPersonalities();
    }

    public async loadPersonalities() {
        // Assuming process.cwd() is the project root in dev, or we might need a better strategy for prod
        const personalitiesDir = path.join(process.cwd(), 'personalities');
        
        if (!fs.existsSync(personalitiesDir)) {
            console.warn(`Personalities directory not found at ${personalitiesDir}`);
            return;
        }

        const files = fs.readdirSync(personalitiesDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(path.join(personalitiesDir, file), 'utf-8');
                    const personality = JSON.parse(content) as Personality;
                    this.personalities.set(personality.id, personality);
                    console.log(`Loaded personality: ${personality.name} (${personality.id})`);
                } catch (err) {
                    console.error(`Failed to load personality ${file}:`, err);
                }
            }
        }
    }

    public getPersonality(id: string): Personality | undefined {
        return this.personalities.get(id);
    }

    public getAllPersonalities(): Personality[] {
        return Array.from(this.personalities.values());
    }

    public suggestPersonality(content: string): Personality | undefined {
        const lowerContent = content.toLowerCase();
        let bestMatch: Personality | undefined;
        let maxMatches = 0;

        for (const personality of this.personalities.values()) {
            if (!personality.intentKeywords) continue;
            
            let matches = 0;
            for (const keyword of personality.intentKeywords) {
                if (lowerContent.includes(keyword.toLowerCase())) {
                    matches++;
                }
            }
            
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = personality;
            }
        }
        
        // Simple threshold: at least 1 keyword match
        return maxMatches > 0 ? bestMatch : undefined;
    }

    public setAlephNetClient(client: AlephNetClient) {
        this.alephNetClient = client;
    }

    public setConversationManager(manager: ConversationManager) {
        this.conversationManager = manager;
    }

    /**
     * Retrieves or creates the Core Personality MemoryField.
     * Scope: 'user'
     * Name: 'Core Personality'
     */
    async getCorePersonality(): Promise<MemoryField> {
        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized in PersonalityManager');

        // Try to find existing core personality field
        const fields = await this.alephNetClient.memoryList({ scope: 'user' });
        const existing = fields.find(f => f.name === 'Core Personality');

        if (existing) {
            this.corePersonalityId = existing.id;
            return existing;
        }

        // Create if not exists
        const newField = await this.alephNetClient.memoryCreate({
            name: 'Core Personality',
            scope: 'user',
            description: 'The core persona definition for the AI agent.',
            visibility: 'private'
        });

        this.corePersonalityId = newField.id;
        
        // Initialize with a default system prompt fragment if empty
        await this.alephNetClient.memoryStore({
            fieldId: newField.id,
            content: "You are a helpful, intelligent, and secure AI assistant within the AlephNet ecosystem. You value privacy, security, and user autonomy.",
            significance: 1.0,
            metadata: { type: 'system_prompt', default: true }
        });

        return newField;
    }

    /**
     * Retrieves relevant fragments from the conversation's memory field to build context.
     */
    async getSituationalContext(conversationId: string, query: string): Promise<string> {
        if (!this.alephNetClient || !this.conversationManager) return '';

        try {
            // Get conversation to find its memory field
            const conversation = await this.conversationManager.getConversation(conversationId);
            // The conversation object from ConversationManager might not have memoryFieldId typed in the interface yet
            // but we saw in the code it's stored. We'll cast to any or check property.
            const memoryFieldId = (conversation as any).memoryFieldId;

            if (!memoryFieldId) return '';

            // Query the memory field for relevant fragments
            const result = await this.alephNetClient.memoryQuery({
                fieldId: memoryFieldId,
                query: query,
                limit: 10,
                threshold: 0.5
            });

            // Sort by timestamp (ascending) to maintain chronological order in context
            const fragments = result.fragments.sort((a, b) => a.timestamp - b.timestamp);

            if (fragments.length === 0) return '';

            return `\n\nRelevant Context:\n${fragments.map(f => `- ${f.content}`).join('\n')}`;
        } catch (error) {
            console.warn(`Failed to get situational context for conversation ${conversationId}:`, error);
            return '';
        }
    }

    /**
     * Handles the interaction flow:
     * 1. Get Core Personality (System Prompt)
     * 2. Get Situational Context
     * 3. Construct Prompt
     * 4. Call AI
     * 5. Store Interaction
     */
    async handleInteraction(content: string, metadata: any): Promise<AIResponse> {
        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized');

        const conversationId = metadata.conversationId || metadata.id;
        let personalityId = metadata.personalityId;

        // If personalityId not provided in metadata, try to fetch from conversation
        if (!personalityId && conversationId && this.conversationManager) {
            try {
                const conversation = await this.conversationManager.getConversation(conversationId);
                if (conversation && conversation.personalityId) {
                    personalityId = conversation.personalityId;
                }
            } catch (err) {
                // Ignore error if conversation not found (might be a new one or stateless)
            }
        }

        // 1. Get Core Personality
        let systemPrompt = '';

        if (personalityId) {
            const personality = this.getPersonality(personalityId);
            if (personality) {
                systemPrompt = personality.systemPrompt;
            }
        } else {
            // Try to suggest a personality based on content if none is explicitly set
            const suggestion = this.suggestPersonality(content);
            if (suggestion) {
                systemPrompt = suggestion.systemPrompt;
                // Optional: We could log this or add a meta-header
                // console.log(`Auto-switching to ${suggestion.name} for query: "${content.substring(0, 50)}..."`);
            }
        }

        if (!systemPrompt) {
            const coreField = await this.getCorePersonality();
            
            // Fetch all fragments from core personality to build the system prompt
            // We use an empty query with zero threshold to retrieve all fragments (up to limit)
            // ensuring we get the complete personality definition without semantic bias.
            const coreFragmentsResult = await this.alephNetClient.memoryQuery({
                fieldId: coreField.id,
                query: '', 
                limit: 50, // Sufficient for a complex personality
                threshold: 0.0
            });
            
            systemPrompt = coreFragmentsResult.fragments
                .sort((a, b) => (b.significance || 0) - (a.significance || 0))
                .map(f => f.content)
                .join('\n\n');
        }

        if (!systemPrompt) {
            systemPrompt = "You are a helpful AI assistant.";
        }

        // 2. Get Situational Context
        const situationalContext = conversationId 
            ? await this.getSituationalContext(conversationId, content) 
            : '';

        // 3. Construct Prompt & Call AI using PromptEngine
        const promptName = `personality-chat-${Date.now()}`;
        promptRegistry.register({
            name: promptName,
            system: '{corePersonality}\n\n{situationalContext}',
            user: '{userMessage}',
            requestFormat: { corePersonality: 'string', situationalContext: 'string', userMessage: 'string' },
            responseFormat: 'text'
        });

        const tools: ToolDefinition[] = [
            {
                type: 'function',
                function: {
                    name: 'list_personalities',
                    description: 'List all available personalities/mentors with their descriptions.',
                    parameters: { type: 'object', properties: {}, required: [] },
                    script: async () => {
                        return this.getAllPersonalities().map(p => ({ id: p.id, name: p.name, description: p.description }));
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'switch_personality',
                    description: 'Switch the current conversation to a different personality/mentor.',
                    parameters: {
                        type: 'object',
                        properties: {
                            personalityId: { type: 'string', description: 'The ID of the personality to switch to' }
                        },
                        required: ['personalityId']
                    },
                    script: async ({ personalityId }: { personalityId: string }) => {
                        const p = this.getPersonality(personalityId);
                        if (!p) return { error: `Personality ${personalityId} not found` };
                        
                        if (conversationId && this.conversationManager) {
                            await this.conversationManager.setPersonality(conversationId, personalityId);
                            return { success: true, message: `Switched conversation to ${p.name}. Future responses will come from ${p.name}.` };
                        }
                        return { error: 'No active conversation to switch' };
                    }
                }
            }
        ];

        const engine = new PromptEngine({
            providers: [new AIProviderManagerAdapter(this.aiManager, metadata.providerId)],
            tools: tools,
            prompts: []
        });

        let engineResult = await engine.execute(promptName, {
            corePersonality: systemPrompt,
            situationalContext: situationalContext,
            userMessage: content
        }, { 
            defaultProvider: metadata.providerId,
            state: { ...metadata }
        });

        // Handle tool result (loop back once)
        if (engineResult.toolResult) {
            const toolOutput = JSON.stringify(engineResult.toolResult);
            const updatedContext = situationalContext + `\n\n[System] User requested a tool action. Tool Output: ${toolOutput}`;
            
            engineResult = await engine.execute(promptName, {
                corePersonality: systemPrompt,
                situationalContext: updatedContext,
                userMessage: content 
            }, { 
                defaultProvider: metadata.providerId,
                state: { ...metadata }
            });
        }

        const response: AIResponse = {
            content: engineResult.text,
            model: metadata.model, // Ideally get from engineResult.raw
            providerId: metadata.providerId,
            usage: engineResult.raw?.usage
        };

        // 5. Store Interaction (if conversation exists)
        if (conversationId && this.conversationManager) {
            try {
                const conversation = await this.conversationManager.getConversation(conversationId);
                const memoryFieldId = (conversation as any).memoryFieldId;

                if (memoryFieldId) {
                    // Store User Input
                    await this.alephNetClient.memoryStore({
                        fieldId: memoryFieldId,
                        content: `User: ${content}`,
                        significance: 0.3, // Lower significance for raw chat logs
                        metadata: { role: 'user', timestamp: Date.now() }
                    });

                    // Store AI Response
                    await this.alephNetClient.memoryStore({
                        fieldId: memoryFieldId,
                        content: `Assistant: ${response.content}`,
                        significance: 0.3,
                        metadata: { role: 'assistant', timestamp: Date.now(), model: response.model }
                    });
                }
            } catch (err) {
                console.warn('Failed to store interaction in memory:', err);
            }
        }

        return response;
    }

    /**
     * Updates the Core Personality by adding a new fragment (defining a trait or instruction).
     */
    async addCoreTrait(trait: string): Promise<MemoryFragment> {
        const field = await this.getCorePersonality();
        if (field.locked) {
            throw new Error('Core Personality is locked. Unlock it to make changes.');
        }

        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized');

        return this.alephNetClient.memoryStore({
            fieldId: field.id,
            content: trait,
            significance: 1.0,
            metadata: { type: 'trait', addedAt: Date.now() }
        });
    }

    /**
     * Locks or unlocks the Core Personality field.
     */
    async setCorePersonalityLock(locked: boolean): Promise<boolean> {
        const field = await this.getCorePersonality();
        
        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized');
        
        await this.alephNetClient.memoryUpdate({ fieldId: field.id, updates: { locked } });
        
        return true; 
    }
}
