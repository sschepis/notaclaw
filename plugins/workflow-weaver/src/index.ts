export interface IContext {
    dsn: {
        registerTool: (toolDef: any, handler: (args: any) => Promise<any>) => void;
        invokeTool?: (toolName: string, args: any) => Promise<any>;
    };
    [key: string]: any;
}

interface WorkflowStep {
    id: string;
    type: string;
    params: Record<string, any>;
    outputKey?: string;
}

export interface Workflow {
    id: string;
    steps: WorkflowStep[];
}

type StepHandler = (params: any, context: any) => Promise<any>;

export class WorkflowEngine {
    private stepHandlers: Record<string, StepHandler> = {};

    constructor(private context: IContext) {}

    public registerStepType(type: string, handler: StepHandler) {
        this.stepHandlers[type] = handler;
    }

    public async execute(workflow: Workflow, inputs: Record<string, any> = {}) {
        console.log(`[WorkflowEngine] Starting workflow: ${workflow.id}`);
        const context = { ...inputs };
        const results: Record<string, any> = {};

        for (const step of workflow.steps) {
            const handler = this.stepHandlers[step.type];
            if (!handler) {
                console.warn(`[WorkflowEngine] Unknown step type: ${step.type}`);
                continue;
            }

            try {
                console.log(`[WorkflowEngine] Executing step ${step.id} (${step.type})...`);
                // Resolve inputs from context
                const resolvedParams = this.resolveParams(step.params, context, results);

                const result = await handler(resolvedParams, context);
                results[step.id] = result;

                // Update context if needed
                if (step.outputKey) {
                    context[step.outputKey] = result;
                }

            } catch (error) {
                console.error(`[WorkflowEngine] Error in step ${step.id}:`, error);
                throw error;
            }
        }

        return results;
    }

    public resolveParams(params: any, context: any, results: any): any {
        if (params === undefined || params === null) return params;

        // Handle string reference directly
        if (typeof params === 'string' && params.startsWith('$')) {
             const path = params.substring(1).split('.');
             let current = { ...context, ...results };
             for (const part of path) {
                 if (current === undefined || current === null) break;
                 current = current[part];
             }
             return current;
        }

        if (typeof params !== 'object') return params;

        // Handle array
        if (Array.isArray(params)) {
            return params.map(p => this.resolveParams(p, context, results));
        }

        const resolved: Record<string, any> = {};
        for (const [key, value] of Object.entries(params)) {
            resolved[key] = this.resolveParams(value, context, results);
        }
        return resolved;
    }
}

export const activate = (context: IContext) => {
    console.log('[Workflow Weaver] Activating...');

    const engine = new WorkflowEngine(context);

    // Register basic step types
    engine.registerStepType('log', async (params) => {
        console.log('[Workflow Log]', params.message);
        return { logged: true };
    });

    engine.registerStepType('tool', async (params) => {
        console.log(`[Workflow Tool] Calling tool ${params.toolName} with`, params.args);

        if (context.dsn && context.dsn.invokeTool) {
            try {
                const result = await context.dsn.invokeTool(params.toolName, params.args);
                return { toolOutput: result };
            } catch (e) {
                console.error(`[Workflow Tool] Error invoking ${params.toolName}:`, e);
                throw e;
            }
        }

        // Fallback
        return { toolOutput: `Result from ${params.toolName} (Mock)` };
    });

    engine.registerStepType('agent', async (params) => {
        console.log(`[Workflow Agent] Querying agent with: ${params.prompt}`);
        return { response: `Agent says: I processed "${params.prompt}"` };
    });

    const workflows = new Map<string, Workflow>();

    // Seed demo
    workflows.set('demo-flow', {
        id: 'demo-flow',
        steps: [
            { id: 'step1', type: 'log', params: { message: 'Starting demo workflow' } },
            { id: 'step2', type: 'tool', params: { toolName: 'getWeather', args: { city: 'Berlin' } } },
            { id: 'step3', type: 'agent', params: { prompt: 'Summarize the weather: $step2.toolOutput' } },
            { id: 'step4', type: 'log', params: { message: 'Workflow complete' } }
        ]
    });

    context.dsn.registerTool({
        name: 'executeWorkflow',
        description: 'Executes a defined workflow by ID',
        parameters: {
            type: 'object',
            properties: {
                workflowId: { type: 'string' },
                inputs: { type: 'object' }
            },
            required: ['workflowId']
        }
    }, async (args: { workflowId: string, inputs?: any }) => {
        const workflow = workflows.get(args.workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${args.workflowId} not found`);
        }
        const results = await engine.execute(workflow, args.inputs);
        return { status: 'success', results };
    });

    context.dsn.registerTool({
        name: 'createWorkflow',
        description: 'Creates or updates a workflow definition',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                definition: { type: 'object' }
            },
            required: ['id', 'definition']
        }
    }, async (args: { id: string, definition: Workflow }) => {
        workflows.set(args.id, { ...args.definition, id: args.id });
        return { status: 'created', id: args.id };
    });

    console.log('[Workflow Weaver] Activated.');
};

export const deactivate = () => {};
