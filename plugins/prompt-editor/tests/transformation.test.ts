import { jsonToGraph, graphToJson } from '../renderer/utils';

// reactflow is mocked via moduleNameMapper in jest.config.js

describe('Prompt Editor Transformation Logic', () => {
    const sampleConfig = {
        prompts: [
            {
                name: 'start',
                system: 'System prompt',
                user: 'User prompt',
                then: {
                    'true': { prompt: 'step2', arguments: {} },
                    'error': { function: 'errorHandler', arguments: { err: 'error' } }
                }
            },
            {
                name: 'step2',
                system: 'Step 2',
                user: 'User 2',
                then: {}
            }
        ],
        tools: [
            {
                function: {
                    name: 'errorHandler',
                    script: 'console.log(error)'
                }
            }
        ]
    };

    test('jsonToGraph creates correct nodes and edges', () => {
        const { nodes, edges } = jsonToGraph(sampleConfig);

        // Check Nodes
        expect(nodes).toHaveLength(3); // start, step2, errorHandler
        
        const startNode = nodes.find(n => n.id === 'start');
        expect(startNode).toBeDefined();
        expect(startNode?.data.name).toBe('start');
        expect(startNode?.type).toBe('prompt');

        const toolNode = nodes.find(n => n.id === 'tool-errorHandler');
        expect(toolNode).toBeDefined();
        expect(toolNode?.type).toBe('tool');

        // Check Edges
        expect(edges).toHaveLength(2);
        
        const promptEdge = edges.find(e => e.source === 'start' && e.target === 'step2');
        expect(promptEdge).toBeDefined();
        expect(promptEdge?.data.condition).toBe('true');

        const toolEdge = edges.find(e => e.source === 'start' && e.target === 'tool-errorHandler');
        expect(toolEdge).toBeDefined();
        expect(toolEdge?.data.condition).toBe('error');
    });

    test('graphToJson reconstructs config correctly', () => {
        const { nodes, edges } = jsonToGraph(sampleConfig);
        const reconstructed = graphToJson(nodes, edges, {});

        expect(reconstructed.prompts).toHaveLength(2);
        expect(reconstructed.tools).toHaveLength(1);

        const startPrompt = reconstructed.prompts.find((p: any) => p.name === 'start');
        expect(startPrompt.then['true']).toBeDefined();
        expect(startPrompt.then['true'].prompt).toBe('step2');
        
        expect(startPrompt.then['error']).toBeDefined();
        expect(startPrompt.then['error'].function).toBe('errorHandler');
    });
});
