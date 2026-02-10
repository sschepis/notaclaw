import { PluginContextMock } from '../mocks/PluginContextMock';

// Load plugins
const kgPlugin = require('../../plugins/knowledge-graph/main/index');

describe('Core Plugins', () => {
  
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
});
