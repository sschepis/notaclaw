import plugin from '../main/index';
import { PluginContext } from '../../../client/src/shared/plugin-types';

describe('Coherence Monitor Plugin', () => {
  let mockContext: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockContext = {
      ipc: {
        send: jest.fn()
      },
      on: jest.fn()
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should activate and start monitoring on ready', () => {
    plugin.activate(mockContext);

    expect(mockContext.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockContext.on).toHaveBeenCalledWith('stop', expect.any(Function));

    // Simulate ready event
    const readyHandler = mockContext.on.mock.calls.find((call: any) => call[0] === 'ready')[1];
    readyHandler();

    jest.advanceTimersByTime(3000);

    expect(mockContext.ipc.send).toHaveBeenCalledWith('coherence:update', expect.objectContaining({
      source: 'SRIA-Core'
    }));
  });
});
