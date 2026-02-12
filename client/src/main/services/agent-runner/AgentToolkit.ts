/**
 * AgentToolkit - Builds the tool set available to the agentic loop.
 * 
 * Combines:
 * 1. Control tools (task_complete, ask_user, send_update)
 * 2. Personality/system tools from PersonalityManager
 * 
 * Control tools don't execute arbitrary logic — they return
 * sentinel values that the AgentLoop interprets to change state.
 */

import { ToolDefinition } from '../prompt-engine/types';

// Sentinel values returned by control tools so the loop can detect them
export const CONTROL_TOOL_NAMES = {
  TASK_COMPLETE: 'task_complete',
  ASK_USER: 'ask_user',
  SEND_UPDATE: 'send_update',
} as const;

/** Check if a tool name is a control tool */
export function isControlTool(name: string): boolean {
  return Object.values(CONTROL_TOOL_NAMES).includes(name as any);
}

/** Build the three agentic control tools */
export function buildControlTools(): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: CONTROL_TOOL_NAMES.TASK_COMPLETE,
        description:
          'Call this tool when you have fully completed the task the user requested. ' +
          'Include a brief summary of what was accomplished. ' +
          'Do NOT call this prematurely — only when the work is actually done.',
        parameters: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'A brief summary of what was accomplished.',
            },
          },
          required: ['summary'],
        },
        // Control tools have no script — the loop handles them directly
        script: async (args: any) => args,
      },
    },
    {
      type: 'function',
      function: {
        name: CONTROL_TOOL_NAMES.ASK_USER,
        description:
          'Call this tool when you need additional information from the user to proceed. ' +
          'Ask a clear, specific question. The loop will pause until the user responds.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask the user.',
            },
          },
          required: ['question'],
        },
        script: async (args: any) => args,
      },
    },
    {
      type: 'function',
      function: {
        name: CONTROL_TOOL_NAMES.SEND_UPDATE,
        description:
          'Send a progress update message to the user without stopping your work. ' +
          'Use this to keep the user informed about what you are doing.',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The progress update message.',
            },
          },
          required: ['message'],
        },
        script: async (args: any) => args,
      },
    },
  ];
}

/**
 * Merge control tools with personality/system tools.
 * Control tools are placed first for prompt visibility.
 */
export function buildFullToolkit(
  personalityTools: ToolDefinition[],
  memoryTools: ToolDefinition[] = []
): ToolDefinition[] {
  const controlTools = buildControlTools();
  return [...controlTools, ...memoryTools, ...personalityTools];
}
