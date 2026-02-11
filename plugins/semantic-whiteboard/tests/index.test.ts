import { activate, deactivate, PluginContext } from '../main/index';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Semantic Whiteboard Main Process', () => {
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
    const pingCall = ipcOnMock.mock.calls.find((call: any) => call[0] === 'ping');
    const pingHandler = pingCall ? pingCall[1] as (data: any) => void : undefined;
    
    if (pingHandler) {
      // Call it
      pingHandler({ some: 'data' });
      
      expect(ipcSendMock).toHaveBeenCalledWith('pong', { message: 'Hello from main process!' });
    } else {
      throw new Error('Ping handler not registered');
    }
  });

  test('should deactivate without error', () => {
    expect(() => deactivate()).not.toThrow();
  });
});
