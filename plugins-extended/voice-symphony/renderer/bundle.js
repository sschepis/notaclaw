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

// plugins/voice-symphony/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => VoiceSymphony
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
function VoiceSymphony() {
  const [isListening, setIsListening] = (0, import_react.useState)(false);
  const [transcript, setTranscript] = (0, import_react.useState)([]);
  const canvasRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    let interval;
    if (isListening) {
      interval = setInterval(() => {
        window.aleph?.invoke("getTranscript", {}).then((res) => {
          if (res.transcript) setTranscript(res.transcript);
        });
      }, 1e3);
    }
    return () => clearInterval(interval);
  }, [isListening]);
  (0, import_react.useEffect)(() => {
    if (!isListening || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const draw = () => {
      if (!isListening) return;
      ctx.clearRect(0, 0, 300, 100);
      ctx.fillStyle = "#4ade80";
      for (let i = 0; i < 30; i++) {
        const h = Math.sin(frame * 0.1 + i * 0.5) * 40 + 50;
        ctx.fillRect(i * 10, 100 - h, 8, h);
      }
      frame++;
      requestAnimationFrame(draw);
    };
    draw();
  }, [isListening]);
  const toggleMic = async () => {
    const newState = !isListening;
    setIsListening(newState);
    await window.aleph?.invoke("toggleListening", { state: newState });
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col h-full bg-gradient-to-b from-gray-900 to-black text-white p-8 items-center justify-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center mb-12" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-4xl font-thin mb-2 flex items-center justify-center gap-3" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Radio, { className: `w-8 h-8 ${isListening ? "text-green-400 animate-pulse" : "text-gray-600"}` }), "Voice Symphony"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-gray-500" }, "Natural Language Interface")), /* @__PURE__ */ import_react.default.createElement("div", { className: "relative mb-12" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: toggleMic,
      className: `w-32 h-32 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 ${isListening ? "bg-red-600 hover:bg-red-500 scale-110" : "bg-gray-800 hover:bg-gray-700"}`
    },
    isListening ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.MicOff, { className: "w-12 h-12" }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Mic, { className: "w-12 h-12" })
  ), isListening && /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute -inset-4 border-2 border-green-500 rounded-full animate-ping opacity-50 pointer-events-none" })), isListening && /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full max-w-md h-24 bg-black rounded-xl overflow-hidden mb-8 border border-gray-800 relative" }, /* @__PURE__ */ import_react.default.createElement("canvas", { ref: canvasRef, width: 300, height: 100, className: "w-full h-full opacity-70" })), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full max-w-2xl bg-gray-800/50 rounded-xl p-6 h-64 overflow-y-auto border border-gray-700 backdrop-blur" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs uppercase text-gray-500 mb-4 font-bold tracking-wider" }, "Live Transcript"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, transcript.length === 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-600 italic" }, "Silence..."), transcript.map((msg, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: `flex ${msg.role === "user" ? "justify-end" : "justify-start"}` }, /* @__PURE__ */ import_react.default.createElement("div", { className: `max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}` }, msg.text))))));
}
