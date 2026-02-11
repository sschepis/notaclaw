import { WorkflowEngine, activate, IContext, Workflow } from '../src/index';

describe('WorkflowEngine', () => {
    let context: IContext;
    let engine: WorkflowEngine;

    beforeEach(() => {
        context = {
            dsn: {
                registerTool: jest.fn(),
                invokeTool: jest.fn().mockResolvedValue('tool-result')
            }
        };
        engine = new WorkflowEngine(context);
    });

    test('should resolve parameters correctly', () => {
        const inputs = { userInput: 'hello' };
        const results = { step1: { output: 'world' } };
        
        const params = {
            a: 'static',
            b: '$userInput',
            c: '$step1.output',
            d: ['$userInput', 'test']
        };

        const resolved = engine.resolveParams(params, inputs, results);

        expect(resolved.a).toBe('static');
        expect(resolved.b).toBe('hello');
        expect(resolved.c).toBe('world');
        expect(resolved.d).toEqual(['hello', 'test']);
    });

    test('should execute a simple workflow', async () => {
        const workflow: Workflow = {
            id: 'test-flow',
            steps: [
                { id: 'step1', type: 'echo', params: { text: 'hello' }, outputKey: 'msg' },
                { id: 'step2', type: 'echo', params: { text: '$step1.text' } } 
            ]
        };

        engine.registerStepType('echo', async (params) => ({ text: params.text }));

        const results = await engine.execute(workflow);

        expect(results['step1']).toEqual({ text: 'hello' });
        expect(results['step2']).toEqual({ text: 'hello' });
    });
});

describe('WorkflowWeaver Plugin', () => {
    let context: IContext;
    let registeredTools: Record<string, Function> = {};

    beforeEach(() => {
        registeredTools = {};
        context = {
            dsn: {
                registerTool: jest.fn((def: any, handler: any) => {
                    registeredTools[def.name] = handler;
                }),
                invokeTool: jest.fn().mockResolvedValue('tool-success')
            }
        };
    });

    test('should register tools on activate', () => {
        activate(context);
        expect(context.dsn.registerTool).toHaveBeenCalledTimes(2);
        expect(registeredTools['executeWorkflow']).toBeDefined();
        expect(registeredTools['createWorkflow']).toBeDefined();
    });

    test('should create and execute a workflow', async () => {
        activate(context);

        const workflow: Workflow = {
            id: 'test-flow',
            steps: [
                { id: 'step1', type: 'tool', params: { toolName: 'myTool', args: { val: 1 } } }
            ]
        };

        await registeredTools['createWorkflow']({ id: 'test-flow', definition: workflow });
        
        const result = await registeredTools['executeWorkflow']({ workflowId: 'test-flow' });

        expect(result.status).toBe('success');
        expect(result.results['step1']).toEqual({ toolOutput: 'tool-success' });
        expect(context.dsn.invokeTool).toHaveBeenCalledWith('myTool', { val: 1 });
    });
});
