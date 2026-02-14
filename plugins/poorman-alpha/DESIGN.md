# poorman-alpha — Design Document

## Overview

`poorman-alpha` is a computational plugin for the notaclaw plugin system. It provides unit conversion, symbolic algebra, matrix operations, step-by-step solutions, and plot generation through three execution strategies: in-process JavaScript via mathjs/nerdamer, async worker threads for non-blocking nerdamer evaluation, and an out-of-process Python bridge via SymPy with persistent-process IPC.

**Version**: 0.2.0  
**Status**: Alpha — fully compliant with the notaclaw plugin lifecycle, with 67 passing tests.

---

## Architecture

### Three-Strategy Computation

The plugin registers four agent tools across three runtime strategies:

| Tool | Module | Runtime | Libraries | Purpose |
|------|--------|---------|-----------|---------|
| `compute` | [`native.js`](native.js) | Node.js (in-process + worker) | `mathjs`, `nerdamer` | Unit conversion, symbolic algebra, arithmetic |
| `sympy_compute` | [`sympy-bridge.js`](sympy-bridge.js) → [`solver.py`](solver.py) | Node.js → Python3 (persistent subprocess) | SymPy, matplotlib | Advanced symbolic computation, step-by-step, plots |
| `matrix_compute` | [`native.js`](native.js) | Node.js (in-process) | `mathjs` | Matrix/linear algebra operations |
| `compute_cache_stats` | [`native.js`](native.js) / [`sympy-bridge.js`](sympy-bridge.js) | Node.js | — | Cache inspection and management |

### Plugin Entry Point

[`index.js`](index.js) exports the standard [`activate(context)`](index.js:22) / [`deactivate()`](index.js:233) lifecycle hooks. On activation it:

1. Loads persisted settings from [`context.storage`](index.js:30)
2. Registers 4 tools via [`context.services.tools.register()`](index.js:49)
3. Registers 2 tools on the DSN mesh via [`context.dsn.registerTool()`](index.js:194)
4. Registers 2 IPC handlers for settings via [`context.ipc.handle()`](index.js:217)

On deactivation it shuts down the persistent Python process and clears caches.

---

## Module Breakdown

### `native.js` — In-Process Engine (315 lines)

Exports four functions:

| Export | Signature | Description |
|--------|-----------|-------------|
| [`computationalTool(input, options)`](native.js:88) | sync | Route-aware evaluation with three-tier fallback |
| [`computeAsync(input, options)`](native.js:210) | async | Worker thread evaluation for non-blocking symbolic ops |
| [`getCacheStats()`](native.js:257) | sync | Returns LRU cache hit/miss/size statistics |
| [`clearCache()`](native.js:261) | sync | Empties the result cache |

**Route-aware fallback** — The smart router ([`lib/router.js`](lib/router.js)) classifies each expression into a route (`unit_conversion`, `symbolic`, `arithmetic`, `unknown`). The engine reorders the fallback chain based on the route:

- **`unit_conversion`** → mathjs first, nerdamer second
- **`symbolic`** → nerdamer first, mathjs second
- **`arithmetic` / `unknown`** → mathjs first, nerdamer second

Each evaluation attempt is guarded by the input sanitizer ([`lib/sanitizer.js`](lib/sanitizer.js)) before execution.

**Matrix operations** — Dedicated handler for expressions matching `det(`, `inv(`, `transpose(`, `eigen(`, `rank(` patterns. Parses nested arrays and delegates to `math.det()`, `math.inv()`, `math.transpose()`, `math.eigs()`, `math.matrix()`.

**LaTeX output** — When `options.format` is `"latex"` or `"all"`, the result includes `latex` and/or `text` fields. Nerdamer provides native `.toTeX()`. Mathjs results get basic LaTeX escaping.

**Caching** — An LRU cache ([`lib/cache.js`](lib/cache.js), 200 entries) keyed by `expression|format` avoids redundant computation. The `cached: true` flag is set on cache hits.

**Worker thread** — [`computeAsync()`](native.js:210) dispatches nerdamer evaluation to [`lib/nerdamer-worker.js`](lib/nerdamer-worker.js) via `worker_threads`, preventing event-loop blocking on complex symbolic algebra.

**Dependencies**:
- [`mathjs`](https://mathjs.org/) — Numeric computation, unit conversion, matrix algebra
- [`nerdamer`](https://nerdamer.com/) + `nerdamer/Algebra` + `nerdamer/Calculus` + `nerdamer/Solve` — Full symbolic algebra suite

### `sympy-bridge.js` — Persistent Subprocess Bridge (296 lines)

Exports three functions:

| Export | Signature | Description |
|--------|-----------|-------------|
| [`callSympy(expression, options)`](sympy-bridge.js:125) | async | Evaluate via persistent or one-shot Python process |
| [`shutdown()`](sympy-bridge.js:196) | async | Kill the persistent Python process |
| [`getCacheStats()`](sympy-bridge.js:214) | sync | Returns SymPy-side cache statistics |

**Persistent process** — On first call, spawns `python3 solver.py --persistent` and maintains a long-running process with JSON-line IPC over stdin/stdout. Requests are multiplexed with unique IDs. Falls back to one-shot spawning if the persistent process is unavailable.

**Options**:
- `format`: `"text"` | `"latex"` | `"all"` — Output format
- `steps`: `boolean` — Include step-by-step solution trace
- `plot`: `boolean` — Generate base64-encoded PNG plot
- `timeout`: `number` — Per-request timeout (default 30s)
- `cache`: `boolean` — Enable/disable caching for this request

**Input sanitization** — All expressions pass through [`sanitizePython()`](lib/sanitizer.js:46) before reaching the Python process.

**Caching** — Separate LRU cache (100 entries) keyed by `expression|format|steps|plot`.

### `solver.py` — SymPy Expression Evaluator (357 lines)

A standalone Python 3 script operating in two modes:

| Mode | Trigger | IPC |
|------|---------|-----|
| One-shot | `python3 solver.py "expression"` | argv → stdout |
| Persistent | `python3 solver.py --persistent` | stdin JSON lines → stdout JSON lines |

**Security** — Uses `sympy.parsing.sympy_parser.parse_expr()` with a restricted namespace (`SAFE_NAMESPACE`) instead of raw `eval()`. The namespace contains only SymPy functions and pre-defined symbols (`x, y, z, t, n, k, a, b, c, f`).

**Capabilities**:
- `--latex` / `format: "latex"` — Returns LaTeX representation via `sympy.latex()`
- `--all` / `format: "all"` — Returns both text and LaTeX
- `--steps` / `steps: true` — Generates step-by-step solution trace (expand → simplify → factor)
- `--plot` / `plot: true` — Generates matplotlib plot as base64-encoded PNG
- Error output includes structured JSON with `error` field

**Optional dependency**: Requires `pip3 install sympy`. The plugin degrades gracefully without it. Plot generation additionally requires `matplotlib`.

---

## Library Modules

### `lib/sanitizer.js` — Input Sanitization (123 lines)

| Export | Description |
|--------|-------------|
| [`sanitizeJS(expr)`](lib/sanitizer.js:8) | Blocks `require`, `process`, `eval`, `Function`, `import`, `__proto__`, `child_process` |
| [`sanitizePython(expr)`](lib/sanitizer.js:46) | Blocks `import`, `exec`, `eval`, `compile`, `os.`, `subprocess`, `open(`, `__builtins__`, `__import__` |

Both enforce a 2000-character maximum length and reject non-string / empty inputs.

### `lib/cache.js` — LRU Cache (76 lines)

[`LRUCache`](lib/cache.js:7) class with `maxSize` parameter (default 200). Methods: `get(key)`, `set(key, value)`, `clear()`, `stats()`. Returns `{ hits, misses, size, maxSize }`.

### `lib/router.js` — Expression Classifier (150 lines)

[`classifyExpression(input)`](lib/router.js:13) uses multi-signal heuristic analysis to classify expressions:

| Route | Signals Checked |
|-------|----------------|
| `unit_conversion` | Unit names, "to"/"in" keywords, compound units |
| `symbolic` | `solve(`, `expand(`, `factor(`, `diff(`, `integrate(`, variable patterns |
| `arithmetic` | Numeric-only content, operators, function calls |
| `unknown` | No signals matched |

Returns `{ route, confidence, signals }` where `confidence` ∈ [0, 1].

### `lib/errors.js` — Error Helpers (39 lines)

| Export | Description |
|--------|-------------|
| [`ErrorCode`](lib/errors.js:3) | Enum: `INVALID_INPUT`, `SANITIZATION_FAILED`, `ENGINE_ERROR`, `TIMEOUT`, `PYTHON_NOT_FOUND`, `UNKNOWN` |
| [`makeError(code, message, details)`](lib/errors.js:12) | Creates structured error objects |
| [`makeResult(result, engine, extras)`](lib/errors.js:18) | Creates structured success objects |

### `lib/nerdamer-worker.js` — Worker Thread Script (33 lines)

Receives `{ expression, format }` via `parentPort`, evaluates with nerdamer (including add-ons), and posts back `{ result, latex?, error? }`.

---

## Input Routing Flow

```
                      ┌──────────────────────────┐
                      │     compute tool         │
                      └──────────┬───────────────┘
                                 │
                        sanitizeJS(input)
                                 │
                        classifyExpression()
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
        unit_conversion      symbolic            arithmetic
              │                  │                   │
        mathjs → nerdamer   nerdamer → mathjs   mathjs → nerdamer
              │                  │                   │
              └──────────────────┼──────────────────┘
                                 │
                          cache result
                                 │
                     format(text / latex / all)
                                 │
                              return

                      ┌──────────────────────────┐
                      │    sympy_compute tool    │
                      └──────────┬───────────────┘
                                 │
                       sanitizePython(input)
                                 │
                     check cache (if enabled)
                                 │
                  ┌──────────────┼──────────────┐
                  │ persistent   │ one-shot     │
                  │ process up   │ fallback     │
                  ▼              ▼              │
           JSON-line IPC    spawn python3       │
                  │              │              │
                  └──────────────┘              │
                         │                     │
                    parse result               │
                         │                     │
                   cache result                │
                         │                     │
              return {result, latex?,          │
                      steps?, plot?}           │

                      ┌──────────────────────────┐
                      │   matrix_compute tool    │
                      └──────────┬───────────────┘
                                 │
                        sanitizeJS(input)
                                 │
                     parse matrix pattern
                     (det/inv/transpose/
                      eigen/rank)
                                 │
                     mathjs matrix ops
                                 │
                     format + return
```

---

## Plugin System Integration

### Manifest

[`manifest.json`](manifest.json) declares:
- **id**: `com.notaclaw.poorman-alpha`
- **version**: `0.2.0`
- **main**: `index.js`
- **renderer**: `renderer/bundle.js`
- **permissions**: `dsn:register-tool`, `exec:spawn`, `store:read`, `store:write`
- **semanticDomain**: `cognitive`
- **aleph.configuration**: 6 settings fields (pythonPath, sympyTimeout, nerdamerTimeout, cacheEnabled, defaultFormat, persistentPython)
- **aleph.tools**: 4 tool definitions (`compute`, `sympy_compute`, `matrix_compute`, `compute_cache_stats`)
- **aleph.smfProfile**: 16-dimensional Semantic Modulation Field vector

### Lifecycle

| Hook | Behavior |
|------|----------|
| [`activate(context)`](index.js:22) | Loads settings, registers 4 tools, 2 DSN tools, 2 IPC handlers |
| [`deactivate()`](index.js:233) | Shuts down persistent Python process, clears caches |

### Permission Usage

| Permission | Used By | Purpose |
|------------|---------|---------|
| `dsn:register-tool` | [`index.js`](index.js:194) | Register `compute` and `sympy_compute` on the AlephNet mesh |
| `exec:spawn` | [`sympy-bridge.js`](sympy-bridge.js:30) | Spawn/manage python3 subprocess for SymPy |
| `store:read` | [`index.js`](index.js:30) | Load persisted plugin settings |
| `store:write` | [`index.js`](index.js:222) | Save updated plugin settings |

### Settings (IPC)

| Channel | Direction | Payload |
|---------|-----------|---------|
| `poorman-alpha:get-settings` | renderer → main | Returns current settings object |
| `poorman-alpha:update-settings` | renderer → main | Merges partial settings, persists to storage |

### DSN Tools

Both `compute` and `sympy_compute` are registered on the AlephNet DSN mesh via [`context.dsn.registerTool()`](index.js:194), making them available to remote agents in the decentralized network.

---

## Capability Matrix

| Capability | Engine | Tool | Example Input | Example Output |
|------------|--------|------|---------------|----------------|
| Unit conversion | mathjs | `compute` | `"5 meters to feet"` | `"16.4042 feet"` |
| Arithmetic | mathjs | `compute` | `"2^10 + 3"` | `"1027"` |
| Solve equations | nerdamer | `compute` | `"solve(x^2+2*x-8, x)"` | `"[2,-4]"` |
| Expand | nerdamer | `compute` | `"expand((x+1)^3)"` | `"1+3*x+3*x^2+x^3"` |
| Factor | nerdamer | `compute` | `"factor(x^2-1)"` | `"(-1+x)*(1+x)"` |
| LaTeX output | nerdamer | `compute` | `"x^2+1"` (format=latex) | `"x^{2}+1"` |
| Determinant | mathjs | `matrix_compute` | `"det([[1,2],[3,4]])"` | `"-2"` |
| Inverse | mathjs | `matrix_compute` | `"inv([[1,2],[3,4]])"` | `"[[-2,1],[1.5,-0.5]]"` |
| Transpose | mathjs | `matrix_compute` | `"transpose([[1,2],[3,4]])"` | `"[[1,3],[2,4]]"` |
| Eigenvalues | mathjs | `matrix_compute` | `"eigen([[2,1],[1,2]])"` | `"[1, 3]"` |
| Integrals | SymPy | `sympy_compute` | `"integrate(x**2, x)"` | `"x**3/3"` |
| Derivatives | SymPy | `sympy_compute` | `"diff(sin(x), x)"` | `"cos(x)"` |
| Differential eqs | SymPy | `sympy_compute` | `"dsolve(f(x).diff(x) - f(x), f(x))"` | `"Eq(f(x), C1*exp(x))"` |
| Step-by-step | SymPy | `sympy_compute` | `"expand((x+1)^3)"` (steps=true) | Array of step objects |
| Plot generation | SymPy + matplotlib | `sympy_compute` | `"sin(x)"` (plot=true) | Base64 PNG data URI |

---

## Renderer UI

### Sidebar Panel

[`renderer/bundle.js`](renderer/bundle.js) provides a Calculator panel registered via [`ui.registerNavigation()`](renderer/bundle.js:224). It appears as a Calculator icon in the sidebar rail.

**Features**:
- Engine selector: Native (mathjs/nerdamer), SymPy, Matrix
- Format selector: Text, LaTeX, Both
- Step-by-step toggle (SymPy only)
- Expression input with Enter-to-evaluate
- Result display with engine tag, cached indicator, LaTeX block, step list
- Expression history (last 50 entries, clickable to re-evaluate)

**IPC Flow**: Renderer → `window.electronAPI.pluginInvokeTool(toolName, args)` → main-process `ServiceRegistry.invokeTool()` → plugin handler

---

## Python Virtual Environment

The plugin manages its own Python venv at [`.venv/`](.venv/) via [`setup-venv.js`](setup-venv.js).

**Setup**: `npm run setup` or `node setup-venv.js`

| Command | Description |
|---------|-------------|
| `npm run setup` | Create venv, install sympy + matplotlib |
| `npm run setup:check` | Verify venv is ready |
| `npm run setup:clean` | Remove the venv |

**Auto-detection**: [`sympy-bridge.js`](sympy-bridge.js) calls [`resolvePythonPath()`](sympy-bridge.js:28) which checks for `.venv/bin/python3` before falling back to the system `python3`. Users can override via the `pythonPath` setting.

**Dependencies installed**:
- `sympy` (required) — symbolic math engine
- `matplotlib` (optional) — plot generation

The venv is excluded from version control via `.gitignore`.

---

## Security Model

### Input Sanitization

All user input passes through the sanitization layer before reaching any evaluation engine:

| Engine | Sanitizer | Blocked Patterns |
|--------|-----------|-----------------|
| JavaScript (mathjs/nerdamer) | [`sanitizeJS()`](lib/sanitizer.js:8) | `require`, `process`, `eval`, `Function`, `import`, `__proto__`, `child_process`, `global` |
| Python (SymPy) | [`sanitizePython()`](lib/sanitizer.js:46) | `import`, `exec`, `eval`, `compile`, `os.`, `subprocess`, `open(`, `__builtins__`, `__import__`, `sys.` |

Both sanitizers enforce a 2000-character maximum expression length.

### Python-Side Safety

[`solver.py`](solver.py) uses `sympy.parsing.sympy_parser.parse_expr()` with a restricted namespace instead of `eval()`. Only SymPy functions and pre-defined symbols are accessible.

---

## Caching Architecture

Two independent LRU caches minimize redundant computation:

| Cache | Location | Max Size | Key Format |
|-------|----------|----------|------------|
| Native | [`native.js`](native.js:15) | 200 entries | `expression\|format` |
| SymPy | [`sympy-bridge.js`](sympy-bridge.js:18) | 100 entries | `expression\|format\|steps\|plot` |

Cache can be globally disabled via the `cacheEnabled` setting or per-request via `options.cache = false`. The `compute_cache_stats` tool exposes hit/miss ratios and allows cache clearing.

---

## File Inventory

| File | Lines | Language | Role |
|------|-------|----------|------|
| [`index.js`](index.js) | 241 | JavaScript (CJS) | Plugin entry point — lifecycle, tool registration, IPC, DSN |
| [`native.js`](native.js) | 315 | JavaScript (CJS) | In-process math engine with routing, caching, worker, matrix ops |
| [`sympy-bridge.js`](sympy-bridge.js) | 296 | JavaScript (CJS) | Persistent Python subprocess bridge with caching |
| [`solver.py`](solver.py) | 357 | Python 3 | SymPy evaluator (one-shot + persistent mode) |
| [`lib/sanitizer.js`](lib/sanitizer.js) | 123 | JavaScript (CJS) | Input sanitization for JS and Python engines |
| [`lib/cache.js`](lib/cache.js) | 76 | JavaScript (CJS) | Generic LRU cache implementation |
| [`lib/router.js`](lib/router.js) | 150 | JavaScript (CJS) | Multi-signal expression classifier |
| [`lib/errors.js`](lib/errors.js) | 39 | JavaScript (CJS) | Structured error codes and helpers |
| [`lib/nerdamer-worker.js`](lib/nerdamer-worker.js) | 33 | JavaScript (CJS) | Worker thread script for async nerdamer evaluation |
| [`renderer/bundle.js`](renderer/bundle.js) | 268 | JavaScript (CJS) | Renderer UI panel (sidebar calculator) |
| [`setup-venv.js`](setup-venv.js) | 165 | JavaScript (CJS) | Python venv creation and management |
| [`__tests__/native.test.js`](__tests__/native.test.js) | 243 | JavaScript (Jest) | 36 tests for native engine |
| [`__tests__/sympy-bridge.test.js`](__tests__/sympy-bridge.test.js) | 119 | JavaScript (Jest) | 17 tests for SymPy bridge |
| [`__tests__/index.test.js`](__tests__/index.test.js) | 167 | JavaScript (Jest) | 15 tests for plugin lifecycle |
| [`manifest.json`](manifest.json) | 143 | JSON | Plugin manifest with tools, config, SMF profile |
| [`package.json`](package.json) | 17 | JSON | npm dependencies and test script |
| **Total** | **2319** | | |

---

## Configuration

Settings are persisted to `context.storage` and exposed via IPC:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `pythonPath` | string | `"python3"` | Path to the Python 3 interpreter |
| `sympyTimeout` | number | `30000` | Max SymPy computation time (ms) |
| `nerdamerTimeout` | number | `10000` | Max nerdamer worker time (ms) |
| `cacheEnabled` | boolean | `true` | Enable/disable result caching |
| `defaultFormat` | string | `"text"` | Default output format (`text` / `latex` / `all`) |
| `persistentPython` | boolean | `true` | Keep persistent Python process for faster SymPy calls |

---

## Error Handling

All tool responses use structured error objects with the [`ErrorCode`](lib/errors.js:3) enum:

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| `INVALID_INPUT` | Input validation failed | Empty, null, non-string, or oversized expression |
| `SANITIZATION_FAILED` | Blocked by sanitizer | Dangerous pattern detected in expression |
| `ENGINE_ERROR` | Computation engine failed | Parse error, unsupported operation |
| `TIMEOUT` | Operation timed out | Complex expression exceeded time limit |
| `PYTHON_NOT_FOUND` | Python 3 not available | python3 not on PATH, ENOENT |
| `UNKNOWN` | Unexpected failure | Internal error |

Errors include `errorCode`, `error` (human-readable message), and `engine` (which engine was attempted).

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| SymPy is optional | Low | Graceful degradation with clear error message if python3/sympy not installed |
| Python `eval()` injection | High → **Mitigated** | `parse_expr()` with restricted namespace + `sanitizePython()` blocklist |
| JS code injection via mathjs/nerdamer | Medium → **Mitigated** | `sanitizeJS()` blocks require, process, eval, Function, import |
| Event loop blocking | Medium → **Mitigated** | `computeAsync()` delegates nerdamer to `worker_threads` |
| Subprocess overhead | Medium → **Mitigated** | Persistent Python process with JSON-line IPC, one-shot fallback |
| Cache memory growth | Low | LRU eviction with fixed max sizes (200 native, 100 SymPy) |
| Worker thread leak on shutdown | Low | Jest warning present; worker `unref()` and `terminate()` on deactivate |

---

## Future Enhancements (Not Yet Implemented)

| Item | Description |
|------|-------------|
| E-12: Chat Math Decorator | Message decorator that detects `$...$` / ` ```math ``` ` blocks and renders inline LaTeX |
