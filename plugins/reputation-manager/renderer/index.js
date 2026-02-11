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

// plugins/reputation-manager/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Reputation Manager] Renderer activated");
  const ReputationPanel = () => {
    const [reputation, setReputation] = (0, import_react.useState)(750);
    const [feedback, setFeedback] = (0, import_react.useState)([
      { id: 1, from: "Alice", score: 5, comment: "Great collaboration!", timestamp: Date.now() - 1e5 },
      { id: 2, from: "Bob", score: 4, comment: "Good work, slight delay.", timestamp: Date.now() - 2e5 }
    ]);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Reputation"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-6 rounded-lg mb-6 text-center border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 mb-2" }, "Your Trust Score"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500" }, reputation), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 mt-2" }, "Rank: Magus")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider" }, "Recent Feedback"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-3" }, feedback.map((item) => /* @__PURE__ */ import_react.default.createElement("div", { key: item.id, className: "bg-white/5 p-3 rounded-lg border border-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "font-bold text-sm text-blue-300" }, item.from), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-500" }, new Date(item.timestamp).toLocaleDateString())), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center mb-1" }, Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ import_react.default.createElement("span", { key: i, className: `text-xs ${i < item.score ? "text-yellow-400" : "text-gray-600"}` }, "\u2605"))), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-300" }, item.comment))))));
  };
  const ReputationManagerButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "reputation-manager";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("reputation-manager"),
        title: "Reputation Manager"
      },
      "REP"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "reputation-manager-nav",
    component: ReputationManagerButton
  });
  context.registerComponent("sidebar:view:reputation-manager", {
    id: "reputation-manager-panel",
    component: ReputationPanel
  });
};
