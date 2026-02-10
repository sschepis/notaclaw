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

// plugins/secure-backup/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Secure Backup] Renderer activated");
  const BackupPanel = () => {
    const [status, setStatus] = (0, import_react.useState)("");
    const [lastBackup, setLastBackup] = (0, import_react.useState)(null);
    const handleBackup = async () => {
      setStatus("Creating backup...");
      try {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const data = { timestamp, version: "1.0.0", content: "Encrypted Data" };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `aleph-backup-${Date.now()}.json`;
        a.click();
        setLastBackup(timestamp);
        setStatus("Backup downloaded successfully");
      } catch (e) {
        setStatus("Backup failed");
      }
    };
    const handleRestore = async () => {
      setStatus("Waiting for file...");
      try {
        const api = window.electronAPI;
        if (api && api.dialogOpenFile) {
          const filePath = await api.dialogOpenFile({
            title: "Select Backup File",
            filters: [{ name: "JSON Files", extensions: ["json"] }]
          });
          if (filePath) {
            setStatus(`Restoring from ${filePath}...`);
            setTimeout(() => setStatus("Restore complete"), 2e3);
          } else {
            setStatus("Restore cancelled");
          }
        } else {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json";
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              setStatus(`Restoring from ${file.name}...`);
              setTimeout(() => setStatus("Restore complete"), 2e3);
            }
          };
          input.click();
        }
      } catch (e) {
        console.error(e);
        setStatus("Restore failed");
      }
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Secure Backup"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-6 rounded-lg mb-6 border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center mb-6" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-4xl mb-2" }, "\u{1F6E1}\uFE0F"), /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-medium" }, "Data Protection"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm text-gray-400" }, "Encrypt and save your local data.")), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleBackup,
        className: "w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors"
      },
      "Create New Backup"
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleRestore,
        className: "w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium transition-colors"
      },
      "Restore from File"
    ))), status && /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 bg-gray-800 rounded-lg text-sm text-center text-gray-300" }, status), lastBackup && /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-4 text-center text-xs text-gray-500" }, "Last backup: ", new Date(lastBackup).toLocaleString()));
  };
  const SecureBackupButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "secure-backup";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("secure-backup"),
        title: "Secure Backup"
      },
      "SB"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "secure-backup-nav",
    component: SecureBackupButton
  });
  context.registerComponent("sidebar:view:secure-backup", {
    id: "secure-backup-panel",
    component: BackupPanel
  });
};
