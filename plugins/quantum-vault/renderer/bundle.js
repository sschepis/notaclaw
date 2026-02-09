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

// plugins/quantum-vault/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => QuantumVault
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
function QuantumVault() {
  const [secrets, setSecrets] = (0, import_react.useState)([]);
  const [logs, setLogs] = (0, import_react.useState)([]);
  const [keyName, setKeyName] = (0, import_react.useState)("");
  const [keyValue, setKeyValue] = (0, import_react.useState)("");
  const refreshLogs = () => {
    window.aleph?.invoke("getAuditLog", {}).then((res) => {
      if (res.logs) setLogs(res.logs);
    });
  };
  (0, import_react.useEffect)(() => {
    refreshLogs();
  }, []);
  const handleStore = async () => {
    await window.aleph?.invoke("storeSecret", { key: keyName, value: keyValue });
    setKeyName("");
    setKeyValue("");
    refreshLogs();
    alert("Secret encrypted & stored.");
  };
  const handleRotate = async () => {
    await window.aleph?.invoke("rotateKeys", {});
    refreshLogs();
    alert("Keys rotated.");
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col h-full bg-slate-900 text-slate-100 p-8" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-8" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-3xl font-bold flex items-center gap-3 text-emerald-400" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Shield, { className: "w-8 h-8" }), "Quantum Vault"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-slate-400 mt-2" }, "Post-Quantum Cryptography Secure Storage (Kyber/Dilithium)")), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleRotate,
      className: "flex items-center gap-2 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-4 py-2 rounded transition"
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RefreshCw, { className: "w-4 h-4" }),
    "Rotate Keys"
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Lock, { className: "w-5 h-5 text-blue-400" }), "Store Secret"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-slate-400 mb-1" }, "Key ID"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      value: keyName,
      onChange: (e) => setKeyName(e.target.value),
      className: "w-full bg-slate-900 border border-slate-600 rounded p-2 focus:border-emerald-500 outline-none",
      placeholder: "e.g. API_MASTER_KEY"
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-slate-400 mb-1" }, "Payload"), /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: keyValue,
      onChange: (e) => setKeyValue(e.target.value),
      className: "w-full h-32 bg-slate-900 border border-slate-600 rounded p-2 focus:border-emerald-500 outline-none font-mono text-sm",
      placeholder: "Sensitive data..."
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleStore,
      className: "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition"
    },
    "Encrypt (Kyber-1024)"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Eye, { className: "w-5 h-5 text-purple-400" }), "Audit Log (Dilithium Verified)"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto bg-slate-900/50 rounded border border-slate-700 p-4 font-mono text-xs space-y-2" }, logs.length === 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: "text-slate-500 italic" }, "No activity recorded."), logs.map((log, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: "flex gap-4 border-b border-slate-800 pb-2 last:border-0" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-slate-500" }, new Date(log.timestamp).toLocaleTimeString()), /* @__PURE__ */ import_react.default.createElement("span", { className: `font-bold ${log.action === "STORE" ? "text-green-400" : "text-blue-400"}` }, log.action), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-slate-300" }, log.key), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-slate-600 ml-auto" }, log.agent)))))));
}
