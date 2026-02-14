import { PluginContext } from './types';
import path from 'path';
import fs from 'fs/promises';

/** The agentic mode instructions appended to every personality prompt (mirrors AgentContextBuilder) */
const AGENTIC_INSTRUCTIONS = `

## Agentic Mode

You are operating in agentic mode. You have the autonomy to work through multi-step tasks independently.

### Behavior Rules
- **Communicate Frequently**: You must keep the user informed about your actions. Do not be silent for multiple steps.
- **Plan First**: Before executing a complex tool or operation, briefly explain what you are about to do.
- **Report Progress**: After each meaningful step, report the result using text or the 'send_update' tool.
- **Use Tools**: Execute tools as needed without asking for permission unless the action is destructive or irreversible.
- **Ask When Stuck**: If you need information from the user, use the \`ask_user\` tool. Do not guess.
- **Completion**: When your task is fully complete, you MUST call the \`task_complete\` tool with a summary.
- **Error Handling**: If you encounter an error, explain it and attempt to recover. Only give up if the error is truly unrecoverable.

### Available Control Tools
- **task_complete**: Call this when the task is finished. Include a summary of what was accomplished.
- **ask_user**: Call this when you need input from the user. Include a clear question. The conversation will pause until they respond.
- **send_update**: Call this to send a progress message without stopping your work.

### Memory Capabilities
- **Long-term Memory**: Use \`memory_search_*\` and \`memory_store\` tools to access and save persistent information.
- **Immediate Memory**: Use \`set_immediate_memory\` to store a thought or context for the *very next step only*. This is useful for chain-of-thought reasoning or carrying over critical details to the next action without cluttering the permanent conversation history.
`;

export class ChainManager {
    private chainsDir: string;
    private personalitiesDir: string;

    constructor(private context: PluginContext) {
        this.chainsDir = path.join(process.cwd(), 'data', 'prompt-chains');
        this.personalitiesDir = path.join(process.cwd(), 'personalities');
    }

    async initialize() {
        try {
            await fs.mkdir(this.chainsDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create chains directory:', error);
        }

        // Auto-sync personality files as editable prompt chains
        await this.syncPersonalities();
    }

    /**
     * Scans the personalities directory and creates prompt chain files
     * for any personality that doesn't already have a corresponding chain.
     * This allows the user to see and edit their agent's default prompts.
     */
    async syncPersonalities(): Promise<string[]> {
        const synced: string[] = [];

        try {
            await fs.access(this.personalitiesDir);
        } catch {
            // Personalities directory doesn't exist — nothing to sync
            console.warn('[ChainManager] Personalities directory not found at', this.personalitiesDir);
            return synced;
        }

        try {
            const files = await fs.readdir(this.personalitiesDir);
            const personalityFiles = files.filter((f: string) => f.endsWith('.json'));

            for (const file of personalityFiles) {
                const personalityId = file.replace('.json', '');
                const chainId = `personality-${personalityId}`;
                const chainPath = path.join(this.chainsDir, `${chainId}.json`);

                // Only create the chain if it doesn't already exist (don't overwrite edits)
                try {
                    await fs.access(chainPath);
                    // Already exists — skip
                    continue;
                } catch {
                    // Doesn't exist — create it
                }

                try {
                    const content = await fs.readFile(path.join(this.personalitiesDir, file), 'utf-8');
                    const personality = JSON.parse(content);
                    const chain = this.personalityToChain(personality);
                    await fs.writeFile(chainPath, JSON.stringify(chain, null, 2));
                    synced.push(chainId);
                    console.log(`[ChainManager] Synced personality "${personality.name}" as chain "${chainId}"`);
                } catch (e) {
                    console.error(`[ChainManager] Failed to sync personality ${file}:`, e);
                }
            }
        } catch (e) {
            console.error('[ChainManager] Failed to read personalities directory:', e);
        }

        return synced;
    }

    /**
     * Converts a personality JSON object into a prompt chain config
     * that matches the WorkflowConfig format expected by the editor.
     */
    private personalityToChain(personality: any): any {
        const systemPrompt = personality.systemPrompt || 'You are a helpful AI assistant.';
        const fullSystemPrompt = systemPrompt + AGENTIC_INSTRUCTIONS;

        return {
            _source: 'personality',
            _personalityId: personality.id,
            _personalityName: personality.name,
            _description: personality.description || '',
            prompts: [
                {
                    name: 'main',
                    system: fullSystemPrompt,
                    user: '{query}',
                    requestFormat: {
                        query: 'string'
                    },
                    responseFormat: {
                        response: 'string'
                    },
                    tools: ['completeTask'],
                    then: {
                        'true': {
                            function: 'completeTask',
                            arguments: {
                                response: '{response}'
                            }
                        }
                    }
                }
            ],
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'completeTask',
                        description: 'Complete the task with a response',
                        parameters: {
                            type: 'object',
                            properties: {
                                response: {
                                    type: 'string'
                                }
                            },
                            required: ['response']
                        },
                        script: 'async ({ response }) => ({ response, taskCompleted: true })'
                    }
                }
            ]
        };
    }

    async listChains() {
        try {
            const files = await fs.readdir(this.chainsDir);
            return files.filter((f: string) => f.endsWith('.json')).map((f: string) => f.replace('.json', ''));
        } catch {
            return [];
        }
    }

    /**
     * Returns the chain config as a plain JSON-serializable object.
     * Safe for IPC transfer (no live functions).
     */
    async getChain(id: string) {
        const filePath = path.join(this.chainsDir, `${id}.json`);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * Returns the chain config with script strings hydrated into live functions.
     * NOT safe for IPC — use only in the main process (e.g. run-chain).
     */
    async getHydratedChain(id: string) {
        const config = await this.getChain(id);
        if (!config) return null;

        if (config.tools) {
            config.tools.forEach((tool: any) => {
                if (tool.function && typeof tool.function.script === 'string') {
                    try {
                        const scriptSrc = tool.function.script.trim();
                        tool.function.script = new Function(`return (${scriptSrc})`)();
                    } catch (e) {
                        console.error(`Failed to hydrate script for tool ${tool.function.name}:`, e);
                    }
                }
            });
        }

        return config;
    }

    async saveChain(id: string, config: any) {
        const filePath = path.join(this.chainsDir, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(config, null, 2));
    }

    async deleteChain(id: string) {
        const filePath = path.join(this.chainsDir, `${id}.json`);
        try {
            await fs.unlink(filePath);
        } catch (e) {
            console.error(`[ChainManager] Failed to delete chain ${id}:`, e);
            throw new Error(`Chain "${id}" not found or could not be deleted`);
        }
    }
}
