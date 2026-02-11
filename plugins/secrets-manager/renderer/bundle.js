"use strict";

// plugins/secrets-manager/renderer/bundle.js
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
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
var import_react = require("react");
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};
var Icon = (0, import_react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => (0, import_react.createElement)(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);
var createLucideIcon = (iconName, iconNode) => {
  const Component = (0, import_react2.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};
var __iconNode = [
  ["path", { d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4", key: "g0fldk" }],
  ["path", { d: "m21 2-9.6 9.6", key: "1j0ho8" }],
  ["circle", { cx: "7.5", cy: "15.5", r: "5.5", key: "yqb3hr" }]
];
var Key = createLucideIcon("key", __iconNode);
var __iconNode2 = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1", key: "1mm8w8" }]
];
var LockOpen = createLucideIcon("lock-open", __iconNode2);
var __iconNode3 = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
];
var Lock = createLucideIcon("lock", __iconNode3);
var __iconNode4 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
var Plus = createLucideIcon("plus", __iconNode4);
var __iconNode5 = [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
];
var RefreshCw = createLucideIcon("refresh-cw", __iconNode5);
var __iconNode6 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
var Search = createLucideIcon("search", __iconNode6);
var __iconNode7 = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ]
];
var Shield = createLucideIcon("shield", __iconNode7);
var __iconNode8 = [
  ["path", { d: "M10 11v6", key: "nco0om" }],
  ["path", { d: "M14 11v6", key: "outv1u" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
var Trash2 = createLucideIcon("trash-2", __iconNode8);
var __iconNode9 = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
];
var X = createLucideIcon("x", __iconNode9);
var import_react3 = __toESM(require("react"));
var NAMESPACES = [
  "user",
  "plugins",
  "ai-providers",
  "services",
  "identity",
  "system"
];
var SecretsSidebar = () => {
  const [secrets, setSecrets] = (0, import_react3.useState)([]);
  const [status, setStatus] = (0, import_react3.useState)(null);
  const [loading, setLoading] = (0, import_react3.useState)(true);
  const [filterNamespace, setFilterNamespace] = (0, import_react3.useState)("all");
  const [searchQuery, setSearchQuery] = (0, import_react3.useState)("");
  const [isAdding, setIsAdding] = (0, import_react3.useState)(false);
  const [newNamespace, setNewNamespace] = (0, import_react3.useState)("user");
  const [newKey, setNewKey] = (0, import_react3.useState)("");
  const [newValue, setNewValue] = (0, import_react3.useState)("");
  const [newLabel, setNewLabel] = (0, import_react3.useState)("");
  const [saving, setSaving] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    loadStatus();
    loadSecrets();
    const interval = setInterval(loadStatus, 5e3);
    return () => clearInterval(interval);
  }, []);
  (0, import_react3.useEffect)(() => {
    loadSecrets();
  }, [filterNamespace]);
  const loadStatus = async () => {
    try {
      const s = await window.electronAPI.secretsStatus();
      setStatus(s);
      if (s.locked) {
        setSecrets([]);
      }
    } catch (err) {
      console.error("Failed to load vault status:", err);
    }
  };
  const loadSecrets = async () => {
    if (status?.locked) return;
    setLoading(true);
    try {
      const options = {};
      if (filterNamespace !== "all") {
        options.namespace = filterNamespace;
      }
      const results = await window.electronAPI.secretsList(options);
      setSecrets(results || []);
    } catch (err) {
      console.error("Failed to load secrets:", err);
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    if (!newKey || !newValue) return;
    setSaving(true);
    try {
      await window.electronAPI.secretsSet({
        namespace: newNamespace,
        key: newKey,
        value: newValue,
        label: newLabel || void 0
      });
      setNewKey("");
      setNewValue("");
      setNewLabel("");
      setIsAdding(false);
      loadSecrets();
      loadStatus();
    } catch (err) {
      console.error("Failed to save secret:", err);
      alert("Failed to save secret. Check console for details.");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (namespace, key) => {
    if (!confirm(`Are you sure you want to delete ${namespace}/${key}?`)) return;
    try {
      await window.electronAPI.secretsDelete({ namespace, key });
      loadSecrets();
      loadStatus();
    } catch (err) {
      console.error("Failed to delete secret:", err);
    }
  };
  const toggleLock = async () => {
    try {
      if (status?.locked) {
        await window.electronAPI.secretsUnlock();
      } else {
        await window.electronAPI.secretsLock();
      }
      await loadStatus();
      if (status?.locked) {
        loadSecrets();
      }
    } catch (err) {
      console.error("Failed to toggle lock:", err);
    }
  };
  const filteredSecrets = secrets.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.key.toLowerCase().includes(q) || s.metadata.label?.toLowerCase().includes(q) || s.namespace.toLowerCase().includes(q);
  });
  if (!status) {
    return /* @__PURE__ */ import_react3.default.createElement("div", { className: "p-4 text-gray-500 text-center" }, "Connecting to vault...");
  }
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex flex-col h-full bg-gray-900/95 text-gray-100 overflow-hidden" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: `p-2 rounded-lg ${status.locked ? "bg-amber-500/20" : "bg-emerald-500/20"}` }, /* @__PURE__ */ import_react3.default.createElement(Shield, { className: `w-5 h-5 ${status.locked ? "text-amber-400" : "text-emerald-400"}` })), /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("h1", { className: "text-sm font-bold uppercase tracking-wider" }, "Secrets Vault"), /* @__PURE__ */ import_react3.default.createElement("p", { className: "text-[10px] text-gray-500 flex items-center" }, status.locked ? "Encrypted & Locked" : "Unlocked & Active"))), /* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      onClick: toggleLock,
      className: `p-2 rounded-md transition-colors ${status.locked ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`,
      title: status.locked ? "Unlock Vault" : "Lock Vault"
    },
    status.locked ? /* @__PURE__ */ import_react3.default.createElement(Lock, { className: "w-4 h-4" }) : /* @__PURE__ */ import_react3.default.createElement(LockOpen, { className: "w-4 h-4" })
  )), status.locked ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2" }, /* @__PURE__ */ import_react3.default.createElement(Lock, { className: "w-8 h-8 text-gray-500" })), /* @__PURE__ */ import_react3.default.createElement("h3", { className: "text-lg font-medium text-gray-300" }, "Vault is Locked"), /* @__PURE__ */ import_react3.default.createElement("p", { className: "text-sm text-gray-500 max-w-xs" }, "Unlock the vault to access or manage your secure credentials."), /* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      onClick: toggleLock,
      className: "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors"
    },
    "Unlock Vault"
  )) : /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("div", { className: "p-3 space-y-3 bg-gray-900/50" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex space-x-2" }, /* @__PURE__ */ import_react3.default.createElement(
    "select",
    {
      value: filterNamespace,
      onChange: (e) => setFilterNamespace(e.target.value),
      className: "bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 focus:border-blue-500 outline-none flex-1"
    },
    /* @__PURE__ */ import_react3.default.createElement("option", { value: "all" }, "All Namespaces"),
    NAMESPACES.map((ns) => /* @__PURE__ */ import_react3.default.createElement("option", { key: ns, value: ns }, ns))
  ), /* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      onClick: () => setIsAdding(!isAdding),
      className: `p-1.5 rounded border transition-colors ${isAdding ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`,
      title: "Add Secret"
    },
    isAdding ? /* @__PURE__ */ import_react3.default.createElement(X, { className: "w-4 h-4" }) : /* @__PURE__ */ import_react3.default.createElement(Plus, { className: "w-4 h-4" })
  )), /* @__PURE__ */ import_react3.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react3.default.createElement(Search, { className: "absolute left-2 top-2 w-3.5 h-3.5 text-gray-500" }), /* @__PURE__ */ import_react3.default.createElement(
    "input",
    {
      type: "text",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      placeholder: "Search keys...",
      className: "w-full bg-gray-800 border border-gray-700 rounded pl-8 pr-2 py-1.5 text-xs focus:border-blue-500 outline-none"
    }
  ))), isAdding && /* @__PURE__ */ import_react3.default.createElement("div", { className: "p-3 bg-blue-900/10 border-b border-blue-900/30 space-y-3 animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "text-xs font-bold text-blue-400 uppercase" }, "New Secret")), /* @__PURE__ */ import_react3.default.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ import_react3.default.createElement(
    "select",
    {
      value: newNamespace,
      onChange: (e) => setNewNamespace(e.target.value),
      className: "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none"
    },
    NAMESPACES.map((ns) => /* @__PURE__ */ import_react3.default.createElement("option", { key: ns, value: ns }, ns))
  ), /* @__PURE__ */ import_react3.default.createElement(
    "input",
    {
      type: "text",
      value: newKey,
      onChange: (e) => setNewKey(e.target.value),
      placeholder: "Key (e.g. api-key)",
      className: "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
    }
  ), /* @__PURE__ */ import_react3.default.createElement(
    "input",
    {
      type: "password",
      value: newValue,
      onChange: (e) => setNewValue(e.target.value),
      placeholder: "Secret value",
      className: "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
    }
  ), /* @__PURE__ */ import_react3.default.createElement(
    "input",
    {
      type: "text",
      value: newLabel,
      onChange: (e) => setNewLabel(e.target.value),
      placeholder: "Label (optional)",
      className: "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
    }
  ), /* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      onClick: handleSave,
      disabled: !newKey || !newValue || saving,
      className: "w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
    },
    saving ? "Encrypting..." : "Save Secret"
  ))), /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2" }, loading ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ import_react3.default.createElement(RefreshCw, { className: "w-5 h-5 text-gray-600 animate-spin" })) : filteredSecrets.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "text-center py-12 text-gray-500" }, /* @__PURE__ */ import_react3.default.createElement("p", { className: "text-xs" }, "No secrets found matching your criteria.")) : filteredSecrets.map((secret) => /* @__PURE__ */ import_react3.default.createElement("div", { key: `${secret.namespace}/${secret.key}`, className: "group bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700/50 hover:border-gray-600 rounded-lg p-2.5 transition-all" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "overflow-hidden" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-center space-x-2 mb-1" }, /* @__PURE__ */ import_react3.default.createElement("span", { className: `text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${secret.namespace === "user" ? "bg-purple-500/20 text-purple-300" : secret.namespace === "system" ? "bg-red-500/20 text-red-300" : secret.namespace === "ai-providers" ? "bg-green-500/20 text-green-300" : "bg-blue-500/20 text-blue-300"}` }, secret.namespace), /* @__PURE__ */ import_react3.default.createElement("span", { className: "text-xs font-mono text-gray-300 truncate", title: secret.key }, secret.key)), secret.metadata.label && /* @__PURE__ */ import_react3.default.createElement("p", { className: "text-[10px] text-gray-400 italic truncate mb-1" }, secret.metadata.label), /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-center space-x-2 text-[9px] text-gray-600" }, /* @__PURE__ */ import_react3.default.createElement("span", null, "Updated: ", new Date(secret.metadata.updatedAt).toLocaleDateString()))), /* @__PURE__ */ import_react3.default.createElement(
    "button",
    {
      onClick: () => handleDelete(secret.namespace, secret.key),
      className: "opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-all",
      title: "Delete Secret"
    },
    /* @__PURE__ */ import_react3.default.createElement(Trash2, { className: "w-3.5 h-3.5" })
  ))))), /* @__PURE__ */ import_react3.default.createElement("div", { className: "p-2 border-t border-gray-800 bg-gray-900 text-[10px] text-gray-500 flex justify-between" }, /* @__PURE__ */ import_react3.default.createElement("span", null, filteredSecrets.length, " secrets"), /* @__PURE__ */ import_react3.default.createElement("span", null, status.entryCount, " total in vault"))));
};
var activate = (context) => {
  console.log("[Secrets Manager] Activated");
  const { ui } = context;
  const cleanupPanel = ui.registerPanel({
    id: "secrets-manager-panel",
    name: "Secrets Manager",
    icon: Key,
    component: SecretsSidebar,
    defaultLocation: "left",
    defaultWeight: 20,
    enableClose: true
  });
  context._cleanups = [cleanupPanel];
};
var deactivate = (context) => {
  console.log("[Secrets Manager] Deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils/mergeClasses.js:
lucide-react/dist/esm/shared/src/utils/toKebabCase.js:
lucide-react/dist/esm/shared/src/utils/toCamelCase.js:
lucide-react/dist/esm/shared/src/utils/toPascalCase.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/key.js:
lucide-react/dist/esm/icons/lock-open.js:
lucide-react/dist/esm/icons/lock.js:
lucide-react/dist/esm/icons/plus.js:
lucide-react/dist/esm/icons/refresh-cw.js:
lucide-react/dist/esm/icons/search.js:
lucide-react/dist/esm/icons/shield.js:
lucide-react/dist/esm/icons/trash-2.js:
lucide-react/dist/esm/icons/x.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.563.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
