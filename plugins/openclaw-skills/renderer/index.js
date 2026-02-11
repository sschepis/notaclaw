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

// plugins/openclaw-skills/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  console.log("[OpenClaw Skills] Renderer activated");
  const { ui, useAppStore } = context;
  const SkillsPanel = () => {
    const [skills, setSkills] = (0, import_react.useState)([]);
    (0, import_react.useEffect)(() => {
      const fetchSkills = async () => {
        if (context.ipc && context.ipc.invoke) {
          const list = await context.ipc.invoke("skills:list");
          setSkills(list);
        }
      };
      fetchSkills();
    }, []);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "OpenClaw Skills"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-3" }, skills.map((skill) => /* @__PURE__ */ import_react.default.createElement("div", { key: skill.name, className: "bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-bold text-sm text-blue-400" }, skill.name), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300" }, "Legacy")), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm text-gray-300" }, skill.description), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-2 text-xs text-gray-500 font-mono truncate" }, skill.path))), skills.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center text-gray-500 mt-8" }, "No legacy skills found")));
  };
  const SkillsButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "openclaw-skills";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("openclaw-skills"),
        title: "OpenClaw Skills"
      },
      "SKL"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "openclaw-skills-nav",
    component: SkillsButton
  });
  context.registerComponent("sidebar:view:openclaw-skills", {
    id: "openclaw-skills-panel",
    component: SkillsPanel
  });
  const cleanups = [];
  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:open",
      label: "Open OpenClaw Skills",
      icon: import_lucide_react.Zap,
      category: "OpenClaw Skills",
      action: () => {
        const store = useAppStore?.getState?.();
        store?.setActiveSidebarView?.("openclaw-skills");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:list",
      label: "List All Skills",
      icon: import_lucide_react.List,
      category: "OpenClaw Skills",
      action: () => {
        const store = useAppStore?.getState?.();
        store?.setActiveSidebarView?.("openclaw-skills");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:create",
      label: "Create New Skill",
      icon: import_lucide_react.Plus,
      category: "OpenClaw Skills",
      action: () => {
        context.ipc?.invoke?.("skills:create");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:refresh",
      label: "Refresh Skills List",
      icon: import_lucide_react.RefreshCw,
      category: "OpenClaw Skills",
      action: () => {
        context.ipc?.invoke?.("skills:refresh");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:import",
      label: "Import Skill",
      icon: import_lucide_react.Download,
      category: "OpenClaw Skills",
      action: () => {
        context.ipc?.invoke?.("skills:import");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:export",
      label: "Export Skill",
      icon: import_lucide_react.Upload,
      category: "OpenClaw Skills",
      action: () => {
        context.ipc?.invoke?.("skills:export");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "openclaw-skills:settings",
      label: "Skill Settings",
      icon: import_lucide_react.Settings,
      category: "OpenClaw Skills",
      action: () => {
        context.ipc?.invoke?.("skills:openSettings");
      }
    }));
  }
  context._cleanups = cleanups;
};
var deactivate = (context) => {
  console.log("[OpenClaw Skills] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
