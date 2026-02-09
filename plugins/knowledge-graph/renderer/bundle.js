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

// plugins/knowledge-graph/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react2 = __toESM(require("react"));
var import_lucide_react = require("lucide-react");

// plugins/knowledge-graph/renderer/MemoryPanel.tsx
var import_react = __toESM(require("react"));
var Icon = ({ d, className }) => /* @__PURE__ */ import_react.default.createElement("svg", { className, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ import_react.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d }));
var Search = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" });
var Plus = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M12 4v16m8-8H4" });
var Database = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" });
var ArrowLeft = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M10 19l-7-7m0 0l7-7m-7 7h18" });
var Trash2 = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" });
var Activity = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M13 10V3L4 14h7v7l9-11h-7z" });
var Download = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" });
var Button = ({ children, onClick, className, disabled, size }) => /* @__PURE__ */ import_react.default.createElement(
  "button",
  {
    onClick,
    disabled,
    className: `inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 py-2 text-sm"} ${className}`
  },
  children
);
var MemoryPanel = ({ context }) => {
  const { useAlephStore } = context;
  const {
    memory: { activeFieldId, fields, queryResults, activeFieldEntropy },
    loadMemoryFields,
    setActiveMemoryField,
    createMemoryField,
    storeMemory,
    queryMemoryField,
    deleteMemoryField,
    queryGlobalMemory
  } = useAlephStore();
  const [tab, setTab] = (0, import_react.useState)("fields");
  const [showCreate, setShowCreate] = (0, import_react.useState)(false);
  const [newName, setNewName] = (0, import_react.useState)("");
  const [newScope, setNewScope] = (0, import_react.useState)("user");
  const [newDesc, setNewDesc] = (0, import_react.useState)("");
  const [storeContent, setStoreContent] = (0, import_react.useState)("");
  const [storeSignificance, setStoreSignificance] = (0, import_react.useState)(0.5);
  const [queryInput, setQueryInput] = (0, import_react.useState)("");
  const [queryThreshold, setQueryThreshold] = (0, import_react.useState)(0.3);
  const [globalQueryInput, setGlobalQueryInput] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    loadMemoryFields();
  }, []);
  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createMemoryField(newName, newScope, newDesc);
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
  };
  const handleStore = async (fieldId) => {
    if (!storeContent.trim()) return;
    await storeMemory(fieldId, storeContent.trim(), storeSignificance);
    setStoreContent("");
  };
  const handleQuery = async (fieldId) => {
    if (!queryInput.trim()) return;
    await queryMemoryField(fieldId, queryInput, queryThreshold);
  };
  const handleGlobalQuery = async () => {
    if (!globalQueryInput.trim()) return;
    await queryGlobalMemory(globalQueryInput);
  };
  if (activeFieldId) {
    const field = fields.find((f) => f.id === activeFieldId);
    if (!field) return /* @__PURE__ */ import_react.default.createElement("div", null, "Field not found");
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2 p-3 border-b border-white/5 bg-white/5" }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => setActiveMemoryField(null), className: "p-1 hover:bg-white/10 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement(ArrowLeft, { className: "w-3.5 h-3.5 text-gray-400" })), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm font-medium text-white" }, field.name), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-[10px] text-gray-500" }, field.scope, " \u2022 ", field.contributionCount, " fragments")), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => deleteMemoryField(activeFieldId), className: "h-6 text-[10px] bg-red-600/30 text-red-400" }, /* @__PURE__ */ import_react.default.createElement(Trash2, { className: "w-2.5 h-2.5" }))), activeFieldEntropy && /* @__PURE__ */ import_react.default.createElement("div", { className: "px-3 py-2 border-b border-white/5 bg-purple-900/5 flex items-center gap-4 text-[10px]" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ import_react.default.createElement(Activity, { className: "w-2.5 h-2.5 text-purple-400" }), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-400" }, "Entropy:"), " ", /* @__PURE__ */ import_react.default.createElement("span", { className: "text-purple-400" }, activeFieldEntropy.shannon.toFixed(3))), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-400" }, "Trend:"), " ", /* @__PURE__ */ import_react.default.createElement("span", { className: activeFieldEntropy.trend === "stable" ? "text-emerald-400" : "text-amber-400" }, activeFieldEntropy.trend)), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-400" }, "Coherence:"), " ", /* @__PURE__ */ import_react.default.createElement("span", { className: "text-blue-400" }, activeFieldEntropy.coherence.toFixed(2)))), /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 border-b border-white/5 space-y-2" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold" }, "Store Knowledge"), /* @__PURE__ */ import_react.default.createElement(
      "textarea",
      {
        value: storeContent,
        onChange: (e) => setStoreContent(e.target.value),
        placeholder: "Enter knowledge to store...",
        className: "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 h-16 resize-none focus:outline-none focus:border-blue-500/50"
      }
    ), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-[10px] text-gray-500" }, "Significance: ", storeSignificance.toFixed(1)), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "range",
        min: "0",
        max: "1",
        step: "0.1",
        value: storeSignificance,
        onChange: (e) => setStoreSignificance(parseFloat(e.target.value)),
        className: "flex-1 h-1 accent-blue-500"
      }
    ), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => handleStore(activeFieldId), disabled: !storeContent.trim(), className: "h-6 text-[10px] bg-blue-600 px-2 text-white" }, /* @__PURE__ */ import_react.default.createElement(Download, { className: "w-2.5 h-2.5 mr-1" }), " Store"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 border-b border-white/5 space-y-2" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold" }, "Query Field"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        value: queryInput,
        onChange: (e) => setQueryInput(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && handleQuery(activeFieldId),
        placeholder: "Semantic search...",
        className: "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
      }
    ), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => handleQuery(activeFieldId), className: "h-7 px-2 bg-purple-600 text-white" }, /* @__PURE__ */ import_react.default.createElement(Search, { className: "w-3 h-3" }))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2 text-[10px] text-gray-500" }, /* @__PURE__ */ import_react.default.createElement("label", null, "Threshold: ", queryThreshold.toFixed(1)), /* @__PURE__ */ import_react.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.1", value: queryThreshold, onChange: (e) => setQueryThreshold(parseFloat(e.target.value)), className: "flex-1 h-1 accent-purple-500" }))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" }, queryResults.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-6 text-gray-600 text-xs" }, "Query this field to see results.") : queryResults.map((frag, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: frag.id || i, className: "p-2.5 bg-white/5 rounded-lg border border-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] text-gray-500" }, frag.id?.substring(0, 12), "..."), frag.similarity !== void 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: `text-[10px] font-mono font-bold ${frag.similarity > 0.7 ? "text-emerald-400" : frag.similarity > 0.4 ? "text-amber-400" : "text-gray-500"}` }, (frag.similarity * 100).toFixed(0), "%")), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-200" }, frag.content), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 mt-1 text-[9px] text-gray-600" }, /* @__PURE__ */ import_react.default.createElement("span", null, "sig: ", frag.significance?.toFixed(1)), frag.sourceNode && /* @__PURE__ */ import_react.default.createElement("span", null, "src: ", frag.sourceNode.substring(0, 8)))))));
  }
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between p-3 border-b border-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-3" }, ["fields", "global"].map((t) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      key: t,
      onClick: () => setTab(t),
      className: `text-xs font-medium capitalize ${tab === t ? "text-blue-400" : "text-gray-500 hover:text-gray-300"} transition-colors`
    },
    t === "fields" ? "My Fields" : "Global Memory"
  )))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto" }, tab === "fields" ? /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-end p-3 border-b border-white/5" }, /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => setShowCreate(true), className: "h-6 text-[10px] bg-blue-600 px-2 text-white" }, /* @__PURE__ */ import_react.default.createElement(Plus, { className: "w-2.5 h-2.5 mr-1" }), " New Field")), showCreate && /* @__PURE__ */ import_react.default.createElement("div", { className: "border-b border-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 space-y-2 bg-blue-900/10" }, /* @__PURE__ */ import_react.default.createElement("input", { value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "Field name", className: "w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" }), /* @__PURE__ */ import_react.default.createElement("input", { value: newDesc, onChange: (e) => setNewDesc(e.target.value), placeholder: "Description", className: "w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement("select", { value: newScope, onChange: (e) => setNewScope(e.target.value), className: "bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" }, /* @__PURE__ */ import_react.default.createElement("option", { value: "user" }, "User"), /* @__PURE__ */ import_react.default.createElement("option", { value: "conversation" }, "Conversation"), /* @__PURE__ */ import_react.default.createElement("option", { value: "organization" }, "Organization"), /* @__PURE__ */ import_react.default.createElement("option", { value: "global" }, "Global")), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: handleCreate, className: "h-6 text-[10px] bg-blue-600 text-white" }, "Create"), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => setShowCreate(false), className: "h-6 text-[10px] bg-gray-700 text-white" }, "Cancel")))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" }, fields.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500 text-xs" }, /* @__PURE__ */ import_react.default.createElement(Database, { className: "w-6 h-6 mx-auto mb-2 opacity-40" }), /* @__PURE__ */ import_react.default.createElement("p", null, "No memory fields. Create one above.")) : fields.map((f) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: f.id,
      onClick: () => setActiveMemoryField(f.id),
      className: "p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm font-medium text-white" }, f.name), /* @__PURE__ */ import_react.default.createElement("span", { className: `text-[9px] px-1.5 py-0.5 rounded-full ${f.scope === "global" ? "bg-purple-500/10 text-purple-400" : f.scope === "user" ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"}` }, f.scope)),
    /* @__PURE__ */ import_react.default.createElement("p", { className: "text-[10px] text-gray-500" }, f.description || "No description"),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-3 mt-1.5 text-[9px] text-gray-600" }, /* @__PURE__ */ import_react.default.createElement("span", null, f.contributionCount, " fragments"), /* @__PURE__ */ import_react.default.createElement("span", null, "entropy: ", f.entropy?.toFixed(2)), /* @__PURE__ */ import_react.default.createElement("span", null, f.locked ? "\u{1F512}" : "\u{1F513}"))
  )))) : /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 border-b border-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      value: globalQueryInput,
      onChange: (e) => setGlobalQueryInput(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleGlobalQuery(),
      placeholder: "Query global network memory...",
      className: "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
    }
  ), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: handleGlobalQuery, className: "h-7 px-2 bg-purple-600 text-white" }, /* @__PURE__ */ import_react.default.createElement(Search, { className: "w-3 h-3" })))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" }, queryResults.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500 text-xs" }, "Enter a query to search global memory.") : queryResults.map((frag, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: frag.id || i, className: "p-2.5 bg-white/5 rounded-lg border border-white/5" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] text-gray-500" }, frag.sourceNode?.substring(0, 12) ?? "local", "..."), frag.similarity !== void 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: `text-[10px] font-mono font-bold ${frag.similarity > 0.7 ? "text-emerald-400" : "text-amber-400"}` }, (frag.similarity * 100).toFixed(0), "%")), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-200" }, frag.content)))))));
};

// plugins/knowledge-graph/renderer/index.tsx
var activate = (context) => {
  console.log("[Knowledge Graph Explorer] Renderer activated");
  const { ui } = context;
  const cleanupNav = ui.registerNavigation({
    id: "knowledge-graph-nav",
    label: "Knowledge Graph",
    icon: import_lucide_react.Network,
    view: {
      id: "knowledge-graph-panel",
      name: "Knowledge Graph Explorer",
      icon: import_lucide_react.Network,
      component: () => /* @__PURE__ */ import_react2.default.createElement(MemoryPanel, { context })
    },
    order: 600
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  console.log("[Knowledge Graph Explorer] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
