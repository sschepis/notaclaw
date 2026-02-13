/**
 * PromptChainLoader — Loads, parses, and applies prompt chain JSON files
 * so that a designated chain can serve as the agent's default behavior.
 *
 * A prompt chain JSON has:
 *   - `_id`, `_name`, `_description`, `_source` — optional metadata
 *   - `prompts[]` — array of PromptTemplate objects (name, system, user, tools, then)
 *   - `tools[]` — array of ToolDefinition objects with optional script strings
 *
 * When a chain is loaded as the default, its entry prompt (typically named "main"
 * or the first prompt in the array) supplies:
 *   1. A **system prompt** that wraps the agent's personality
 *   2. Descriptions of **available sub-prompts** the agent can invoke
 *   3. Chain-specific **tool definitions** (their descriptions/parameters, not scripts)
 *
 * The chain's tool scripts are NOT executed directly — they use the PromptEngine's
 * context.require / context.runner patterns which are not available in AgentLoop.
 * Instead, the chain's tool descriptions are injected so the AI knows about them,
 * and the agent's built-in tools (shell, read_file, etc.) handle actual execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/** Metadata fields from a chain JSON file */
export interface PromptChainMeta {
  _id?: string;
  _name?: string;
  _description?: string;
  _source?: string;
}

/** A single prompt entry within a chain */
export interface ChainPrompt {
  name: string;
  system: string;
  user: string;
  requestFormat?: Record<string, string>;
  responseFormat?: Record<string, any> | 'text';
  tools?: Array<string | any>;
  then?: Record<string, any>;
}

/** Tool definition within a chain (may have string-based scripts) */
export interface ChainToolDef {
  type: string;
  function: {
    name: string;
    description?: string;
    parameters?: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
    script?: string;  // String form from JSON — not executable as-is
  };
}

/** Fully parsed prompt chain */
export interface ParsedPromptChain {
  meta: PromptChainMeta;
  prompts: ChainPrompt[];
  tools: ChainToolDef[];
  /** The entry-point prompt (named "main", "start", or the first one) */
  entryPrompt: ChainPrompt;
}

const PROMPT_CHAINS_SUBDIR = path.join('data', 'prompt-chains');

/**
 * Resolve the prompt-chains directory using multi-fallback.
 */
function resolvePromptChainsDir(): string {
  const candidates = [
    path.join(process.cwd(), PROMPT_CHAINS_SUBDIR),
    path.join(app.getAppPath(), PROMPT_CHAINS_SUBDIR),
    path.join(path.dirname(app.getAppPath()), PROMPT_CHAINS_SUBDIR),
    path.join(process.cwd(), '..', PROMPT_CHAINS_SUBDIR),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const userDataDir = path.join(app.getPath('userData'), 'prompt-chains');
  fs.mkdirSync(userDataDir, { recursive: true });
  return userDataDir;
}

/**
 * Load and parse a prompt chain JSON file by name.
 * Returns null if the file does not exist.
 */
export function loadPromptChain(chainName: string): ParsedPromptChain | null {
  const filename = chainName.endsWith('.json') ? chainName : `${chainName}.json`;
  const dir = resolvePromptChainsDir();
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[PromptChainLoader] Chain file not found: ${filePath}`);
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return parseChainJSON(raw);
  } catch (err: any) {
    console.error(`[PromptChainLoader] Failed to parse chain "${chainName}":`, err.message);
    return null;
  }
}

/**
 * Parse a raw chain JSON object into a structured ParsedPromptChain.
 */
function parseChainJSON(raw: any): ParsedPromptChain {
  const meta: PromptChainMeta = {
    _id: raw._id,
    _name: raw._name,
    _description: raw._description,
    _source: raw._source,
  };

  const prompts: ChainPrompt[] = (raw.prompts || []).map((p: any) => ({
    name: p.name,
    system: p.system || '',
    user: p.user || '',
    requestFormat: p.requestFormat,
    responseFormat: p.responseFormat,
    tools: p.tools,
    then: p.then,
  }));

  const tools: ChainToolDef[] = (raw.tools || []).map((t: any) => ({
    type: t.type || 'function',
    function: {
      name: t.function?.name || 'unknown',
      description: t.function?.description,
      parameters: t.function?.parameters,
      script: typeof t.function?.script === 'string' ? t.function.script : undefined,
    },
  }));

  // Find the entry prompt: "main" > "start" > first
  const entryPrompt =
    prompts.find((p) => p.name === 'main') ||
    prompts.find((p) => p.name === 'start') ||
    prompts[0] ||
    { name: 'default', system: '', user: '', tools: [], then: {} };

  return { meta, prompts, tools, entryPrompt };
}

/**
 * Build a system prompt section from a loaded chain.
 * This is injected into the agent's context to inform it of the chain's purpose
 * and available sub-prompts.
 */
export function buildChainSystemSection(chain: ParsedPromptChain): string {
  const parts: string[] = [];

  // Chain description
  const name = chain.meta._name || chain.meta._id || 'Default Chain';
  const desc = chain.meta._description || '';
  parts.push(`## Active Prompt Chain: ${name}`);
  if (desc) {
    parts.push(desc);
  }

  // Entry prompt's system instructions (stripped of template interpolation markers)
  if (chain.entryPrompt.system) {
    const cleanSystem = chain.entryPrompt.system
      .replace(/\{state\.\w+\}/g, '[dynamic]')
      .replace(/\{history\}/g, '[conversation history]')
      .replace(/\{availablePrompts\}/g, '[see below]');
    parts.push('\n### Chain Instructions');
    parts.push(cleanSystem);
  }

  // List available sub-prompts
  if (chain.prompts.length > 1) {
    parts.push('\n### Available Sub-Prompts');
    for (const p of chain.prompts) {
      if (p.name === chain.entryPrompt.name) continue;
      const firstLine = p.system.split('\n')[0].substring(0, 120);
      parts.push(`- **${p.name}**: ${firstLine}`);
    }
  }

  // List chain-specific tools (descriptions only)
  if (chain.tools.length > 0) {
    parts.push('\n### Chain-Specific Tools');
    for (const t of chain.tools) {
      const desc = t.function.description || 'No description';
      parts.push(`- **${t.function.name}**: ${desc}`);
    }
  }

  return parts.join('\n');
}

/**
 * List all chain files and indicate which one is the default.
 */
export function listChainFiles(): Array<{
  filename: string;
  name: string;
  path: string;
}> {
  const dir = resolvePromptChainsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => ({
      filename: f,
      name: f.replace('.json', ''),
      path: path.join(dir, f),
    }));
}
