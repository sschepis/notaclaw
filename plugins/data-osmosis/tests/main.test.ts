import plugin from '../main/index';
import { PluginContext } from '../../../client/src/shared/plugin-types';

describe('Data Osmosis Plugin', () => {
  let mockContext: any;
  let registeredTools: Record<string, Function> = {};
  let ipcHandlers: Record<string, Function> = {};

  beforeEach(() => {
    registeredTools = {};
    ipcHandlers = {};
    mockContext = {
      ipc: {
        handle: jest.fn((channel, handler) => {
          ipcHandlers[channel] = handler;
        }),
        send: jest.fn()
      },
      storage: {
        get: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue(undefined)
      },
      dsn: {
        registerTool: jest.fn((def, handler) => {
          registeredTools[def.name] = handler;
        })
      }
    };
    jest.clearAllMocks();
  });

  it('should activate and register tools and ipc handlers', async () => {
    await plugin.activate(mockContext);

    expect(mockContext.ipc.handle).toHaveBeenCalledWith('data-osmosis:list', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('data-osmosis:connect', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('data-osmosis:sync', expect.any(Function));
    expect(mockContext.dsn.registerTool).toHaveBeenCalled();
    expect(registeredTools['connectDataSource']).toBeDefined();
  });

  it('should connect to a data source', async () => {
    await plugin.activate(mockContext);
    
    const handler = ipcHandlers['data-osmosis:connect'];
    const config = { type: 'postgres', connectionString: 'postgres://localhost:5432/db', name: 'Test DB' };
    
    const result = await handler(config);
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test DB');
    expect(mockContext.storage.set).toHaveBeenCalled();
  });

  it('should sync a data source', async () => {
    await plugin.activate(mockContext);
    
    // Connect first
    const connectHandler = ipcHandlers['data-osmosis:connect'];
    const source = await connectHandler({ type: 'postgres', connectionString: 'postgres://localhost:5432/db', name: 'Test DB' });
    
    // Sync
    const syncHandler = ipcHandlers['data-osmosis:sync'];
    const result = await syncHandler(source.id);
    
    expect(result.recordsIngested).toBeGreaterThan(0);
    expect(mockContext.ipc.send).toHaveBeenCalledWith('data-osmosis:update', expect.any(Array));
  });
});
