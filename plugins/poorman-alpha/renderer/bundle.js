"use strict";

// plugins/poorman-alpha/renderer/bundle.js
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var renderer_exports = {};
__export(renderer_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = renderer_exports;
var React = require("react");
var LucideReact = require("lucide-react");
function MathPanel(props) {
  var context = props.context;
  var useState = React.useState;
  var useCallback = React.useCallback;
  var useRef = React.useRef;
  var useEffect = React.useEffect;
  var _expr = useState("");
  var expression = _expr[0];
  var setExpression = _expr[1];
  var _result = useState(null);
  var result = _result[0];
  var setResult = _result[1];
  var _loading = useState(false);
  var loading = _loading[0];
  var setLoading = _loading[1];
  var _engine = useState("compute");
  var engine = _engine[0];
  var setEngine = _engine[1];
  var _format = useState("text");
  var format = _format[0];
  var setFormat = _format[1];
  var _steps = useState(false);
  var steps = _steps[0];
  var setSteps = _steps[1];
  var _history = useState([]);
  var history = _history[0];
  var setHistory = _history[1];
  var _error = useState(null);
  var errorMsg = _error[0];
  var setError = _error[1];
  var inputRef = useRef(null);
  useEffect(function() {
    if (inputRef.current) inputRef.current.focus();
  }, []);
  var evaluate = useCallback(function() {
    if (!expression.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    var toolName = engine;
    var args = { expression: expression.trim(), format };
    if (engine === "sympy_compute" && steps) {
      args.steps = true;
    }
    window.electronAPI.pluginInvokeTool(toolName, args).then(function(res) {
      setResult(res);
      setHistory(function(prev) {
        var entry = {
          expression: expression.trim(),
          result: res,
          engine: toolName,
          timestamp: Date.now()
        };
        return [entry].concat(prev.slice(0, 49));
      });
    }).catch(function(err) {
      setError(err.message || String(err));
    }).finally(function() {
      setLoading(false);
    });
  }, [expression, engine, format, steps]);
  var handleKeyDown = useCallback(function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      evaluate();
    }
  }, [evaluate]);
  var clearHistory = useCallback(function() {
    setHistory([]);
  }, []);
  var h = React.createElement;
  var resultDisplay = null;
  if (loading) {
    resultDisplay = h(
      "div",
      { className: "flex items-center justify-center py-6 text-muted-foreground" },
      h(LucideReact.Loader2, { size: 20, className: "animate-spin mr-2" }),
      "Computing..."
    );
  } else if (errorMsg) {
    resultDisplay = h(
      "div",
      { className: "p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm" },
      h(
        "div",
        { className: "flex items-center gap-2 mb-1 font-medium" },
        h(LucideReact.AlertCircle, { size: 14 }),
        "Error"
      ),
      h("pre", { className: "text-xs whitespace-pre-wrap" }, errorMsg)
    );
  } else if (result) {
    var resultText = "";
    var resultLatex = "";
    var resultEngine = "";
    var resultSteps = null;
    if (typeof result === "object") {
      resultText = result.result || result.text || JSON.stringify(result);
      resultLatex = result.latex || "";
      resultEngine = result.engine || "";
      resultSteps = result.steps || null;
      if (result.error) {
        resultText = result.error;
      }
    } else {
      resultText = String(result);
    }
    resultDisplay = h(
      "div",
      { className: "space-y-2" },
      // Main result
      h(
        "div",
        { className: "p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" },
        h(
          "div",
          { className: "flex items-center justify-between mb-1" },
          h("span", { className: "text-xs text-muted-foreground font-mono" }, resultEngine || engine),
          result.cached && h("span", { className: "text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded" }, "cached")
        ),
        h("pre", { className: "text-emerald-400 text-sm font-mono whitespace-pre-wrap break-all" }, resultText)
      ),
      // LaTeX if available
      resultLatex && h(
        "div",
        { className: "p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg" },
        h("div", { className: "text-xs text-muted-foreground mb-1" }, "LaTeX"),
        h("pre", { className: "text-blue-400 text-xs font-mono whitespace-pre-wrap" }, resultLatex)
      ),
      // Steps if available
      resultSteps && Array.isArray(resultSteps) && h(
        "div",
        { className: "p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg" },
        h("div", { className: "text-xs text-muted-foreground mb-2" }, "Steps"),
        resultSteps.map(function(step, i) {
          return h(
            "div",
            { key: i, className: "text-xs text-purple-300 mb-1" },
            h("span", { className: "text-purple-500 mr-1" }, i + 1 + "."),
            typeof step === "object" ? step.description || step.result || JSON.stringify(step) : String(step)
          );
        })
      )
    );
  }
  return h(
    "div",
    { className: "h-full flex flex-col text-white" },
    // Header
    h(
      "div",
      { className: "p-4 border-b border-border" },
      h(
        "div",
        { className: "flex items-center gap-2 mb-3" },
        h(LucideReact.Calculator, { size: 18, className: "text-emerald-500" }),
        h("h2", { className: "text-sm font-bold" }, "Poorman's Calculator")
      ),
      // Engine selector
      h(
        "div",
        { className: "flex gap-2 mb-3" },
        h("button", {
          onClick: function() {
            setEngine("compute");
          },
          className: "text-xs px-2 py-1 rounded transition-colors " + (engine === "compute" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-muted/20 text-muted-foreground border border-border hover:text-foreground")
        }, "Native"),
        h("button", {
          onClick: function() {
            setEngine("sympy_compute");
          },
          className: "text-xs px-2 py-1 rounded transition-colors " + (engine === "sympy_compute" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-muted/20 text-muted-foreground border border-border hover:text-foreground")
        }, "SymPy"),
        h("button", {
          onClick: function() {
            setEngine("matrix_compute");
          },
          className: "text-xs px-2 py-1 rounded transition-colors " + (engine === "matrix_compute" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-muted/20 text-muted-foreground border border-border hover:text-foreground")
        }, "Matrix")
      ),
      // Options row
      h(
        "div",
        { className: "flex items-center gap-3 mb-3" },
        h(
          "select",
          {
            value: format,
            onChange: function(e) {
              setFormat(e.target.value);
            },
            className: "text-xs bg-muted/20 border border-border rounded px-2 py-1 text-foreground"
          },
          h("option", { value: "text" }, "Text"),
          h("option", { value: "latex" }, "LaTeX"),
          h("option", { value: "all" }, "Both")
        ),
        engine === "sympy_compute" && h(
          "label",
          { className: "flex items-center gap-1 text-xs text-muted-foreground cursor-pointer" },
          h("input", {
            type: "checkbox",
            checked: steps,
            onChange: function(e) {
              setSteps(e.target.checked);
            },
            className: "rounded"
          }),
          "Steps"
        )
      ),
      // Expression input
      h(
        "div",
        { className: "flex gap-2" },
        h("input", {
          ref: inputRef,
          value: expression,
          onChange: function(e) {
            setExpression(e.target.value);
          },
          onKeyDown: handleKeyDown,
          placeholder: engine === "sympy_compute" ? "integrate(x**2, x)" : engine === "matrix_compute" ? "det([[1,2],[3,4]])" : "5 meters to feet",
          className: "flex-1 bg-black/20 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500/50",
          disabled: loading
        }),
        h(
          "button",
          {
            onClick: evaluate,
            disabled: loading || !expression.trim(),
            className: "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
          },
          h(LucideReact.Play, { size: 16 })
        )
      )
    ),
    // Result area
    h(
      "div",
      { className: "flex-1 overflow-y-auto p-4 space-y-4" },
      resultDisplay,
      // History
      history.length > 0 && h(
        "div",
        { className: "mt-4" },
        h(
          "div",
          { className: "flex items-center justify-between mb-2" },
          h("span", { className: "text-xs text-muted-foreground font-medium uppercase tracking-wider" }, "History"),
          h("button", {
            onClick: clearHistory,
            className: "text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          }, "Clear")
        ),
        history.map(function(entry, i) {
          return h(
            "div",
            {
              key: entry.timestamp + "-" + i,
              className: "p-2 bg-muted/10 rounded border border-border mb-1 cursor-pointer hover:bg-muted/20 transition-colors",
              onClick: function() {
                setExpression(entry.expression);
                setResult(entry.result);
              }
            },
            h("div", { className: "text-xs font-mono text-foreground truncate" }, entry.expression),
            h(
              "div",
              { className: "text-[10px] text-muted-foreground mt-0.5 truncate" },
              typeof entry.result === "object" ? entry.result.result || entry.result.error || "done" : String(entry.result)
            )
          );
        })
      )
    )
  );
}
var activate = function(context) {
  console.log("[poorman-alpha] Renderer activated");
  var ui = context.ui;
  var PanelWrapper = function() {
    return React.createElement(MathPanel, { context });
  };
  var cleanupNav = ui.registerNavigation({
    id: "poorman-alpha-nav",
    label: "Calculator",
    icon: LucideReact.Calculator,
    view: {
      id: "poorman-alpha-panel",
      name: "Calculator",
      icon: LucideReact.Calculator,
      component: PanelWrapper
    },
    order: 450
  });
  context._cleanups = [cleanupNav];
};
var deactivate = function(context) {
  console.log("[poorman-alpha] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach(function(cleanup) {
      cleanup();
    });
  }
};
