import plugin, { PluginContext } from '../src/index';
import * as http from 'http';
import { EventEmitter } from 'events';

// Mock http
jest.mock('http');

describe('API Gateway Plugin', () => {
  let mockContext: any;
  let mockServer: any;
  let requestHandler: (req: any, res: any) => void;

  beforeEach(() => {
    mockContext = {
      services: {
        gateways: {
          register: jest.fn()
        }
      },
      dsn: {
        publishObservation: jest.fn()
      },
      ipc: {
        send: jest.fn()
      },
      on: jest.fn()
    };

    mockServer = new EventEmitter();
    mockServer.timeout = 0;
    mockServer.keepAliveTimeout = 0;
    mockServer.listen = jest.fn((port, cb) => cb && cb());
    mockServer.close = jest.fn((cb) => cb && cb());
    mockServer.closeAllConnections = jest.fn();

    (http.createServer as jest.Mock).mockImplementation((handler) => {
      requestHandler = handler;
      return mockServer;
    });

    jest.clearAllMocks();
  });

  it('should activate and start server', async () => {
    await plugin.activate(mockContext);

    expect(http.createServer).toHaveBeenCalled();
    expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(mockContext.services.gateways.register).toHaveBeenCalled();
  });

  it('should handle incoming messages', async () => {
    await plugin.activate(mockContext);

    const req: any = new EventEmitter();
    req.method = 'POST';
    req.url = '/messages';
    req.headers = {
      'content-type': 'application/json'
    };
    req.destroy = jest.fn();

    const res: any = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn()
    };

    // Simulate request body
    const promise = requestHandler(req, res);
    
    req.emit('data', JSON.stringify({
      sender: 'test-user',
      content: 'hello world',
      channel: 'test-channel'
    }));
    req.emit('end');

    await promise;

    expect(mockContext.dsn.publishObservation).toHaveBeenCalledWith(
      expect.stringContaining('hello world'),
      []
    );
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
  });

  it('should handle health checks', async () => {
    await plugin.activate(mockContext);

    const req: any = {
      method: 'GET',
      url: '/health',
      headers: {},
      on: jest.fn()
    };

    const res: any = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn()
    };

    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('ok'));
  });
});
