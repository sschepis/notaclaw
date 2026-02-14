import { PluginContext } from './types';
import { ChainManager } from './ChainManager';

export async function activate(context: PluginContext) {
    const chainManager = new ChainManager(context);
    await chainManager.initialize();

    // Register IPC handlers for the renderer UI
    context.ipc.handle('list-chains', async () => {
        return await chainManager.listChains();
    });

    context.ipc.handle('get-chain', async (id: string) => {
        return await chainManager.getChain(id);
    });

    context.ipc.handle('save-chain', async ({ id, config }: { id: string; config: any }) => {
        await chainManager.saveChain(id, config);
    });

    context.ipc.handle('delete-chain', async (id: string) => {
        await chainManager.deleteChain(id);
    });

    context.ipc.handle('sync-personalities', async () => {
        return await chainManager.syncPersonalities();
    });

    context.ipc.handle('list-tools', async () => {
        return await context.services.tools.list();
    });

    context.ipc.handle('run-chain', async ({ id, input }: { id: string; input: any }) => {
        const config = await chainManager.getHydratedChain(id);
        if (!config) throw new Error('Chain not found');
        
        // Create runner with current config
        const runner = context.workflow.createRunner(config, {});
        
        // Listen for execution events
        runner.on('runWithDepthStart', (data: any) => {
            context.ipc.send('chain-execution-update', { 
                type: 'node-start', 
                nodeId: data.prompt, // Assuming prompt name maps to node ID or label
                timestamp: Date.now() 
            });
        });

        runner.on('promptExecutionCompleted', (data: any) => {
            // Send full result for inspection, but maybe check size if needed
            context.ipc.send('chain-execution-update', { 
                type: 'node-complete', 
                nodeId: data.prompt, 
                result: data.result, // Send full object
                timestamp: Date.now() 
            });
        });

        runner.on('aiError', (data: any) => {
            context.ipc.send('chain-execution-update', { 
                type: 'node-error', 
                nodeId: data.promptName, 
                error: data.error.message,
                timestamp: Date.now() 
            });
        });

        // Execute the 'main' prompt (or first prompt)
        // Assuming the input is passed as initialArgs
        // The runner.run method we added to constructor.ts takes (promptName, initialArgs, providerName)
        
        // Find the start prompt
        const startPrompt = config.prompts[0]?.name || 'main';
        
        try {
            const result = await runner.run(startPrompt, input || {});
            return { success: true, result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    /*
    // Service registration temporarily disabled until ServiceDefinition is fully implemented
    context.dsn.registerService({
        id: 'prompt-editor-service',
        name: 'Prompt Chain Editor Service',
        description: 'Manages prompt chains',
        capabilities: ['workflow:create']
    } as any, () => {});
    */

    // Register tools for the agent
    context.dsn.registerTool({
        name: 'list_prompt_chains',
        description: 'List available prompt chains',
        parameters: { type: 'object', properties: {} },
        executionLocation: 'SERVER',
        version: '1.0.0',
        semanticDomain: 'cognitive',
        primeDomain: [1],
        smfAxes: [0],
        requiredTier: 'Neophyte'
    }, async () => {
        return await chainManager.listChains();
    });

    context.dsn.registerTool({
        name: 'read_prompt_chain',
        description: 'Read a prompt chain configuration',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Chain ID' }
            },
            required: ['id']
        },
        executionLocation: 'SERVER',
        version: '1.0.0',
        semanticDomain: 'cognitive',
        primeDomain: [1],
        smfAxes: [0],
        requiredTier: 'Neophyte'
    }, async ({ id }: { id: string }) => {
        return await chainManager.getChain(id);
    });

    context.dsn.registerTool({
        name: 'write_prompt_chain',
        description: 'Create or update a prompt chain',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Chain ID' },
                config: { type: 'object', description: 'WorkflowConfig object' }
            },
            required: ['id', 'config']
        },
        executionLocation: 'SERVER',
        version: '1.0.0',
        semanticDomain: 'cognitive',
        primeDomain: [1],
        smfAxes: [0],
        requiredTier: 'Neophyte'
    }, async ({ id, config }: { id: string, config: any }) => {
        await chainManager.saveChain(id, config);
        return { success: true };
    });

    if (context.traits) {
      context.traits.register({
        id: 'prompt-engineering',
        name: 'Prompt Engineering',
        description: 'Read, write, and manage prompt chains.',
        instruction: 'You are an expert prompt engineer. You can read, write, and manage prompt chains using tools like `list_prompt_chains`, `read_prompt_chain`, and `write_prompt_chain`. Use this to create new workflows or modify existing agent behaviors.',
        activationMode: 'dynamic',
        triggerKeywords: ['prompt', 'chain', 'workflow', 'configure agent', 'behavior', 'prompt engineering']
      });
    }
}
