/**
 * index.js — Enhanced plugin entry point for poorman-alpha.
 *
 * Integrates all enhancements:
 *   E-01..E-10: Sanitization, errors, worker, persistent process, caching, routing, LaTeX, steps, matrix, plots
 *   E-13: Plugin settings via configuration
 *   E-14: DSN tool registration
 *
 * Registers agent tools:
 *   - compute: In-process math via mathjs/nerdamer
 *   - sympy_compute: Out-of-process math via Python3/SymPy
 *   - matrix_compute: Matrix/linear algebra operations
 *   - cache_stats: Cache statistics and management
 */

const { computeAsync, computationalTool, getCacheStats, clearCache } = require('./native');
const { callSympy, shutdown: shutdownSympy, getCacheStats: getSympyCacheStats } = require('./sympy-bridge');

// Default settings (E-13)
const DEFAULT_SETTINGS = {
  pythonPath: 'python3',
  sympyTimeout: 30000,
  nerdamerTimeout: 10000,
  cacheEnabled: true,
  defaultFormat: 'text',
  persistentPython: true,
};

let settings = { ...DEFAULT_SETTINGS };

module.exports = {
  /**
   * Called by the PluginManager when the plugin is loaded and active.
   * @param {import('../../client/src/shared/plugin-types').PluginContext} context
   */
  async activate(context) {
    console.log(`[poorman-alpha] Activating plugin ${context.id}`);

    // E-13: Load settings from plugin storage
    try {
      const stored = await context.storage.get('settings');
      if (stored && typeof stored === 'object') {
        settings = { ...DEFAULT_SETTINGS, ...stored };
      }
    } catch (_e) {
      // Use defaults
    }

    // ── Tool 1: In-process computation (mathjs + nerdamer) ──────────
    const computeTool = {
      name: 'compute',
      description:
        'Evaluate math expressions: unit conversions (e.g. "5 meters to feet"), ' +
        'symbolic algebra (e.g. "solve(x^2+2x=8,x)"), arithmetic, expand, factor, simplify. ' +
        'Supports format options: "text" (default), "latex", "all".',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'A math expression to evaluate. Supports unit conversion ("5 meters to feet"), ' +
              'algebra ("solve(x^2+2x=8,x)"), expand, factor, simplify, and arithmetic.'
          },
          format: {
            type: 'string',
            description: 'Output format: "text" (default), "latex", or "all" (both text and LaTeX).',
            enum: ['text', 'latex', 'all']
          }
        },
        required: ['expression']
      },
      handler: async (args) => {
        const format = args.format || settings.defaultFormat;
        const result = await computeAsync(args.expression, {
          format,
          cache: settings.cacheEnabled,
          timeout: settings.nerdamerTimeout,
        });
        return result;
      }
    };

    context.services.tools.register(computeTool);

    // ── Tool 2: SymPy computation ───────────────────────────────────
    const sympyTool = {
      name: 'sympy_compute',
      description:
        'Evaluate advanced symbolic math via SymPy (Python). ' +
        'Supports integrals, derivatives, differential equations, series expansions, and more. ' +
        'Options: format ("text", "latex", "all"), steps (true/false for step-by-step), ' +
        'plot (true/false for graph generation). Requires python3 with sympy installed.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'A SymPy expression (e.g. "integrate(x**2, x)", "diff(sin(x), x)", "solve(x**2 - 4, x)").'
          },
          format: {
            type: 'string',
            description: 'Output format: "text" (default), "latex", or "all".',
            enum: ['text', 'latex', 'all']
          },
          steps: {
            type: 'boolean',
            description: 'If true, include step-by-step solution breakdown.'
          },
          plot: {
            type: 'boolean',
            description: 'If true, generate a plot of the expression as base64 PNG.'
          }
        },
        required: ['expression']
      },
      handler: async (args) => {
        return await callSympy(args.expression, {
          format: args.format || settings.defaultFormat,
          steps: args.steps || false,
          plot: args.plot || false,
          cache: settings.cacheEnabled,
          pythonPath: settings.pythonPath,
          timeout: settings.sympyTimeout,
          persistent: settings.persistentPython,
        });
      }
    };

    context.services.tools.register(sympyTool);

    // ── Tool 3: Matrix operations (E-09) ────────────────────────────
    const matrixTool = {
      name: 'matrix_compute',
      description:
        'Perform matrix and linear algebra operations. ' +
        'Supports: det (determinant), inv (inverse), transpose, eigenvalues, rank, size, ' +
        'and general matrix expressions. Matrices use mathjs syntax: [[1,2],[3,4]].',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'A matrix expression. Use det([[1,2],[3,4]]), inv([[1,0],[0,1]]), ' +
              'transpose([[1,2],[3,4]]), eigenvalues([[2,1],[1,2]]), etc.'
          },
          format: {
            type: 'string',
            description: 'Output format: "text" (default), "latex", or "all".',
            enum: ['text', 'latex', 'all']
          }
        },
        required: ['expression']
      },
      handler: async (args) => {
        return await computeAsync(args.expression, {
          format: args.format || settings.defaultFormat,
          cache: settings.cacheEnabled,
        });
      }
    };

    context.services.tools.register(matrixTool);

    // ── Tool 4: Cache management ────────────────────────────────────
    const cacheTool = {
      name: 'compute_cache_stats',
      description: 'Get cache statistics for the computation plugin, or clear the cache.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: '"stats" to get statistics, "clear" to clear the cache.',
            enum: ['stats', 'clear']
          }
        },
        required: ['action']
      },
      handler: async (args) => {
        if (args.action === 'clear') {
          clearCache();
          return { message: 'Cache cleared', native: getCacheStats(), sympy: getSympyCacheStats() };
        }
        return { native: getCacheStats(), sympy: getSympyCacheStats() };
      }
    };

    context.services.tools.register(cacheTool);

    // ── E-14: DSN tool registration ─────────────────────────────────
    if (context.dsn && typeof context.dsn.registerTool === 'function') {
      try {
        context.dsn.registerTool(
          {
            name: 'compute',
            description: computeTool.description,
            parameters: computeTool.parameters,
          },
          computeTool.handler
        );

        context.dsn.registerTool(
          {
            name: 'sympy_compute',
            description: sympyTool.description,
            parameters: sympyTool.parameters,
          },
          sympyTool.handler
        );

        console.log(`[poorman-alpha] Registered tools on DSN mesh`);
      } catch (err) {
        console.warn(`[poorman-alpha] DSN registration failed (non-fatal): ${err.message}`);
      }
    }

    // ── E-13: IPC handler for settings updates ──────────────────────
    context.ipc.handle('get-settings', async () => settings);
    context.ipc.handle('update-settings', async (newSettings) => {
      settings = { ...settings, ...newSettings };
      await context.storage.set('settings', settings);
      return settings;
    });

    console.log(`[poorman-alpha] Registered tools: compute, sympy_compute, matrix_compute, compute_cache_stats`);
    console.log(`[poorman-alpha] Settings:`, JSON.stringify(settings));
  },

  /**
   * Called by the PluginManager when the plugin is being unloaded.
   */
  deactivate() {
    console.log(`[poorman-alpha] Deactivating...`);
    shutdownSympy();
    clearCache();
    console.log(`[poorman-alpha] Deactivated`);
  }
};
