import { IdentityManager } from './IdentityManager';
import { SecurityManager } from './SecurityManager';
import { StorageManager } from './StorageManager';
import { NetworkManager } from './NetworkManager';
import { Message, Conversation, User } from './types';
import { v4 as uuidv4 } from 'uuid';

export class ChatEngine {
  identityManager: IdentityManager;
  securityManager: SecurityManager;
  storageManager: StorageManager;
  networkManager: NetworkManager;

  constructor() {
    this.identityManager = new IdentityManager();
    this.securityManager = new SecurityManager();
    this.storageManager = new StorageManager();
    this.networkManager = new NetworkManager();

    this.networkManager.on('message', this.handleIncomingMessage.bind(this));
  }

  async init(username: string) {
    const user = await this.identityManager.init(username);
    await this.securityManager.init(this.identityManager.getPrivateKey() || undefined);
    this.storageManager.setUserId(user.id);
    await this.storageManager.saveUser(user);
    
    // Initialize network
    await this.networkManager.init();
    console.log(`[ChatEngine] Initialized as ${user.id}`);
  }

  async sendMessage(conversationId: string, content: string, type: Message['type'] = 'text') {
    const user = this.identityManager.getUser();
    if (!user) throw new Error('User not initialized');

    // 1. Create Message Object
    const message: Message = {
      id: uuidv4(),
      conversationId,
      sender: user.id,
      content, // Will be encrypted
      type,
      timestamp: Date.now(),
      status: 'pending'
    };

    // 2. Encrypt Message
    // For direct messages, we need the recipient's public key.
    // For group messages, we need the group key.
    // Simplifying: Fetch conversation to get participants
    // In a real app, we'd handle group encryption (Sender Keys) or pairwise encryption.
    // Here we will simulate E2EE by encrypting for all participants individually or using a shared key if available.
    
    // Fetch conversation
    // const conversation = await this.storageManager.getConversation(conversationId);
    
    // For this prototype, we'll just broadcast the message. 
    // In a real implementation, we would encrypt the content field here.
    // const encryptedContent = this.securityManager.encrypt(content, recipientPublicKey);
    // message.content = encryptedContent;

    // 3. Save Locally
    await this.storageManager.saveMessage(message);

    // 4. Broadcast
    await this.networkManager.broadcast(message);

    return message;
  }

  async handleIncomingMessage(data: any) {
      // 1. Validate
      if (!data || !data.id || !data.sender) return;
      const message = data as Message;

      // 2. Decrypt
      // const decryptedContent = this.securityManager.decrypt(message.content, senderPublicKey);
      // message.content = decryptedContent;

      // 3. Store
      await this.storageManager.saveMessage(message);
      
      console.log(`[ChatEngine] Received message from ${message.sender}: ${message.content}`);
  }

  async createConversation(participants: string[], type: 'direct' | 'group', name?: string): Promise<Conversation> {
      const conversation: Conversation = {
          id: uuidv4(),
          type,
          participants,
          name,
          updatedAt: Date.now()
      };
      
      await this.storageManager.saveConversation(conversation);
      return conversation;
  }

  async getMessages(conversationId: string) {
      return this.storageManager.getMessages(conversationId);
  }
}
