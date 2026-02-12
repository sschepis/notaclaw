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
    const [documents, setDocuments] = (0, import_react.useState)([]);
    const [selectedDocId, setSelectedDocId] = (0, import_react.useState)(null);
    const [selectedDocContent, setSelectedDocContent] = (0, import_react.useState)(null);
    const [dragging, setDragging] = (0, import_react.useState)(false);
    const [loading, setLoading] = (0, import_react.useState)(false);
    const [error, setError] = (0, import_react.useState)(null);
    (0, import_react.useEffect)(() => {
      fetchDocuments();
    }, []);
    (0, import_react.useEffect)(() => {
      if (selectedDocId) {
        fetchDocumentContent(selectedDocId);
      } else {
        setSelectedDocContent(null);
      }
    }, [selectedDocId]);
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const docs = await context.dsn.request("document-reader", "list_documents", {});
        setDocuments(docs || []);
      } catch (err) {
        console.error("Failed to list documents:", err);
        setError("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };
    const fetchDocumentContent = async (id) => {
      try {
        setLoading(true);
        const doc = await context.dsn.request("document-reader", "get_document_content", { id });
        setSelectedDocContent(doc);
      } catch (err) {
        console.error("Failed to get document content:", err);
        setError("Failed to load document content");
      } finally {
        setLoading(false);
      }
    };
    const handleDrop = (0, import_react.useCallback)(async (e) => {
      e.preventDefault();
      setDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;
      setLoading(true);
      setError(null);
      for (const file of droppedFiles) {
        try {
          const filePath = file.path;
          if (!filePath) {
            setError("Cannot determine file path. Please use the desktop app.");
            continue;
          }
          await context.dsn.request("document-reader", "ingest_document", { filePath });
        } catch (err) {
          console.error("Ingestion failed:", err);
          setError(`Failed to ingest ${file.name}: ${err.message}`);
        }
      }
      await fetchDocuments();
      setLoading(false);
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "h-full flex flex-col text-white bg-gray-900", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 border-b border-gray-800 flex justify-between items-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-xl font-bold", children: "Document Reader" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            onClick: fetchDocuments,
            className: "text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded",
            children: "Refresh"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 flex overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-1/3 border-r border-gray-800 flex flex-col", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: `p-4 border-b border-gray-800 text-center transition-colors cursor-pointer ${dragging ? "bg-blue-900/50 border-blue-500" : "hover:bg-gray-800"}`,
              onDragOver: (e) => {
                e.preventDefault();
                setDragging(true);
              },
              onDragLeave: () => setDragging(false),
              onDrop: handleDrop,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-2xl mb-1", children: "\u{1F4E5}" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-400", children: "Drag & Drop files to ingest" })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 overflow-y-auto", children: [
            documents.map((doc) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                onClick: () => setSelectedDocId(doc.id),
                className: `p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 ${selectedDocId === doc.id ? "bg-blue-900/30 border-l-4 border-l-blue-500" : ""}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "font-semibold text-sm truncate", children: doc.title || "Untitled" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-500 mt-1", children: new Date(doc.type || "").toLocaleDateString() }),
                  doc.summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs text-gray-400 mt-1 line-clamp-2 italic", children: doc.summary })
                ]
              },
              doc.id
            )),
            documents.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-4 text-center text-gray-500 text-sm", children: "No documents found" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 flex flex-col overflow-hidden bg-gray-950", children: selectedDocContent ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 overflow-y-auto p-8", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "max-w-3xl mx-auto", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "text-2xl font-bold mb-2", children: selectedDocContent.metadata.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-4 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-800", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: selectedDocContent.metadata.author || "Unknown Author" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2022" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: new Date(selectedDocContent.metadata.createdAt).toLocaleString() }),
            selectedDocContent.metadata.pageCount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2022" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                selectedDocContent.metadata.pageCount,
                " pages"
              ] })
            ] })
          ] }),
          selectedDocContent.metadata.summary && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-blue-900/20 border border-blue-900/50 p-4 rounded-lg mb-8", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "text-blue-300 font-semibold mb-2 text-sm uppercase tracking-wider", children: "Summary" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-gray-300 leading-relaxed", children: selectedDocContent.metadata.summary })
          ] }),
          selectedDocContent.metadata.entities && selectedDocContent.metadata.entities.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mb-8 flex flex-wrap gap-2", children: selectedDocContent.metadata.entities.map((entity, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-1 bg-gray-800 rounded text-xs text-gray-300", children: entity }, i)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "prose prose-invert max-w-none", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "whitespace-pre-wrap font-sans text-gray-300 leading-relaxed", children: selectedDocContent.content }) })
        ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 flex items-center justify-center text-gray-600", children: loading ? "Loading..." : "Select a document to view" }) })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "absolute bottom-4 right-4 bg-red-900/90 text-white px-4 py-2 rounded shadow-lg max-w-md", children: [
        error,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setError(null), className: "ml-2 text-red-300 hover:text-white", children: "\u2715" })
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
