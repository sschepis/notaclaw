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

// plugins/logger/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
var LoggerComponent = () => {
  const [logs, setLogs] = import_react.default.useState([]);
  const logsEndRef = import_react.default.useRef(null);
  import_react.default.useEffect(() => {
    setLogs((prev) => [...prev, `[${(/* @__PURE__ */ new Date()).toISOString()}] Logger initialized`]);
    const interval = setInterval(() => {
      const messages = [
        "System check... OK",
        "Network connected",
        "Data sync complete",
        "User activity detected",
        "Memory usage stable"
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setLogs((prev) => [...prev, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${randomMsg}`]);
    }, 3e3);
    return () => clearInterval(interval);
  }, []);
  import_react.default.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    fontFamily: "monospace",
    fontSize: "12px",
    overflow: "hidden"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
      padding: "8px",
      borderBottom: "1px solid #333",
      fontWeight: "bold",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "System Logs" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => setLogs([]),
          style: {
            background: "transparent",
            border: "1px solid #444",
            color: "#aaa",
            padding: "2px 8px",
            borderRadius: "4px",
            cursor: "pointer"
          },
          children: "Clear"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, overflow: "auto", padding: "10px" }, children: [
      logs.map((log, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: "4px", whiteSpace: "pre-wrap" }, children: log }, i)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: logsEndRef })
    ] })
  ] });
};
var index_default = (context) => {
  context.ui.registerBottomPanelTab({
    id: "logger-tab",
    name: "Logger",
    icon: import_lucide_react.Activity,
    component: LoggerComponent,
    priority: 10,
    enableClose: true
  });
};
