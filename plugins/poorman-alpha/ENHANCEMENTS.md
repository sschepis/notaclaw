# poorman-alpha — Enhancement Roadmap

## Priority 1: Robustness & Safety

### E-01: Input Sanitization Layer
**Problem**: Both [`math.evaluate()`](native.js:39) and Python's `eval()` in [`solver.py`](solver.py:44) execute arbitrary expressions without validation. A malicious or malformed expression could cause unexpected behavior.

**Enhancement**:
- Add an allowlist-based expression validator in [`native.js`](native.js) that rejects known-dangerous patterns (e.g., `require`, `import`, `process`, `__proto__`)
- Replace `eval()` in [`solver.py`](solver.py:44) with `sympy.parsing.sympy_parser.parse_expr()` which provides a safer evaluation model
- Add max expression length check (e.g., 1000 chars) to prevent DoS via pathologically large inputs

**Impact**: High — security hardening  
**Effort**: Low

---

### E-02: Structured Error Classification
**Problem**: Errors return a single string message with no machine-readable classification. Callers can't distinguish parse errors from computation errors from timeout errors.

**Enhancement**:
- Define an error taxonomy: `PARSE_ERROR`, `COMPUTATION_ERROR`, `TIMEOUT`, `DEPENDENCY_MISSING`, `INPUT_INVALID`
- Return `{ error: string, errorCode: string }` in all error paths
- Update [`native.js`](native.js) and [`sympy-bridge.js`](sympy-bridge.js) to emit classified errors

**Impact**: Medium — enables downstream error handling  
**Effort**: Low

---

### E-03: Worker Thread for Nerdamer
**Problem**: Nerdamer operations are synchronous and can block the Node.js event loop on complex expressions (e.g., solving high-degree polynomials).

**Enhancement**:
- Move nerdamer evaluation to a `worker_threads` worker
- Add a configurable timeout (default 10s) for nerdamer operations
- Return `TIMEOUT` error if the worker exceeds the limit

**Impact**: Medium — prevents event loop stalling in Electron  
**Effort**: Medium

---

## Priority 2: Performance & Reliability

### E-04: Persistent Python Process
**Problem**: Each `sympy_compute` call spawns a new `python3` process (~200-500ms cold start). High-frequency use creates significant overhead.

**Enhancement**:
- Spawn a single persistent Python process on plugin activation
- Communicate via JSON-line protocol over stdin/stdout
- Implement process health monitoring and automatic restart on crash
- Reuse the process for all `sympy_compute` calls

**Impact**: High — eliminates subprocess overhead, ~10x faster for SymPy calls  
**Effort**: Medium

---

### E-05: Expression Result Caching
**Problem**: Identical expressions are re-computed on every call. Math expressions are deterministic — same input always yields same output.

**Enhancement**:
- Add an LRU cache (bounded, e.g., 256 entries) in [`native.js`](native.js) and [`sympy-bridge.js`](sympy-bridge.js)
- Cache key = normalized expression string; cache value = `{ result, engine }`
- Use `context.storage` for optional persistence of frequently-used expressions across sessions
- Add a `cache: false` parameter option to bypass caching

**Impact**: Medium — eliminates redundant computation  
**Effort**: Low

---

### E-06: Smarter Input Routing
**Problem**: The current `" to "` regex heuristic in [`native.js`](native.js:18) is fragile and can misroute expressions.

**Enhancement**:
- Replace regex with a multi-signal classifier:
  1. Check for known nerdamer function names (`solve`, `expand`, `factor`, `simplify`, `diff`, `integrate`)
  2. Check for unit keywords (maintain a list of mathjs unit names)
  3. Check for symbolic variables (single letters like `x`, `y`, `z`)
- Route based on confidence score rather than first-match
- Log routing decisions for debugging

**Impact**: Medium — reduces misrouted expressions  
**Effort**: Medium

---

## Priority 3: Feature Expansion

### E-07: LaTeX Output Format
**Problem**: Results are returned as plain text strings. For display in the UI, LaTeX rendering would be more readable.

**Enhancement**:
- Add a `format` parameter: `"text"` (default), `"latex"`, `"mathml"`
- Use nerdamer's `.toTeX()` method for nerdamer results
- Use SymPy's `latex()` function in [`solver.py`](solver.py) for SymPy results
- Use mathjs's formatting for unit conversion results

**Impact**: Medium — improves readability in chat/UI  
**Effort**: Low

---

### E-08: Step-by-Step Solution Mode
**Problem**: The plugin returns only the final answer. For educational or debugging purposes, showing intermediate steps is valuable.

**Enhancement**:
- Add a `showSteps: true` parameter
- For `solve`: show the equation transformation steps
- For `integrate`/`diff`: show substitution steps
- For `expand`/`factor`: show intermediate forms
- SymPy supports this via `sympy.integrals.manualintegrate` and step-by-step solvers

**Impact**: High — major feature for educational/debugging use  
**Effort**: High

---

### E-09: Matrix and Linear Algebra Support
**Problem**: Matrix operations are not explicitly supported, though mathjs can handle some.

**Enhancement**:
- Add a dedicated `matrix_compute` tool for:
  - Matrix multiplication, inversion, determinant
  - Eigenvalues/eigenvectors
  - Row echelon form, rank
  - Systems of linear equations (Ax = b)
- Accept matrices as JSON arrays or MATLAB-like syntax (`[1 2; 3 4]`)

**Impact**: Medium — expands use case coverage  
**Effort**: Medium

---

### E-10: Graph/Plot Generation
**Problem**: No visualization capability. Mathematical expressions often benefit from graphical representation.

**Enhancement**:
- Add a `plot` tool that generates SVG or PNG graphs
- Support 2D function plots (y = f(x)), parametric curves, and implicit equations
- Use Python's matplotlib via the SymPy bridge, or a JavaScript library like `function-plot`
- Return plot as a base64 data URI or temporary file path
- Register as a rich content attachment in the chat system

**Impact**: High — visual math is a differentiating feature  
**Effort**: High

---

## Priority 4: Integration Depth

### E-11: Renderer UI Panel
**Problem**: The plugin is backend-only. There's no dedicated UI for entering expressions or viewing results.

**Enhancement**:
- Add a `renderer` entry point with a computation panel:
  - Expression input field with syntax highlighting
  - Result display with LaTeX rendering (via KaTeX or MathJax)
  - Expression history with re-execution
  - Engine indicator (mathjs / nerdamer / SymPy)
- Register via `context.ui.registerPanel()` and `context.ui.registerNavigation()`

**Impact**: High — transforms from tool-only to interactive experience  
**Effort**: High

---

### E-12: Chat Message Decorator for Math
**Problem**: Math expressions in chat messages are rendered as plain text.

**Enhancement**:
- Register a message decorator via `context.ui.registerMessageDecorator()` that:
  - Detects math expressions in messages (inline `$...$` or fenced ````math` blocks)
  - Renders them with LaTeX formatting
  - Adds a "Compute" action button that evaluates the expression
- Display results inline below the message

**Impact**: Medium — seamless chat integration  
**Effort**: Medium

---

### E-13: Plugin Settings via Configuration
**Problem**: No user-configurable settings (e.g., default engine, timeout, Python path).

**Enhancement**:
- Add `configuration` to [`manifest.json`](manifest.json) under `aleph`:
  ```json
  "configuration": [
    { "key": "pythonPath", "label": "Python 3 Path", "type": "string", "default": "python3" },
    { "key": "sympyTimeout", "label": "SymPy Timeout (ms)", "type": "number", "default": 30000 },
    { "key": "cacheEnabled", "label": "Enable Result Cache", "type": "boolean", "default": true },
    { "key": "defaultFormat", "label": "Default Output Format", "type": "select", "options": ["text", "latex"], "default": "text" }
  ]
  ```
- Read settings from `context.storage` in [`index.js`](index.js) and pass to engine modules

**Impact**: Medium — user customization  
**Effort**: Low

---

### E-14: AlephNet DSN Tool Registration
**Problem**: Tools are registered only on `context.services.tools`, not on the DSN mesh. They're not discoverable by other agents in the AlephNet network.

**Enhancement**:
- Register tools via `context.dsn.registerTool()` in addition to `context.services.tools.register()`
- Add an SMF profile vector in [`manifest.json`](manifest.json) for semantic positioning
- Publish computation results as observations via `context.dsn.publishObservation()`

**Impact**: Medium — enables network-wide math capabilities  
**Effort**: Low

---

### E-15: Unit Test Suite
**Problem**: No automated tests. Validation is manual.

**Enhancement**:
- Add a `__tests__/` directory with:
  - `native.test.js` — Unit tests for all computation paths (unit conversion, algebra, arithmetic, error cases)
  - `sympy-bridge.test.js` — Tests for subprocess bridge (mock python3, test timeout, ENOENT)
  - `index.test.js` — Integration test for activate/deactivate lifecycle with mock context
- Add `"test": "jest"` script to [`package.json`](package.json)
- Ensure tests run without Python3/SymPy dependency (mock the subprocess)

**Impact**: High — regression prevention  
**Effort**: Medium

---

## Summary Table

| ID | Enhancement | Priority | Impact | Effort |
|----|------------|----------|--------|--------|
| E-01 | Input Sanitization | P1 | High | Low |
| E-02 | Error Classification | P1 | Medium | Low |
| E-03 | Worker Thread for Nerdamer | P1 | Medium | Medium |
| E-04 | Persistent Python Process | P2 | High | Medium |
| E-05 | Expression Caching | P2 | Medium | Low |
| E-06 | Smarter Input Routing | P2 | Medium | Medium |
| E-07 | LaTeX Output | P3 | Medium | Low |
| E-08 | Step-by-Step Solutions | P3 | High | High |
| E-09 | Matrix/Linear Algebra | P3 | Medium | Medium |
| E-10 | Graph/Plot Generation | P3 | High | High |
| E-11 | Renderer UI Panel | P4 | High | High |
| E-12 | Chat Math Decorator | P4 | Medium | Medium |
| E-13 | Plugin Settings | P4 | Medium | Low |
| E-14 | DSN Tool Registration | P4 | Medium | Low |
| E-15 | Unit Test Suite | P4 | High | Medium |
