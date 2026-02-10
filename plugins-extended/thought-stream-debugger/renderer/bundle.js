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

// plugins/thought-stream-debugger/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => ThoughtStreamDebugger
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var MOCK_SESSION = {
  id: "sess_mock_123",
  agentId: "agent_sre_01",
  startTime: Date.now() - 6e4,
  status: "completed",
  traces: [
    { timestamp: Date.now() - 5e4, step: "Goal Analysis", details: { goal: "Summarize recent logs", priority: "high" } },
    { timestamp: Date.now() - 45e3, step: "Memory Recall", details: { query: "logs", limit: 10, resonance: 0.85 } },
    { timestamp: Date.now() - 4e4, step: "Plan Formulation", details: { steps: ["fetch_logs", "analyze_sentiment", "generate_summary"] } },
    { timestamp: Date.now() - 35e3, step: "Tool Execution", details: { tool: "fetch_logs", args: { limit: 100 } } },
    { timestamp: Date.now() - 3e4, step: "Observation", details: { result: "Fetched 100 log entries." } },
    { timestamp: Date.now() - 25e3, step: "Reasoning", details: { thought: "Logs show high error rate in auth service." } },
    { timestamp: Date.now() - 2e4, step: "Tool Execution", details: { tool: "analyze_sentiment", args: { text: "Error: Auth failed..." } } },
    { timestamp: Date.now() - 1e4, step: "Response Generation", details: { draft: "The system is experiencing auth failures." } }
  ]
};
function ThoughtStreamDebugger() {
  const [selectedSessionId, setSelectedSessionId] = (0, import_react.useState)(null);
  const [selectedTraceIndex, setSelectedTraceIndex] = (0, import_react.useState)(null);
  const session = selectedSessionId === "sess_mock_123" ? MOCK_SESSION : null;
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex h-full bg-gray-950 text-gray-200 font-sans" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-64 border-r border-gray-800 flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-b border-gray-800" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-lg font-bold text-purple-400" }, "Sessions")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto" }, /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      onClick: () => setSelectedSessionId("sess_mock_123"),
      className: `p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-900 ${selectedSessionId === "sess_mock_123" ? "bg-gray-900 border-l-2 border-purple-500" : ""}`
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "font-medium text-sm text-gray-300" }, "agent_sre_01"),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 mt-1" }, new Date(MOCK_SESSION.startTime).toLocaleTimeString()),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-2 text-xs" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "bg-green-900 text-green-300 px-1 rounded" }, "COMPLETED"))
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 text-xs text-gray-600 text-center" }, "No other sessions"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex flex-col" }, session ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("div", { className: "h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-lg font-semibold text-white" }, "Execution Trace: ", session.id), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-500" }, "Agent: ", session.agentId))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-6 space-y-4" }, session.traces.map((trace, index) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: index,
      onClick: () => setSelectedTraceIndex(index),
      className: `relative pl-8 pb-4 border-l-2 cursor-pointer transition-all ${selectedTraceIndex === index ? "border-purple-500" : "border-gray-800 hover:border-gray-600"}`
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: `absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${selectedTraceIndex === index ? "bg-purple-900 border-purple-500" : "bg-gray-900 border-gray-600"}` }),
    /* @__PURE__ */ import_react.default.createElement("div", { className: `p-4 rounded-lg border ${selectedTraceIndex === index ? "bg-gray-900 border-purple-500 shadow-lg shadow-purple-900/20" : "bg-gray-900 border-gray-800"}` }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "font-bold text-sm text-blue-300" }, trace.step), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs font-mono text-gray-500" }, "+", trace.timestamp - session.startTime, "ms")), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 line-clamp-2" }, JSON.stringify(trace.details)))
  ))), selectedTraceIndex !== null && /* @__PURE__ */ import_react.default.createElement("div", { className: "w-96 border-l border-gray-800 bg-black p-6 overflow-y-auto" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-bold mb-4 text-white" }, "Step Details"), /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-4" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-xs text-gray-500 uppercase mb-1" }, "Step Type"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-blue-400 font-mono" }, session.traces[selectedTraceIndex].step)), /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-4" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-xs text-gray-500 uppercase mb-1" }, "Timestamp"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-300 font-mono" }, new Date(session.traces[selectedTraceIndex].timestamp).toISOString())), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-xs text-gray-500 uppercase mb-1" }, "Data Payload"), /* @__PURE__ */ import_react.default.createElement("pre", { className: "text-xs font-mono text-green-400 bg-gray-900 p-3 rounded overflow-x-auto" }, JSON.stringify(session.traces[selectedTraceIndex].details, null, 2)))))) : /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex items-center justify-center text-gray-500" }, "Select a session to view the thought stream")));
}
