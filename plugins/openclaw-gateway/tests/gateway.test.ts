
import { activate } from '../src/index';

// Mock global fetch
global.fetch = jest.fn();

describe('OpenClaw Gateway', () => {
  let context: any;
  let traits: { [key: string]: any } = {};
  let tools: { [key: string]: Function } = {};
  let gateway: any;

  beforeEach(() => {
    jest.clearAllMocks();
    traits = {};
    tools = {};
    gateway = null;

    context = {
      manifest: {
        alephConfig: {
          configuration: {
            endpoints: [{ name: 'TestNode', url: 'http://test-node' }]
          }
        }
      },
      traits: {
        register: jest.fn((trait) => {
          traits[trait.id] = trait;
        })
      },
      services: {
        gateways: {
          register: jest.fn((gw) => {
            gateway = gw;
          })
        }
      },
      dsn: {
        registerTool: jest.fn((def, fn) => {
          tools[def.name] = fn;
        })
      }
    };
  });

  test('activate registers traits and gateway', async () => {
    await activate(context);

    expect(context.traits.register).toHaveBeenCalledWith(expect.objectContaining({
      id: 'openclaw-gateway:task-delegation'
    }));
    
    expect(context.services.gateways.register).toHaveBeenCalled();
    expect(gateway).toBeDefined();
    expect(gateway.id).toBe('openclaw-gateway');
  });

  test('activate registers tools', async () => {
    await activate(context);
    
    expect(context.dsn.registerTool).toHaveBeenCalledTimes(4);
    expect(tools['openclaw_submit_task']).toBeDefined();
    expect(tools['openclaw_get_task_status']).toBeDefined();
    expect(tools['openclaw_cancel_task']).toBeDefined();
    expect(tools['openclaw_list_nodes']).toBeDefined();
  });

  test('gateway connects successfully', async () => {
    await activate(context);
    
    // Mock health check response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      statusText: 'OK'
    });

    await gateway.connect();
    
    expect(global.fetch).toHaveBeenCalledWith('http://test-node/health');
    expect(gateway.status).toBe('connected');
  });

  test('gateway handles connection failure', async () => {
    await activate(context);
    
    // Mock failure
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Not Found'
    });

    await gateway.connect();
    
    expect(gateway.status).toBe('error');
  });

  test('submitTask sends request', async () => {
    await activate(context);
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123' })
    });

    const taskId = await gateway.submitTask({ description: 'test' });
    
    expect(global.fetch).toHaveBeenCalledWith('http://test-node/tasks', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ description: 'test' })
    }));
    expect(taskId).toBe('task-123');
  });

  test('tool openclaw_submit_task calls gateway.submitTask', async () => {
    await activate(context);
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-tool' })
    });

    const result = await tools['openclaw_submit_task']({ description: 'via tool' });
    expect(result).toBe('task-tool');
  });
});
