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

// plugins/temporal-voyager/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => TemporalVoyager
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
function TemporalVoyager() {
  const [timestamp, setTimestamp] = (0, import_react.useState)(Date.now());
  const [isLive, setIsLive] = (0, import_react.useState)(true);
  const [history, setHistory] = (0, import_react.useState)([]);
  const [forkName, setForkName] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    if (window.aleph) {
      window.aleph.invoke("getHistoryEvents", { limit: 10 }).then((res) => {
        if (res.events) setHistory(res.events);
      });
    }
  }, []);
  const handleTravel = (val) => {
    setTimestamp(val);
    setIsLive(false);
    window.aleph?.invoke("travelToTime", { timestamp: val, mode: "view" });
  };
  const handleFork = () => {
    const name = forkName || `Fork @ ${new Date(timestamp).toLocaleTimeString()}`;
    window.aleph?.invoke("forkTimeline", { timestamp, label: name });
    alert(`Created fork: ${name}`);
  };
  const handleLive = () => {
    const now = Date.now();
    setTimestamp(now);
    setIsLive(true);
    window.aleph?.invoke("travelToTime", { timestamp: now, mode: "view" });
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 flex flex-col h-full bg-gray-900 text-gray-100" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-2xl font-bold flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Clock, { className: "w-6 h-6 text-blue-400" }), "Temporal Voyager"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleLive,
      className: `px-3 py-1 rounded text-sm flex items-center gap-1 ${isLive ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"}`
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Play, { className: "w-3 h-3" }),
    " Live"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex gap-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 border border-gray-700 rounded bg-gray-800 p-6 relative flex flex-col justify-center items-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute top-4 right-4 text-4xl opacity-10" }, "\u23F3"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-4xl font-mono font-bold text-white mb-2" }, new Date(timestamp).toLocaleTimeString()), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-gray-400 text-sm" }, new Date(timestamp).toDateString()), !isLive && /* @__PURE__ */ import_react.default.createElement("span", { className: "inline-block mt-2 px-2 py-1 bg-yellow-900 text-yellow-200 text-xs rounded border border-yellow-700" }, "HISTORICAL STATE")), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full max-w-2xl" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "range",
      min: Date.now() - 864e5,
      max: Date.now(),
      value: timestamp,
      onChange: (e) => handleTravel(Number(e.target.value)),
      className: "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
    }
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-xs text-gray-500 mt-2" }, /* @__PURE__ */ import_react.default.createElement("span", null, "-24h"), /* @__PURE__ */ import_react.default.createElement("span", null, "Now"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-12 flex gap-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      placeholder: "Fork Label",
      value: forkName,
      onChange: (e) => setForkName(e.target.value),
      className: "bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
    }
  ), /* @__PURE__ */ import_react.default.createElement("button", { onClick: handleFork, className: "bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded flex items-center justify-center gap-2 transition" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.GitBranch, { className: "w-4 h-4" }), "Fork Timeline")), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => handleTravel(timestamp - 6e4),
      className: "bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded flex items-center gap-2 self-end"
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RotateCcw, { className: "w-4 h-4" }),
    "Step Back 1m"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-64 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider" }, "Event Log"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-3" }, history.map((evt, i) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: i,
      className: "p-2 bg-gray-700 rounded border border-gray-600 hover:bg-gray-600 cursor-pointer transition",
      onClick: () => handleTravel(evt.timestamp)
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-blue-300 mb-1" }, new Date(evt.timestamp).toLocaleTimeString()),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm font-medium text-white" }, evt.type),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-400" }, evt.summary)
  )), history.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 italic text-center py-4" }, "No events found")))));
}
