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

// plugins/secrets-manager/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var SecretsPanel = ({ context }) => {
  const [secrets, setSecrets] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [newKey, setNewKey] = (0, import_react.useState)("");
  const [newValue, setNewValue] = (0, import_react.useState)("");
  const [newLabel, setNewLabel] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    loadSecrets();
  }, []);
  const loadSecrets = async () => {
    setLoading(true);
    try {
      if (context.secrets && context.secrets.list) {
        const results = await context.secrets.list({ namespace: "plugins" });
        setSecrets(results || []);
      } else {
        console.warn("Secrets list API not available");
        setSecrets([]);
      }
    } catch (err) {
      console.error("Failed to load secrets:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    if (!newKey || !newValue) return;
    try {
      await context.secrets.set(newKey, newValue, newLabel);
      setNewKey("");
      setNewValue("");
      setNewLabel("");
      loadSecrets();
    } catch (err) {
      console.error("Failed to save secret:", err);
    }
  };
  const handleDelete = async (fullKey) => {
    try {
      await context.secrets.delete(fullKey);
      loadSecrets();
    } catch (err) {
      console.error("Failed to delete secret:", err);
    }
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col h-full bg-gray-900 text-gray-100 p-4 overflow-y-auto" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-6 flex items-center space-x-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-2 bg-blue-500/20 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Shield, { className: "w-6 h-6 text-blue-400" })), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-xl font-bold" }, "Secrets Manager"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-500" }, "Secure Vault Storage"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-medium text-gray-300 mb-3 flex items-center" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Plus, { className: "w-4 h-4 mr-2" }), "Add New Secret"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-[10px] uppercase text-gray-500 font-bold" }, "Key"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      value: newKey,
      onChange: (e) => setNewKey(e.target.value),
      placeholder: "e.g. api-keys/openai",
      className: "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-[10px] uppercase text-gray-500 font-bold" }, "Value"), /* @__PURE__ */ import_react.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "password",
      value: newValue,
      onChange: (e) => setNewValue(e.target.value),
      placeholder: "Secret value...",
      className: "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
    }
  ))), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-[10px] uppercase text-gray-500 font-bold" }, "Label (Optional)"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      value: newLabel,
      onChange: (e) => setNewLabel(e.target.value),
      placeholder: "Descriptive label",
      className: "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleSave,
      disabled: !newKey || !newValue,
      className: "w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    },
    "Encrypt & Save"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-medium text-gray-300 mb-3 flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "flex items-center" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Key, { className: "w-4 h-4 mr-2" }), " Stored Secrets"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: loadSecrets, className: "text-xs text-blue-400 hover:text-blue-300" }, "Refresh")), loading ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500" }, "Loading vault...") : secrets.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg border border-dashed border-gray-700" }, "No secrets found in plugin namespace.") : /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-2" }, secrets.map((secret) => /* @__PURE__ */ import_react.default.createElement("div", { key: secret.key, className: "bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded" }, secret.key), secret.metadata?.label && /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-400 italic" }, "- ", secret.metadata.label)), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-1 text-[10px] text-gray-500 flex items-center space-x-3" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Updated: ", new Date(secret.metadata?.updatedAt).toLocaleDateString()), /* @__PURE__ */ import_react.default.createElement("span", null, "Namespace: ", secret.namespace))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-1 ml-2" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => handleDelete(secret.key),
      className: "p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors",
      title: "Delete"
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Trash2, { className: "w-3.5 h-3.5" })
  ))))))));
};
var activate = (context) => {
  console.log("[Secrets Manager] Activated");
  const { ui } = context;
  const cleanupNav = ui.registerNavigation({
    id: "secrets-nav-btn",
    label: "Secrets",
    icon: import_lucide_react.Lock,
    view: {
      id: "secrets-panel",
      name: "Secrets Manager",
      icon: import_lucide_react.Lock,
      component: () => /* @__PURE__ */ import_react.default.createElement(SecretsPanel, { context })
    },
    order: 900
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  console.log("[Secrets Manager] Deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
