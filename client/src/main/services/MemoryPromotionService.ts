import { AlephNetClient } from './AlephNetClient';
import { MemoryFragment } from '../../shared/alephnet-types';

/**
 * Categories of data that should be implicitly promoted to user memory.
 * When the AI encounters these kinds of data during conversation,
 * it should automatically promote them to the user's long-term memory.
 */
export type ImplicitPromotionCategory =
    | 'skill_config'      // Skill configuration values (API keys refs, preferences)
    | 'user_preference'   // User-expressed preferences ("I prefer dark mode", "call me X")
    | 'factual_context'   // Facts the user shares about themselves
    | 'workflow'          // Recurring workflows or procedures
    | 'identity';         // User identity information

/**
 * A request to promote specific content from conversation memory to user memory.
 */
export interface MemoryPromotionRequest {
    /** The content to promote */
    content: string;
    /** Why this is being promoted */
    reason: string;
    /** Category of the promoted memory */
    category: ImplicitPromotionCategory;
    /** Significance score (0-1) */
    significance: number;
    /** Source conversation ID */
    conversationId?: string;
    /** Source conversation memory field ID */
    sourceFieldId?: string;
    /** Additional metadata to attach */
    metadata?: Record<string, unknown>;
}

/**
 * Result of a memory promotion operation.
 */
export interface MemoryPromotionResult {
    /** Whether the promotion succeeded */
    success: boolean;
    /** ID of the created fragment in user memory */
    fragmentId?: string;
    /** ID of the user memory field used */
    userFieldId?: string;
    /** Error message if promotion failed */
    error?: string;
}

/**
 * Skill configuration entry to be persisted in user memory.
 */
export interface SkillConfigEntry {
    /** Discriminator for JSON parsing */
    type: 'skill_config';
    /** Skill identifier (e.g., plugin ID or skill name) */
    skillId: string;
    /** Configuration key */
    key: string;
    /** Configuration value (serialized) */
    value: string;
    /** When this was last updated */
    updatedAt: number;
}

/**
 * MemoryPromotionService manages the promotion of memories from
 * conversation-scoped fields to user-scoped persistent memory.
 * 
 * This supports two promotion paths:
 * 1. **Explicit**: User or AI explicitly requests "save this to my memory"
 * 2. **Implicit**: Certain categories of data (skill configs, user preferences)
 *    are automatically detected and promoted
 * 
 * It also manages skill configuration persistence, ensuring that skill
 * settings survive across conversations.
 */
export class MemoryPromotionService {
    private alephNetClient: AlephNetClient;
    private userMemoryFieldId: string | null = null;

    /** Patterns that trigger implicit promotion */
    private readonly implicitPatterns: Array<{
        pattern: RegExp;
        category: ImplicitPromotionCategory;
        significance: number;
    }> = [
        // Skill configuration patterns
        { pattern: /(?:set|configure|save|store|remember)\s+(?:my\s+)?(?:api[- ]?key|token|credential|secret)/i, category: 'skill_config', significance: 0.9 },
        { pattern: /(?:my|set)\s+(?:default|preferred)\s+(?:model|provider|engine)/i, category: 'skill_config', significance: 0.8 },
        
        // User preference patterns
        { pattern: /(?:i\s+prefer|i\s+like|i\s+want|always\s+use|default\s+to)/i, category: 'user_preference', significance: 0.7 },
        { pattern: /(?:call\s+me|my\s+name\s+is|i\s+am\s+known\s+as)/i, category: 'identity', significance: 0.9 },
        
        // Factual context patterns
        { pattern: /(?:i\s+work\s+(?:at|for|with)|my\s+(?:job|role|position)\s+is)/i, category: 'factual_context', significance: 0.7 },
        { pattern: /(?:i\s+live\s+in|my\s+(?:timezone|location|city)\s+is)/i, category: 'factual_context', significance: 0.6 },
        
        // Workflow patterns
        { pattern: /(?:every\s+(?:day|morning|week)|my\s+(?:routine|workflow|process)\s+is)/i, category: 'workflow', significance: 0.6 },
    ];

    constructor(alephNetClient: AlephNetClient) {
        this.alephNetClient = alephNetClient;
    }

    // ─── Core Promotion Methods ──────────────────────────────────────────────

    /**
     * Explicitly promote content to user long-term memory.
     * Called when the user says "remember this" or the AI determines
     * something should be persisted.
     */
    async promoteToUserMemory(request: MemoryPromotionRequest): Promise<MemoryPromotionResult> {
        try {
            const userFieldId = await this.ensureUserMemoryField();
            
            const fragment = await this.alephNetClient.memoryStore({
                fieldId: userFieldId,
                content: request.content,
                significance: request.significance,
                metadata: {
                    category: request.category,
                    reason: request.reason,
                    sourceConversationId: request.conversationId,
                    sourceFieldId: request.sourceFieldId,
                    promotedAt: Date.now(),
                    ...request.metadata
                }
            });

            console.log(`MemoryPromotionService: Promoted to user memory [${request.category}]: ${request.content.substring(0, 80)}...`);
            
            return {
                success: true,
                fragmentId: fragment.id,
                userFieldId
            };
        } catch (err) {
            console.error('MemoryPromotionService: Failed to promote memory:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    }

    /**
     * Check if a message contains content that should be implicitly promoted.
     * Returns promotion requests for any matching patterns.
     */
    detectImplicitPromotions(content: string, conversationId?: string): MemoryPromotionRequest[] {
        const promotions: MemoryPromotionRequest[] = [];

        for (const { pattern, category, significance } of this.implicitPatterns) {
            if (pattern.test(content)) {
                promotions.push({
                    content,
                    reason: `Implicit promotion: detected ${category} pattern`,
                    category,
                    significance,
                    conversationId
                });
            }
        }

        return promotions;
    }

    /**
     * Process a message for implicit promotions and execute them.
     * Called automatically when messages are added to conversations.
     */
    async processMessageForPromotion(
        content: string, 
        role: string, 
        conversationId?: string
    ): Promise<MemoryPromotionResult[]> {
        // Only process user messages for implicit promotion
        if (role !== 'user') return [];

        const promotions = this.detectImplicitPromotions(content, conversationId);
        const results: MemoryPromotionResult[] = [];

        for (const promotion of promotions) {
            const result = await this.promoteToUserMemory(promotion);
            results.push(result);
        }

        return results;
    }

    // ─── Skill Configuration Persistence ─────────────────────────────────────

    /**
     * Save a skill configuration value to user memory.
     * This ensures skill settings persist across conversations.
     */
    async saveSkillConfig(skillId: string, key: string, value: string): Promise<MemoryPromotionResult> {
        const configContent = JSON.stringify({
            type: 'skill_config',
            skillId,
            key,
            value,
            updatedAt: Date.now()
        } satisfies SkillConfigEntry);

        return this.promoteToUserMemory({
            content: configContent,
            reason: `Skill configuration: ${skillId}/${key}`,
            category: 'skill_config',
            significance: 0.9,
            metadata: {
                type: 'skill_config',
                skillId,
                configKey: key
            }
        });
    }

    /**
     * Load a skill configuration value from user memory.
     */
    async loadSkillConfig(skillId: string, key: string): Promise<string | null> {
        try {
            const userFieldId = await this.ensureUserMemoryField();
            const result = await this.alephNetClient.memoryQuery({
                fieldId: userFieldId,
                query: `skill_config ${skillId} ${key}`,
                limit: 10
            });

            // Find the most recent matching config entry
            for (const fragment of result.fragments) {
                try {
                    const parsed = JSON.parse(fragment.content) as SkillConfigEntry;
                    if (parsed.type === 'skill_config' && parsed.skillId === skillId && parsed.key === key) {
                        return parsed.value;
                    }
                } catch {
                    // Not a JSON skill config fragment, skip
                }
            }

            return null;
        } catch (err) {
            console.error(`MemoryPromotionService: Failed to load skill config ${skillId}/${key}:`, err);
            return null;
        }
    }

    /**
     * Load all skill configurations for a given skill.
     */
    async loadAllSkillConfigs(skillId: string): Promise<Record<string, string>> {
        try {
            const userFieldId = await this.ensureUserMemoryField();
            const result = await this.alephNetClient.memoryQuery({
                fieldId: userFieldId,
                query: `skill_config ${skillId}`,
                limit: 50
            });

            const configs: Record<string, string> = {};
            for (const fragment of result.fragments) {
                try {
                    const parsed = JSON.parse(fragment.content) as SkillConfigEntry;
                    if (parsed.type === 'skill_config' && parsed.skillId === skillId) {
                        configs[parsed.key] = parsed.value;
                    }
                } catch {
                    // Not a JSON skill config fragment, skip
                }
            }

            return configs;
        } catch (err) {
            console.error(`MemoryPromotionService: Failed to load configs for ${skillId}:`, err);
            return {};
        }
    }

    // ─── Fold Operations ─────────────────────────────────────────────────────

    /**
     * Fold an entire conversation's memory field into the user's long-term memory.
     * This is the "close conversation and preserve knowledge" operation.
     */
    async foldConversationToUserMemory(
        conversationFieldId: string,
        options?: { verifiedOnly?: boolean; minSignificance?: number }
    ): Promise<{ syncedCount: number; entropyDelta: number }> {
        const userFieldId = await this.ensureUserMemoryField();

        // Get fragments from conversation field
        const result = await this.alephNetClient.memoryQuery({
            fieldId: conversationFieldId,
            query: '',
            limit: 1000
        });

        let syncedCount = 0;
        const minSig = options?.minSignificance ?? 0.3;

        for (const fragment of result.fragments) {
            // Filter by significance
            if (fragment.significance < minSig) continue;

            await this.alephNetClient.memoryStore({
                fieldId: userFieldId,
                content: fragment.content,
                significance: fragment.significance,
                metadata: {
                    ...fragment.metadata,
                    foldedFrom: conversationFieldId,
                    foldedAt: Date.now(),
                    originalTimestamp: fragment.timestamp
                }
            });
            syncedCount++;
        }

        return { syncedCount, entropyDelta: syncedCount * 0.01 };
    }

    // ─── Query User Memory ──────────────────────────────────────────────────

    /**
     * Query the user's long-term memory for relevant context.
     * Used to inject persistent context into new conversations.
     */
    async queryUserMemory(query: string, limit: number = 10): Promise<MemoryFragment[]> {
        try {
            const userFieldId = await this.ensureUserMemoryField();
            const result = await this.alephNetClient.memoryQuery({
                fieldId: userFieldId,
                query,
                limit
            });
            return result.fragments;
        } catch (err) {
            console.error('MemoryPromotionService: Failed to query user memory:', err);
            return [];
        }
    }

    /**
     * Get all user memories of a specific category.
     */
    async getUserMemoriesByCategory(category: ImplicitPromotionCategory, limit: number = 50): Promise<MemoryFragment[]> {
        try {
            const userFieldId = await this.ensureUserMemoryField();
            const result = await this.alephNetClient.memoryQuery({
                fieldId: userFieldId,
                query: category,
                limit
            });
            
            // Filter to only fragments with matching category metadata
            return result.fragments.filter(f => 
                f.metadata && (f.metadata as any).category === category
            );
        } catch (err) {
            console.error(`MemoryPromotionService: Failed to get memories for category ${category}:`, err);
            return [];
        }
    }

    // ─── Field Management ────────────────────────────────────────────────────

    /**
     * Ensure the user's persistent memory field exists, creating it if needed.
     */
    private async ensureUserMemoryField(): Promise<string> {
        if (this.userMemoryFieldId) return this.userMemoryFieldId;

        // Try to find existing user memory field
        const fields = await this.alephNetClient.memoryList({ scope: 'user' });
        const userField = fields.find(f => 
            f.scope === 'user' && f.name === 'User Long-Term Memory'
        );

        if (userField) {
            this.userMemoryFieldId = userField.id;
            return userField.id;
        }

        // Create new user memory field
        const newField = await this.alephNetClient.memoryCreate({
            name: 'User Long-Term Memory',
            scope: 'user',
            description: 'Persistent memory for user preferences, skill configs, and accumulated knowledge',
            visibility: 'private'
        });

        this.userMemoryFieldId = newField.id;
        console.log(`MemoryPromotionService: Created user memory field: ${newField.id}`);
        return newField.id;
    }

    /**
     * Get the user memory field ID, ensuring it exists first.
     */
    async getUserMemoryFieldId(): Promise<string> {
        return this.ensureUserMemoryField();
    }
}
