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

// plugins/document-reader/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var activate = (context) => {
  console.log("[Document Reader] Renderer activated");
  const DocumentPanel = () => {
    const [files, setFiles] = (0, import_react.useState)([]);
    const [dragging, setDragging] = (0, import_react.useState)(false);
    const handleDrop = (0, import_react.useCallback)(async (e) => {
      e.preventDefault();
      setDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      for (const file of droppedFiles) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const content = ev.target?.result;
          setFiles((prev) => [...prev, {
            name: file.name,
            size: file.size,
            type: file.type,
            content: content.substring(0, 200) + "...",
            // Preview
            summary: "Summary generation requires server connection"
          }]);
        };
        reader.readAsText(file);
      }
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "h-full flex flex-col p-4 text-white", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-xl font-bold mb-4", children: "Document Reader" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          className: `border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${dragging ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"}`,
          onDragOver: (e) => {
            e.preventDefault();
            setDragging(true);
          },
          onDragLeave: () => setDragging(false),
          onDrop: handleDrop,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-4xl mb-2", children: "\u{1F4C4}" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-sm text-gray-400", children: "Drag and drop text files here" })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 overflow-y-auto space-y-2", children: [
        files.map((file, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-white/5 p-3 rounded-lg", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between items-start mb-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-semibold text-sm truncate", children: file.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-xs text-gray-500", children: [
              (file.size / 1024).toFixed(1),
              " KB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-400 font-mono bg-black/20 p-2 rounded mb-2", children: file.content }),
          file.summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-blue-300 italic", children: file.summary })
        ] }, i)),
        files.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-center text-gray-600 text-sm mt-8", children: "No documents loaded" })
      ] })
    ] });
  };
  const DocumentReaderButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "document-reader";
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("document-reader"),
        title: "Document Reader",
        children: "DR"
      }
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "document-reader-nav",
    component: DocumentReaderButton
  });
  context.registerComponent("sidebar:view:document-reader", {
    id: "document-reader-panel",
    component: DocumentPanel
  });
  if (context.dsn && context.dsn.registerTool) {
    context.dsn.registerTool({
      name: "read_document",
      description: "Request user to upload a document for reading",
      executionLocation: "CLIENT",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Message to show to user" }
        },
        required: ["prompt"]
      },
      semanticDomain: "perceptual",
      primeDomain: [13],
      smfAxes: [0.6, 0.4],
      requiredTier: "Neophyte",
      version: "1.0.0"
    }, async ({ prompt }) => {
      const { setActiveSidebarView } = context.useAppStore.getState();
      setActiveSidebarView("document-reader");
      return { message: `Switched to Document Reader. Prompt: ${prompt}` };
    });
  }
};
