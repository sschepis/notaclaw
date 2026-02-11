import { activate, deactivate } from '../main/index';

describe('Wallet Main Process', () => {
  let mockContext: any;
  beforeEach(() => {
    mockContext = {
      storage: {
        get: jest.fn().mockResolvedValue(100),
        set: jest.fn().mockResolvedValue(undefined)
      },
      ipc: {
        handle: jest.fn(),
        send: jest.fn()
      },
      dsn: {
        registerTool: jest.fn()
      }
    };
  });

  it('should activate and register tool', async () => {
    await activate(mockContext);
    expect(mockContext.dsn.registerTool).toHaveBeenCalled();
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('wallet:get-balance', expect.any(Function));
  });
});
