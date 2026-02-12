import { ToolDefinition } from '../prompt-engine/types';
import { AlephNetClient } from '../AlephNetClient';

/**
 * Build memory-related tools for the agent.
 */
export function buildMemoryTools(
  alephNetClient: AlephNetClient,
  conversationId: string
): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'memory_search_conversation',
        description: 'Search for memories specifically related to this conversation.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' },
            limit: { type: 'number', description: 'Max number of results (default 5).' },
          },
          required: ['query'],
        },
        script: async ({ query, limit }: { query: string; limit?: number }) => {
          // Find conversation-scoped field
          // We assume there's a convention or we search for it.
          // For now, we'll try to find a field that matches the conversation ID in description
          // or create/use a standard one if possible.
          // Since we can't easily "create" here without more info, we'll search existing fields.
          
          const fields = await alephNetClient.memoryList({ scope: 'conversation' });
          const field = fields.find(f => f.description.includes(conversationId));
          
          if (!field) {
            return { error: 'No memory field found for this conversation.' };
          }

          const result = await alephNetClient.memoryQuery({
            fieldId: field.id,
            query,
            limit: limit ?? 5,
          });

          return {
            fragments: result.fragments.map(f => ({
              content: f.content,
              timestamp: f.timestamp,
              significance: f.significance,
            })),
          };
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'memory_search_user',
        description: 'Search the user\'s personal memory (across all their private fields).',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' },
            limit: { type: 'number', description: 'Max number of results (default 5).' },
          },
          required: ['query'],
        },
        script: async ({ query, limit }: { query: string; limit?: number }) => {
          // In a real implementation, we might search multiple fields or a specific "main" user field.
          // For now, let's search fields with scope 'user'.
          const fields = await alephNetClient.memoryList({ scope: 'user' });
          
          // We'll search the first few private fields or aggregate.
          // Ideally AlephNetClient should support multi-field search or "user scope" search.
          // For MVP, let's pick the first private field or just use recall if it's better.
          // But recall searches *all* fragments.
          
          if (fields.length === 0) {
             return { error: 'No private memory fields found for user.' };
          }

          // Search the first/main private field for now
          // TODO: Implement multi-field search in AlephNetClient
          const field = fields[0]; 

          const result = await alephNetClient.memoryQuery({
            fieldId: field.id,
            query,
            limit: limit ?? 5,
          });

          return {
            fragments: result.fragments.map(f => ({
              content: f.content,
              timestamp: f.timestamp,
              significance: f.significance,
            })),
          };
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'memory_search_global',
        description: 'Search global/public knowledge base.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' },
            limit: { type: 'number', description: 'Max number of results (default 5).' },
          },
          required: ['query'],
        },
        script: async ({ query, limit }: { query: string; limit?: number }) => {
          const result = await alephNetClient.memoryQueryGlobal({
            query,
            limit: limit ?? 5,
          });

          return {
            fragments: result.fragments.map(f => ({
              content: f.content,
              timestamp: f.timestamp,
              significance: f.significance,
            })),
          };
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'memory_recall',
        description: 'Recall information from ALL available memory (broad search).',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' },
            limit: { type: 'number', description: 'Max number of results (default 5).' },
          },
          required: ['query'],
        },
        script: async ({ query, limit }: { query: string; limit?: number }) => {
          const result = await alephNetClient.recall({
            query,
            limit: limit ?? 5,
          });

          return {
            fragments: result.fragments.map(f => ({
              content: f.content,
              timestamp: f.timestamp,
              significance: f.significance,
            })),
          };
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'memory_store',
        description: 'Store a new memory fragment.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to store.' },
            scope: { 
              type: 'string', 
              enum: ['conversation', 'user', 'global'],
              description: 'Where to store the memory. Default is "conversation".' 
            },
            significance: { type: 'number', description: 'Importance (0.0 to 1.0). Default 0.5.' },
          },
          required: ['content'],
        },
        script: async ({ content, scope, significance }: { content: string; scope?: string; significance?: number }) => {
          const targetScope = scope || 'conversation';
          
          let fieldId: string | undefined;
          
          if (targetScope === 'conversation') {
             // Find or create conversation field
             const fields = await alephNetClient.memoryList({ scope: 'conversation' });
             const field = fields.find(f => f.description.includes(conversationId));
             if (field) {
               fieldId = field.id;
             } else {
               // Create it
               const newField = await alephNetClient.memoryCreate({
                 name: `Conversation ${conversationId.substring(0, 8)}`,
                 scope: 'conversation',
                 description: `Memory for conversation ${conversationId}`,
                 visibility: 'private' // Conversations are usually private
               });
               fieldId = newField.id;
             }
          } else if (targetScope === 'user') {
             const fields = await alephNetClient.memoryList({ scope: 'user' });
             if (fields.length > 0) {
               fieldId = fields[0].id;
             } else {
                // Create default user field
                const newField = await alephNetClient.memoryCreate({
                 name: 'Personal Memory',
                 scope: 'user',
                 description: 'Main personal memory field',
                 visibility: 'private'
               });
               fieldId = newField.id;
             }
          } else if (targetScope === 'global') {
             // Find a global field we can write to? Or just use a default one.
             // For now, let's look for 'global-marketplace-registry' or similar, or create one?
             // Writing to global usually requires permissions.
             // Let's check if there is a 'Global Shared' field.
             const fields = await alephNetClient.memoryList({ scope: 'global' });
             if (fields.length > 0) {
               fieldId = fields[0].id;
             } else {
                return { error: 'No global memory field available to write to.' };
             }
          }

          if (!fieldId) {
            return { error: `Could not determine target field for scope ${targetScope}` };
          }

          const result = await alephNetClient.memoryStore({
            fieldId,
            content,
            significance: significance ?? 0.5,
          });

          return {
            success: true,
            fragmentId: result.id,
            message: 'Memory stored successfully.',
          };
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_immediate_memory',
        description: 'Set a temporary thought or scratchpad content that will be available ONLY in the very next step, then cleared. Use this to carry over reasoning or critical context to the next turn.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to remember for the next step.' },
          },
          required: ['content'],
        },
        script: async ({ content }: { content: string }) => {
          // This tool's effect is handled by the AgentLoop via the returned object
          // We return a special signal that the loop detects.
          return {
            _system_action: 'set_immediate_memory',
            content,
          };
        },
      },
    }
  ];
}
