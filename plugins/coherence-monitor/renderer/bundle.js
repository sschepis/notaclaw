"use strict";

// plugins/coherence-monitor/renderer/bundle.js
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
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  console.log("[Coherence Monitor] Renderer activated");
  const { ui, ipc } = context;
  const CoherencePanel = () => {
    const [events, setEvents] = (0, import_react.useState)([]);
    const [stats, setStats] = (0, import_react.useState)({ coherence: 0, entropy: 0 });
    (0, import_react.useEffect)(() => {
      const handleUpdate = (event) => {
        setStats({ coherence: event.coherence, entropy: event.entropy });
        setEvents((prev) => [event, ...prev].slice(0, 50));
      };
      if (ipc && ipc.on) {
        ipc.on("coherence:update", handleUpdate);
      }
      return () => {
      };
    }, []);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Coherence Monitor"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-2 gap-4 mb-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 mb-1" }, "Coherence"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-2xl font-mono text-cyan-400" }, (stats.coherence * 100).toFixed(1), "%"), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full bg-gray-700 h-1 mt-2 rounded overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-cyan-500 h-full transition-all duration-500", style: { width: `${stats.coherence * 100}%` } }))), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 mb-1" }, "Entropy"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-2xl font-mono text-pink-400" }, (stats.entropy * 100).toFixed(1), "%"), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full bg-gray-700 h-1 mt-2 rounded overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-pink-500 h-full transition-all duration-500", style: { width: `${stats.entropy * 100}%` } })))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 bg-black/20 rounded-lg p-2 overflow-hidden flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider" }, "Event Stream"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-1 font-mono text-xs" }, events.map((evt, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: "p-2 rounded hover:bg-white/5 border-l-2 border-transparent hover:border-white/20" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-gray-500 mb-0.5" }, /* @__PURE__ */ import_react.default.createElement("span", null, new Date(evt.timestamp).toLocaleTimeString()), /* @__PURE__ */ import_react.default.createElement("span", null, evt.source)), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-300" }, evt.message))), events.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-600 italic p-2" }, "Waiting for coherence data..."))));
  };
  const cleanupNav = ui.registerNavigation({
    id: "coherence-monitor-nav",
    label: "Coherence",
    icon: import_lucide_react.Activity,
    view: {
      id: "coherence-monitor-panel",
      name: "Coherence Monitor",
      icon: import_lucide_react.Activity,
      component: CoherencePanel
    },
    order: 100
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
