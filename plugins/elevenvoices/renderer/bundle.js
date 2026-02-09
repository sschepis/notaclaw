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

// plugins/elevenvoices/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var ElevenVoicesPanel = ({ context }) => {
  const [voices, setVoices] = (0, import_react.useState)([]);
  const [subscription, setSubscription] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [selectedVoice, setSelectedVoice] = (0, import_react.useState)("");
  const [testText, setTestText] = (0, import_react.useState)("Hello! This is a test of the ElevenLabs voice synthesis.");
  const [generating, setGenerating] = (0, import_react.useState)(false);
  const [lastAudioFile, setLastAudioFile] = (0, import_react.useState)(null);
  const [sfxText, setSfxText] = (0, import_react.useState)("");
  const [activeTab, setActiveTab] = (0, import_react.useState)("voices");
  const loadVoices = (0, import_react.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await context.ipc.invoke("elevenvoices:get_voices", { refresh: true });
      setVoices(result.voices || []);
    } catch (e) {
      setError(e.message || "Failed to load voices");
    }
    setLoading(false);
  }, [context]);
  const loadSubscription = (0, import_react.useCallback)(async () => {
    try {
      const result = await context.ipc.invoke("elevenvoices:get_subscription_info", {});
      setSubscription(result);
    } catch (e) {
      console.warn("Failed to load subscription info:", e.message);
    }
  }, [context]);
  (0, import_react.useEffect)(() => {
    loadVoices();
    loadSubscription();
  }, [loadVoices, loadSubscription]);
  const handleGenerateSpeech = async () => {
    if (!testText.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await context.ipc.invoke("elevenvoices:text_to_speech", {
        text: testText,
        voiceId: selectedVoice || void 0
      });
      setLastAudioFile(result.audioFile);
    } catch (e) {
      setError(e.message || "Failed to generate speech");
    }
    setGenerating(false);
  };
  const handleGenerateSoundEffect = async () => {
    if (!sfxText.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await context.ipc.invoke("elevenvoices:generate_sound_effect", {
        text: sfxText
      });
      setLastAudioFile(result.audioFile);
    } catch (e) {
      setError(e.message || "Failed to generate sound effect");
    }
    setGenerating(false);
  };
  const formatResetDate = (unix) => {
    if (!unix) return "Unknown";
    return new Date(unix * 1e3).toLocaleDateString();
  };
  const usagePercentage = subscription ? Math.round(subscription.characterCount / subscription.characterLimit * 100) : 0;
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "elevenvoices-panel p-4 space-y-4 bg-gray-900 text-white min-h-full" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "header flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-2xl" }, "\u{1F399}\uFE0F"), "ElevenVoices"), subscription && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-green-400" }, subscription.tier), " |", subscription.characterCount.toLocaleString(), " / ", subscription.characterLimit.toLocaleString(), " chars")), subscription && /* @__PURE__ */ import_react.default.createElement("div", { className: "usage-bar bg-gray-800 rounded-lg p-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-sm mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Character Usage"), /* @__PURE__ */ import_react.default.createElement("span", null, usagePercentage, "%")), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full bg-gray-700 rounded-full h-2" }, /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      className: `h-2 rounded-full transition-all ${usagePercentage > 90 ? "bg-red-500" : usagePercentage > 70 ? "bg-yellow-500" : "bg-green-500"}`,
      style: { width: `${usagePercentage}%` }
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 mt-1" }, "Resets: ", formatResetDate(subscription.nextCharacterCountResetUnix))), /* @__PURE__ */ import_react.default.createElement("div", { className: "tabs flex border-b border-gray-700" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => setActiveTab("voices"),
      className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === "voices" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"}`
    },
    "Voices"
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => setActiveTab("generate"),
      className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === "generate" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"}`
    },
    "Generate Speech"
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => setActiveTab("effects"),
      className: `px-4 py-2 text-sm font-medium transition-colors ${activeTab === "effects" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"}`
    },
    "Sound Effects"
  )), error && /* @__PURE__ */ import_react.default.createElement("div", { className: "error-message bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded" }, error), activeTab === "voices" && /* @__PURE__ */ import_react.default.createElement("div", { className: "voices-tab space-y-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm text-gray-400" }, voices.length, " voices available"), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: loadVoices,
      disabled: loading,
      className: "text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
    },
    loading ? "Loading..." : "Refresh"
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "voices-grid grid gap-2 max-h-96 overflow-y-auto" }, voices.map((voice) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: voice.voiceId,
      onClick: () => setSelectedVoice(voice.voiceId),
      className: `voice-card p-3 rounded-lg cursor-pointer transition-all ${selectedVoice === voice.voiceId ? "bg-blue-600/30 border border-blue-500" : "bg-gray-800 border border-gray-700 hover:border-gray-500"}`
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { className: "font-medium" }, voice.name), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-400" }, voice.category, " \u2022 ", voice.voiceId.slice(0, 8), "...")), voice.previewUrl && /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          const audio = new Audio(voice.previewUrl);
          audio.play();
        },
        className: "text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
      },
      "\u25B6 Preview"
    )),
    voice.description && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 mt-1 line-clamp-2" }, voice.description)
  )))), activeTab === "generate" && /* @__PURE__ */ import_react.default.createElement("div", { className: "generate-tab space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Selected Voice"), /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: selectedVoice,
      onChange: (e) => setSelectedVoice(e.target.value),
      className: "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
    },
    /* @__PURE__ */ import_react.default.createElement("option", { value: "" }, "Default Voice"),
    voices.map((voice) => /* @__PURE__ */ import_react.default.createElement("option", { key: voice.voiceId, value: voice.voiceId }, voice.name, " (", voice.category, ")"))
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Text to Speak"), /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: testText,
      onChange: (e) => setTestText(e.target.value),
      placeholder: "Enter text to convert to speech...",
      rows: 4,
      maxLength: 5e3,
      className: "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm resize-none"
    }
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 text-right" }, testText.length, " / 5000")), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleGenerateSpeech,
      disabled: generating || !testText.trim(),
      className: "w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
    },
    generating ? "Generating..." : "\u{1F50A} Generate Speech"
  ), lastAudioFile && /* @__PURE__ */ import_react.default.createElement("div", { className: "audio-result bg-gray-800 rounded-lg p-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 mb-2" }, "Generated Audio:"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-green-400 font-mono break-all" }, lastAudioFile))), activeTab === "effects" && /* @__PURE__ */ import_react.default.createElement("div", { className: "effects-tab space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Describe the Sound Effect"), /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: sfxText,
      onChange: (e) => setSfxText(e.target.value),
      placeholder: "e.g., Thunder rolling in the distance, waves crashing on a beach, robotic door opening...",
      rows: 4,
      className: "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm resize-none"
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleGenerateSoundEffect,
      disabled: generating || !sfxText.trim(),
      className: "w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
    },
    generating ? "Generating..." : "\u{1F3B5} Generate Sound Effect"
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "examples" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400 mb-2" }, "Example Prompts:"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-wrap gap-2" }, [
    "Thunder rumbling",
    "Door creaking open",
    "Futuristic laser blast",
    "Rain on window",
    "Crowd cheering",
    "Cat meowing"
  ].map((example) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      key: example,
      onClick: () => setSfxText(example),
      className: "text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
    },
    example
  ))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "footer text-xs text-gray-500 pt-4 border-t border-gray-800" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Powered by ElevenLabs AI"), /* @__PURE__ */ import_react.default.createElement("span", null, "v0.1.0"))));
};
var activate = (context) => {
  console.log("[ElevenVoices Renderer] Activating...");
  const { ui } = context;
  const cleanupNav = ui.registerNavigation({
    id: "elevenvoices-nav",
    label: "ElevenVoices",
    icon: import_lucide_react.Mic,
    view: {
      id: "elevenvoices-panel",
      name: "ElevenVoices",
      icon: import_lucide_react.Mic,
      component: ElevenVoicesPanel
    },
    order: 300
  });
  context._cleanups = [cleanupNav];
  console.log("[ElevenVoices Renderer] Ready");
};
var deactivate = (context) => {
  console.log("[ElevenVoices Renderer] Deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
