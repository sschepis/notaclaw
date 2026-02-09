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

// plugins/data-osmosis/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  const { ui, ipc } = context;
  const DataOsmosis = () => {
    const [sources, setSources] = (0, import_react.useState)([]);
    const [isAdding, setIsAdding] = (0, import_react.useState)(false);
    const [newSource, setNewSource] = (0, import_react.useState)({ name: "", type: "postgres", connectionString: "" });
    (0, import_react.useEffect)(() => {
      ipc.invoke("data-osmosis:list").then((initialSources) => {
        if (Array.isArray(initialSources)) {
          setSources(initialSources);
        }
      });
      const handleUpdate = (updatedSources) => {
        if (Array.isArray(updatedSources)) {
          setSources(updatedSources);
        }
      };
      ipc.on("data-osmosis:update", handleUpdate);
      return () => {
      };
    }, []);
    const handleAdd = async () => {
      try {
        const result = await ipc.invoke("data-osmosis:connect", newSource);
        if (result) {
          setIsAdding(false);
          setNewSource({ name: "", type: "postgres", connectionString: "" });
        }
      } catch (err) {
        console.error("Failed to add source:", err);
        ui.showToast({
          title: "Connection Failed",
          message: String(err),
          type: "error"
        });
      }
    };
    const handleSync = async (id) => {
      try {
        await ipc.invoke("data-osmosis:sync", id);
      } catch (err) {
        console.error("Sync failed:", err);
        ui.showToast({
          title: "Sync Failed",
          message: String(err),
          type: "error"
        });
      }
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-6 bg-gray-900 text-white min-h-full font-sans" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-8" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-2xl font-bold text-blue-400" }, "Data Osmosis"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-gray-400 text-sm" }, "Universal Data Connector")), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => setIsAdding(true),
        className: "bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
      },
      "+ Add Source"
    )), isAdding && /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-8 bg-gray-800 p-6 rounded-lg border border-gray-700" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-semibold mb-4" }, "New Connection"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-2 gap-4 mb-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Name"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        className: "w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none",
        value: newSource.name,
        onChange: (e) => setNewSource({ ...newSource, name: e.target.value }),
        placeholder: "e.g. User Database"
      }
    )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Type"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        className: "w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none",
        value: newSource.type,
        onChange: (e) => setNewSource({ ...newSource, type: e.target.value })
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "postgres" }, "PostgreSQL"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "mysql" }, "MySQL"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "mongodb" }, "MongoDB"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "rest" }, "REST API")
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "col-span-2" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Connection String / URL"), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        className: "w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none font-mono text-sm",
        value: newSource.connectionString,
        onChange: (e) => setNewSource({ ...newSource, connectionString: e.target.value }),
        placeholder: "postgres://..."
      }
    ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-end gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => setIsAdding(false),
        className: "px-4 py-2 text-gray-400 hover:text-white"
      },
      "Cancel"
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleAdd,
        className: "bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
      },
      "Connect"
    ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" }, sources.map((source) => /* @__PURE__ */ import_react.default.createElement("div", { key: source.id, className: "bg-gray-800 rounded-lg border border-gray-700 p-6 shadow-sm hover:border-gray-500 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: `w-3 h-3 rounded-full ${source.status === "connected" ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : source.status === "syncing" ? "bg-blue-500 animate-pulse" : "bg-red-500"}` }), /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-semibold text-lg" }, source.name)), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs font-mono bg-gray-900 px-2 py-1 rounded text-gray-400 uppercase" }, source.type)), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-2 text-sm text-gray-400 mb-6" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Records:"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-white font-mono" }, source.recordCount.toLocaleString())), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Last Sync:"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-white" }, source.lastSync ? new Date(source.lastSync).toLocaleTimeString() : "Never"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => handleSync(source.id),
        disabled: source.status === "syncing",
        className: `flex-1 py-2 rounded text-sm font-medium ${source.status === "syncing" ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`
      },
      source.status === "syncing" ? "Syncing..." : "Sync Now"
    ), /* @__PURE__ */ import_react.default.createElement("button", { className: "px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300" }, "\u2699\uFE0F")))), sources.length === 0 && !isAdding && /* @__PURE__ */ import_react.default.createElement("div", { className: "col-span-full text-center py-12 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-700" }, 'No data sources connected. Click "Add Source" to begin.')));
  };
  const cleanupNav = ui.registerNavigation({
    id: "data-osmosis-nav",
    label: "Data Osmosis",
    icon: import_lucide_react.Database,
    view: {
      id: "data-osmosis-view",
      name: "Data Osmosis",
      icon: import_lucide_react.Database,
      component: DataOsmosis
    },
    order: 200
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
