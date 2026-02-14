/**
 * nerdamer-worker.js — Worker thread script for nerdamer evaluation.
 * Enhancement E-03: Runs nerdamer off the main event loop.
 *
 * This file runs inside a worker_threads Worker.
 * Receives { expression, format } via parentPort, returns { result, latex?, error? }.
 */

const { parentPort } = require('worker_threads');
const nerdamer = require('nerdamer');
require('nerdamer/Algebra');
require('nerdamer/Calculus');
require('nerdamer/Solve');

parentPort.on('message', ({ expression, format }) => {
  try {
    const result = nerdamer(expression);
    const response = { result: result.toString() };

    // E-07: LaTeX output
    if (format === 'latex' || format === 'all') {
      try {
        response.latex = result.toTeX();
      } catch (_e) {
        response.latex = null;
      }
    }

    parentPort.postMessage(response);
  } catch (err) {
    parentPort.postMessage({ error: err.message || String(err) });
  }
});
