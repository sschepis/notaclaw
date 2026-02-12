import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { ChainManager } from '../main/ChainManager';

// Create a mock PluginContext
const mockContext = {
    id: 'prompt-editor',
    manifest: { id: 'prompt-editor', name: 'Prompt Editor', version: '0.1.0', description: '', permissions: [] },
    on: jest.fn(),
    storage: { get: jest.fn(), set: jest.fn(), delete: jest.fn() },
    secrets: { set: jest.fn(), get: jest.fn(), delete: jest.fn(), has: jest.fn(), list: jest.fn() },
    ipc: { send: jest.fn(), on: jest.fn(), handle: jest.fn(), invoke: jest.fn() },
    services: { tools: { register: jest.fn() }, gateways: { register: jest.fn() }, sandbox: {} as any },
    dsn: { registerTool: jest.fn(), registerService: jest.fn(), invokeTool: jest.fn(), publishObservation: jest.fn(), getIdentity: jest.fn() },
    ai: { complete: jest.fn() },
    workflow: { createRunner: jest.fn() },
    traits: { register: jest.fn(), unregister: jest.fn() },
} as any;

describe('ChainManager Personality Sync', () => {
    let tmpDir: string;
    let chainsDir: string;
    let personalitiesDir: string;
    let originalCwd: typeof process.cwd;

    beforeEach(async () => {
        // Create a temp directory structure
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-editor-test-'));
        chainsDir = path.join(tmpDir, 'data', 'prompt-chains');
        personalitiesDir = path.join(tmpDir, 'personalities');

        await fs.mkdir(chainsDir, { recursive: true });
        await fs.mkdir(personalitiesDir, { recursive: true });

        // Override process.cwd()
        originalCwd = process.cwd;
        process.cwd = () => tmpDir;
    });

    afterEach(async () => {
        process.cwd = originalCwd;
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    test('syncPersonalities creates chains from personality files', async () => {
        // Write a test personality file
        const personality = {
            id: 'test-agent',
            name: 'Test Agent',
            description: 'A test agent personality',
            systemPrompt: 'You are a test agent. Be helpful.',
            traits: ['Helpful'],
            capabilities: ['testing'],
            contextScope: 'testing',
            intentKeywords: ['test']
        };
        await fs.writeFile(
            path.join(personalitiesDir, 'test-agent.json'),
            JSON.stringify(personality, null, 2)
        );

        const chainManager = new ChainManager(mockContext);
        await chainManager.initialize();

        // Check that the chain was created
        const chains = await chainManager.listChains();
        expect(chains).toContain('personality-test-agent');

        // Load the chain and verify its contents
        const chain = await chainManager.getChain('personality-test-agent');
        expect(chain).not.toBeNull();
        expect(chain._source).toBe('personality');
        expect(chain._personalityId).toBe('test-agent');
        expect(chain._personalityName).toBe('Test Agent');
        expect(chain.prompts).toHaveLength(1);
        expect(chain.prompts[0].name).toBe('main');
        expect(chain.prompts[0].system).toContain('You are a test agent. Be helpful.');
        expect(chain.prompts[0].system).toContain('Agentic Mode');
        expect(chain.tools).toHaveLength(1);
        expect(chain.tools[0].function.name).toBe('completeTask');
    });

    test('syncPersonalities does not overwrite existing chain files', async () => {
        // Write a personality file
        const personality = {
            id: 'existing',
            name: 'Existing Agent',
            description: 'An existing agent',
            systemPrompt: 'Original system prompt.'
        };
        await fs.writeFile(
            path.join(personalitiesDir, 'existing.json'),
            JSON.stringify(personality, null, 2)
        );

        // Pre-create a chain file with custom edits
        const customChain = {
            _source: 'personality',
            _personalityId: 'existing',
            prompts: [{ name: 'main', system: 'Custom edited prompt by user', user: '{query}' }],
            tools: []
        };
        await fs.writeFile(
            path.join(chainsDir, 'personality-existing.json'),
            JSON.stringify(customChain, null, 2)
        );

        const chainManager = new ChainManager(mockContext);
        await chainManager.initialize();

        // The chain should still have the user's custom edits
        const chain = await chainManager.getChain('personality-existing');
        expect(chain.prompts[0].system).toBe('Custom edited prompt by user');
    });

    test('syncPersonalities handles multiple personalities', async () => {
        const personalities = [
            { id: 'alpha', name: 'Alpha', systemPrompt: 'Alpha prompt' },
            { id: 'beta', name: 'Beta', systemPrompt: 'Beta prompt' },
            { id: 'gamma', name: 'Gamma', systemPrompt: 'Gamma prompt' },
        ];

        for (const p of personalities) {
            await fs.writeFile(
                path.join(personalitiesDir, `${p.id}.json`),
                JSON.stringify(p, null, 2)
            );
        }

        const chainManager = new ChainManager(mockContext);
        await chainManager.initialize();

        const chains = await chainManager.listChains();
        expect(chains).toContain('personality-alpha');
        expect(chains).toContain('personality-beta');
        expect(chains).toContain('personality-gamma');
    });

    test('syncPersonalities returns list of synced chains', async () => {
        const personality = {
            id: 'synced',
            name: 'Synced Agent',
            systemPrompt: 'A synced prompt'
        };
        await fs.writeFile(
            path.join(personalitiesDir, 'synced.json'),
            JSON.stringify(personality, null, 2)
        );

        const chainManager = new ChainManager(mockContext);
        await chainManager.initialize();

        // Call syncPersonalities again — the chain already exists so should return empty
        const secondSync = await chainManager.syncPersonalities();
        expect(secondSync).toHaveLength(0);
    });

    test('syncPersonalities handles missing personalities directory gracefully', async () => {
        // Remove the personalities directory
        await fs.rm(personalitiesDir, { recursive: true, force: true });

        const chainManager = new ChainManager(mockContext);
        // Should not throw
        await chainManager.initialize();

        const chains = await chainManager.listChains();
        // Should have no personality chains (just whatever was in data/prompt-chains)
        const personalityChains = chains.filter((c: string) => c.startsWith('personality-'));
        expect(personalityChains).toHaveLength(0);
    });

    test('generated chain includes agentic instructions in system prompt', async () => {
        const personality = {
            id: 'agentic-test',
            name: 'Agentic Test',
            systemPrompt: 'Base system prompt for agentic testing.'
        };
        await fs.writeFile(
            path.join(personalitiesDir, 'agentic-test.json'),
            JSON.stringify(personality, null, 2)
        );

        const chainManager = new ChainManager(mockContext);
        await chainManager.initialize();

        const chain = await chainManager.getChain('personality-agentic-test');
        const systemPrompt = chain.prompts[0].system;

        // Verify the agentic instructions are appended
        expect(systemPrompt).toContain('Base system prompt for agentic testing.');
        expect(systemPrompt).toContain('## Agentic Mode');
        expect(systemPrompt).toContain('task_complete');
        expect(systemPrompt).toContain('ask_user');
        expect(systemPrompt).toContain('send_update');
        expect(systemPrompt).toContain('Immediate Memory');
    });

    test('existing non-personality chains are preserved', async () => {
        // Write a regular (non-personality) chain
        const regularChain = {
            prompts: [{ name: 'main', system: 'Regular chain', user: '{input}' }],
            tools: []
        };
        await fs.writeFile(
            path.join(chainsDir, 'my-custom-chain.json'),
            JSON.stringify(regularChain, null, 2)
        );

        const chainManager = new ChainManager(mockContext);
        await chainManager.initialize();

        const chains = await chainManager.listChains();
        expect(chains).toContain('my-custom-chain');

        const chain = await chainManager.getChain('my-custom-chain');
        expect(chain.prompts[0].system).toBe('Regular chain');
    });
});
