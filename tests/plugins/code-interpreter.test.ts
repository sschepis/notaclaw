import { PluginContextMock } from '../mocks/PluginContextMock';

const codePlugin = require('../../plugins/code-interpreter/main/index');

describe('Code Interpreter Plugin', () => {
  let context: PluginContextMock;

  beforeEach(() => {
    context = new PluginContextMock('code-interpreter');
  });

  it('should register exec tool', async () => {
    await codePlugin.activate(context);
    const tool = context.services.tools.registered.find(t => t.name === 'exec');
    expect(tool).toBeDefined();
    expect(tool.description).toContain('Execute shell commands');
  });

  it('should execute a simple echo command', async () => {
    await codePlugin.activate(context);
    const tool = context.services.tools.registered.find(t => t.name === 'exec');
    
    const result = await tool.handler({ command: 'echo "hello world"' });
    expect(result.output.trim()).toBe('hello world');
    expect(result.code).toBe(0);
  });

  it('should handle command errors', async () => {
    await codePlugin.activate(context);
    const tool = context.services.tools.registered.find(t => t.name === 'exec');
    
    // Non-existent command
    const result = await tool.handler({ command: 'nonexistentcommand123' });
    expect(result.code).not.toBe(0);
    expect(result.error).toBeDefined();
  });
});
