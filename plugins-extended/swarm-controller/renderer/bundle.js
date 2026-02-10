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

// plugins/swarm-controller/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Swarm Controller] Renderer activated");
  const SwarmPanel = () => {
    const [agents, setAgents] = (0, import_react.useState)([
      { id: "agent-1", name: "Researcher", status: "idle", task: "" },
      { id: "agent-2", name: "Writer", status: "working", task: "Drafting report" },
      { id: "agent-3", name: "Reviewer", status: "idle", task: "" }
    ]);
    const spawnAgent = () => {
      const id = `agent-${agents.length + 1}`;
      setAgents([...agents, { id, name: `Agent ${agents.length + 1}`, status: "idle", task: "" }]);
    };
    const assignTask = (id) => {
      const task = prompt("Enter task for agent:", "Processing new directive...");
      if (!task) return;
      setAgents(agents.map((a) => a.id === id ? { ...a, status: "working", task } : a));
      setTimeout(() => {
        setAgents((prev) => prev.map((a) => a.id === id ? { ...a, status: "idle", task: "" } : a));
      }, 5e3);
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold" }, "Swarm Controller"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: spawnAgent,
        className: "bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
      },
      "+ Spawn Agent"
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 gap-3" }, agents.map((agent) => /* @__PURE__ */ import_react.default.createElement("div", { key: agent.id, className: "bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: `w-2 h-2 rounded-full ${agent.status === "working" ? "bg-green-500 animate-pulse" : "bg-gray-500"}` }), /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-bold text-sm text-blue-300" }, agent.name)), /* @__PURE__ */ import_react.default.createElement("span", { className: `text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${agent.status === "working" ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}` }, agent.status)), agent.task ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-300 mb-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Current Task:"), " ", agent.task) : /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 italic mb-2" }, "No active task"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 mt-2" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => assignTask(agent.id),
        disabled: agent.status === "working",
        className: "flex-1 bg-white/10 hover:bg-white/20 text-white py-1 rounded text-xs transition-colors disabled:opacity-50"
      },
      "Assign Task"
    ), /* @__PURE__ */ import_react.default.createElement("button", { className: "px-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors" }, "Stop"))))));
  };
  const SwarmControllerButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "swarm-controller";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("swarm-controller"),
        title: "Swarm Controller"
      },
      "SWM"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "swarm-controller-nav",
    component: SwarmControllerButton
  });
  context.registerComponent("sidebar:view:swarm-controller", {
    id: "swarm-controller-panel",
    component: SwarmPanel
  });
};
