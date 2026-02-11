import { activate, PluginContext } from '../src/index';

// Mock os module
jest.mock('os', () => ({
  loadavg: jest.fn(() => [0.5, 0.3, 0.1]),
  freemem: jest.fn(() => 1000),
  totalmem: jest.fn(() => 2000),
  uptime: jest.fn(() => 3600),
  platform: jest.fn(() => 'test-platform')
}));

describe('AutoDash Plugin', () => {
  let mockContext: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockContext = {
      dsn: {
        getIdentity: jest.fn().mockResolvedValue({ peerId: 'test-peer', publicKey: 'test-key' })
      },
      ipc: {
        send: jest.fn(),
        handle: jest.fn()
      },
      ai: {
        complete: jest.fn().mockResolvedValue({ text: '{}' })
      },
      services: {
        sandbox: {
          createSession: jest.fn()
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should activate and start update loop', async () => {
    const cleanup = await activate(mockContext as PluginContext);

    // Initial update is async. Wait for microtasks.
    await Promise.resolve();
    await Promise.resolve();

    // Verify initial update sent
    expect(mockContext.ipc.send).toHaveBeenCalledWith('autodash:update', expect.any(Object));

    if (cleanup) (cleanup as any)();
  });

  it('should handle AI generation request', async () => {
    await activate(mockContext as PluginContext);
    
    // Find handler
    const calls = mockContext.ipc.handle.mock.calls;
    const generateHandler = calls.find((c: any) => c[0] === 'autodash:generate')?.[1];
    
    expect(generateHandler).toBeDefined();

    // Mock AI response
    mockContext.ai.complete.mockResolvedValue({
      text: JSON.stringify({
        layout: 'grid',
        widgets: [{ id: 'test', type: 'metric', title: 'Test', data: {} }]
      })
    });

    await generateHandler();

    expect(mockContext.ai.complete).toHaveBeenCalled();
    expect(mockContext.ipc.send).toHaveBeenCalledWith('autodash:update', expect.objectContaining({
      layout: 'grid'
    }));
  });
});
