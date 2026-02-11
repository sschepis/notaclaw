"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/api-gateway/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react = require("lucide-react");

// plugins/api-gateway/renderer/GatewayPanel.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col h-full p-4 text-white", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-xl font-bold mb-4", children: "API Gateway" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg mb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm text-gray-400", children: "Status" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `px-2 py-0.5 rounded text-xs ${status === "running" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`, children: status ? status.toUpperCase() : "UNKNOWN" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "text-sm text-gray-400", children: "Port" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "number",
            value: port,
            onChange: (e) => setPort(Number(e.target.value)),
            className: "bg-black/20 border border-white/10 rounded px-2 py-1 text-sm w-24 text-white"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: handleSavePort,
            className: "px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-colors",
            children: "Update"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 bg-black/20 rounded-lg p-2 overflow-hidden flex flex-col", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider", children: "Request Log" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 overflow-y-auto space-y-1 font-mono text-xs", children: [
        logs.map((log, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `p-1.5 rounded ${log.type === "error" ? "bg-red-500/10 text-red-300" : "hover:bg-white/5"}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-gray-500 mr-2", children: [
            "[",
            new Date(log.timestamp).toLocaleTimeString(),
            "]"
          ] }),
          log.message
        ] }, i)),
        logs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-gray-600 italic p-2", children: "No logs yet" })
      ] })
    ] })
  ] });
};

// plugins/api-gateway/renderer/index.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var activate = (context) => {
  console.log("[API Gateway] Renderer activated");
  if (context.ui.registerStageView && context.ui.registerNavigation) {
    context.ui.registerStageView({
      id: "api-gateway-panel",
      name: "API Gateway",
      icon: import_lucide_react.Network,
      component: () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(GatewayPanel, { context })
    });
    context.ui.registerNavigation({
      id: "api-gateway-nav",
      label: "Gateway",
      icon: import_lucide_react.Network,
      view: {
        id: "api-gateway-panel",
        name: "API Gateway",
        icon: import_lucide_react.Network,
        component: () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(GatewayPanel, { context })
      },
      order: 25
    });
  } else {
    console.warn("[API Gateway] New UI API not available");
  }
};
