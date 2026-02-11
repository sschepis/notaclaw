"use strict";

// plugins/auto-dash/renderer/bundle.js
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
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var MetricCard = ({ title, data, context }) => {
  const value = typeof data === "object" ? data.value || data.usage || data.temp || data.price : data;
  const unit = data.unit || (context === "weather" ? "\xB0F" : context === "cpu" ? "%" : "");
  const trend = data.trend;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-w-[150px]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-gray-400 text-sm uppercase tracking-wider mb-2", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-3xl font-bold text-white", children: [
      value,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-lg text-gray-500 ml-1", children: unit })
    ] }),
    trend && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `text-sm mt-2 ${trend === "up" ? "text-green-400" : "text-red-400"}`, children: [
      trend === "up" ? "\u25B2" : "\u25BC",
      " ",
      trend
    ] })
  ] });
};
var import_jsx_runtime2 = require("react/jsx-runtime");
var LogViewer = ({ title, data }) => {
  const logs = Array.isArray(data) ? data : [];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full max-h-[300px]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "bg-gray-800 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-700", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-2 overflow-y-auto flex-1 font-mono text-xs space-y-1", children: [
      logs.map((log, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-gray-500", children: [
          "[",
          new Date(log.timestamp || Date.now()).toLocaleTimeString(),
          "]"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-green-400", children: [
          log.source || "SYSTEM",
          ":"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-gray-300", children: typeof log.data === "object" ? JSON.stringify(log.data) : log.data })
      ] }, i)),
      logs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "text-gray-600 italic p-2", children: "No logs available" })
    ] })
  ] });
};
var import_jsx_runtime3 = require("react/jsx-runtime");
var ActionConsole = ({ actions, onAction }) => {
  if (!actions || actions.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-wrap gap-2 mt-4", children: actions.map((action, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "button",
    {
      onClick: () => onAction(action.intent, action.context),
      className: "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors",
      children: action.label
    },
    i
  )) });
};
var import_jsx_runtime4 = require("react/jsx-runtime");
var SimpleChart = ({ title, data }) => {
  const points = Array.isArray(data) ? data : data.points || [];
  const values = points.map((p) => typeof p === "number" ? p : p.value || 0);
  if (values.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "text-gray-500 text-xs p-4", children: "No chart data" });
  }
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min;
  const width = 300;
  const height = 100;
  const path = values.map((val, i) => {
    const x = i / (values.length - 1) * width;
    const y = height - (val - min) / range * height;
    return `${i === 0 ? "M" : "L"} ${x},${y}`;
  }).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "bg-gray-800 p-4 rounded-lg shadow-md min-w-[300px]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "text-gray-400 text-sm uppercase tracking-wider mb-2", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("svg", { width: "100%", height, viewBox: `0 0 ${width} ${height}`, className: "overflow-visible", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: path, fill: "none", stroke: "#60a5fa", strokeWidth: "2" }),
      values.map((val, i) => {
        const x = i / (values.length - 1) * width;
        const y = height - (val - min) / range * height;
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: x, cy: y, r: "3", fill: "#3b82f6" }, i);
      })
    ] })
  ] });
};
var import_jsx_runtime5 = require("react/jsx-runtime");
var WidgetRenderer = ({ widget, onAction }) => {
  const renderContent = () => {
    switch (widget.type) {
      case "metric":
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(MetricCard, { title: widget.title || "Metric", data: widget.data, context: widget.context });
      case "log":
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LogViewer, { title: widget.title || "Logs", data: widget.data });
      case "chat":
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "text-gray-400", children: "Chat widget placeholder" });
      case "list":
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "text-gray-400", children: "List widget placeholder" });
      case "chart":
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SimpleChart, { title: widget.title || "Chart", data: widget.data });
      default:
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "text-red-400", children: [
          "Unknown widget type: ",
          widget.type
        ] });
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex flex-col gap-2 p-2 border border-gray-800 rounded bg-gray-900/50", children: [
    renderContent(),
    widget.actions && widget.actions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ActionConsole, { actions: widget.actions, onAction })
  ] });
};
var import_jsx_runtime6 = require("react/jsx-runtime");
var AutoDashView = ({ context }) => {
  const [schema, setSchema] = (0, import_react.useState)(null);
  const [lastUpdate, setLastUpdate] = (0, import_react.useState)(Date.now());
  const [generating, setGenerating] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    const handleUpdate = (newSchema) => {
      console.log("[AutoDashView] Received schema update:", newSchema);
      setSchema(newSchema);
      setLastUpdate(Date.now());
      setGenerating(false);
    };
    context.ipc.on("autodash:update", handleUpdate);
    return () => {
    };
  }, [context]);
  const handleAction = async (intent, actionContext) => {
    console.log("[AutoDashView] Triggering action:", intent);
    const result = await context.ipc.invoke("autodash:action", { intent, context: actionContext });
    console.log("[AutoDashView] Action result:", result);
  };
  const requestAIGeneration = async () => {
    setGenerating(true);
    try {
      await context.ipc.invoke("autodash:generate", {});
    } catch (e) {
      console.error("[AutoDashView] AI generation failed:", e);
      setGenerating(false);
    }
  };
  if (!schema) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex items-center justify-center h-full text-gray-500", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "mb-2", children: "Waiting for system data..." }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "text-xs text-gray-600", children: "Dashboard updates every 5 seconds" })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "h-full w-full bg-gray-950 p-6 overflow-y-auto", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "mb-6 flex justify-between items-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h1", { className: "text-2xl font-bold text-white", children: "AutoDash" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "button",
          {
            onClick: requestAIGeneration,
            disabled: generating,
            className: `px-3 py-1.5 text-xs rounded-md transition-colors ${generating ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"}`,
            children: generating ? "Generating..." : "\u2728 AI Enhance"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "text-xs text-gray-500", children: new Date(lastUpdate).toLocaleTimeString() })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: `grid gap-4 ${schema.layout === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : schema.layout === "focus" ? "grid-cols-1" : "grid-cols-1"}`, children: schema.widgets?.map((widget) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      WidgetRenderer,
      {
        widget,
        onAction: handleAction
      },
      widget.id
    )) })
  ] });
};
var import_jsx_runtime7 = require("react/jsx-runtime");
var activate = (context) => {
  console.log("[AutoDash] Renderer activated");
  const { React: React2, useAppStore } = context;
  const AutoDashButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "autodash";
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("autodash"),
        title: "AutoDash",
        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("line", { x1: "3", y1: "9", x2: "21", y2: "9" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("line", { x1: "9", y1: "21", x2: "9", y2: "9" })
        ] })
      }
    );
  };
  context.ui.registerNavigation({
    id: "autodash-nav",
    label: "AutoDash",
    icon: "dashboard",
    // Fallback if component not used in some contexts
    view: {
      id: "autodash-view",
      name: "AutoDash",
      icon: "dashboard",
      component: () => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(AutoDashView, { context })
    },
    order: 50
  });
  if (context.registerComponent) {
    context.registerComponent("sidebar:nav-item", {
      id: "autodash-nav-btn",
      component: AutoDashButton
    });
    context.registerComponent("sidebar:view:autodash", {
      id: "autodash-panel",
      component: () => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(AutoDashView, { context })
    });
  }
};
