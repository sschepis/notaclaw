import { AlephGunBridge, gunObjectsToArrays } from '@sschepis/alephnet-node';
import { IdentityManager } from './IdentityManager';
import { AIConversation, AIMessage, MemoryField } from '../../shared/alephnet-types';
import { randomUUID } from 'crypto';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';

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

// Callback type for saving messages to memory
export type MessageSaver = (
    conversationId: string, 
    memoryFieldId: string, 
    message: AIMessage
) => Promise<void>;

/** Persisted state for active conversation restoration across sessions */
interface ConversationSessionState {
    activeConversationId: string | null;
    openConversationIds: string[];
    lastUpdated: number;
}

/** Conversation change event for cross-device sync */
export interface ConversationChangeEvent {
    type: 'conversation_updated' | 'message_added' | 'conversation_deleted';
    conversationId: string;
    data?: any;
}

export class ConversationManager extends EventEmitter {
    private bridge: AlephGunBridge;
    private memoryFieldCreator: MemoryFieldCreator | null = null;
    private messageSaver: MessageSaver | null = null;
    private sessionStatePath: string | null = null;
    private localStoragePath: string | null = null;
    private writeMutex: Map<string, Promise<void>> = new Map();

    constructor(bridge: AlephGunBridge, _identity: IdentityManager) {
        super();
        this.bridge = bridge;
    }

    /**
     * Set the memory field creator callback.
     */
    setMemoryFieldCreator(creator: MemoryFieldCreator) {
        this.memoryFieldCreator = creator;
    }

    /**
     * Set the message saver callback.
     */
    setMessageSaver(saver: MessageSaver) {
        this.messageSaver = saver;
    }

    private get user() {
        return this.bridge.getGun().user();
    }

    // ─── Local Storage Layer ─────────────────────────────────────────────────

    private getLocalStoragePath(): string {
        if (!this.localStoragePath) {
            this.localStoragePath = path.join(app.getPath('userData'), 'conversations');
        }
        return this.localStoragePath;
    }

    private async ensureLocalStorageDir(): Promise<void> {
        const dir = this.getLocalStoragePath();
        await fs.mkdir(dir, { recursive: true });
    }

    /**
     * Serialize a write operation to avoid concurrent file writes for the same conversation.
     */
    private async withWriteLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const prev = this.writeMutex.get(key) || Promise.resolve();
        const next = prev.then(fn, fn); // Run even if previous failed
        this.writeMutex.set(key, next.then(() => {}, () => {}));
        return next;
    }

    /**
     * Atomically write a file (write to temp, then rename).
     */
    private async atomicWrite(filePath: string, data: string): Promise<void> {
        const tmpPath = filePath + '.tmp.' + Date.now();
        await fs.writeFile(tmpPath, data, { mode: 0o600 });
        await fs.rename(tmpPath, filePath);
    }

    /**
     * Save conversation metadata to local JSON (no messages).
     */
    private async saveConversationMetadataLocally(conv: AIConversation): Promise<void> {
        await this.withWriteLock(`meta-${conv.id}`, async () => {
            await this.ensureLocalStorageDir();
            const convDir = path.join(this.getLocalStoragePath(), conv.id);
            await fs.mkdir(convDir, { recursive: true });

            // Save metadata (without messages to keep it lean)
            const metadata = {
                id: conv.id,
                title: conv.title,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt,
                domainId: conv.domainId,
                personalityId: conv.personalityId,
                messageCount: conv.messageCount,
                memoryFieldId: conv.memoryFieldId
            };
            await this.atomicWrite(
                path.join(convDir, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            // Update the index
            await this.rebuildLocalIndex();
        });
    }

    /**
     * Save messages for a conversation to local JSON.
     */
    private async saveMessagesLocally(convId: string, messages: AIMessage[]): Promise<void> {
        await this.withWriteLock(`msgs-${convId}`, async () => {
            await this.ensureLocalStorageDir();
            const convDir = path.join(this.getLocalStoragePath(), convId);
            await fs.mkdir(convDir, { recursive: true });
            await this.atomicWrite(
                path.join(convDir, 'messages.json'),
                JSON.stringify(messages, null, 2)
            );
        });
    }

    /**
     * Append a single message to the local messages file.
     */
    private async appendMessageLocally(convId: string, msg: AIMessage): Promise<void> {
        await this.withWriteLock(`msgs-${convId}`, async () => {
            const convDir = path.join(this.getLocalStoragePath(), convId);
            const msgPath = path.join(convDir, 'messages.json');
            
            let messages: AIMessage[] = [];
            try {
                const data = await fs.readFile(msgPath, 'utf-8');
                messages = JSON.parse(data);
            } catch {
                // File doesn't exist yet
                await fs.mkdir(convDir, { recursive: true });
            }

            // Don't add duplicates
            if (!messages.some(m => m.id === msg.id)) {
                messages.push(msg);
                // Keep sorted by sequence
                messages.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                await this.atomicWrite(msgPath, JSON.stringify(messages, null, 2));
            }
        });
    }

    /**
     * Load conversation metadata from local JSON.
     */
    private async loadConversationMetadataLocally(convId: string): Promise<AIConversation | null> {
        try {
            const metaPath = path.join(this.getLocalStoragePath(), convId, 'metadata.json');
            const data = await fs.readFile(metaPath, 'utf-8');
            const metadata = JSON.parse(data);
            return { ...metadata, messages: [] };
        } catch {
            return null;
        }
    }

    /**
     * Load messages from local JSON.
     */
    private async loadMessagesLocally(convId: string): Promise<AIMessage[]> {
        try {
            const msgPath = path.join(this.getLocalStoragePath(), convId, 'messages.json');
            const data = await fs.readFile(msgPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    /**
     * Load all conversations from local JSON (metadata only).
     */
    private async loadConversationsLocally(): Promise<AIConversation[]> {
        try {
            const indexPath = path.join(this.getLocalStoragePath(), 'index.json');
            const data = await fs.readFile(indexPath, 'utf-8');
            const conversations: AIConversation[] = JSON.parse(data);
            return conversations.map(c => ({ ...c, messages: [] }));
        } catch {
            return [];
        }
    }

    /**
     * Rebuild the index.json from individual metadata files.
     */
    private async rebuildLocalIndex(): Promise<void> {
        const baseDir = this.getLocalStoragePath();
        try {
            const entries = await fs.readdir(baseDir, { withFileTypes: true });
            const conversations: AIConversation[] = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    try {
                        const metaPath = path.join(baseDir, entry.name, 'metadata.json');
                        const data = await fs.readFile(metaPath, 'utf-8');
                        const metadata = JSON.parse(data);
                        conversations.push({ ...metadata, messages: [] });
                    } catch {
                        // Skip invalid directories
                    }
                }
            }

            // Sort by updatedAt descending
            conversations.sort((a, b) => b.updatedAt - a.updatedAt);

            await this.atomicWrite(
                path.join(baseDir, 'index.json'),
                JSON.stringify(conversations, null, 2)
            );
        } catch {
            // Directory doesn't exist yet
        }
    }

    /**
     * Delete a conversation from local storage.
     */
    private async deleteConversationLocally(convId: string): Promise<void> {
        await this.withWriteLock(`meta-${convId}`, async () => {
            await this.withWriteLock(`msgs-${convId}`, async () => {
                const convDir = path.join(this.getLocalStoragePath(), convId);
                try {
                    await fs.rm(convDir, { recursive: true, force: true });
                } catch {
                    // Ignore if doesn't exist
                }
                await this.rebuildLocalIndex();
            });
        });
    }

    // ─── GunDB Message Loading ───────────────────────────────────────────────

    /**
     * Load messages from GunDB by traversing the messages sub-graph.
     * GunDB's .once() on a parent does NOT recursively resolve nested nodes,
     * so we must use .map().once() on the messages node specifically.
     */
    private async loadMessagesFromGun(convId: string): Promise<AIMessage[]> {
        if (!this.user || !this.user.is) {
            return [];
        }

        return new Promise((resolve) => {
            const messages: Record<string, AIMessage> = {};

            this.user.get('conversations').get(convId).get('messages')
                .map().once((data: any, key: string) => {
                    if (data && key !== '_' && data.id) {
                        const msg = gunObjectsToArrays(data) as AIMessage;
                        messages[key] = msg;
                    }
                });

            // Allow time for GunDB to traverse the graph
            setTimeout(() => {
                const sorted = Object.values(messages)
                    .filter(m => m && m.id && m.content !== undefined)
                    .sort((a, b) => (a.sequence || a.timestamp || 0) - (b.sequence || b.timestamp || 0));
                resolve(sorted);
            }, 2000);
        });
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    async createConversation(title?: string, domainId?: string): Promise<AIConversationWithMemory> {
        if (!this.user || !this.user.is) {
            console.error('ConversationManager: User not authenticated', { userExists: !!this.user, is: this.user?.is });
            throw new Error('User not authenticated');
        }

        const id = randomUUID();
        const conversationTitle = title || 'New Conversation';
        
        const conversationData: any = {
            id,
            title: conversationTitle,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0
        };
        
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
            }
        }

        // Store in GunDB
        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(id).put(conversationData, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });

        const fullConversation: AIConversationWithMemory = {
            ...conversationData,
            messages: [],
            memoryFieldId
        };

        // IMMEDIATELY save to local JSON
        await this.saveConversationMetadataLocally(fullConversation);
        await this.saveMessagesLocally(id, []);

        console.log(`ConversationManager: Created conversation ${id} and persisted locally`);

        return fullConversation;
    }

    async listConversations(): Promise<AIConversation[]> {
        // Fast path: read from local JSON cache first
        const localConversations = await this.loadConversationsLocally();
        
        if (localConversations.length > 0) {
            console.log(`ConversationManager: Loaded ${localConversations.length} conversations from local cache`);
            
            // Background sync with GunDB (don't block the return)
            this.syncConversationsFromGun().catch(err => {
                console.warn('ConversationManager: Background GunDB sync failed:', err);
            });
            
            return localConversations;
        }

        // No local cache - fall back to GunDB
        console.log('ConversationManager: No local cache, loading from GunDB...');
        
        if (!this.user || !this.user.is) {
            console.error('ConversationManager: User not authenticated (list)');
            return [];
        }

        return new Promise((resolve) => {
            const conversations: Record<string, AIConversation> = {};
            
            this.user.get('conversations').map().once((data: any, key: string) => {
                if (data && key !== '_' && data.id) {
                    if (data === null) {
                        delete conversations[key];
                        return;
                    }
                    const conv = gunObjectsToArrays(data);
                    if (!conv.messages) conv.messages = [];
                    conversations[key] = conv;
                }
            });

            setTimeout(async () => {
                const list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
                console.log(`ConversationManager: Loaded ${list.length} conversations from GunDB`);
                
                // Save to local cache for next time
                for (const conv of list) {
                    await this.saveConversationMetadataLocally(conv);
                }
                
                resolve(list);
            }, 2000);
        });
    }

    /**
     * Background sync: pull conversation list from GunDB and merge with local cache.
     */
    private async syncConversationsFromGun(): Promise<void> {
        if (!this.user || !this.user.is) return;

        return new Promise((resolve) => {
            const gunConversations: Record<string, AIConversation> = {};
            
            this.user.get('conversations').map().once((data: any, key: string) => {
                if (data && key !== '_' && data.id) {
                    if (data === null) return;
                    const conv = gunObjectsToArrays(data);
                    if (!conv.messages) conv.messages = [];
                    gunConversations[key] = conv;
                }
            });

            setTimeout(async () => {
                // Merge: update local cache with any GunDB conversations not locally present
                // or with newer updatedAt timestamps
                const localConversations = await this.loadConversationsLocally();
                const localMap = new Map(localConversations.map(c => [c.id, c]));
                
                let updated = false;
                for (const [id, gunConv] of Object.entries(gunConversations)) {
                    const localConv = localMap.get(id);
                    if (!localConv || gunConv.updatedAt > localConv.updatedAt) {
                        await this.saveConversationMetadataLocally(gunConv);
                        updated = true;
                        
                        // Emit change event for renderer
                        this.emit('conversationChanged', {
                            type: 'conversation_updated',
                            conversationId: id,
                            data: gunConv
                        } as ConversationChangeEvent);
                    }
                }

                if (updated) {
                    console.log('ConversationManager: Local cache updated from GunDB sync');
                }
                
                resolve();
            }, 2000);
        });
    }

    async getConversation(id: string): Promise<AIConversation> {
        // 1. Try local cache first (fast path)
        const localMeta = await this.loadConversationMetadataLocally(id);
        let messages = await this.loadMessagesLocally(id);
        
        if (localMeta && messages.length > 0) {
            console.log(`ConversationManager: Loaded conversation ${id} from local cache (${messages.length} messages)`);
            return { ...localMeta, messages };
        }

        // 2. If no local messages, try GunDB
        if (!this.user || !this.user.is) {
            if (localMeta) return { ...localMeta, messages: [] };
            throw new Error('User not authenticated and no local cache');
        }

        console.log(`ConversationManager: Loading conversation ${id} from GunDB...`);

        // Load metadata from GunDB
        const metadata = await new Promise<any>((resolve, reject) => {
            this.user.get('conversations').get(id).once((data: any) => {
                if (!data) {
                    reject(new Error('Conversation not found'));
                    return;
                }
                resolve(gunObjectsToArrays(data));
            });
        });

        // Load messages from GunDB (explicitly traversing sub-graph)
        const gunMessages = await this.loadMessagesFromGun(id);
        
        const conversation: AIConversation = {
            ...metadata,
            messages: gunMessages
        };

        // Cache locally for next time
        await this.saveConversationMetadataLocally(conversation);
        if (gunMessages.length > 0) {
            await this.saveMessagesLocally(id, gunMessages);
        }

        console.log(`ConversationManager: Loaded conversation ${id} from GunDB (${gunMessages.length} messages)`);
        return conversation;
    }

    async deleteConversation(id: string): Promise<boolean> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        // Delete from GunDB
        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(id).put(null, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });

        // Delete from local storage
        await this.deleteConversationLocally(id);

        console.log(`ConversationManager: Deleted conversation ${id}`);
        return true;
    }

    async addMessage(conversationId: string, message: AIMessage): Promise<AIMessage> {
        if (!this.user || !this.user.is) {
            console.error('ConversationManager: User not authenticated (addMessage)');
            throw new Error('User not authenticated');
        }

        // Fetch conversation metadata
        const convNode = this.user.get('conversations').get(conversationId);
        
        const metadata = await new Promise<{ messageCount?: number; memoryFieldId?: string }>((resolve) => {
            convNode.once((data: any) => {
                resolve({
                    messageCount: data && typeof data.messageCount === 'number' ? data.messageCount : 0,
                    memoryFieldId: data?.memoryFieldId
                });
            });
        });

        const currentCount = metadata.messageCount || 0;
        const newCount = currentCount + 1;
        
        message.sequence = newCount;

        // Sanitize message to remove undefined values
        const sanitizedMessage = JSON.parse(JSON.stringify(message));

        // Store in GunDB
        await new Promise<void>((resolve, reject) => {
            convNode.get('messages').get(message.id).put(sanitizedMessage, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });

        // Update metadata in GunDB
        const now = Date.now();
        convNode.get('updatedAt').put(now);
        convNode.get('messageCount').put(newCount);

        // IMMEDIATELY persist to local JSON
        await this.appendMessageLocally(conversationId, sanitizedMessage);
        
        // Update local metadata
        const localMeta = await this.loadConversationMetadataLocally(conversationId);
        if (localMeta) {
            localMeta.updatedAt = now;
            localMeta.messageCount = newCount;
            await this.saveConversationMetadataLocally(localMeta);
        }

        console.log(`ConversationManager: Persisted message ${message.id} to conversation ${conversationId} (seq: ${newCount})`);

        // Save to memory field if configured (fire and forget)
        if (this.messageSaver && metadata.memoryFieldId) {
            try {
                this.messageSaver(conversationId, metadata.memoryFieldId, message)
                    .catch(err => console.error('ConversationManager: Failed to save message to memory field:', err));
            } catch (err) {
                console.error('ConversationManager: Failed to initiate memory save:', err);
            }
        }

        return message;
    }

    async updateMessage(conversationId: string, messageId: string, content: string): Promise<void> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        // Update in GunDB
        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(conversationId).get('messages').get(messageId).put({ content }, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });
        
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());

        // Update in local JSON
        await this.withWriteLock(`msgs-${conversationId}`, async () => {
            const messages = await this.loadMessagesLocally(conversationId);
            const idx = messages.findIndex(m => m.id === messageId);
            if (idx !== -1) {
                messages[idx].content = content;
                const msgPath = path.join(this.getLocalStoragePath(), conversationId, 'messages.json');
                await this.atomicWrite(msgPath, JSON.stringify(messages, null, 2));
            }
        });
    }

    async deleteMessage(conversationId: string, messageId: string): Promise<void> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        // Delete from GunDB
        await new Promise<void>((resolve, reject) => {
            this.user.get('conversations').get(conversationId).get('messages').get(messageId).put(null, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });
        
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());

        // Delete from local JSON
        await this.withWriteLock(`msgs-${conversationId}`, async () => {
            const messages = await this.loadMessagesLocally(conversationId);
            const filtered = messages.filter(m => m.id !== messageId);
            const msgPath = path.join(this.getLocalStoragePath(), conversationId, 'messages.json');
            await this.atomicWrite(msgPath, JSON.stringify(filtered, null, 2));
        });
    }

    async updateTitle(id: string, title: string): Promise<AIConversation> {
        if (!this.user || !this.user.is) throw new Error('User not authenticated');

        const now = Date.now();

        // Update in GunDB
        this.user.get('conversations').get(id).get('title').put(title);
        this.user.get('conversations').get(id).get('updatedAt').put(now);

        // Update in local JSON
        const localMeta = await this.loadConversationMetadataLocally(id);
        if (localMeta) {
            localMeta.title = title;
            localMeta.updatedAt = now;
            await this.saveConversationMetadataLocally(localMeta);
        }

        // Return updated conversation
        const conversation = localMeta || await this.getConversation(id);
        conversation.title = title;
        conversation.updatedAt = now;
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
        
        this.user.get('conversations').get(conversationId).get('updatedAt').put(Date.now());

        // Update local
        const localMeta = await this.loadConversationMetadataLocally(conversationId);
        if (localMeta) {
            localMeta.personalityId = personalityId;
            localMeta.updatedAt = Date.now();
            await this.saveConversationMetadataLocally(localMeta);
        }
    }

    // ─── Cross-Device Sync (GunDB Subscriptions) ─────────────────────────────

    /**
     * Subscribe to conversation changes for cross-device sync.
     * Call this after GunDB authentication.
     */
    subscribeToChanges(): void {
        if (!this.user || !this.user.is) {
            console.warn('ConversationManager: Cannot subscribe - user not authenticated');
            return;
        }

        console.log('ConversationManager: Subscribing to conversation changes...');

        // Watch for new/updated conversations
        this.user.get('conversations').map().on(async (data: any, key: string) => {
            if (!data || key === '_' || !data.id) return;

            const conv = gunObjectsToArrays(data);
            if (!conv.messages) conv.messages = [];

            // Check if this is newer than what we have locally
            const localMeta = await this.loadConversationMetadataLocally(key);
            if (!localMeta || conv.updatedAt > localMeta.updatedAt) {
                await this.saveConversationMetadataLocally(conv);
                
                this.emit('conversationChanged', {
                    type: 'conversation_updated',
                    conversationId: key,
                    data: conv
                } as ConversationChangeEvent);
            }
        });
    }

    /**
     * Subscribe to new messages in a specific conversation.
     * Returns an unsubscribe function.
     */
    subscribeToMessages(conversationId: string): () => void {
        if (!this.user || !this.user.is) {
            console.warn('ConversationManager: Cannot subscribe to messages - user not authenticated');
            return () => {};
        }

        const handler = async (data: any, key: string) => {
            if (!data || key === '_' || !data.id) return;

            const msg = gunObjectsToArrays(data) as AIMessage;
            
            // Append to local cache
            await this.appendMessageLocally(conversationId, msg);
            
            this.emit('conversationChanged', {
                type: 'message_added',
                conversationId,
                data: msg
            } as ConversationChangeEvent);
        };

        this.user.get('conversations').get(conversationId)
            .get('messages').map().on(handler);

        return () => {
            // GunDB doesn't have great unsubscribe semantics, but .off() works
            try {
                this.user.get('conversations').get(conversationId)
                    .get('messages').map().off();
            } catch {
                // Ignore
            }
        };
    }

    // ─── Session State Persistence ───────────────────────────────────────────

    private getSessionStatePath(): string {
        if (!this.sessionStatePath) {
            this.sessionStatePath = path.join(app.getPath('userData'), 'conversation-session.json');
        }
        return this.sessionStatePath;
    }

    async saveSessionState(state: { activeConversationId: string | null; openConversationIds: string[] }): Promise<void> {
        const sessionState: ConversationSessionState = {
            activeConversationId: state.activeConversationId,
            openConversationIds: state.openConversationIds,
            lastUpdated: Date.now()
        };
        try {
            const filePath = this.getSessionStatePath();
            await this.atomicWrite(filePath, JSON.stringify(sessionState, null, 2));
        } catch (err) {
            console.error('ConversationManager: Failed to save session state:', err);
        }
    }

    async loadSessionState(): Promise<ConversationSessionState | null> {
        try {
            const filePath = this.getSessionStatePath();
            const data = await fs.readFile(filePath, 'utf-8');
            const state = JSON.parse(data) as ConversationSessionState;
            return state;
        } catch {
            return null;
        }
    }

    async clearSessionState(): Promise<void> {
        try {
            const filePath = this.getSessionStatePath();
            await fs.unlink(filePath);
        } catch {
            // Ignore if file doesn't exist
        }
    }
}
