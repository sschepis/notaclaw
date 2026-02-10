
class WorkflowEngine {
  constructor(context) {
    this.context = context;
    this.stepHandlers = {};
  }

  registerStepType(type, handler) {
    this.stepHandlers[type] = handler;
  }

  async execute(workflow, inputs = {}) {
    console.log(`[WorkflowEngine] Starting workflow: ${workflow.id}`);
    const context = { ...inputs };
    const results = {};

    for (const step of workflow.steps) {
      const handler = this.stepHandlers[step.type];
      if (!handler) {
        console.warn(`[WorkflowEngine] Unknown step type: ${step.type}`);
        continue;
      }

      try {
        console.log(`[WorkflowEngine] Executing step ${step.id} (${step.type})...`);
        // Resolve inputs from context if they are references (e.g. $step1.output)
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

  resolveParams(params, context, results) {
    if (!params) return {};
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Simple reference resolution logic
        const path = value.substring(1).split('.');
        let current = { ...context, ...results };
        for (const part of path) {
            current = current ? current[part] : undefined;
        }
        resolved[key] = current;
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}

exports.activate = function(context) {
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
    
    // Fallback if not available
    return { toolOutput: `Result from ${params.toolName} (Mock)` };
  });

  engine.registerStepType('agent', async (params) => {
    console.log(`[Workflow Agent] Querying agent with: ${params.prompt}`);
    // Mock response
    return { response: `Agent says: I processed "${params.prompt}"` };
  });

  // Mock store for workflows
  const workflows = new Map();
  
  // Seed a demo workflow
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
  }, async (args) => {
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
  }, async (args) => {
      workflows.set(args.id, { id: args.id, ...args.definition });
      return { status: 'created', id: args.id };
  });

  console.log('[Workflow Weaver] Activated.');
}
