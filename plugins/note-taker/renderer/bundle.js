"use strict";

// plugins/note-taker/renderer/index.tsx
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
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react = require("lucide-react");
var import_jsx_runtime = require("react/jsx-runtime");
var NoteTree = ({ context, eventBus }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-lg font-bold", children: "Note Explorer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Tree view placeholder" })
  ] });
};
var import_jsx_runtime2 = require("react/jsx-runtime");
var NoteEditor = ({ context, eventBus }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "text-lg font-bold", children: "Note Editor" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "Editor placeholder" })
  ] });
};
var import_jsx_runtime3 = require("react/jsx-runtime");
function activate(context) {
  const { React, ui } = context;
  const eventBus = new EventTarget();
  const NoteTreeWrapper = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NoteTree, { context, eventBus });
  const NoteEditorWrapper = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NoteEditor, { context, eventBus });
  ui.registerNavigation({
    id: "note-taker-nav",
    label: "Notes",
    icon: import_lucide_react.Notebook,
    view: {
      id: "note-taker-view",
      name: "Notes",
      icon: import_lucide_react.FileText,
      component: NoteEditorWrapper
    },
    order: 20
  });
  ui.registerPanel({
    id: "note-taker-tree",
    name: "Note Explorer",
    icon: import_lucide_react.Notebook,
    component: NoteTreeWrapper,
    defaultLocation: "left",
    defaultWeight: 20,
    enableClose: true
  });
}
function deactivate(context) {
}
