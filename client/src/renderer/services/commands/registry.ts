/**
 * Command Registry
 * 
 * Defines all available slash commands and their handlers.
 */

import { 
  Users,
  Bot,
  Settings,
  LayoutGrid,
  Globe
} from 'lucide-react';
import { CommandGroup, CommandResult } from './types';
import { parseDuration } from './parser';

// Placeholder for store access - in a real implementation this would import the store
// or be injected via context
let appStore: any = null;

export const setCommandStore = (store: any) => {
  appStore = store;
};

/**
 * Agent Commands
 * /agent add <id> <model>
 * /agent list
 * /agent remove <id>
 */
const agentCommands: CommandGroup = {
  name: 'agent',
  description: 'Manage AI agents in the conversation',
  icon: Bot,
  subcommands: [
    {
      name: 'add',
      description: 'Add an agent to the current conversation',
      usage: '/agent add <id> [model]',
      parameters: [
        { name: 'id', description: 'Agent ID or name', required: true, type: 'string' },
        { name: 'model', description: 'Model to use (optional)', required: false, type: 'model' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 1) {
          return { success: false, message: 'Usage: /agent add <id> [model]' };
        }
        
        const agentId = args[0];
        const model = args[1] || 'default';
        
        // Logic to add agent would go here
        // await appStore.addAgentToConversation(ctx.conversationId, agentId, model);
        
        return { 
          success: true, 
          message: `Agent ${agentId} added to conversation using ${model} model.` 
        };
      }
    },
    {
      name: 'list',
      description: 'List active agents',
      usage: '/agent list',
      handler: async (): Promise<CommandResult> => {
        // Logic to list agents
        // const agents = appStore.getActiveAgents(ctx.conversationId);
        const agents = ['Analyst', 'Strategist', 'Coder']; // Mock data
        
        return { 
          success: true, 
          message: `Active agents: ${agents.join(', ')}` 
        };
      }
    },
    {
      name: 'remove',
      description: 'Remove an agent from the conversation',
      usage: '/agent remove <id>',
      parameters: [
        { name: 'id', description: 'Agent ID to remove', required: true, type: 'string' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 1) {
          return { success: false, message: 'Usage: /agent remove <id>' };
        }
        
        const agentId = args[0];
        // Logic to remove agent
        
        return { 
          success: true, 
          message: `Agent ${agentId} removed from conversation.` 
        };
      }
    }
  ]
};

/**
 * Friend Commands
 * /friend invite <user_id> <duration>
 * /friend accept <user_id>
 * /friend add <user_id>
 * /friend remove <user_id>
 * /friend list
 */
const friendCommands: CommandGroup = {
  name: 'friend',
  description: 'Manage friends and contacts',
  icon: Users,
  subcommands: [
    {
      name: 'invite',
      description: 'Invite a user to be a friend with a time-limited key',
      usage: '/friend invite <user_id> <duration>',
      parameters: [
        { name: 'user_id', description: 'User ID to invite', required: true, type: 'user_id' },
        { name: 'duration', description: 'Duration (e.g. 5m, 1h)', required: true, type: 'duration', example: '5m' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 2) {
          return { success: false, message: 'Usage: /friend invite <user_id> <duration>' };
        }
        
        const userId = args[0];
        const durationStr = args[1];
        
        try {
          parseDuration(durationStr);
          // Logic to create invite
          
          return { 
            success: true, 
            message: `Invitation sent to ${userId}, valid for ${durationStr}.` 
          };
        } catch (e: any) {
          return { success: false, message: e.message };
        }
      }
    },
    {
      name: 'accept',
      description: 'Accept a friend request',
      usage: '/friend accept <user_id>',
      parameters: [
        { name: 'user_id', description: 'User ID to accept', required: true, type: 'user_id' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 1) {
          return { success: false, message: 'Usage: /friend accept <user_id>' };
        }
        
        const userId = args[0];
        // Logic to accept friend
        
        return { 
          success: true, 
          message: `Friend request from ${userId} accepted.` 
        };
      }
    },
    {
      name: 'add',
      description: 'Send a friend request',
      usage: '/friend add <user_id>',
      parameters: [
        { name: 'user_id', description: 'User ID to add', required: true, type: 'user_id' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 1) {
          return { success: false, message: 'Usage: /friend add <user_id>' };
        }
        
        const userId = args[0];
        
        return { 
          success: true, 
          message: `Friend request sent to ${userId}.` 
        };
      }
    },
    {
      name: 'remove',
      description: 'Remove a friend',
      usage: '/friend remove <user_id>',
      parameters: [
        { name: 'user_id', description: 'User ID to remove', required: true, type: 'user_id' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 1) {
          return { success: false, message: 'Usage: /friend remove <user_id>' };
        }
        
        const userId = args[0];
        
        return { 
          success: true, 
          message: `Removed ${userId} from friends.` 
        };
      }
    },
    {
      name: 'list',
      description: 'List all friends',
      usage: '/friend list',
      handler: async (): Promise<CommandResult> => {
        // Logic to list friends
        return { 
          success: true, 
          message: 'Friends: Alice, Bob, Charlie' 
        };
      }
    }
  ]
};

/**
 * Group Commands
 * /group list
 * /group create <group>
 * /group create post <title> <description>
 * /group update description <desc>
 */
const groupCommands: CommandGroup = {
  name: 'group',
  description: 'Manage groups and posts',
  icon: LayoutGrid,
  subcommands: [
    {
      name: 'list',
      description: 'List all groups',
      usage: '/group list',
      handler: async (): Promise<CommandResult> => {
        // Logic to list groups
        return {
          success: true,
          message: 'Groups: General, Random, Development'
        };
      }
    },
    {
      name: 'create',
      description: 'Create a group or post',
      usage: '/group create <name> OR /group create post <title> <description>',
      parameters: [
        { name: 'name_or_type', description: 'Group name OR "post"', required: true, type: 'string' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 1) {
          return { success: false, message: 'Usage: /group create <name> OR /group create post <title> <description>' };
        }

        const firstArg = args[0];

        if (firstArg.toLowerCase() === 'post') {
          // Handle post creation
          if (args.length < 3) {
            return { success: false, message: 'Usage: /group create post <title> <description>' };
          }
          const title = args[1];
          const description = args.slice(2).join(' '); // Join remaining args for description
          
          return {
            success: true,
            message: `Created post: "${title}" - ${description}`
          };
        } else {
          // Handle group creation
          const groupName = firstArg;
          return {
            success: true,
            message: `Created group: ${groupName}`
          };
        }
      }
    },
    {
      name: 'update',
      description: 'Update group settings',
      usage: '/group update description <desc>',
      parameters: [
        { name: 'field', description: 'Field to update (e.g., description)', required: true, type: 'string' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        if (args.length < 2) {
          return { success: false, message: 'Usage: /group update description <desc>' };
        }

        const field = args[0].toLowerCase();
        const value = args.slice(1).join(' ');

        if (field === 'description') {
           return {
            success: true,
            message: `Updated group description to: "${value}"`
          };
        }

        return { success: false, message: `Unknown field: ${field}` };
      }
    }
  ]
};

/**
 * OpenClaw Gateway Commands
 * /openclaw connect [url]
 * /openclaw disconnect
 * /openclaw status
 * /openclaw list
 */
const openclawCommands: CommandGroup = {
  name: 'openclaw',
  description: 'Connect to and interact with OpenClaw networks',
  icon: Globe,
  aliases: ['oc'],
  subcommands: [
    {
      name: 'connect',
      description: 'Connect to an OpenClaw gateway node',
      usage: '/openclaw connect [url]',
      parameters: [
        { name: 'url', description: 'OpenClaw node URL (optional, uses default if not provided)', required: false, type: 'string' }
      ],
      handler: async (ctx): Promise<CommandResult> => {
        const { args } = ctx.parsed;
        const url = args[0]; // May be undefined
        
        try {
          // Call the IPC handler
          const result = await (window as any).electronAPI?.openclawConnect?.({ url });
          
          if (result?.success) {
            const node = result.status?.currentNode;
            return { 
              success: true, 
              message: `Connected to OpenClaw node: ${node?.name || node?.url || url || 'default'}${node?.latency ? ` (${node.latency}ms)` : ''}` 
            };
          } else {
            return { 
              success: false, 
              message: `Failed to connect: ${result?.error || 'Unknown error'}` 
            };
          }
        } catch (err: any) {
          return { 
            success: false, 
            message: `Connection error: ${err.message}` 
          };
        }
      }
    },
    {
      name: 'disconnect',
      description: 'Disconnect from the current OpenClaw gateway',
      usage: '/openclaw disconnect',
      handler: async (): Promise<CommandResult> => {
        try {
          await (window as any).electronAPI?.openclawDisconnect?.();
          return { 
            success: true, 
            message: 'Disconnected from OpenClaw gateway.' 
          };
        } catch (err: any) {
          return { 
            success: false, 
            message: `Disconnect error: ${err.message}` 
          };
        }
      }
    },
    {
      name: 'status',
      description: 'Show current OpenClaw connection status',
      usage: '/openclaw status',
      handler: async (): Promise<CommandResult> => {
        try {
          const status = await (window as any).electronAPI?.openclawStatus?.();
          
          if (status?.connected) {
            const node = status.currentNode;
            return { 
              success: true, 
              message: `Connected to: ${node?.name || node?.url}\nLatency: ${node?.latency || 'N/A'}ms\nVersion: ${node?.version || 'unknown'}` 
            };
          } else {
            return { 
              success: true, 
              message: `Not connected to any OpenClaw node.${status?.error ? `\nLast error: ${status.error}` : ''}` 
            };
          }
        } catch (err: any) {
          return { 
            success: false, 
            message: `Status error: ${err.message}` 
          };
        }
      }
    },
    {
      name: 'list',
      description: 'List available OpenClaw nodes',
      usage: '/openclaw list',
      aliases: ['nodes'],
      handler: async (): Promise<CommandResult> => {
        try {
          const nodes = await (window as any).electronAPI?.openclawListNodes?.();
          
          if (!nodes || nodes.length === 0) {
            return { 
              success: true, 
              message: 'No OpenClaw nodes configured.' 
            };
          }
          
          const nodeList = nodes.map((n: any) => 
            `• ${n.name} (${n.url}) - ${n.status}${n.latency ? ` [${n.latency}ms]` : ''}`
          ).join('\n');
          
          return { 
            success: true, 
            message: `Available OpenClaw nodes:\n${nodeList}` 
          };
        } catch (err: any) {
          return { 
            success: false, 
            message: `List error: ${err.message}` 
          };
        }
      }
    }
  ]
};

/**
 * System Commands
 * /clear
 * /help
 */
const systemCommands: CommandGroup = {
  name: 'system',
  description: 'System commands',
  icon: Settings,
  subcommands: [
    {
      name: 'help',
      description: 'Show help for commands',
      usage: '/help [command]',
      parameters: [
        { name: 'command', description: 'Command to get help for', required: false, type: 'string' }
      ],
      handler: async (): Promise<CommandResult> => {
        // This is handled specially by the UI usually to show a help modal
        // or we can return a formatted message
        return { 
          success: true, 
          message: 'Available commands: /agent, /friend, /group, /openclaw, /help, /clear' 
        };
      }
    },
    {
      name: 'clear',
      description: 'Clear the current conversation',
      usage: '/clear',
      handler: async (): Promise<CommandResult> => {
        // Logic to clear chat
        if (appStore && appStore.clearMessages) {
            // appStore.clearMessages(ctx.conversationId);
        }
        return { 
          success: true, 
          message: 'Conversation cleared.',
          silent: true
        };
      }
    }
  ]
};

// Flatten commands for easier lookup if needed, but keeping groups is better for organization
export const commandGroups: CommandGroup[] = [
  agentCommands,
  friendCommands,
  groupCommands,
  openclawCommands,
  systemCommands
];

/**
 * Get all available commands as a flat list for autocomplete
 */
export const getAllCommands = (): CommandGroup[] => {
  return commandGroups;
};

/**
 * Find a command definition
 */
export const findCommand = (groupName: string, subcommandName?: string) => {
  const group = commandGroups.find(g => g.name === groupName || g.aliases?.includes(groupName));
  if (!group) return null;
  
  if (!subcommandName) return { group };
  
  const subcommand = group.subcommands.find(s => s.name === subcommandName || s.aliases?.includes(subcommandName));
  return { group, subcommand };
};
