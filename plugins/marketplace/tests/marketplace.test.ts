const marketplace = require('../main/index');
// Use require since main is JS

// Mock context
const mockContext = {
  ipc: {
    handle: jest.fn(),
    invoke: jest.fn(),
  },
  on: jest.fn(),
};

describe('Marketplace Plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('activate registers IPC handlers', () => {
    marketplace.activate(mockContext);

    expect(mockContext.ipc.handle).toHaveBeenCalledWith('marketplace:list', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('marketplace:install', expect.any(Function));
  });

  test('marketplace:list returns registry', async () => {
    marketplace.activate(mockContext);
    
    // Extract the handler
    const listHandler = mockContext.ipc.handle.mock.calls.find((c: any) => c[0] === 'marketplace:list')[1];
    
    const result = await listHandler();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('weather-skill');
  });

  test('marketplace:install returns simulated failure', async () => {
    marketplace.activate(mockContext);
    
    const installHandler = mockContext.ipc.handle.mock.calls.find((c: any) => c[0] === 'marketplace:install')[1];
    
    const result = await installHandler({ pluginId: 'weather-skill' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Installation simulation only');
  });
});
