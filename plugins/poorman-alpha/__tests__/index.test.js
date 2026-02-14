/**
 * index.test.js — Integration tests for the plugin lifecycle.
 * Enhancement E-15.
 */

const plugin = require('../index');
const { shutdown } = require('../sympy-bridge');

afterAll(() => {
  shutdown();
});

function createMockContext() {
  const registeredTools = [];
  const dsnTools = [];
  const ipcHandlers = {};
  const storage = {};

  return {
    context: {
      id: 'com.notaclaw.poorman-alpha',
      manifest: { id: 'com.notaclaw.poorman-alpha', name: 'Poorman Computational Tool' },
      services: {
        tools: {
          register: (tool) => registeredTools.push(tool),
        }
      },
      dsn: {
        registerTool: (def, handler) => dsnTools.push({ def, handler }),
      },
      ipc: {
        handle: (channel, handler) => { ipcHandlers[channel] = handler; },
      },
      storage: {
        get: async (key) => storage[key],
        set: async (key, value) => { storage[key] = value; },
      }
    },
    registeredTools,
    dsnTools,
    ipcHandlers,
    storage,
  };
}

describe('Plugin Lifecycle', () => {
  test('exports activate and deactivate functions', () => {
    expect(typeof plugin.activate).toBe('function');
    expect(typeof plugin.deactivate).toBe('function');
  });

  test('activate registers 4 tools', async () => {
    const mock = createMockContext();
    await plugin.activate(mock.context);
    expect(mock.registeredTools).toHaveLength(4);
    expect(mock.registeredTools.map(t => t.name)).toEqual([
      'compute', 'sympy_compute', 'matrix_compute', 'compute_cache_stats'
    ]);
    plugin.deactivate();
  });

  test('activate registers 2 DSN tools (E-14)', async () => {
    const mock = createMockContext();
    await plugin.activate(mock.context);
    expect(mock.dsnTools).toHaveLength(2);
    expect(mock.dsnTools.map(t => t.def.name)).toEqual(['compute', 'sympy_compute']);
    plugin.deactivate();
  });

  test('activate registers IPC handlers (E-13)', async () => {
    const mock = createMockContext();
    await plugin.activate(mock.context);
    expect(mock.ipcHandlers['get-settings']).toBeDefined();
    expect(mock.ipcHandlers['update-settings']).toBeDefined();
    plugin.deactivate();
  });

  test('deactivate completes without error', async () => {
    const mock = createMockContext();
    await plugin.activate(mock.context);
    expect(() => plugin.deactivate()).not.toThrow();
  });
});

describe('Tool Handlers', () => {
  let tools;

  beforeAll(async () => {
    const mock = createMockContext();
    await plugin.activate(mock.context);
    tools = mock.registeredTools;
  });

  afterAll(() => {
    plugin.deactivate();
  });

  test('compute tool evaluates arithmetic', async () => {
    const r = await tools[0].handler({ expression: '2+3' });
    expect(r.result).toBe('5');
  });

  test('compute tool evaluates unit conversion', async () => {
    const r = await tools[0].handler({ expression: '5 meters to feet' });
    expect(r.result).toContain('feet');
  });

  test('compute tool evaluates algebra', async () => {
    const r = await tools[0].handler({ expression: 'solve(x^2-9, x)' });
    expect(r.result).toContain('3');
  });

  test('compute tool supports LaTeX format', async () => {
    const r = await tools[0].handler({ expression: 'expand((x+1)^2)', format: 'all' });
    expect(r.latex).toBeDefined();
  });

  test('compute tool rejects dangerous input', async () => {
    const r = await tools[0].handler({ expression: 'require("fs")' });
    expect(r.errorCode).toBe('SANITIZATION_FAILED');
  });

  test('matrix_compute evaluates determinant', async () => {
    const r = await tools[2].handler({ expression: 'det([[1,2],[3,4]])' });
    expect(r.result).toBe('-2');
  });

  test('cache_stats returns statistics', async () => {
    const r = await tools[3].handler({ action: 'stats' });
    expect(r.native).toBeDefined();
    expect(r.sympy).toBeDefined();
    expect(r.native.size).toBeGreaterThanOrEqual(0);
  });

  test('cache_stats clear action works', async () => {
    const r = await tools[3].handler({ action: 'clear' });
    expect(r.message).toBe('Cache cleared');
  });
});

describe('Settings (E-13)', () => {
  let ipcHandlers;

  beforeAll(async () => {
    const mock = createMockContext();
    await plugin.activate(mock.context);
    ipcHandlers = mock.ipcHandlers;
  });

  afterAll(() => {
    plugin.deactivate();
  });

  test('get-settings returns default settings', async () => {
    const settings = await ipcHandlers['get-settings']();
    expect(settings.pythonPath).toBe('python3');
    expect(settings.sympyTimeout).toBe(30000);
    expect(settings.cacheEnabled).toBe(true);
    expect(settings.defaultFormat).toBe('text');
  });

  test('update-settings merges with defaults', async () => {
    const updated = await ipcHandlers['update-settings']({ defaultFormat: 'latex' });
    expect(updated.defaultFormat).toBe('latex');
    expect(updated.pythonPath).toBe('python3'); // Preserved
  });
});
