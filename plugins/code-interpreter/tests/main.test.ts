import plugin from '../main/index';
import { PluginContext } from '../../../client/src/shared/plugin-types';
import * as child_process from 'child_process';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('Code Interpreter Plugin', () => {
  let mockContext: any;
  let registeredHandlers: Record<string, Function> = {};

  beforeEach(() => {
    registeredHandlers = {};
    mockContext = {
      ipc: {
        handle: jest.fn((channel, handler) => {
          registeredHandlers[channel] = handler;
        }),
        invoke: jest.fn()
      },
      services: {
        tools: {
          register: jest.fn()
        }
      },
      on: jest.fn()
    };

    jest.clearAllMocks();
  });

  it('should activate and register handlers', async () => {
    // Mock docker check
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
        if (typeof opts === 'function') cb = opts;
        if (cmd.includes('docker --version')) cb(null, 'Docker version 20.10.0', '');
    });

    await plugin.activate(mockContext);

    expect(mockContext.ipc.handle).toHaveBeenCalledWith('create-session', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('execute', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('end-session', expect.any(Function));
  });

  it('should create a secure session', async () => {
    // Mock docker check
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
        if (typeof opts === 'function') cb = opts;
        if (cmd.includes('docker --version')) cb(null, 'Docker version 20.10.0', '');
        if (cmd.includes('docker run')) {
            // Verify security flags
            if (!cmd.includes('--network none')) cb(new Error('Insecure network'));
            else if (!cmd.includes('--cpus 1')) cb(new Error('No CPU limit'));
            else if (!cmd.includes('--memory 512m')) cb(new Error('No memory limit'));
            else cb(null, 'container-123\n', '');
        }
    });

    await plugin.activate(mockContext);
    
    const createSession = registeredHandlers['create-session'];
    const result = await createSession({ language: 'python' });

    expect(result.sessionId).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should execute code in container', async () => {
    // Mock docker check
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
        if (typeof opts === 'function') cb = opts;
        if (cmd.includes('docker --version')) cb(null, 'Docker version 20.10.0', '');
        if (cmd.includes('docker run')) cb(null, 'container-123\n', '');
        if (cmd.includes('docker exec')) cb(null, 'Hello World\n', '');
    });

    await plugin.activate(mockContext);
    
    const createSession = registeredHandlers['create-session'];
    const { sessionId } = await createSession({ language: 'python' });

    const execute = registeredHandlers['execute'];
    const result = await execute({ sessionId, code: 'print("Hello World")' });

    expect(result.output).toBe('Hello World\n');
    expect(result.code).toBe(0);
  });

  it('should fail if Docker is not available', async () => {
    // Mock docker check failure
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, opts, cb) => {
        if (typeof opts === 'function') cb = opts;
        if (cmd.includes('docker --version')) cb(new Error('Command not found'), '', 'command not found');
    });

    await plugin.activate(mockContext);
    
    const createSession = registeredHandlers['create-session'];
    const result = await createSession({ language: 'python' });

    expect(result.sessionId).toBe('');
    expect(result.error).toContain('Docker is not available');
  });
});
