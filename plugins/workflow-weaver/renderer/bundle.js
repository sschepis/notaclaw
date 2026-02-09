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

// plugins/workflow-weaver/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => WorkflowWeaver
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
function WorkflowWeaver() {
  const [workflows, setWorkflows] = (0, import_react.useState)([
    {
      id: "demo-flow",
      name: "Demo Weather Summary",
      steps: [
        { id: "step1", type: "log", params: { message: "Starting demo workflow" } },
        { id: "step2", type: "tool", params: { toolName: "getWeather", args: { city: "Berlin" } } },
        { id: "step3", type: "agent", params: { prompt: "Summarize the weather: $step2.toolOutput" } },
        { id: "step4", type: "log", params: { message: "Workflow complete" } }
      ]
    }
  ]);
  const [selectedId, setSelectedId] = (0, import_react.useState)(null);
  const [logs, setLogs] = (0, import_react.useState)([]);
  const [isRunning, setIsRunning] = (0, import_react.useState)(false);
  const selectedWorkflow = workflows.find((w) => w.id === selectedId);
  const handleRun = async () => {
    if (!selectedWorkflow) return;
    setIsRunning(true);
    setLogs((prev) => [...prev, `[System] Starting workflow: ${selectedWorkflow.name}...`]);
    try {
      for (const step of selectedWorkflow.steps) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setLogs((prev) => [...prev, `[Engine] Executing step ${step.id} (${step.type})...`]);
        if (step.type === "tool") {
          setLogs((prev) => [...prev, `  > Calling tool: ${step.params.toolName}`]);
        } else if (step.type === "agent") {
          setLogs((prev) => [...prev, `  > Agent thinking...`]);
        }
      }
      setLogs((prev) => [...prev, `[System] Workflow completed successfully.`]);
    } catch (err) {
      setLogs((prev) => [...prev, `[Error] Execution failed.`]);
    } finally {
      setIsRunning(false);
    }
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex h-full bg-gray-900 text-white font-sans" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-64 border-r border-gray-700 p-4 flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4 text-blue-400" }, "Workflows"), /* @__PURE__ */ import_react.default.createElement("button", { className: "bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded mb-4" }, "+ New Workflow"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-2" }, workflows.map((w) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: w.id,
      onClick: () => setSelectedId(w.id),
      className: `p-3 rounded cursor-pointer transition-colors ${selectedId === w.id ? "bg-gray-700 border-l-4 border-blue-500" : "bg-gray-800 hover:bg-gray-700"}`
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "font-medium" }, w.name),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-400" }, w.steps.length, " steps")
  )))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex flex-col" }, selectedWorkflow ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("div", { className: "h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-xl font-semibold" }, selectedWorkflow.name), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement("button", { className: "bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded" }, "Edit"), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleRun,
      disabled: isRunning,
      className: `px-4 py-2 rounded flex items-center gap-2 ${isRunning ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`
    },
    isRunning ? "Running..." : "\u25B6 Run"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 p-8 overflow-y-auto bg-gray-900 relative" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "max-w-3xl mx-auto space-y-8 relative" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute left-8 top-4 bottom-4 w-1 bg-gray-700 -z-10" }), selectedWorkflow.steps.map((step, index) => /* @__PURE__ */ import_react.default.createElement("div", { key: step.id, className: "flex gap-4 items-start" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-16 h-16 rounded-full bg-gray-800 border-4 border-gray-900 flex items-center justify-center z-10 shadow-lg text-lg font-bold text-gray-400" }, index + 1), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:border-blue-500 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: `text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${step.type === "trigger" ? "bg-purple-900 text-purple-200" : step.type === "agent" ? "bg-green-900 text-green-200" : step.type === "tool" ? "bg-orange-900 text-orange-200" : "bg-gray-700 text-gray-300"}` }, step.type), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-500" }, "ID: ", step.id)), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm font-mono bg-black p-2 rounded text-gray-300 overflow-x-auto" }, JSON.stringify(step.params, null, 2))))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "h-64 border-t border-gray-700 bg-black p-4 font-mono text-sm overflow-y-auto" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-500 mb-2 uppercase text-xs tracking-wider" }, "Execution Log"), logs.length === 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-600 italic" }, "Ready to execute."), logs.map((log, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: "mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-green-500 opacity-50 mr-2" }, (/* @__PURE__ */ new Date()).toLocaleTimeString()), log)))) : /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex items-center justify-center text-gray-500" }, "Select a workflow to view details")));
}
