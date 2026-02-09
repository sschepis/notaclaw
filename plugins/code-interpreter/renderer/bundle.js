"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/code-interpreter/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Code Interpreter] Renderer activated");
  const CodeBlockRenderer = ({ block, language }) => {
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
            const result = eval(block.content);
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
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "my-2 rounded-lg overflow-hidden border border-white/10 bg-black/30" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs font-mono text-gray-400 uppercase" }, language), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleRun,
        disabled: isRunning,
        className: `px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${isRunning ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`
      },
      isRunning ? "Running..." : "Run"
    )), /* @__PURE__ */ import_react.default.createElement("pre", { className: "p-3 text-sm font-mono text-gray-300 overflow-x-auto m-0" }, /* @__PURE__ */ import_react.default.createElement("code", null, block.content)), output && /* @__PURE__ */ import_react.default.createElement("div", { className: "border-t border-white/10 bg-black/50 p-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 mb-1 uppercase tracking-wider" }, "Output"), /* @__PURE__ */ import_react.default.createElement("pre", { className: "text-xs font-mono text-white whitespace-pre-wrap" }, output)));
  };
  const { useFenceStore } = context.require("alephnet");
  const { registerRenderer } = useFenceStore.getState();
  registerRenderer({
    id: "js-interpreter",
    languages: ["javascript", "js"],
    component: (props) => /* @__PURE__ */ import_react.default.createElement(CodeBlockRenderer, { ...props, language: "javascript" }),
    priority: 10
  });
};
