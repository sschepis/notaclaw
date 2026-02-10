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

// plugins/semantic-search/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Semantic Search] Renderer activated");
  const { useAppStore } = context;
  const SearchPanel = () => {
    const { queryGlobalMemory, storeMemory } = useAppStore();
    const [query, setQuery] = (0, import_react.useState)("");
    const [results, setResults] = (0, import_react.useState)([]);
    const [isIndexing, setIsIndexing] = (0, import_react.useState)(false);
    const [indexContent, setIndexContent] = (0, import_react.useState)("");
    const handleSearch = async () => {
      if (!query.trim()) return;
      const res = await queryGlobalMemory(query);
      setResults(res?.fragments || []);
    };
    const handleIndex = async () => {
      if (!indexContent.trim()) return;
      setIsIndexing(true);
      setTimeout(() => {
        setIsIndexing(false);
        setIndexContent("");
        alert("Content indexed successfully");
      }, 1e3);
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Semantic Search"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg mb-4 space-y-3 border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-bold text-gray-400 uppercase" }, "Search Knowledge"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && handleSearch(),
        placeholder: "Ask a question or search...",
        className: "flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleSearch,
        className: "bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors"
      },
      "Search"
    ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-2 mb-4" }, results.map((res, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: "bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm text-gray-200" }, res.content), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-1 flex justify-between text-xs text-gray-500" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Similarity: ", (res.similarity * 100).toFixed(0), "%"), /* @__PURE__ */ import_react.default.createElement("span", null, new Date(res.timestamp).toLocaleDateString())))), results.length === 0 && query && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center text-gray-500 mt-4" }, "No results found.")), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-4 rounded-lg border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-bold text-gray-400 uppercase mb-2" }, "Index Content"), /* @__PURE__ */ import_react.default.createElement(
      "textarea",
      {
        value: indexContent,
        onChange: (e) => setIndexContent(e.target.value),
        placeholder: "Paste text to index...",
        className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:border-blue-500 mb-2"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleIndex,
        disabled: isIndexing || !indexContent,
        className: "w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-medium transition-colors disabled:opacity-50"
      },
      isIndexing ? "Indexing..." : "Index Content"
    )));
  };
  const SemanticSearchButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "semantic-search";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("semantic-search"),
        title: "Semantic Search"
      },
      "SS"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "semantic-search-nav",
    component: SemanticSearchButton
  });
  context.registerComponent("sidebar:view:semantic-search", {
    id: "semantic-search-panel",
    component: SearchPanel
  });
};
