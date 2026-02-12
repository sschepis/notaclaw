import { Context } from './types';
import { ChatEngine } from './ChatEngine';

export function activate(context: Context) {
  console.log('[Entangled Chat] Activating...');
  
  const chatEngine = new ChatEngine();

  context.dsn.registerTool({
    name: 'initializeIdentity',
    description: 'Initializes the user identity for the chat system',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        username: { type: 'string' }
      },
      required: ['username']
    },
    semanticDomain: 'social',
    primeDomain: [11],
    smfAxes: [0.5, 0.5],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async (args: { username: string }) => {
    await chatEngine.init(args.username);
    return { status: 'success', user: chatEngine.identityManager.getUser() };
  });

  context.dsn.registerTool({
    name: 'createConversation',
    description: 'Creates a new conversation',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        participants: { type: 'array', items: { type: 'string' } },
        type: { type: 'string', enum: ['direct', 'group'] },
        name: { type: 'string' }
      },
      required: ['participants', 'type']
    },
    semanticDomain: 'social',
    primeDomain: [11],
    smfAxes: [0.5, 0.5],
    requiredTier: 'Initiate',
    version: '1.0.0'
  }, async (args: { participants: string[], type: 'direct' | 'group', name?: string }) => {
    const conversation = await chatEngine.createConversation(args.participants, args.type, args.name);
    return { status: 'success', conversation };
  });

  context.dsn.registerTool({
    name: 'sendMessage',
    description: 'Sends a message to a conversation',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string', enum: ['text', 'image', 'video', 'file', 'code'] }
      },
      required: ['conversationId', 'content']
    },
    semanticDomain: 'social',
    primeDomain: [11, 7],
    smfAxes: [0.8, 0.4],
    requiredTier: 'Initiate',
    version: '1.0.0'
  }, async (args: { conversationId: string, content: string, type?: 'text' | 'image' | 'video' | 'file' | 'code' }) => {
    const message = await chatEngine.sendMessage(args.conversationId, args.content, args.type);
    return { status: 'success', message };
  });

  context.dsn.registerTool({
    name: 'getMessages',
    description: 'Retrieves messages for a conversation',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' }
      },
      required: ['conversationId']
    },
    semanticDomain: 'social',
    primeDomain: [11],
    smfAxes: [0.4],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async (args: { conversationId: string }) => {
      const messages = await chatEngine.getMessages(args.conversationId);
      return { messages };
  });

  context.dsn.registerTool({
    name: 'getNetworkState',
    description: 'Returns current network state',
    executionLocation: 'SERVER',
    parameters: { type: 'object', properties: {} },
    semanticDomain: 'social',
    primeDomain: [11],
    smfAxes: [0.4],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async () => {
      return {
          peerId: chatEngine.networkManager.getPeerId(),
          user: chatEngine.identityManager.getUser()
      };
  });

  console.log('[Entangled Chat] Activated.');
}
