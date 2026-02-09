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

// plugins/voice-interface/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Voice Interface] Renderer activated");
  const VoicePanel = () => {
    const [isListening, setIsListening] = (0, import_react.useState)(false);
    const [transcript, setTranscript] = (0, import_react.useState)("");
    const [lastSpoken, setLastSpoken] = (0, import_react.useState)("");
    const recognitionRef = (0, import_react.useRef)(null);
    (0, import_react.useEffect)(() => {
      if (context.dsn && context.dsn.registerTool) {
        context.dsn.registerTool({
          name: "text_to_speech",
          description: "Speak text to the user",
          executionLocation: "CLIENT",
          parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
        }, async ({ text }) => {
          speak(text);
          return { success: true };
        });
      }
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.onresult = (event) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setIsListening(false);
        };
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }, []);
    const toggleListening = () => {
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        setTranscript("");
        recognitionRef.current?.start();
        setIsListening(true);
      }
    };
    const speak = (text) => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
        setLastSpoken(text);
      }
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white items-center justify-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-8 rounded-full mb-8 relative" }, isListening && /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-50" }), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: toggleListening,
        className: `w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-colors ${isListening ? "bg-red-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`
      },
      isListening ? "\u23F9" : "\u{1F3A4}"
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full max-w-md space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-black/20 p-4 rounded-lg min-h-[100px]" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs text-gray-500 uppercase mb-2" }, "Transcript"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-lg text-gray-200" }, transcript || "Click mic to speak...")), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-black/20 p-4 rounded-lg min-h-[60px]" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs text-gray-500 uppercase mb-2" }, "Last Spoken"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm text-blue-300 italic" }, lastSpoken || "Nothing spoken yet.")), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => speak("Hello, I am listening."),
        className: "w-full py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
      },
      "Test TTS"
    )));
  };
  const VoiceInterfaceButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "voice-interface";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("voice-interface"),
        title: "Voice Interface"
      },
      "VOC"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "voice-interface-nav",
    component: VoiceInterfaceButton
  });
  context.registerComponent("sidebar:view:voice-interface", {
    id: "voice-interface-panel",
    component: VoicePanel
  });
};
