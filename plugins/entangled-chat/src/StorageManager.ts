import Gun from 'gun';
import { Message, User, Conversation } from './types';

export class StorageManager {
  private gun: any;
  private userId: string | null = null;

  constructor(peers: string[] = []) {
    // In a real environment, we'd pass peers to Gun constructor to sync
    // For now, we'll use local storage and optionally some public relay if available
    this.gun = Gun({
        peers: peers,
        localStorage: true,
        radisk: true // Use Radix storage adapter if available (usually node)
    });
  }

  setUserId(userId: string) {
      this.userId = userId;
  }

  async saveUser(user: User) {
    return new Promise<void>((resolve) => {
      this.gun.get('users').get(user.id).put(user, (ack: any) => {
          resolve();
      });
    });
  }

  async getUser(userId: string): Promise<User | null> {
    return new Promise((resolve) => {
      this.gun.get('users').get(userId).once((data: any) => {
        if (data) {
            // Gun adds metadata properties, we might want to strip them
            const { _, ...user } = data;
            resolve(user as User);
        } else {
            resolve(null);
        }
      });
    });
  }

  async saveMessage(message: Message) {
    return new Promise<void>((resolve) => {
      // Store message by ID
      this.gun.get('messages').get(message.id).put(message);
      
      // Link message to conversation
      this.gun.get('conversations').get(message.conversationId).get('messages').set(this.gun.get('messages').get(message.id));
      
      resolve();
    });
  }

  async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
      return new Promise((resolve) => {
          const messages: Message[] = [];
          // This is a simplified query. Gun graph traversal can be more complex.
          // We are just getting the set of messages linked to the conversation.
          // Note: map() subscribes, so we need to be careful. 'once' on a set might not work as expected for all items.
          // For this implementation, we will use a time-based approach or just fetch whatever is available quickly.
          
          // A better approach for a chat app in Gun is to use a time-series or linked list structure.
          // For simplicity here, we assume the 'messages' node in a conversation is a set of message references.
          
          this.gun.get('conversations').get(conversationId).get('messages').map().once((data: any, key: string) => {
              if (data) {
                  const { _, ...msg } = data;
                  messages.push(msg as Message);
              }
          });
          
          // Give it a moment to gather data (Gun is async/eventual consistency)
          setTimeout(() => {
              resolve(messages.sort((a, b) => a.timestamp - b.timestamp));
          }, 200); 
      });
  }

  async saveConversation(conversation: Conversation) {
      return new Promise<void>((resolve) => {
          this.gun.get('conversations').get(conversation.id).put(conversation);
          resolve();
      });
  }
  
  async getConversations(): Promise<Conversation[]> {
      return new Promise((resolve) => {
          const conversations: Conversation[] = [];
          this.gun.get('conversations').map().once((data: any) => {
              if (data) {
                  const { _, ...conv } = data;
                  conversations.push(conv as Conversation);
              }
          });
           setTimeout(() => {
              resolve(conversations);
          }, 200);
      });
  }
}
