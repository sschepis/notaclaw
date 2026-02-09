import { PluginContextMock } from '../mocks/PluginContextMock';

// Load plugins
const canvasPlugin = require('../../plugins/canvas-viz/main/index');
const kgPlugin = require('../../plugins/knowledge-graph/main/index');
const voicePlugin = require('../../plugins/voice-interface/main/index');
const walletPlugin = require('../../plugins/wallet/main/index');

describe('Core Plugins', () => {
  
  describe('Canvas Viz', () => {
    let context: PluginContextMock;
    beforeEach(() => context = new PluginContextMock('canvas-viz'));

    it('should register IPC handlers', async () => {
      await canvasPlugin.activate(context);
      expect(context.ipc.handlers.has('canvas:add-node')).toBe(true);
    });

    it('should add nodes', async () => {
      await canvasPlugin.activate(context);
      const handler = context.ipc.handlers.get('canvas:add-node')!;
      const node = await handler({ label: 'test' });
      expect(node.label).toBe('test');
      expect(node.id).toBeDefined();
    });
  });

  describe('Knowledge Graph', () => {
    let context: PluginContextMock;
    beforeEach(() => context = new PluginContextMock('knowledge-graph'));

    it('should insert and query triples', async () => {
      await kgPlugin.activate(context);
      const insert = context.ipc.handlers.get('kg:insert')!;
      const query = context.ipc.handlers.get('kg:query')!;

      await insert({ subject: 'Alice', predicate: 'knows', object: 'Bob' });
      const results = await query({ subject: 'Alice' });
      
      expect(results).toHaveLength(1);
      expect(results[0].object).toBe('Bob');
    });
  });

  describe('Wallet', () => {
    let context: PluginContextMock;
    beforeEach(() => {
        context = new PluginContextMock('wallet');
        // Mock storage
        context.storage.get = jest.fn().mockResolvedValue(100);
        context.storage.set = jest.fn().mockResolvedValue(undefined);
    });

    it('should load balance', async () => {
      await walletPlugin.activate(context);
      const getBalance = context.ipc.handlers.get('wallet:get-balance')!;
      const balance = await getBalance();
      expect(balance).toBe(100);
    });

    it('should transfer funds', async () => {
      await walletPlugin.activate(context);
      const transfer = context.ipc.handlers.get('wallet:transfer')!;
      
      const result = await transfer({ to: 'Bob', amount: 50 });
      expect(result.success).toBe(true);
      expect(context.storage.set).toHaveBeenCalledWith('balance', 50);
    });

    it('should reject insufficient funds', async () => {
        await walletPlugin.activate(context);
        const transfer = context.ipc.handlers.get('wallet:transfer')!;
        await expect(transfer({ to: 'Bob', amount: 200 })).rejects.toThrow('Insufficient funds');
    });
  });
});
