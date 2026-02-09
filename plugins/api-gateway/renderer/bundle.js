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

// plugins/api-gateway/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react2 = __toESM(require("react"));

// plugins/api-gateway/renderer/GatewayPanel.tsx
var import_react = __toESM(require("react"));
var GatewayPanel = ({ context }) => {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [logs, setLogs] = (0, import_react.useState)([]);
  const [port, setPort] = (0, import_react.useState)(3e3);
  (0, import_react.useEffect)(() => {
    const fetchStatus = async () => {
      const data = await context.ipc.invoke("gateway:get-status");
      if (data) {
        setStatus(data.status);
        setPort(data.port);
        setLogs(data.logs);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5e3);
    return () => clearInterval(interval);
  }, [context]);
  const handleSavePort = async () => {
    await context.ipc.invoke("gateway:set-port", { port: Number(port) });
    const data = await context.ipc.invoke("gateway:get-status");
    if (data) {
      setStatus(data.status);
      setPort(data.port);
    }
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col h-full p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "API Gateway"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg mb-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm text-gray-400" }, "Status"), /* @__PURE__ */ import_react.default.createElement("span", { className: `px-2 py-0.5 rounded text-xs ${status === "running" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}` }, status ? status.toUpperCase() : "UNKNOWN")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-sm text-gray-400" }, "Port"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "number",
      value: port,
      onChange: (e) => setPort(Number(e.target.value)),
      className: "bg-black/20 border border-white/10 rounded px-2 py-1 text-sm w-24 text-white"
    }
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleSavePort,
      className: "px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-colors"
    },
    "Update"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 bg-black/20 rounded-lg p-2 overflow-hidden flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider" }, "Request Log"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-1 font-mono text-xs" }, logs.map((log, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: `p-1.5 rounded ${log.type === "error" ? "bg-red-500/10 text-red-300" : "hover:bg-white/5"}` }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500 mr-2" }, "[", new Date(log.timestamp).toLocaleTimeString(), "]"), log.message)), logs.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-600 italic p-2" }, "No logs yet"))));
};

// plugins/api-gateway/renderer/index.tsx
var activate = (context) => {
  console.log("[API Gateway] Renderer activated");
  const ApiGatewayButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "api-gateway";
    return /* @__PURE__ */ import_react2.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("api-gateway"),
        title: "API Gateway"
      },
      "AG"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "api-gateway-nav",
    component: ApiGatewayButton
  });
  context.registerComponent("sidebar:view:api-gateway", {
    id: "api-gateway-panel",
    component: () => /* @__PURE__ */ import_react2.default.createElement(GatewayPanel, { context })
  });
};
