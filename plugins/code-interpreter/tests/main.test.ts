import plugin from '../main/index';
import { PluginContext } from '../../../client/src/shared/plugin-types';
import * as child_process from 'child_process';
import * as os from 'os';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('os', () => ({
  platform: jest.fn(),
}));

describe('Code Interpreter Plugin', () => {
  let mockContext: any;
  let registeredTools: Record<string, Function> = {};
  let mockChildProcess: any;

  beforeEach(() => {
    registeredTools = {};
    mockContext = {
      ipc: {
        handle: jest.fn()
      },
      services: {
        tools: {
          register: jest.fn((def) => {
            registeredTools[def.name] = def.handler;
          })
        }
      },
      on: jest.fn()
    };

    mockChildProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
      killed: false
    };

    (child_process.spawn as jest.Mock).mockReturnValue(mockChildProcess);
    (os.platform as jest.Mock).mockReturnValue('linux');

    jest.clearAllMocks();
  });

  it('should activate and register tool', () => {
    plugin.activate(mockContext);

    expect(mockContext.ipc.handle).toHaveBeenCalledWith('exec', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('spawn', expect.any(Function));
    expect(mockContext.ipc.handle).toHaveBeenCalledWith('kill', expect.any(Function));
    expect(mockContext.services.tools.register).toHaveBeenCalled();
    expect(registeredTools['exec']).toBeDefined();
  });

  it('should execute command successfully', async () => {
    plugin.activate(mockContext);
    
    const handler = registeredTools['exec'];
    const promise = handler({ command: 'echo hello' });

    // Simulate process execution
    const closeHandler = (mockChildProcess.on as jest.Mock).mock.calls.find(call => call[0] === 'close')[1];
    const stdoutHandler = (mockChildProcess.stdout.on as jest.Mock).mock.calls.find(call => call[0] === 'data')[1];
    
    stdoutHandler(Buffer.from('hello world'));
    closeHandler(0);

    const result = await promise;
    expect(result.code).toBe(0);
    expect(result.output).toBe('hello world');
  });

  it('should handle execution error', async () => {
    plugin.activate(mockContext);
    
    const handler = registeredTools['exec'];
    const promise = handler({ command: 'bad command' });

    // Simulate process execution
    const closeHandler = (mockChildProcess.on as jest.Mock).mock.calls.find(call => call[0] === 'close')[1];
    const stderrHandler = (mockChildProcess.stderr.on as jest.Mock).mock.calls.find(call => call[0] === 'data')[1];
    
    stderrHandler(Buffer.from('command not found'));
    closeHandler(1);

    const result = await promise;
    expect(result.code).toBe(1);
    expect(result.error).toBe('command not found');
  });

  it('should block forbidden commands', async () => {
    plugin.activate(mockContext);
    
    const handler = registeredTools['exec'];
    await expect(handler({ command: 'rm -rf /' })).rejects.toThrow('Command blocked');
  });
});
