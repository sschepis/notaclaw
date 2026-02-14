/**
 * native.js — In-process computational engine using mathjs and nerdamer.
 *
 * Integrates:
 *   E-01: Input sanitization
 *   E-02: Structured error classification
 *   E-03: Worker thread for nerdamer (async path)
 *   E-05: Expression result caching
 *   E-06: Smart input routing
 *   E-07: LaTeX output format
 *   E-09: Matrix/linear algebra support
 *
 * Exports: computationalTool(input, options?) — sync/fallback
 *          computeAsync(input, options?) — async with worker thread
 */

const path = require('path');
const math = require('mathjs');
const { ErrorCode, makeError, makeResult } = require('./lib/errors');
const { sanitizeJS } = require('./lib/sanitizer');
const { classifyExpression } = require('./lib/router');
const { LRUCache } = require('./lib/cache');

// Cache instance (E-05)
const cache = new LRUCache(256);

// ── Synchronous fallback (used when worker is unavailable) ──────────

/**
 * Try to evaluate with nerdamer synchronously (fallback path).
 */
function tryNerdamer(expression, format) {
  const nerdamer = require('nerdamer');
  require('nerdamer/Algebra');
  require('nerdamer/Calculus');
  require('nerdamer/Solve');

  const result = nerdamer(expression);
  const response = makeResult(result.toString(), 'nerdamer');
  if (format === 'latex' || format === 'all') {
    try { response.latex = result.toTeX(); } catch (_e) { /* ignore */ }
  }
  return response;
}

/**
 * Try to evaluate with mathjs.
 */
function tryMathjs(expression, format) {
  const result = math.evaluate(expression);
  const response = makeResult(result.toString(), 'mathjs');
  if (format === 'latex' || format === 'all') {
    // mathjs doesn't have toTeX natively; provide a simple fallback
    response.latex = null;
  }
  return response;
}

/**
 * Evaluate a matrix expression (E-09).
 * Supports: det, inv, transpose, eigenvalues, rank, size, multiply.
 */
function tryMatrix(expression) {
  // Parse matrix operations
  const matOps = {
    det: /^det\((.+)\)$/i,
    inv: /^inv\((.+)\)$/i,
    transpose: /^transpose\((.+)\)$/i,
    eigenvalues: /^eigenvalues\((.+)\)$/i,
    rank: /^rank\((.+)\)$/i,
    size: /^size\((.+)\)$/i,
  };

  for (const [op, re] of Object.entries(matOps)) {
    const match = expression.match(re);
    if (match) {
      try {
        const matExpr = match[1];
        const matrix = math.evaluate(matExpr);
        let result;
        switch (op) {
          case 'det': result = math.det(matrix); break;
          case 'inv': result = math.inv(matrix); break;
          case 'transpose': result = math.transpose(matrix); break;
          case 'eigenvalues': result = math.eigs(matrix).values; break;
          case 'rank': result = math.matrix(matrix).size(); break;
          case 'size': result = math.matrix(matrix).size(); break;
        }
        return makeResult(JSON.stringify(result), 'mathjs-matrix');
      } catch (err) {
        return makeError(ErrorCode.COMPUTATION_ERROR, `Matrix ${op} failed: ${err.message}`, 'mathjs-matrix');
      }
    }
  }

  // Try direct matrix evaluation
  try {
    const result = math.evaluate(expression);
    if (result && typeof result === 'object' && result._data) {
      return makeResult(JSON.stringify(result._data), 'mathjs-matrix');
    }
  } catch (_e) { /* not a matrix expression */ }

  return null; // Not a matrix expression
}

/**
 * Synchronous computation (fallback when worker unavailable).
 *
 * @param {string} input - The expression to evaluate
 * @param {{ format?: string, cache?: boolean }} options
 * @returns {{ result: string|null, engine: string, error?: string, errorCode?: string, latex?: string }}
 */
function computationalTool(input, options = {}) {
  const { format = 'text', cache: useCache = true } = options;

  // E-01: Sanitize
  const sanitized = sanitizeJS(input);
  if (!sanitized.safe) return sanitized.error;

  const expression = sanitized.expression;

  // E-05: Check cache
  const cacheKey = `sync:${expression}:${format}`;
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  // E-06: Classify expression
  const classification = classifyExpression(expression);
  let result;

  // E-09: Try matrix operations first
  const matrixResult = tryMatrix(expression);
  if (matrixResult) {
    result = matrixResult;
  } else if (classification.route === 'unit_conversion') {
    // Strategy 1: mathjs for unit conversion
    try {
      result = tryMathjs(expression, format);
    } catch (_e) {
      try { result = tryNerdamer(expression, format); }
      catch (_e2) { result = null; }
    }
  } else if (classification.route === 'symbolic') {
    // Strategy 2: nerdamer for symbolic
    try {
      result = tryNerdamer(expression, format);
    } catch (_e) {
      try { result = tryMathjs(expression, format); }
      catch (_e2) { result = null; }
    }
  } else if (classification.route === 'arithmetic') {
    // Strategy 3: mathjs for arithmetic, then nerdamer
    try {
      result = tryMathjs(expression, format);
    } catch (_e) {
      try { result = tryNerdamer(expression, format); }
      catch (_e2) { result = null; }
    }
  } else {
    // Unknown: try nerdamer then mathjs
    try {
      result = tryNerdamer(expression, format);
    } catch (_e) {
      try { result = tryMathjs(expression, format); }
      catch (_e2) { result = null; }
    }
  }

  if (!result || result.errorCode) {
    result = result || makeError(
      ErrorCode.PARSE_ERROR,
      `Could not evaluate expression: ${expression}`
    );
  }

  // Add routing info
  result.route = classification.route;
  result.routeConfidence = classification.confidence;

  // E-05: Cache success results
  if (useCache && result.result) {
    cache.set(cacheKey, result);
  }

  return result;
}

// ── Async path with worker thread (E-03) ────────────────────────────

let Worker;
try {
  Worker = require('worker_threads').Worker;
} catch (_e) {
  Worker = null; // worker_threads unavailable
}

/**
 * Async computation using worker thread for nerdamer.
 * Falls back to sync if worker_threads unavailable.
 *
 * @param {string} input
 * @param {{ format?: string, cache?: boolean, timeout?: number }} options
 * @returns {Promise<object>}
 */
async function computeAsync(input, options = {}) {
  const { format = 'text', cache: useCache = true, timeout = 10000 } = options;

  // E-01: Sanitize
  const sanitized = sanitizeJS(input);
  if (!sanitized.safe) return sanitized.error;

  const expression = sanitized.expression;

  // E-05: Check cache
  const cacheKey = `async:${expression}:${format}`;
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  // E-06: Classify
  const classification = classifyExpression(expression);

  // E-09: Try matrix first (sync, fast)
  const matrixResult = tryMatrix(expression);
  if (matrixResult) {
    if (useCache && matrixResult.result) cache.set(cacheKey, matrixResult);
    return { ...matrixResult, route: classification.route };
  }

  // For unit conversion and arithmetic, use sync mathjs (fast, no need for worker)
  if (classification.route === 'unit_conversion' || classification.route === 'arithmetic') {
    try {
      const result = tryMathjs(expression, format);
      result.route = classification.route;
      if (useCache && result.result) cache.set(cacheKey, result);
      return result;
    } catch (_e) {
      // Fall through to nerdamer worker
    }
  }

  // For symbolic expressions, use worker thread if available
  if (Worker) {
    try {
      const result = await runNerdamerWorker(expression, format, timeout);
      result.route = classification.route;
      if (useCache && result.result) cache.set(cacheKey, result);
      return result;
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        return makeError(ErrorCode.TIMEOUT, `Nerdamer timed out after ${timeout}ms`, 'nerdamer');
      }
      // Fall through to sync
    }
  }

  // Sync fallback
  const result = computationalTool(input, options);
  return result;
}

/**
 * Run nerdamer in a worker thread with timeout.
 */
function runNerdamerWorker(expression, format, timeout) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'lib', 'nerdamer-worker.js');
    const worker = new Worker(workerPath);

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('TIMEOUT'));
    }, timeout);

    worker.on('message', (msg) => {
      clearTimeout(timer);
      worker.terminate();
      if (msg.error) {
        resolve(makeError(ErrorCode.COMPUTATION_ERROR, msg.error, 'nerdamer'));
      } else {
        const result = makeResult(msg.result, 'nerdamer');
        if (msg.latex) result.latex = msg.latex;
        resolve(result);
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    });

    worker.postMessage({ expression, format });
  });
}

/**
 * Get cache statistics.
 */
function getCacheStats() {
  return cache.stats();
}

/**
 * Clear the computation cache.
 */
function clearCache() {
  cache.clear();
}

module.exports = { computationalTool, computeAsync, getCacheStats, clearCache };
