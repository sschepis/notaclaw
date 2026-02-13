/**
 * PromptTemplateTools — Agent tools for managing prompt template/chain files.
 *
 * These 4 tools operate directly on the filesystem in the main process:
 *  1. list_prompt_templates — enumerate available prompt chain JSON files
 *  2. read_prompt_template — read and parse a template file
 *  3. save_prompt_template — create or update a template file
 *  4. open_prompt_in_editor — open a template in the app's text editor via CommandInterface
 *
 * Path resolution uses the same multi-fallback strategy as PluginManager
 * to work in both development (process.cwd()) and packaged Electron builds.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ToolDefinition } from '../prompt-engine/types';
import { CommandInterface } from '../PersonalityManager';
import { configManager } from '../ConfigManager';
import { loadPromptChain } from './PromptChainLoader';

/** Relative subdirectory where prompt chain JSON files live */
const PROMPT_CHAINS_SUBDIR = path.join('data', 'prompt-chains');

/**
 * Resolve the prompt-chains directory using multi-fallback strategy.
 * Tries several paths in order — the first that exists wins.
 * Falls back to `<userData>/prompt-chains` for user-created templates
 * if no bundled directory is found.
 */
function resolvePromptChainsDir(): string {
  const candidates = [
    // Dev mode: workspace root
    path.join(process.cwd(), PROMPT_CHAINS_SUBDIR),
    // Packaged: next to asar
    path.join(app.getAppPath(), PROMPT_CHAINS_SUBDIR),
    // Packaged: parent of asar
    path.join(path.dirname(app.getAppPath()), PROMPT_CHAINS_SUBDIR),
    // Packaged: one level up from cwd
    path.join(process.cwd(), '..', PROMPT_CHAINS_SUBDIR),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback: user data directory (always writable, always exists)
  const userDataDir = path.join(app.getPath('userData'), 'prompt-chains');
  fs.mkdirSync(userDataDir, { recursive: true });
  return userDataDir;
}

/**
 * List all .json files in the prompt-chains directory.
 * Exported so AgentTaskRunner can populate the promptTemplates snapshot field.
 */
export function listPromptTemplateFiles(): string[] {
  const dir = resolvePromptChainsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'));
}

/**
 * Build the 4 prompt-template tools.
 * commandInterface is needed only for `open_prompt_in_editor`; the other
 * three work even without it.
 */
export function buildPromptTemplateTools(
  commandInterface?: CommandInterface | null
): ToolDefinition[] {
  return [
    // ── list_prompt_templates ─────────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'list_prompt_templates',
        description:
          'List all available prompt templates/chains. ' +
          'Returns filenames, names, and file paths.',
        parameters: { type: 'object', properties: {}, required: [] },
        script: async () => {
          const dir = resolvePromptChainsDir();
          const files = listPromptTemplateFiles();
          return {
            templates: files.map((f: string) => ({
              filename: f,
              name: f.replace('.json', ''),
              path: path.join(dir, f),
            })),
          };
        },
      },
    },

    // ── read_prompt_template ──────────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'read_prompt_template',
        description:
          'Read the contents of a prompt template/chain file. ' +
          'Parses the JSON and returns the full template object.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Template name or filename (with or without .json extension)',
            },
          },
          required: ['name'],
        },
        script: async ({ name }: { name: string }) => {
          const filename = name.endsWith('.json') ? name : `${name}.json`;
          const filePath = path.join(resolvePromptChainsDir(), filename);
          if (!fs.existsSync(filePath)) {
            return { error: `Template "${name}" not found at ${filePath}` };
          }
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return { template: JSON.parse(content), path: filePath };
          } catch (err: any) {
            return { error: `Failed to read template: ${err.message}` };
          }
        },
      },
    },

    // ── save_prompt_template ──────────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'save_prompt_template',
        description:
          'Create or update a prompt template/chain file. ' +
          'The template parameter should be the full JSON object to save.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Template name (will be saved as name.json)',
            },
            template: {
              type: 'object',
              description: 'The prompt template/chain object to save',
            },
          },
          required: ['name', 'template'],
        },
        script: async ({ name, template }: { name: string; template: any }) => {
          const filename = name.endsWith('.json') ? name : `${name}.json`;
          const dir = resolvePromptChainsDir();
          const filePath = path.join(dir, filename);
          try {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
            return { success: true, path: filePath };
          } catch (err: any) {
            return { error: `Failed to save template: ${err.message}` };
          }
        },
      },
    },

    // ── open_prompt_in_editor ─────────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'open_prompt_in_editor',
        description:
          'Open a prompt template file in the text editor panel so the user ' +
          'can view and edit it visually.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Template name or filename',
            },
          },
          required: ['name'],
        },
        script: async ({ name }: { name: string }) => {
          const filename = name.endsWith('.json') ? name : `${name}.json`;
          const filePath = path.join(resolvePromptChainsDir(), filename);
          if (!fs.existsSync(filePath)) {
            return { error: `Template "${name}" not found at ${filePath}` };
          }
          if (!commandInterface) {
            return { error: 'Command interface not available — cannot open file in editor' };
          }
          try {
            await commandInterface.openFile(filePath);
            return { success: true, message: `Opened "${name}" in the editor` };
          } catch (err: any) {
            return { error: `Failed to open in editor: ${err.message}` };
          }
        },
      },
    },

    // ── get_default_prompt_chain ───────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'get_default_prompt_chain',
        description:
          'Get the name of the currently designated default prompt chain. ' +
          'The default chain is loaded automatically when the agent starts a task, ' +
          'providing specialized system instructions, sub-prompts, and tool descriptions.',
        parameters: { type: 'object', properties: {}, required: [] },
        script: async () => {
          const chainName = configManager.getDefaultPromptChain();
          if (!chainName) {
            return { defaultChain: null, message: 'No default prompt chain is set.' };
          }
          const chain = loadPromptChain(chainName);
          if (!chain) {
            return {
              defaultChain: chainName,
              error: `Chain "${chainName}" is configured as default but the file was not found.`,
            };
          }
          return {
            defaultChain: chainName,
            name: chain.meta._name || chainName,
            description: chain.meta._description || null,
            promptCount: chain.prompts.length,
            toolCount: chain.tools.length,
            entryPrompt: chain.entryPrompt.name,
          };
        },
      },
    },

    // ── set_default_prompt_chain ───────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'set_default_prompt_chain',
        description:
          'Designate a prompt chain as the default agent chain. ' +
          'When set, this chain\'s system prompt and available sub-prompts will be ' +
          'injected into the agent\'s context at the start of every new task. ' +
          'Pass null or empty string to clear the default.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Prompt chain name (without .json extension), or empty string/null to clear',
            },
          },
          required: ['name'],
        },
        script: async ({ name }: { name: string }) => {
          // Clear the default
          if (!name || name.trim() === '' || name === 'null' || name === 'none') {
            await configManager.setDefaultPromptChain(null);
            return { success: true, defaultChain: null, message: 'Default prompt chain cleared.' };
          }

          // Validate the chain exists and is parseable
          const chain = loadPromptChain(name);
          if (!chain) {
            return { error: `Prompt chain "${name}" not found or could not be parsed.` };
          }

          await configManager.setDefaultPromptChain(name);
          return {
            success: true,
            defaultChain: name,
            name: chain.meta._name || name,
            description: chain.meta._description || null,
            promptCount: chain.prompts.length,
            toolCount: chain.tools.length,
            message: `Default prompt chain set to "${chain.meta._name || name}".`,
          };
        },
      },
    },
  ];
}
