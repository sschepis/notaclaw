/**
 * native.test.js — Unit tests for the native computation engine.
 * Enhancement E-15.
 */

const { computationalTool, computeAsync, getCacheStats, clearCache } = require('../native');

beforeEach(() => {
  clearCache();
});

describe('computationalTool (sync)', () => {
  // ── Input Validation (E-01) ─────────────────────────────────────
  describe('E-01: Input Sanitization', () => {
    test('rejects null input', () => {
      const r = computationalTool(null);
      expect(r.errorCode).toBe('INPUT_INVALID');
      expect(r.result).toBeNull();
    });

    test('rejects empty string', () => {
      const r = computationalTool('');
      expect(r.errorCode).toBe('INPUT_INVALID');
    });

    test('rejects non-string input', () => {
      const r = computationalTool(42);
      expect(r.errorCode).toBe('INPUT_INVALID');
    });

    test('rejects require() calls', () => {
      const r = computationalTool('require("fs")');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects process access', () => {
      const r = computationalTool('process.exit()');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects eval() calls', () => {
      const r = computationalTool('eval("1+1")');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects expressions exceeding max length', () => {
      const r = computationalTool('x'.repeat(2001));
      expect(r.errorCode).toBe('INPUT_INVALID');
      expect(r.error).toContain('too long');
    });

    test('allows valid math expressions', () => {
      const r = computationalTool('2+3');
      expect(r.result).toBe('5');
    });
  });

  // ── Error Classification (E-02) ─────────────────────────────────
  describe('E-02: Structured Errors', () => {
    test('returns errorCode on failure', () => {
      const r = computationalTool('!!!invalid!!!');
      expect(r.errorCode).toBeDefined();
      expect(r.errorCode).toBe('PARSE_ERROR');
    });

    test('returns engine field on success', () => {
      const r = computationalTool('2+3');
      expect(r.engine).toBeDefined();
    });

    test('returns route info', () => {
      const r = computationalTool('2+3');
      expect(r.route).toBeDefined();
    });
  });

  // ── Unit Conversion ─────────────────────────────────────────────
  describe('Unit Conversion', () => {
    test('converts meters to feet', () => {
      const r = computationalTool('5 meters to feet');
      expect(r.engine).toBe('mathjs');
      expect(r.result).toContain('feet');
      expect(r.route).toBe('unit_conversion');
    });

    test('converts kg to lb', () => {
      const r = computationalTool('10 kg to lb');
      expect(r.engine).toBe('mathjs');
      expect(r.result).toContain('lb');
    });
  });

  // ── Symbolic Algebra ────────────────────────────────────────────
  describe('Symbolic Algebra', () => {
    test('solves quadratic equations', () => {
      const r = computationalTool('solve(x^2+2*x-8, x)');
      expect(r.engine).toBe('nerdamer');
      expect(r.result).toContain('2');
      expect(r.result).toContain('-4');
    });

    test('expands expressions', () => {
      const r = computationalTool('expand((x+1)^2)');
      expect(r.engine).toBe('nerdamer');
      expect(r.result).toContain('x^2');
    });

    test('factors expressions', () => {
      const r = computationalTool('factor(x^2-1)');
      expect(r.engine).toBe('nerdamer');
      expect(r.result).toContain('x');
    });
  });

  // ── Arithmetic ──────────────────────────────────────────────────
  describe('Arithmetic', () => {
    test('evaluates basic arithmetic', () => {
      const r = computationalTool('2+3*4');
      expect(r.result).toBe('14');
    });

    test('evaluates powers', () => {
      const r = computationalTool('2^10');
      expect(r.result).toBe('1024');
    });
  });

  // ── LaTeX Output (E-07) ─────────────────────────────────────────
  describe('E-07: LaTeX Output', () => {
    test('returns LaTeX when format=latex', () => {
      const r = computationalTool('expand((x+1)^2)', { format: 'latex' });
      expect(r.latex).toBeDefined();
      expect(r.latex).toContain('x');
    });

    test('returns LaTeX when format=all', () => {
      const r = computationalTool('factor(x^2-1)', { format: 'all' });
      expect(r.result).toBeDefined();
      expect(r.latex).toBeDefined();
    });

    test('omits LaTeX when format=text', () => {
      const r = computationalTool('2+3');
      expect(r.latex).toBeUndefined();
    });
  });

  // ── Caching (E-05) ─────────────────────────────────────────────
  describe('E-05: Caching', () => {
    test('caches results and returns cached flag', () => {
      computationalTool('2+3');
      const r2 = computationalTool('2+3');
      expect(r2.cached).toBe(true);
    });

    test('cache can be disabled', () => {
      computationalTool('2+3', { cache: false });
      const r2 = computationalTool('2+3', { cache: false });
      expect(r2.cached).toBeUndefined();
    });

    test('getCacheStats returns valid stats', () => {
      computationalTool('2+3');
      computationalTool('2+3'); // hit
      const stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
    });

    test('clearCache empties the cache', () => {
      computationalTool('2+3');
      clearCache();
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  // ── Smart Routing (E-06) ────────────────────────────────────────
  describe('E-06: Smart Routing', () => {
    test('routes unit conversion correctly', () => {
      const r = computationalTool('5 meters to feet');
      expect(r.route).toBe('unit_conversion');
    });

    test('routes symbolic algebra correctly', () => {
      const r = computationalTool('solve(x^2-4, x)');
      expect(r.route).toBe('symbolic');
    });

    test('routes pure arithmetic correctly', () => {
      const r = computationalTool('2+3*4');
      expect(r.route).toBe('arithmetic');
    });
  });

  // ── Matrix Operations (E-09) ────────────────────────────────────
  describe('E-09: Matrix Operations', () => {
    test('computes determinant', () => {
      const r = computationalTool('det([[1,2],[3,4]])');
      expect(r.engine).toBe('mathjs-matrix');
      expect(r.result).toBe('-2');
    });

    test('computes transpose', () => {
      const r = computationalTool('transpose([[1,2],[3,4]])');
      expect(r.engine).toBe('mathjs-matrix');
      const parsed = JSON.parse(r.result);
      expect(parsed.data).toEqual([[1,3],[2,4]]);
    });

    test('computes inverse', () => {
      const r = computationalTool('inv([[1,0],[0,1]])');
      expect(r.engine).toBe('mathjs-matrix');
    });
  });
});

describe('computeAsync', () => {
  // ── Async with Worker (E-03) ────────────────────────────────────
  describe('E-03: Async Worker', () => {
    test('evaluates symbolic algebra asynchronously', async () => {
      const r = await computeAsync('solve(x^2-4, x)');
      expect(r.result).toBeDefined();
      expect(r.result).toContain('2');
    });

    test('evaluates unit conversion asynchronously', async () => {
      const r = await computeAsync('10 kg to lb');
      expect(r.result).toContain('lb');
    });

    test('rejects dangerous input asynchronously', async () => {
      const r = await computeAsync('require("fs")');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('returns LaTeX in async mode', async () => {
      const r = await computeAsync('expand((x+1)^2)', { format: 'all' });
      expect(r.result).toBeDefined();
      expect(r.latex).toBeDefined();
    });
  });
});
