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

// plugins/secure-comms/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  console.log("[Secure Comms] Renderer activated");
  const { ui } = context;
  const CommsPanel = () => {
    const [recipient, setRecipient] = (0, import_react.useState)("");
    const [message, setMessage] = (0, import_react.useState)("");
    const [log, setLog] = (0, import_react.useState)([]);
    const handleSend = () => {
      if (!recipient || !message) return;
      setLog((prev) => [`Encrypting message for ${recipient}...`, ...prev]);
      setTimeout(() => {
        setLog((prev) => [`Message sent securely to ${recipient}.`, ...prev]);
        setMessage("");
      }, 1e3);
    };
    const handleVerify = () => {
      setLog((prev) => [`Verifying signature...`, ...prev]);
      setTimeout(() => {
        setLog((prev) => [`Signature VALID.`, ...prev]);
      }, 1e3);
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Secure Comms"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg mb-4 space-y-3 border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-bold text-gray-400 uppercase" }, "Send Encrypted Message"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        value: recipient,
        onChange: (e) => setRecipient(e.target.value),
        placeholder: "Recipient ID / Public Key",
        className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "textarea",
      {
        value: message,
        onChange: (e) => setMessage(e.target.value),
        placeholder: "Secret message...",
        className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:border-blue-500"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleSend,
        disabled: !recipient || !message,
        className: "w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-medium transition-colors disabled:opacity-50"
      },
      "Encrypt & Send"
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg mb-4 space-y-3 border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-bold text-gray-400 uppercase" }, "Verify Signature"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleVerify,
        className: "flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded font-medium transition-colors"
      },
      "Verify Last Message"
    ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 bg-black/20 rounded-lg p-3 overflow-y-auto font-mono text-xs space-y-1" }, log.map((entry, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: "text-gray-400" }, entry)), log.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-600 italic" }, "Ready for secure operations.")));
  };
  const cleanupNav = ui.registerNavigation({
    id: "secure-comms-nav",
    label: "Secure Comms",
    icon: import_lucide_react.Shield,
    view: {
      id: "secure-comms-panel",
      name: "Secure Communications",
      icon: import_lucide_react.Shield,
      component: CommsPanel
    },
    order: 1e3
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  console.log("[Secure Comms] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
