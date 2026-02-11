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

// plugins/theme-studio/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Theme Studio] Renderer activated");
  const ThemePanel = () => {
    const [primaryColor, setPrimaryColor] = (0, import_react.useState)("#3b82f6");
    const [secondaryColor, setSecondaryColor] = (0, import_react.useState)("#a855f7");
    const [font, setFont] = (0, import_react.useState)("Inter");
    (0, import_react.useEffect)(() => {
    }, []);
    const handleSave = () => {
      document.documentElement.style.setProperty("--primary-color", primaryColor);
      document.documentElement.style.setProperty("--secondary-color", secondaryColor);
      alert("Theme saved!");
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Theme Studio"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Primary Color"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 items-center" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "color",
        value: primaryColor,
        onChange: (e) => setPrimaryColor(e.target.value),
        className: "bg-transparent border-none w-8 h-8 cursor-pointer"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "text",
        value: primaryColor,
        onChange: (e) => setPrimaryColor(e.target.value),
        className: "flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm font-mono"
      }
    ))), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Secondary Color"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 items-center" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "color",
        value: secondaryColor,
        onChange: (e) => setSecondaryColor(e.target.value),
        className: "bg-transparent border-none w-8 h-8 cursor-pointer"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "text",
        value: secondaryColor,
        onChange: (e) => setSecondaryColor(e.target.value),
        className: "flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm font-mono"
      }
    ))), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Font Family"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: font,
        onChange: (e) => setFont(e.target.value),
        className: "w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "Inter" }, "Inter"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "Roboto" }, "Roboto"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "JetBrains Mono" }, "JetBrains Mono")
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "pt-4" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleSave,
        className: "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-2 rounded font-medium transition-colors"
      },
      "Apply Theme"
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-8 p-4 rounded-lg bg-black/20 border border-white/5" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-bold mb-2" }, "Preview"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 mb-2" }, /* @__PURE__ */ import_react.default.createElement("button", { className: "px-3 py-1 bg-[var(--primary-color)] text-white rounded text-xs", style: { backgroundColor: primaryColor } }, "Primary"), /* @__PURE__ */ import_react.default.createElement("button", { className: "px-3 py-1 bg-[var(--secondary-color)] text-white rounded text-xs", style: { backgroundColor: secondaryColor } }, "Secondary")), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-400", style: { fontFamily: font } }, "The quick brown fox jumps over the lazy dog."))));
  };
  const ThemeStudioButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "theme-studio";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("theme-studio"),
        title: "Theme Studio"
      },
      "THE"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "theme-studio-nav",
    component: ThemeStudioButton
  });
  context.registerComponent("sidebar:view:theme-studio", {
    id: "theme-studio-panel",
    component: ThemePanel
  });
};
