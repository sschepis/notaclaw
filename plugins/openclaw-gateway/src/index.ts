import { PluginContext } from '../../../src/shared/plugin-types';
import { GatewayDefinition } from '../../../src/shared/service-types';
import { ConnectionManager, NodeConfig } from './ConnectionManager';

export const activate = async (context: PluginContext) => {
    console.log('OpenClaw Gateway activating...');

    // Register traits for AI to understand OpenClaw capabilities
    context.traits.register({
        id: 'openclaw-gateway:task-delegation',
        name: 'OpenClaw Task Delegation',
        description: 'Enables delegating compute tasks to the distributed OpenClaw network',
        instruction: `You have access to the OpenClaw distributed compute network for delegating tasks.

Available tools:
- 'openclaw_submit_task': Submit a compute task to the OpenClaw network
  Parameters: description (required), requirements (optional object with compute specs)
  Returns: taskId for tracking

- 'openclaw_get_task_status': Check status of a submitted task
  Parameters: taskId (required)
  Returns: task status, progress, and results when complete

- 'openclaw_cancel_task': Cancel a running task
  Parameters: taskId (required)

- 'openclaw_list_nodes': List available OpenClaw compute nodes
  Returns: array of connected nodes

Use OpenClaw when:
- User needs to run compute-intensive tasks (ML training, data processing)
- Local resources are insufficient for the requested operation
- Tasks can run asynchronously while waiting for results
- Distributed computation would be more efficient

Note: Tasks are executed on remote nodes. Results may take time depending on complexity.`,
        activationMode: 'dynamic',
        triggerKeywords: ['openclaw', 'distributed', 'compute', 'delegate', 'run task', 'offload', 'parallel', 'cluster'],
        priority: 12,
        source: 'openclaw-gateway'
    });

    const config = context.manifest.alephConfig?.configuration || {};
    const endpoints: NodeConfig[] = config.endpoints || [];

    const connectionManager = new ConnectionManager(endpoints);

    // Implement the Gateway Interface
    const gateway: GatewayDefinition = {
        id: 'openclaw-gateway',
        name: 'OpenClaw Gateway',
        type: 'openclaw',
        status: 'disconnected',
        networkName: 'OpenClaw',
        
        connect: async () => {
            await connectionManager.connect();
            const activeNode = connectionManager.getActiveNode();
            if (activeNode) {
                gateway.status = 'connected';
                console.log(`Connected to OpenClaw node: ${activeNode}`);
            } else {
                gateway.status = 'error';
                console.error('Could not connect to any OpenClaw endpoints');
            }
        },

        disconnect: async () => {
            await connectionManager.disconnect();
            gateway.status = 'disconnected';
            console.log('Disconnected from OpenClaw network');
        },

        submitTask: async (task: any) => {
            const response = await connectionManager.request('/tasks', {
                method: 'POST',
                body: JSON.stringify(task)
            });
            return response.id;
        },

        getTaskStatus: async (taskId: string) => {
            return await connectionManager.request(`/tasks/${taskId}`);
        }
    };

    // Register the gateway service
    context.services.gateways.register(gateway);

    // Register tools for Agents
    context.dsn.registerTool({
        name: 'openclaw_submit_task',
        description: 'Submit a task to the OpenClaw network',
        executionLocation: 'SERVER',
        semanticDomain: 'cognitive',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                description: { type: 'string' },
                requirements: { type: 'object' }
            },
            required: ['description']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        return await gateway.submitTask(args);
    });

    context.dsn.registerTool({
        name: 'openclaw_get_task_status',
        description: 'Get status of an OpenClaw task',
        executionLocation: 'SERVER',
        semanticDomain: 'meta',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string' }
            },
            required: ['taskId']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        return await gateway.getTaskStatus(args.taskId);
    });

    context.dsn.registerTool({
        name: 'openclaw_cancel_task',
        description: 'Cancel an OpenClaw task',
        executionLocation: 'SERVER',
        semanticDomain: 'meta',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string' }
            },
            required: ['taskId']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        await connectionManager.request(`/tasks/${args.taskId}/cancel`, {
            method: 'POST'
        });
        return { success: true };
    });

    context.dsn.registerTool({
        name: 'openclaw_list_nodes',
        description: 'List connected OpenClaw nodes',
        executionLocation: 'SERVER',
        semanticDomain: 'meta',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {},
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async () => {
        return endpoints.map(ep => ({
            name: ep.name,
            url: ep.url,
            connected: connectionManager.getActiveNode() === ep.name
        }));
    });

    console.log('OpenClaw Gateway activated.');
};
