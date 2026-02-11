import { activate } from '../src/index';
import { PluginContext } from '../../../client/src/shared/plugin-types';
import WebSocket from 'ws';

jest.mock('ws');

describe('VS Code Control Plugin', () => {
  let mockContext: any;
  let mockWs: any;
  let registeredTools: Record<string, Function> = {};

  beforeEach(() => {
    registeredTools = {};
    mockContext = {
      manifest: {
        alephConfig: {
          configuration: {
            host: 'localhost',
            port: 1234,
            token: 'test-token'
          }
        }
      },
      dsn: {
        registerTool: jest.fn((def, handler) => {
          registeredTools[def.name] = handler;
        })
      }
    };

    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      readyState: 1 // OPEN
    };

    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);
    
    // Static property OPEN
    (WebSocket as any).OPEN = 1;

    jest.clearAllMocks();
  });

  it('should activate and connect to websocket', async () => {
    await activate(mockContext);

    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:1234');
    expect(mockWs.on).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should register tools', async () => {
    await activate(mockContext);

    expect(mockContext.dsn.registerTool).toHaveBeenCalled();
    expect(registeredTools['vscode_open_file']).toBeDefined();
    expect(registeredTools['vscode_read_file']).toBeDefined();
    expect(registeredTools['vscode_edit_file']).toBeDefined();
  });

  it('should send messages via websocket when tool is called', async () => {
    await activate(mockContext);
    
    // Simulate connection open
    const openHandler = mockWs.on.mock.calls.find((call: any) => call[0] === 'open')[1];
    openHandler();

    const handler = registeredTools['vscode_open_file'];
    
    // Mock send implementation to call callback immediately
    mockWs.send.mockImplementation((data: string, cb: Function) => {
      const msg = JSON.parse(data);
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: { success: true }
      };
      
      // We need to trigger the message handler with the response
      const messageHandler = mockWs.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler(JSON.stringify(response));
      
      if (cb) cb();
    });

    const result = await handler({ path: '/test/file.ts' });
    
    expect(mockWs.send).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});
