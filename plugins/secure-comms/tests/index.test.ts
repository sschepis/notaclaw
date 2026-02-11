import { activate, deactivate, PluginContext } from '../main/index';

describe('Secure Comms Main Process', () => {
  let mockContext: PluginContext;
  let onMock: jest.Mock;
  let ipcOnMock: jest.Mock;
  let ipcSendMock: jest.Mock;

  beforeEach(() => {
    onMock = jest.fn();
    ipcOnMock = jest.fn();
    ipcSendMock = jest.fn();
    
    mockContext = {
      on: onMock,
      ipc: {
        on: ipcOnMock,
        send: ipcSendMock
      }
    };
  });

  test('should activate and register ready handler', () => {
    activate(mockContext);
    expect(onMock).toHaveBeenCalledWith('ready', expect.any(Function));
  });

  test('should register ipc ping handler', () => {
    activate(mockContext);
    expect(ipcOnMock).toHaveBeenCalledWith('ping', expect.any(Function));
  });

  test('should respond to ping', () => {
    activate(mockContext);
    
    // Get the callback passed to ipc.on('ping')
    const pingHandler = ipcOnMock.mock.calls.find(call => call[0] === 'ping')[1];
    
    // Call it
    pingHandler({ some: 'data' });
    
    expect(ipcSendMock).toHaveBeenCalledWith('pong', { message: 'Hello from main process!' });
  });

  test('should deactivate without error', () => {
    expect(() => deactivate()).not.toThrow();
  });
});
