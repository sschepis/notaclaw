/**
 * UIContextTools — Agent tools for querying and manipulating the renderer UI.
 *
 * These 4 tools give the agent the ability to:
 *  1. Query the renderer's current UI state (active tab, editor, conversation)
 *  2. Navigate the UI programmatically (switch tabs, open files, change sidebar)
 *  3. Read the text editor content
 *  4. Write/replace the text editor content
 *
 * All interactions go through the invokeRenderer IPC bridge —
 * the same bidirectional channel used by PersonalityManager.setCommandInterface().
 */

import { ToolDefinition } from '../prompt-engine/types';
import { UIContextSnapshot } from '../../../shared/ui-context-types';

type InvokeRenderer = (channel: string, data?: any) => Promise<any>;

/**
 * Build the 4 UI context tools that bridge to the renderer process.
 * Returns an empty array if invokeRenderer is not available.
 */
export function buildUITools(invokeRenderer: InvokeRenderer): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'get_ui_context',
        description:
          'Get the current state of the application UI: what tab is open, ' +
          'editor content, active conversation, sidebar panel, and available ' +
          'prompt templates. Use this to understand what the user is looking at.',
        parameters: { type: 'object', properties: {}, required: [] },
        script: async () => {
          try {
            const snapshot: UIContextSnapshot = await invokeRenderer('ui:getContext');
            return snapshot;
          } catch (err: any) {
            return { error: `Failed to get UI context: ${err.message}` };
          }
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'navigate_ui',
        description:
          'Navigate the application UI. Actions: ' +
          '"openConversation" (target=conversationId), ' +
          '"switchSidebar" (target=explorer|extensions|messages|tasks|memory|agents|secrets|etc.), ' +
          '"openFile" (target=filePath), ' +
          '"switchTab" (target=tabId).',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['openConversation', 'switchSidebar', 'openFile', 'switchTab'],
              description: 'Navigation action to perform',
            },
            target: {
              type: 'string',
              description: 'Target ID, file path, or sidebar view name',
            },
          },
          required: ['action', 'target'],
        },
        script: async ({ action, target }: { action: string; target: string }) => {
          try {
            return await invokeRenderer('ui:navigate', { action, target });
          } catch (err: any) {
            return { error: `Navigation failed: ${err.message}` };
          }
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_editor_content',
        description:
          'Get the full content of the file currently open in the text editor. ' +
          'Returns the content and file path, or null if no file tab is active.',
        parameters: { type: 'object', properties: {}, required: [] },
        script: async () => {
          try {
            return await invokeRenderer('ui:getEditorContent');
          } catch (err: any) {
            return { error: `Failed to get editor content: ${err.message}` };
          }
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_editor_content',
        description:
          'Set or replace the content in the currently open text editor. ' +
          'Use this to edit prompt templates or any open file. ' +
          'Set save=true to auto-save the file after updating content.',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'New content to set in the editor',
            },
            save: {
              type: 'boolean',
              description: 'Whether to auto-save after setting content (default: false)',
            },
          },
          required: ['content'],
        },
        script: async ({ content, save }: { content: string; save?: boolean }) => {
          try {
            return await invokeRenderer('ui:setEditorContent', { content, save });
          } catch (err: any) {
            return { error: `Failed to set editor content: ${err.message}` };
          }
        },
      },
    },
  ];
}
