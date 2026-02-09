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

// plugins/entangled-chat/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => EntangledChat
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
function EntangledChat() {
  const [localTopics, setLocalTopics] = (0, import_react.useState)(["general", "physics"]);
  const [peers, setPeers] = (0, import_react.useState)([
    { id: "node_alpha", topics: ["physics", "quantum"], status: "connected", latency: 45 },
    { id: "node_beta", topics: ["ai", "general"], status: "connected", latency: 12 },
    { id: "node_gamma", topics: ["crypto"], status: "disconnected", latency: 0 }
  ]);
  const [messages, setMessages] = (0, import_react.useState)([
    { id: "1", sender: "node_alpha", content: "Phase shift detected in sector 7.", topics: ["physics"], timestamp: Date.now() - 6e4 },
    { id: "2", sender: "node_beta", content: "Acknowledged. Adjusting frequency.", topics: ["general"], timestamp: Date.now() - 3e4 }
  ]);
  const [input, setInput] = (0, import_react.useState)("");
  const [selectedTopic, setSelectedTopic] = (0, import_react.useState)("general");
  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      sender: "Me",
      content: input,
      topics: [selectedTopic],
      timestamp: Date.now()
    };
    setMessages([...messages, newMessage]);
    setInput("");
  };
  const toggleTopic = (topic) => {
    if (localTopics.includes(topic)) {
      setLocalTopics(localTopics.filter((t) => t !== topic));
    } else {
      setLocalTopics([...localTopics, topic]);
    }
  };
  const availableTopics = ["general", "physics", "quantum", "ai", "crypto", "privacy"];
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex h-full bg-white text-gray-900 font-sans" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-64 border-r border-gray-200 bg-gray-50 flex flex-col p-4" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "font-bold text-lg mb-4 text-gray-700" }, "Subscriptions"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-2 mb-8" }, availableTopics.map((topic) => /* @__PURE__ */ import_react.default.createElement("label", { key: topic, className: "flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "checkbox",
      checked: localTopics.includes(topic),
      onChange: () => toggleTopic(topic),
      className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    }
  ), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm capitalize" }, topic)))), /* @__PURE__ */ import_react.default.createElement("h2", { className: "font-bold text-lg mb-4 text-gray-700" }, "Network Status"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm space-y-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Peers Online:"), /* @__PURE__ */ import_react.default.createElement("span", { className: "font-mono" }, "2")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Avg Latency:"), /* @__PURE__ */ import_react.default.createElement("span", { className: "font-mono" }, "28ms")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Protocol:"), /* @__PURE__ */ import_react.default.createElement("span", { className: "font-mono text-green-600" }, "Entangled/v1")))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex flex-col bg-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "h-14 border-b border-gray-200 flex items-center px-4 justify-between bg-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "font-semibold text-gray-800" }, "Broadcast Channel"), /* @__PURE__ */ import_react.default.createElement("span", { className: "bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full" }, "Topic: ", selectedTopic)), /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: selectedTopic,
      onChange: (e) => setSelectedTopic(e.target.value),
      className: "text-sm border border-gray-300 rounded p-1"
    },
    localTopics.map((t) => /* @__PURE__ */ import_react.default.createElement("option", { key: t, value: t }, t))
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-4" }, messages.map((msg) => /* @__PURE__ */ import_react.default.createElement("div", { key: msg.id, className: `flex flex-col ${msg.sender === "Me" ? "items-end" : "items-start"}` }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-baseline gap-2 mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "font-bold text-xs text-gray-700" }, msg.sender), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-400" }, new Date(msg.timestamp).toLocaleTimeString())), /* @__PURE__ */ import_react.default.createElement("div", { className: `max-w-[70%] px-4 py-2 rounded-lg text-sm ${msg.sender === "Me" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}` }, msg.content), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-1 mt-1" }, msg.topics.map((t) => /* @__PURE__ */ import_react.default.createElement("span", { key: t, className: "text-[10px] text-gray-400 bg-gray-50 px-1 rounded border border-gray-100" }, "#", t)))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-t border-gray-200 bg-gray-50" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      className: "flex-1 border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none",
      placeholder: `Message #${selectedTopic}...`,
      value: input,
      onChange: (e) => setInput(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleSend()
    }
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleSend,
      className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium text-sm transition-colors"
    },
    "Send"
  )))), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-64 border-l border-gray-200 bg-gray-50 p-4 flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "font-bold text-lg mb-4 text-gray-700" }, "Active Peers"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-2" }, peers.map((peer) => /* @__PURE__ */ import_react.default.createElement("div", { key: peer.id, className: "bg-white p-3 rounded border border-gray-200 shadow-sm" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "font-medium text-sm text-gray-800" }, peer.id), /* @__PURE__ */ import_react.default.createElement("div", { className: `w-2 h-2 rounded-full ${peer.status === "connected" ? "bg-green-500" : "bg-red-500"}` })), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 mb-2" }, peer.latency, "ms latency"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-wrap gap-1" }, peer.topics.map((t) => /* @__PURE__ */ import_react.default.createElement("span", { key: t, className: "px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200" }, t))))))));
}
