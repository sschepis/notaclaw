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

// plugins/federated-trainer/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Federated Trainer] Renderer activated");
  const TrainerView = () => {
    const [rounds, setRounds] = (0, import_react.useState)([]);
    const [showNewRoundForm, setShowNewRoundForm] = (0, import_react.useState)(false);
    const [newRound, setNewRound] = (0, import_react.useState)({ modelId: "", datasetQuery: "", epochs: 1 });
    (0, import_react.useEffect)(() => {
      context.ipc.send("get-rounds");
      context.ipc.on("training-update", (updatedRounds) => {
        setRounds(updatedRounds);
      });
    }, []);
    const startRound = () => {
      if (!newRound.modelId) return;
      context.ipc.send("start-round", newRound);
      setShowNewRoundForm(false);
      setNewRound({ modelId: "", datasetQuery: "", epochs: 1 });
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 h-full overflow-y-auto text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-2xl font-bold" }, "Federated Trainer"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => setShowNewRoundForm(true),
        className: "bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
      },
      "+ New Round"
    )), showNewRoundForm && /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-6 border border-white/10 p-4 rounded bg-white/5 animate-in fade-in slide-in-from-top-2" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-bold mb-4" }, "Start New Training Round"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Model ID"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        value: newRound.modelId,
        onChange: (e) => setNewRound({ ...newRound, modelId: e.target.value }),
        placeholder: "e.g. llama-3-8b-quantized",
        className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      }
    )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Dataset Query"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        value: newRound.datasetQuery,
        onChange: (e) => setNewRound({ ...newRound, datasetQuery: e.target.value }),
        placeholder: "e.g. docs/*.md",
        className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      }
    )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Epochs"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "number",
        value: newRound.epochs,
        onChange: (e) => setNewRound({ ...newRound, epochs: parseInt(e.target.value) }),
        className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      }
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => setShowNewRoundForm(false),
        className: "px-4 py-2 text-gray-400 hover:text-white"
      },
      "Cancel"
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: startRound,
        className: "bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
      },
      "Start"
    )))), rounds.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-400 text-center mt-10" }, "No active training rounds.") : /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, rounds.map((round) => /* @__PURE__ */ import_react.default.createElement("div", { key: round.id, className: "border border-white/10 p-4 rounded bg-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-bold text-lg" }, round.modelId), /* @__PURE__ */ import_react.default.createElement("span", { className: `px-2 py-1 rounded text-xs ${round.status === "completed" ? "bg-green-500/20 text-green-400" : round.status === "training" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}` }, round.status.toUpperCase())), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 mb-2" }, "Participants: ", round.participants), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full bg-gray-700 h-2 rounded overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        className: "bg-blue-500 h-full transition-all duration-500",
        style: { width: `${round.progress || 0}%` }
      }
    ))))));
  };
  const TrainerButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "federated-trainer";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("federated-trainer"),
        title: "Federated Trainer"
      },
      "\u{1F9E0}"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "federated-trainer-nav",
    component: TrainerButton
  });
  context.registerComponent("sidebar:view:federated-trainer", {
    id: "federated-trainer-panel",
    component: TrainerView
  });
};
