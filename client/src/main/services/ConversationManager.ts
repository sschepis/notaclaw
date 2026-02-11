import { AlephGunBridge, gunObjectsToArrays } from '@sschepis/alephnet-node';
import { IdentityManager } from './IdentityManager';
import { AIConversation, AIMessage, MemoryField } from '../../shared/alephnet-types';
import { randomUUID } from 'crypto';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

// Extended type to include memory field reference
export interface AIConversationWithMemory extends AIConversation {
    memoryFieldId?: string;
}

// Callback type for memory field creation
export type MemoryFieldCreator = (options: {
    name: string;
    scope: 'conversation';
    description?: string;
    visibility?: 'private'
}) => Promise<MemoryField>;

/** Persisted state for active conversation restoration across sessions */
interface ConversationSessionState {
    activeConversationId: string | null;
    openConversationIds: string[];
    lastUpdated: number;
}

export class ConversationManager {
    private bridge: AlephGunBridge;
    private memoryFieldCreator: MemoryFieldCreator | null = null;
    private sessionStatePath: string | null = null;

    constructor(bridge: AlephGunBridge, _identity: IdentityManager) {
        this.bridge = bridge;
    }

    /**
     * Set the memory field creator callback.
     * This allows ConversationManager to create memory fields without circular dependencies.
     */
    setMemoryFieldCreator(creator: MemoryFieldCreator) {
        this.memoryFieldCreator = creator;
    }

    private get user() {
        return this.bridge.getGun().user();
    }

    async createConversation(title?: string, domainId?: string): Promise<AIConversationWithMemory> {
        if (!this.user || !this.user.is) {
            console.error('ConversationManager: User not authenticated', { userExists: !!this.user, is: this.user?.is });
            throw new Error('User not authenticated');
        }

        const id = randomUUID();
        const conversationTitle = title || 'New Conversation';
        
        // NOTE: We do NOT include messages: [] here because GunDB does not support empty arrays in put().
        // We will treat the missing 'messages' node as an empty list in getConversation.
        // Also, we must NOT include undefined values as GunDB rejects them.
        const conversationData: any = {
            id,
            title: conversationTitle,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // Only add domainId if it's defined (GunDB doesn't accept undefined values)
        if (domainId !== undefined) {
            conversationData.domainId = domainId;
        }

        // Auto-create memory field for this conversation
        let memoryFieldId: string | undefined;
        if (this.memoryFieldCreator) {
            try {
                const memoryField = await this.memoryFieldCreator({
                    name: `Chat: ${conversationTitle.substring(0, 50)}`,
                    scope: 'conversation',
                    description: `Memory field for conversation ${id}`,
                    visibility: 'private'
                });
                memoryFieldId = memoryField.id;
                conversationData.memoryFieldId = memoryFieldId;
                console.log(`ConversationManager: Created memory field ${memoryFieldId} for conversation ${id}`);
            } catch (err) {
                console.error('ConversationManager: Failed to create memory field for conversation:', err);
                // Don't fail the conversation creation if memory field fails
            }
        }

        // Store in GunDB under user's private graph
        // path: conversations/<id>
        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(id).put(conversationData, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });

        // Return full object with empty messages for the caller
        return {
            ...conversationData,
            messages: [],
            memoryFieldId
        };
    }

    async listConversations(): Promise<AIConversation[]> {
        if (!this.user || !this.user.is) {
            console.error('ConversationManager: User not authenticated (list)', { userExists: !!this.user, is: this.user?.is });
            throw new Error('User not authenticated');
        }

        return new Promise((resolve) => {
            const conversations: Record<string, AIConversation> = {};
            
            // Load all conversations
            this.user.get('conversations').map().once((data: any, key: string) => {
                if (data && !data._) { // Skip metadata
                    // Gun might return partial data or nulls for deleted items
                    if (data === null) {
                        delete conversations[key];
                        return;
                    }
                    
                    // Convert back to array structure if needed
                    const conv = gunObjectsToArrays(data);
                    if (!conv.messages) conv.messages = []; // Ensure messages array exists
                    conversations[key] = conv;
                }
            });

            // Wait a bit for data to flow (Gun is eventually consistent)
            // We use a timeout to aggregate results from the graph traversal.
            // In a reactive architecture, we would subscribe to updates, but for this snapshot API,
            // we wait for initial data propagation.
            setTimeout(() => {
                const list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
                resolve(list);
            }, 300); // Increased delay to ensure better data coverage
        });
    }

    async getConversation(id: string): Promise<AIConversation> {
        if (!this.user.is) throw new Error('User not authenticated');

        return new Promise((resolve, reject) => {
            this.user.get('conversations').get(id).once((data: any) => {
                if (!data) {
                    reject(new Error('Conversation not found'));
                    return;
                }
                const conv = gunObjectsToArrays(data);
                if (!conv.messages) conv.messages = []; // Ensure messages array exists
                resolve(conv);
            });
        });
    }

    async deleteConversation(id: string): Promise<boolean> {
        if (!this.user.is) throw new Error('User not authenticated');

        return new Promise((resolve, reject) => {
            this.user.get('conversations').get(id).put(null, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve(true);
            });
        });
    }

    async addMessage(conversationId: string, message: AIMessage): Promise<AIMessage> {
        if (!this.user || !this.user.is) {
            console.error('ConversationManager: User not authenticated (addMessage)');
            throw new Error('User not authenticated');
        }

        // Sanitize message to remove undefined values which GunDB rejects
        const sanitizedMessage = JSON.parse(JSON.stringify(message));

        // Use message.id as the key for direct access
        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(conversationId).get('messages').get(message.id).put(sanitizedMessage, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });

        // Update timestamp
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());

        return message;
    }

    async updateMessage(conversationId: string, messageId: string, content: string): Promise<void> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(conversationId).get('messages').get(messageId).put({ content }, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });
        
        // Update timestamp
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());
    }

    async deleteMessage(conversationId: string, messageId: string): Promise<void> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(conversationId).get('messages').get(messageId).put(null, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });
        
        // Update timestamp
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());
    }

    async updateTitle(id: string, title: string): Promise<AIConversation> {
        if (!this.user.is) throw new Error('User not authenticated');

        const conversation = await this.getConversation(id);
        conversation.title = title;
        conversation.updatedAt = Date.now();

        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(id).put(conversation, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });

        return conversation;
    }

    async setPersonality(conversationId: string, personalityId: string): Promise<void> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(conversationId).get('personalityId').put(personalityId, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });
        
        // Update timestamp
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());
    }

    // ─── Session State Persistence ───────────────────────────────────────────

    private getSessionStatePath(): string {
        if (!this.sessionStatePath) {
            this.sessionStatePath = path.join(app.getPath('userData'), 'conversation-session.json');
        }
        return this.sessionStatePath;
    }

    /**
     * Save the current active conversation and open conversations list.
     * Called progressively as the user interacts with conversations.
     */
    async saveSessionState(state: { activeConversationId: string | null; openConversationIds: string[] }): Promise<void> {
        const sessionState: ConversationSessionState = {
            activeConversationId: state.activeConversationId,
            openConversationIds: state.openConversationIds,
            lastUpdated: Date.now()
        };
        try {
            const filePath = this.getSessionStatePath();
            await fs.writeFile(filePath, JSON.stringify(sessionState, null, 2), { mode: 0o600 });
        } catch (err) {
            console.error('ConversationManager: Failed to save session state:', err);
        }
    }

    /**
     * Load the previously active conversation state.
     * Called on startup to restore the user's conversation context.
     */
    async loadSessionState(): Promise<ConversationSessionState | null> {
        try {
            const filePath = this.getSessionStatePath();
            const data = await fs.readFile(filePath, 'utf-8');
            const state = JSON.parse(data) as ConversationSessionState;
            return state;
        } catch {
            // File doesn't exist yet or is corrupted - return null
            return null;
        }
    }

    /**
     * Clear the persisted session state (e.g., on explicit logout or reset).
     */
    async clearSessionState(): Promise<void> {
        try {
            const filePath = this.getSessionStatePath();
            await fs.unlink(filePath);
        } catch {
            // Ignore if file doesn't exist
        }
    }
}
