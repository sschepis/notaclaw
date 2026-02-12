export interface Context {
  dsn: {
    registerTool: (tool: any, handler: (args: any) => Promise<any>) => void;
    publishObservation?: (content: string, peers: string[]) => void;
  };
}

export interface User {
  id: string; // DID or unique ID
  publicKey: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  content: string; // Encrypted payload or plain text depending on context
  type: 'text' | 'image' | 'video' | 'file' | 'code';
  timestamp: number;
  replyTo?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  name?: string;
  lastMessage?: Message;
  updatedAt: number;
  keys?: Record<string, string>; // Encrypted keys for group chat
}

export interface NetworkPeer {
  id: string;
  addresses: string[];
  latency?: number;
}
