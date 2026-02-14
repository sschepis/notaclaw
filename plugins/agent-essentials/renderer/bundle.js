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

// plugins/agent-essentials/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react2 = require("lucide-react");

// plugins/agent-essentials/renderer/components/SystemMonitor.tsx
var import_react = require("react");
var import_lucide_react = require("lucide-react");

// plugins/agent-essentials/renderer/ipc.ts
var ipc = null;
var setIpc = (i) => {
  ipc = i;
};
var getIpc = () => {
  if (!ipc) {
    console.warn("IPC not initialized");
  }
  return ipc;
};

// plugins/agent-essentials/renderer/components/SystemMonitor.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var SystemMonitor = () => {
  const [stats, setStats] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const ipc2 = getIpc();
  const fetchStats = async () => {
    if (!ipc2) return;
    try {
      const data = await ipc2.invoke("sys:info", {});
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };
  (0, import_react.useEffect)(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5e3);
    return () => clearInterval(interval);
  }, []);
  if (!stats) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-4 text-gray-500", children: "Loading system stats..." });
  }
  const { cpu, memory, os, network } = stats;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col h-full bg-gray-900 text-white p-4 space-y-4 overflow-y-auto", children: [
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "bg-red-500/20 text-red-400 p-2 rounded text-sm", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center mb-2 text-blue-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Cpu, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: "CPU" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Model:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-right", children: [
              cpu.manufacturer,
              " ",
              cpu.brand
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Cores:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              cpu.physicalCores,
              " Physical / ",
              cpu.cores,
              " Logical"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Speed:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              cpu.speed,
              " GHz"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mt-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-400 mb-1", children: "Load" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full bg-gray-700 h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "bg-blue-500 h-full transition-all duration-500",
                style: { width: `${cpu.load}%` }
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-right text-xs mt-1", children: [
              cpu.load.toFixed(1),
              "%"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center mb-2 text-purple-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Activity, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: "Memory" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Total:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              (memory.total / 1024 / 1024 / 1024).toFixed(1),
              " GB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Used:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              (memory.used / 1024 / 1024 / 1024).toFixed(1),
              " GB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Free:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              (memory.free / 1024 / 1024 / 1024).toFixed(1),
              " GB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mt-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-400 mb-1", children: "Usage" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full bg-gray-700 h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "bg-purple-500 h-full transition-all duration-500",
                style: { width: `${memory.used / memory.total * 100}%` }
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-right text-xs mt-1", children: [
              (memory.used / memory.total * 100).toFixed(1),
              "%"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center mb-2 text-green-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.HardDrive, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: "System" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Platform:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "capitalize", children: os.platform })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Distro:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: os.distro })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Release:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: os.release })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400", children: "Hostname:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: os.hostname })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center mb-2 text-yellow-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Wifi, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "font-semibold", children: "Network" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-y-2 text-sm max-h-40 overflow-y-auto", children: network.map((iface, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border-b border-white/5 pb-2 last:border-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-medium text-gray-300", children: iface.iface }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-500", children: "IPv4:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: iface.ip4 })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-500", children: "MAC:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: iface.mac })
          ] })
        ] }, idx)) })
      ] })
    ] })
  ] });
};

// plugins/agent-essentials/renderer/AgentsPanel.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var AgentsPanel = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "h-full flex flex-col", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "flex-1 overflow-y-auto p-3 space-y-2", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SystemMonitor, {}) }) });
};

// plugins/agent-essentials/renderer/index.tsx
var activate = (context) => {
  console.log("[Agent Essentials] Renderer activated");
  const { React: React2, useAppStore, ui } = context;
  setIpc(context.ipc);
  const cleanups = [];
  if (context.ui.registerStageView) {
    cleanups.push(context.ui.registerStageView({
      id: "agent-essentials-panel",
      name: "System",
      icon: import_lucide_react2.HardDrive,
      component: AgentsPanel
    }));
    cleanups.push(context.ui.registerNavigation({
      id: "agent-essentials-nav",
      label: "System",
      icon: import_lucide_react2.HardDrive,
      view: {
        id: "agent-essentials-panel",
        name: "System",
        icon: import_lucide_react2.HardDrive,
        component: AgentsPanel
      },
      order: 20
    }));
  } else {
    console.warn("[Agent Essentials] New UI API not available");
  }
  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: "agent-essentials:open-system",
      label: "Open System Monitor",
      icon: import_lucide_react2.HardDrive,
      category: "System",
      action: () => {
        const store = useAppStore.getState();
        store.setActiveSidebarView("agents");
      }
    }));
  }
  context._cleanups = cleanups;
};
var deactivate = (context) => {
  console.log("[Agent Essentials] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
