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

// plugins/prime-tuner/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Prime Tuner] Renderer activated");
  const TunerPanel = () => {
    const [frequency, setFrequency] = (0, import_react.useState)(432);
    const [sensitivity, setSensitivity] = (0, import_react.useState)(0.5);
    const [autoTune, setAutoTune] = (0, import_react.useState)(false);
    const [mode, setMode] = (0, import_react.useState)("harmonic");
    const [wavePoints, setWavePoints] = (0, import_react.useState)("");
    (0, import_react.useEffect)(() => {
      const width = 300;
      const height = 100;
      const points = [];
      for (let x = 0; x <= width; x++) {
        const y = height / 2 + Math.sin(x / width * Math.PI * 4 * (frequency / 432)) * (height / 2.5);
        points.push(`${x},${y}`);
      }
      setWavePoints(points.join(" "));
    }, [frequency]);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Prime Tuner"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg mb-4" }, /* @__PURE__ */ import_react.default.createElement("svg", { width: "100%", height: "100", className: "overflow-visible" }, /* @__PURE__ */ import_react.default.createElement("polyline", { points: wavePoints, fill: "none", stroke: "#3b82f6", strokeWidth: "2" }))), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Resonance Frequency (Hz)"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "range",
        min: "20",
        max: "1000",
        value: frequency,
        onChange: (e) => setFrequency(Number(e.target.value)),
        className: "flex-1 accent-blue-500"
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm w-12 text-right" }, frequency))), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Sensitivity"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "range",
        min: "0",
        max: "1",
        step: "0.1",
        value: sensitivity,
        onChange: (e) => setSensitivity(Number(e.target.value)),
        className: "flex-1 accent-blue-500"
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm w-12 text-right" }, sensitivity))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-sm" }, "Auto Tune"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "checkbox",
        checked: autoTune,
        onChange: (e) => setAutoTune(e.target.checked),
        className: "accent-blue-500 w-4 h-4"
      }
    )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Mode"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: mode,
        onChange: (e) => setMode(e.target.value),
        className: "w-full bg-white/10 border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "harmonic" }, "Harmonic"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "melodic" }, "Melodic"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "scalar" }, "Scalar")
    ))));
  };
  const PrimeTunerButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "prime-tuner";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("prime-tuner"),
        title: "Prime Tuner"
      },
      "PT"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "prime-tuner-nav",
    component: PrimeTunerButton
  });
  context.registerComponent("sidebar:view:prime-tuner", {
    id: "prime-tuner-panel",
    component: TunerPanel
  });
};
