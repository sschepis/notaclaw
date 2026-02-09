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

// plugins/marketplace/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  console.log("[Service Marketplace] Renderer activated");
  const { ui } = context;
  const MarketplacePanel = () => {
    const [plugins, setPlugins] = (0, import_react.useState)([]);
    const [loading, setLoading] = (0, import_react.useState)(false);
    (0, import_react.useEffect)(() => {
      const fetchPlugins = async () => {
        if (context.ipc && context.ipc.invoke) {
          const list = await context.ipc.invoke("marketplace:list");
          setPlugins(list);
        }
      };
      fetchPlugins();
    }, []);
    const handleInstall = async (pluginId) => {
      setLoading(true);
      try {
        const result = await context.ipc.invoke("marketplace:install", { pluginId });
        alert(result.message);
      } catch (e) {
        alert("Installation failed: " + e.message);
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Marketplace"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-3" }, plugins.map((plugin) => /* @__PURE__ */ import_react.default.createElement("div", { key: plugin.id, className: "bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-bold text-sm text-blue-400" }, plugin.name), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-500" }, "v", plugin.version, " \u2022 by ", plugin.author)), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => handleInstall(plugin.id),
        disabled: loading,
        className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium disabled:opacity-50"
      },
      "Install"
    )), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm text-gray-300" }, plugin.description))), plugins.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center text-gray-500 mt-8" }, "Loading registry...")));
  };
  const cleanupNav = ui.registerNavigation({
    id: "marketplace-nav",
    label: "Marketplace",
    icon: import_lucide_react.ShoppingBag,
    view: {
      id: "marketplace-panel",
      name: "Service Marketplace",
      icon: import_lucide_react.ShoppingBag,
      component: MarketplacePanel
    },
    order: 700
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  console.log("[Service Marketplace] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
