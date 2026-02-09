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

// plugins/network-visualizer/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var NetworkGraph = ({ context }) => {
  const [nodes, setNodes] = (0, import_react.useState)([]);
  const [links, setLinks] = (0, import_react.useState)([]);
  (0, import_react.useEffect)(() => {
    const width = 800;
    const height = 600;
    const mockNodes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      type: i === 0 ? "me" : Math.random() > 0.9 ? "archon" : "peer",
      velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 }
    }));
    const mockLinks = [];
    mockNodes.forEach((node, i) => {
      if (i > 0) {
        const numLinks = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numLinks; j++) {
          const target = Math.floor(Math.random() * mockNodes.length);
          if (target !== i) {
            mockLinks.push({ source: i, target });
          }
        }
      }
    });
    setNodes(mockNodes);
    setLinks(mockLinks);
    const interval = setInterval(() => {
      setNodes((prevNodes) => prevNodes.map((node) => {
        let newX = node.x + node.velocity.x;
        let newY = node.y + node.velocity.y;
        if (newX < 0 || newX > width) node.velocity.x *= -1;
        if (newY < 0 || newY > height) node.velocity.y *= -1;
        return { ...node, x: newX, y: newY };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full w-full bg-gray-950 relative overflow-hidden flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute top-4 left-4 z-10 bg-gray-900/80 p-4 rounded-lg backdrop-blur border border-gray-800" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-white font-bold flex items-center space-x-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "animate-pulse w-2 h-2 rounded-full bg-green-500" }), /* @__PURE__ */ import_react.default.createElement("span", null, "DSN Topology")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-2 mt-4" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "w-3 h-3 rounded-full bg-blue-500 border border-blue-400" }), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-400" }, "Local Node (You)")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-2 mt-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "w-3 h-3 rounded-full bg-purple-500 border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]" }), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-400" }, "Archon Node")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-2 mt-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "w-3 h-3 rounded-full bg-gray-600 border border-gray-500" }), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs text-gray-400" }, "Standard Peer")), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-6 pt-4 border-t border-gray-800 space-y-1" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-xs" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Latency"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-green-400 font-mono" }, "42ms")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-xs" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Peers"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-blue-400 font-mono" }, nodes.length)), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-xs" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Sync Status"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-purple-400 font-mono" }, "99.9%")))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 relative" }, /* @__PURE__ */ import_react.default.createElement("svg", { className: "w-full h-full absolute inset-0 pointer-events-none", viewBox: "0 0 800 600" }, /* @__PURE__ */ import_react.default.createElement("defs", null, /* @__PURE__ */ import_react.default.createElement("radialGradient", { id: "grad1", cx: "50%", cy: "50%", r: "50%", fx: "50%", fy: "50%" }, /* @__PURE__ */ import_react.default.createElement("stop", { offset: "0%", style: { stopColor: "rgb(59, 130, 246)", stopOpacity: 0.5 } }), /* @__PURE__ */ import_react.default.createElement("stop", { offset: "100%", style: { stopColor: "rgb(0,0,0)", stopOpacity: 0 } }))), links.map((link, i) => {
    const source = nodes[link.source];
    const target = nodes[link.target];
    if (!source || !target) return null;
    return /* @__PURE__ */ import_react.default.createElement(
      "line",
      {
        key: i,
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
        stroke: "rgba(100, 116, 139, 0.2)",
        strokeWidth: "1"
      }
    );
  }), nodes.map((node) => /* @__PURE__ */ import_react.default.createElement("g", { key: node.id }, /* @__PURE__ */ import_react.default.createElement(
    "circle",
    {
      cx: node.x,
      cy: node.y,
      r: node.type === "me" ? 8 : node.type === "archon" ? 6 : 3,
      fill: node.type === "me" ? "#3B82F6" : node.type === "archon" ? "#A855F7" : "#475569",
      className: "transition-all duration-300"
    }
  ), node.type === "me" && /* @__PURE__ */ import_react.default.createElement("circle", { cx: node.x, cy: node.y, r: "20", fill: "url(#grad1)" }))))));
};
var activate = (context) => {
  console.log("[Network Visualizer] Renderer activated");
  const { ui } = context;
  const cleanupNav = ui.registerNavigation({
    id: "network-visualizer-nav",
    label: "Network",
    icon: import_lucide_react.Share2,
    view: {
      id: "network-visualizer-view",
      name: "Network Visualizer",
      icon: import_lucide_react.Share2,
      component: () => /* @__PURE__ */ import_react.default.createElement(NetworkGraph, { context })
    },
    order: 800
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  console.log("[Network Visualizer] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
