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
      },
      ipc: {
        send: jest.fn(),
        on: jest.fn(),
        handle: jest.fn(),
        invoke: jest.fn()
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
    expect(registeredTools['vscode_pairing_setup']).toBeDefined();
  });

  it('should return a vscode-pairing fence block from vscode_pairing_setup', async () => {
    await activate(mockContext);

    const handler = registeredTools['vscode_pairing_setup'];
    const result = await handler({});

    expect(result).toBeDefined();
    expect(result.content).toContain('```vscode-pairing');
    expect(result.display).toBe('inline');
  });

  it('should include config in vscode_pairing_setup fence block when provided', async () => {
    await activate(mockContext);

    const handler = registeredTools['vscode_pairing_setup'];
    const result = await handler({ host: '192.168.1.100', port: 9999, title: 'My VS Code' });

    expect(result.content).toContain('```vscode-pairing');
    expect(result.content).toContain('192.168.1.100');
    expect(result.content).toContain('9999');
    expect(result.content).toContain('My VS Code');
  });

  it('should register IPC handlers for pairing', async () => {
    await activate(mockContext);

    expect(mockContext.ipc.handle).toHaveBeenCalledWith('vscode-control:status', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('vscode-control:pair', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('vscode-control:unpair', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('vscode-control:config', expect.any(Function));
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
