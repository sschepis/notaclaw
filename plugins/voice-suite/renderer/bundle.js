"use strict";
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

// plugins/voice-suite/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
var VoiceSuiteSettings = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-xl font-bold mb-4", children: "Voice Suite Settings" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mb-4", children: "Configure your voice providers in the settings menu." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gray-100 p-4 rounded", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Providers available:" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "list-disc pl-5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "ElevenLabs (TTS, Voice Cloning)" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "OpenAI (TTS, Whisper STT)" })
      ] })
    ] })
  ] });
};
var activate = (context) => {
  console.log("[Voice Suite] Renderer activated");
  if (context.ui?.registerSettingsTab) {
    context.ui.registerSettingsTab({
      id: "voice-suite-settings",
      label: "Voice Suite",
      icon: import_lucide_react.Mic,
      component: VoiceSuiteSettings
    });
  }
};
