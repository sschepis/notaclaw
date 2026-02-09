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

// plugins/html-artifacts/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var ArtifactStudio = ({ context }) => {
  const [artifacts, setArtifacts] = (0, import_react.useState)([]);
  const [selectedArtifact, setSelectedArtifact] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (context.ipc && context.ipc.on) {
      context.ipc.on("artifact-generated", (artifact) => {
        const newArtifact = { ...artifact, id: Date.now() };
        setArtifacts((prev) => [...prev, newArtifact]);
        setSelectedArtifact(newArtifact);
      });
    }
    setArtifacts([
      { id: 1, title: "Welcome Page", type: "html", content: '<div style="padding: 20px; background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 8px;"><h1>Welcome to AlephNet</h1><p>This is a generated HTML artifact.</p></div>' },
      { id: 2, title: "Status Card", type: "html", content: '<div style="background: #1f2937; color: white; padding: 16px; border-radius: 8px; border: 1px solid #374151;"><h3>System Status</h3><div style="margin-top: 8px; display: flex; align-items: center;"><span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px;"></span><span>Operational</span></div></div>' }
    ]);
  }, [context]);
  const renderPreview = (artifact) => {
    if (!artifact) return /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-400 flex items-center justify-center h-full" }, "Select an artifact to preview");
    if (artifact.type === "html") {
      return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full w-full bg-white rounded-lg shadow-inner overflow-hidden relative" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute top-0 left-0 right-0 bg-gray-100 border-b px-2 py-1 text-xs text-gray-500 flex items-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex space-x-1 mr-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-2 h-2 rounded-full bg-red-400" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-2 h-2 rounded-full bg-yellow-400" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-2 h-2 rounded-full bg-green-400" })), "Preview"), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-6 p-4 h-[calc(100%-24px)] overflow-auto" }, /* @__PURE__ */ import_react.default.createElement("div", { dangerouslySetInnerHTML: { __html: artifact.content } })));
    } else {
      return /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-500 p-4" }, "React preview not yet implemented");
    }
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex h-full text-white bg-gray-950" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-64 bg-gray-900 border-r border-gray-800 flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-b border-gray-800" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-lg font-bold flex items-center space-x-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-blue-400" }, "\u26A1"), /* @__PURE__ */ import_react.default.createElement("span", null, "Artifacts"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-2 space-y-1" }, artifacts.map((a) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: a.id,
      onClick: () => setSelectedArtifact(a),
      className: `p-3 rounded-lg cursor-pointer transition-colors ${selectedArtifact?.id === a.id ? "bg-blue-600/20 border border-blue-500/50 text-blue-100" : "hover:bg-gray-800 border border-transparent"}`
    },
    /* @__PURE__ */ import_react.default.createElement("p", { className: "font-medium text-sm truncate" }, a.title),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center mt-1 space-x-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400" }, a.type))
  )))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex flex-col min-w-0" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-4" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "font-medium text-gray-200" }, selectedArtifact?.title || "No Selection")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex space-x-2" }, /* @__PURE__ */ import_react.default.createElement("button", { className: "px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded transition-colors text-gray-300" }, "Copy Code"), /* @__PURE__ */ import_react.default.createElement("button", { className: "px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white" }, "Download"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 flex overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-1/2 bg-[#0d1117] border-r border-gray-800 flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-[#161b22] px-4 py-2 text-xs text-gray-400 border-b border-gray-800 font-mono" }, "source.html"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-auto p-4 font-mono text-sm text-gray-300" }, /* @__PURE__ */ import_react.default.createElement("pre", { className: "whitespace-pre-wrap break-all" }, selectedArtifact?.content || "// Select an artifact to view source"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-1/2 bg-gray-100/5 p-8 flex flex-col items-center justify-center" }, renderPreview(selectedArtifact)))));
};
var activate = (context) => {
  console.log("[HTML Artifacts] Renderer activated");
  const { useAppStore } = context;
  context.registerComponent("sidebar:view:artifacts", {
    id: "artifact-studio",
    component: () => /* @__PURE__ */ import_react.default.createElement(ArtifactStudio, { context })
  });
  const ArtifactButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "artifacts";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("artifacts"),
        title: "Artifacts"
      },
      "ART"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "artifact-nav",
    component: ArtifactButton
  });
};
