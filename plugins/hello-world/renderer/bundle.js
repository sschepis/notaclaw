"use strict";

// plugins/hello-world/renderer/bundle.js
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
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  console.log("[Hello World] Renderer activated");
  const { ui } = context;
  const HelloPanel = () => {
    const [name, setName] = (0, import_react.useState)("");
    const [message, setMessage] = (0, import_react.useState)("");
    const sayHello = () => {
      setMessage(`Hello, ${name || "World"}!`);
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-8 items-center justify-center text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-8 rounded-2xl border border-white/10 w-full max-w-sm text-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-4xl mb-4" }, "\u{1F44B}"), /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-2xl font-bold mb-2" }, "Hello World"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-gray-400 mb-6 text-sm" }, "Welcome to your first AlephNet plugin."), /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: "Enter your name...",
        className: "w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 mb-4 text-center focus:outline-none focus:border-blue-500/50"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: sayHello,
        className: "w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors mb-6"
      },
      "Say Hello"
    ), message && /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 bg-green-500/20 text-green-400 rounded-lg font-medium animate-in fade-in slide-in-from-bottom-2" }, message)));
  };
  const cleanupNav = ui.registerNavigation({
    id: "hello-world-nav",
    label: "Hello World",
    icon: import_lucide_react.Hand,
    view: {
      id: "hello-world-panel",
      name: "Hello World",
      icon: import_lucide_react.Hand,
      component: HelloPanel
    },
    order: 500
  });
  context._cleanups = [cleanupNav];
  if (context.dsn && context.dsn.registerTool) {
    context.dsn.registerTool({
      name: "say_hello",
      description: "Says hello to the user",
      executionLocation: "CLIENT",
      parameters: { type: "object", properties: { name: { type: "string" } } }
    }, async ({ name }) => {
      const { setActiveSidebarView } = context.useAppStore.getState();
      setActiveSidebarView("hello-world");
      return `Hello, ${name}! (Check the panel)`;
    });
  }
};
var deactivate = (context) => {
  console.log("[Hello World] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
