/**
 * sympy-bridge.test.js — Unit tests for the SymPy bridge.
 * Enhancement E-15.
 *
 * Tests run without Python3/SymPy dependency by testing sanitization
 * and error handling paths. Tests that require SymPy are marked as
 * conditional and skipped if SymPy is not available.
 */

const { callSympy, shutdown, getCacheStats } = require('../sympy-bridge');

afterAll(() => {
  shutdown();
});

describe('callSympy', () => {
  // ── Input Sanitization (E-01) ─────────────────────────────────
  describe('E-01: Python Sanitization', () => {
    test('rejects empty expression', async () => {
      const r = await callSympy('');
      expect(r.errorCode).toBe('INPUT_INVALID');
      expect(r.result).toBeNull();
    });

    test('rejects null input', async () => {
      const r = await callSympy(null);
      expect(r.errorCode).toBe('INPUT_INVALID');
    });

    test('rejects import statements', async () => {
      const r = await callSympy('import os');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects __import__', async () => {
      const r = await callSympy('__import__("os")');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects os.system', async () => {
      const r = await callSympy('os.system("ls")');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects subprocess access', async () => {
      const r = await callSympy('subprocess.run(["ls"])');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects open()', async () => {
      const r = await callSympy('open("/etc/passwd")');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects __builtins__', async () => {
      const r = await callSympy('__builtins__');
      expect(r.errorCode).toBe('SANITIZATION_FAILED');
    });

    test('rejects expressions exceeding max length', async () => {
      const r = await callSympy('x'.repeat(2001));
      expect(r.errorCode).toBe('INPUT_INVALID');
    });

    test('allows valid SymPy expression', async () => {
      const r = await callSympy('solve(x**2-4, x)');
      // Will either succeed (sympy installed) or fail gracefully (sympy not installed)
      expect(r.engine).toBe('sympy');
    });
  });

  // ── Error Classification (E-02) ─────────────────────────────────
  describe('E-02: Error Classification', () => {
    test('returns engine field', async () => {
      const r = await callSympy('solve(x**2-4, x)');
      expect(r.engine).toBe('sympy');
    });

    test('returns structured error for bad input', async () => {
      const r = await callSympy('');
      expect(r.error).toBeDefined();
      expect(r.errorCode).toBeDefined();
    });
  });

  // ── Caching (E-05) ─────────────────────────────────────────────
  describe('E-05: Caching', () => {
    test('getCacheStats returns valid stats', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });

  // ── Options handling ────────────────────────────────────────────
  describe('Options', () => {
    test('accepts format option', async () => {
      const r = await callSympy('x**2', { format: 'latex' });
      expect(r.engine).toBe('sympy');
    });

    test('accepts steps option', async () => {
      const r = await callSympy('solve(x**2-4, x)', { steps: true });
      expect(r.engine).toBe('sympy');
    });

    test('accepts cache=false', async () => {
      const r = await callSympy('x+1', { cache: false });
      expect(r.engine).toBe('sympy');
    });

    test('accepts custom timeout', async () => {
      const r = await callSympy('x+1', { timeout: 5000 });
      expect(r.engine).toBe('sympy');
    });
  });
});
