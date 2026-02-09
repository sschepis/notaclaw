import { PromptEngine } from '../../../src/core/prompt-engine/PromptEngine';
import { promptRegistry } from '../../../src/core/prompt-engine/PromptRegistry';
import { AIProvider } from '../../../src/core/prompt-engine/types';

describe('PromptEngine', () => {
    let engine: PromptEngine;
    let mockProvider: AIProvider;

    beforeEach(() => {
        mockProvider = {
            name: 'mock',
            url: '',
            headers: {},
            requestObject: {
                getMessage: (msg: any) => ({ role: 'user', content: msg }),
                getOptions: (opts: any) => opts
            },
            request: jest.fn().mockResolvedValue({ text: JSON.stringify({ result: 'success' }) }),
            toolFormat: {
                formatTools: jest.fn().mockReturnValue([]),
                formatTool: jest.fn()
            },
            responseFormat: {
                getContent: (res: any) => res.text,
                getToolCall: jest.fn()
            }
        };

        engine = new PromptEngine({
            providers: [mockProvider],
            tools: [],
            prompts: []
        });

        promptRegistry.register({
            name: 'test-prompt',
            system: 'System: {state.foo}',
            user: 'User: {query}',
            requestFormat: { query: 'string' },
            responseFormat: { result: 'string' }
        });
    });

    it('should execute a simple prompt', async () => {
        const result = await engine.execute('test-prompt', { query: 'hello', foo: 'bar' }, { defaultProvider: 'mock' });
        
        expect(result).toEqual({ result: 'success' });
        expect(mockProvider.request).toHaveBeenCalled();
        
        const calls = (mockProvider.request as jest.Mock).mock.calls[0][0];
        expect(calls.messages[0].content).toContain('System: bar');
        expect(calls.messages[1].content).toContain('User: hello');
    });
});
