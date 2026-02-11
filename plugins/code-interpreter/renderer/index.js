var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/code-interpreter/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var activate = (context) => {
  console.log("[Code Interpreter] Renderer activated");
  const CodeBlockRenderer = ({ context: { code, language } }) => {
    const [output, setOutput] = (0, import_react.useState)(null);
    const [isRunning, setIsRunning] = (0, import_react.useState)(false);
    const handleRun = async () => {
      setIsRunning(true);
      setOutput(null);
      try {
        if (language === "javascript" || language === "js") {
          let logs = [];
          const originalConsoleLog = console.log;
          const originalConsoleError = console.error;
          try {
            console.log = (...args) => logs.push(args.map((a) => String(a)).join(" "));
            console.error = (...args) => logs.push("Error: " + args.map((a) => String(a)).join(" "));
            const result = eval(code);
            if (result !== void 0) {
              logs.push("Result: " + String(result));
            }
          } catch (e) {
            logs.push("Error: " + e.message);
          } finally {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
          }
          setOutput(logs.join("\n") || "Executed successfully (no output)");
        }
      } catch (err) {
        setOutput("System Error: " + err.message);
      } finally {
        setIsRunning(false);
      }
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "my-2 rounded-lg overflow-hidden border border-white/10 bg-black/30", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-mono text-gray-400 uppercase", children: language }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: handleRun,
            disabled: isRunning,
            className: `px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${isRunning ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`,
            children: isRunning ? "Running..." : "Run"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "p-3 text-sm font-mono text-gray-300 overflow-x-auto m-0", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: code }) }),
      output && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border-t border-white/10 bg-black/50 p-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-500 mb-1 uppercase tracking-wider", children: "Output" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "text-xs font-mono text-white whitespace-pre-wrap", children: output })
      ] })
    ] });
  };
  if (context.ui.registerSlot) {
    context.ui.registerSlot("fence:renderer", {
      component: CodeBlockRenderer,
      filter: (ctx) => ctx.language === "javascript" || ctx.language === "js"
    });
  } else {
    try {
      const { useFenceStore } = context.require("alephnet");
      const { registerRenderer } = useFenceStore.getState();
      registerRenderer({
        id: "js-interpreter",
        languages: ["javascript", "js"],
        component: (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlockRenderer, { context: { code: props.block.content, language: "javascript" } }),
        priority: 10
      });
    } catch (e) {
      console.warn("[Code Interpreter] Failed to register renderer (legacy fallback failed)", e);
    }
  }
};
