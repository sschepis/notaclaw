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
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var DEFAULT_SETTINGS = {
  autoBackup: { enabled: false, intervalMinutes: 60 },
  retention: { maxBackups: 20, maxAgeDays: 90 },
  maxSizeMB: 50,
  defaultScope: "full",
  defaultCategories: ["conversations", "settings", "personality", "memory", "plugins", "identity"],
  shutdownBackup: false
};
var CATEGORIES = [
  { id: "conversations", label: "Conversations", icon: "\u{1F4AC}" },
  { id: "settings", label: "Settings", icon: "\u2699\uFE0F" },
  { id: "personality", label: "Personality", icon: "\u{1F3AD}" },
  { id: "memory", label: "Memory", icon: "\u{1F9E0}" },
  { id: "plugins", label: "Plugins", icon: "\u{1F50C}" },
  { id: "identity", label: "Identity", icon: "\u{1F194}" }
];
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
var activate = (context) => {
  console.log("[Secure Backup] Renderer activated");
  const { useAppStore } = context;
  const ProgressBar = ({ progress }) => {
    if (!progress) return null;
    const phaseColors = {
      collecting: "bg-blue-500",
      encrypting: "bg-yellow-500",
      writing: "bg-green-500",
      verifying: "bg-purple-500",
      restoring: "bg-orange-500",
      complete: "bg-green-600",
      error: "bg-red-500"
    };
    const color = phaseColors[progress.phase] || "bg-blue-500";
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "mx-4 mb-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between text-xs text-gray-400 mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "capitalize" }, progress.phase), /* @__PURE__ */ import_react.default.createElement("span", null, progress.percent, "%")), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-full h-2 bg-gray-700 rounded-full overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        className: `h-full ${color} rounded-full transition-all duration-300`,
        style: { width: `${progress.percent}%` }
      }
    )), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-[10px] text-gray-500 mt-1 truncate" }, progress.message));
  };
  const RestoreConfirmDialog = ({
    backup,
    onConfirm,
    onCancel
  }) => {
    const [passphrase, setPassphrase] = (0, import_react.useState)("");
    const [showPass, setShowPass] = (0, import_react.useState)(false);
    const [merge, setMerge] = (0, import_react.useState)(false);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-800 border border-gray-600 rounded-xl p-6 w-96 shadow-2xl" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2 mb-4" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertTriangle, { size: 20, className: "text-yellow-400" }), /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-semibold text-white" }, "Confirm Restore")), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm text-gray-300 mb-2" }, "Restoring from backup ", /* @__PURE__ */ import_react.default.createElement("span", { className: "text-white font-mono text-xs" }, backup.id.slice(0, 8))), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-400 mb-4" }, "Created ", new Date(backup.timestamp).toLocaleString(), " \xB7 ", formatBytes(backup.sizeBytes)), backup.encrypted && /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-4" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-xs text-gray-400 mb-1" }, "Passphrase"), /* @__PURE__ */ import_react.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: showPass ? "text" : "password",
        value: passphrase,
        onChange: (e) => setPassphrase(e.target.value),
        placeholder: "Enter backup passphrase",
        className: "w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white pr-10"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowPass(!showPass),
        className: "absolute right-2 top-2 text-gray-400 hover:text-white"
      },
      showPass ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.EyeOff, { size: 16 }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Eye, { size: 16 })
    ))), /* @__PURE__ */ import_react.default.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-300 mb-4 cursor-pointer" }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "checkbox",
        checked: merge,
        onChange: (e) => setMerge(e.target.checked),
        className: "rounded border-gray-600 bg-gray-700"
      }
    ), "Merge with existing data (instead of overwrite)"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: onCancel,
        className: "px-4 py-2 text-sm text-gray-400 hover:text-white rounded hover:bg-gray-700"
      },
      "Cancel"
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => onConfirm(passphrase, merge),
        disabled: backup.encrypted && !passphrase,
        className: "px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RotateCcw, { size: 14 }),
      "Restore"
    ))));
  };
  const SettingsPanel = ({
    settings,
    onUpdate,
    onClose
  }) => {
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 bg-gray-800 border-b border-gray-700 space-y-3 text-sm" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "font-medium text-white" }, "Backup Settings"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-white" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.X, { size: 14 }))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "Auto-backup"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => onUpdate({ autoBackup: { ...settings.autoBackup, enabled: !settings.autoBackup.enabled } }),
        className: `w-10 h-5 rounded-full relative transition-colors ${settings.autoBackup.enabled ? "bg-blue-600" : "bg-gray-600"}`
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: `absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.autoBackup.enabled ? "translate-x-5" : ""}` })
    )), settings.autoBackup.enabled && /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "Interval"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: settings.autoBackup.intervalMinutes,
        onChange: (e) => onUpdate({ autoBackup: { ...settings.autoBackup, intervalMinutes: parseInt(e.target.value) } }),
        className: "bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "15" }, "15 min"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "30" }, "30 min"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "60" }, "1 hour"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "360" }, "6 hours"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "1440" }, "24 hours")
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "Backup on shutdown"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => onUpdate({ shutdownBackup: !settings.shutdownBackup }),
        className: `w-10 h-5 rounded-full relative transition-colors ${settings.shutdownBackup ? "bg-blue-600" : "bg-gray-600"}`
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: `absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.shutdownBackup ? "translate-x-5" : ""}` })
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "Max backups"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: settings.retention.maxBackups,
        onChange: (e) => onUpdate({ retention: { ...settings.retention, maxBackups: parseInt(e.target.value) } }),
        className: "bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "5" }, "5"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "10" }, "10"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "20" }, "20"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "50" }, "50")
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "Max age"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: settings.retention.maxAgeDays,
        onChange: (e) => onUpdate({ retention: { ...settings.retention, maxAgeDays: parseInt(e.target.value) } }),
        className: "bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "30" }, "30 days"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "60" }, "60 days"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "90" }, "90 days"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "180" }, "180 days"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "365" }, "1 year")
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "Max backup size"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: settings.maxSizeMB,
        onChange: (e) => onUpdate({ maxSizeMB: parseInt(e.target.value) }),
        className: "bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "10" }, "10 MB"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "25" }, "25 MB"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "50" }, "50 MB"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "100" }, "100 MB")
    )));
  };
  const BackupItem = ({
    backup,
    onRestore,
    onVerify,
    onDelete,
    verifyResult
  }) => {
    const [expanded, setExpanded] = (0, import_react.useState)(false);
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "group border border-gray-700 rounded-lg hover:border-gray-600 transition-all" }, /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        className: "flex items-center gap-3 p-3 cursor-pointer",
        onClick: () => setExpanded(!expanded)
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-shrink-0" }, backup.encrypted ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.ShieldCheck, { size: 18, className: "text-green-400" }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.ShieldAlert, { size: 18, className: "text-yellow-400" })),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm font-medium text-white truncate" }, backup.label || `Backup ${backup.id.slice(0, 8)}`), backup.incremental && /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded" }, "incremental")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-2 text-[11px] text-gray-500" }, /* @__PURE__ */ import_react.default.createElement("span", null, timeAgo(backup.timestamp)), /* @__PURE__ */ import_react.default.createElement("span", null, "\xB7"), /* @__PURE__ */ import_react.default.createElement("span", null, formatBytes(backup.sizeBytes)), /* @__PURE__ */ import_react.default.createElement("span", null, "\xB7"), /* @__PURE__ */ import_react.default.createElement("span", { className: "capitalize" }, backup.scope))),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" }, /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onVerify();
          },
          className: "p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400",
          title: "Verify integrity"
        },
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.FileCheck, { size: 14 })
      ), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onRestore();
          },
          className: "p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-orange-400",
          title: "Restore"
        },
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Download, { size: 14 })
      ), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onDelete();
          },
          className: "p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400",
          title: "Delete"
        },
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Trash2, { size: 14 })
      )),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-500" }, expanded ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.ChevronUp, { size: 14 }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.ChevronDown, { size: 14 }))
    ), expanded && /* @__PURE__ */ import_react.default.createElement("div", { className: "px-3 pb-3 border-t border-gray-700/50 pt-2 space-y-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-2 gap-x-4 gap-y-1 text-xs" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "ID"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300 font-mono" }, backup.id.slice(0, 16), "..."), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Created"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, new Date(backup.timestamp).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Format"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, "v", backup.formatVersion), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Checksum"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300 font-mono truncate" }, backup.checksum.slice(0, 16), "..."), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-500" }, "Encrypted"), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-gray-300" }, backup.encrypted ? "Yes (AES-256-GCM)" : "No")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-wrap gap-1 mt-2" }, backup.categories.map((cat) => /* @__PURE__ */ import_react.default.createElement("span", { key: cat, className: "text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded capitalize" }, cat))), verifyResult && /* @__PURE__ */ import_react.default.createElement("div", { className: `flex items-center gap-2 p-2 rounded text-xs ${verifyResult.valid ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"}` }, verifyResult.valid ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.CheckCircle, { size: 14 }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertCircle, { size: 14 }), verifyResult.message)));
  };
  const SecureBackupPanel = () => {
    const [backups, setBackups] = (0, import_react.useState)([]);
    const [settings, setSettings] = (0, import_react.useState)(DEFAULT_SETTINGS);
    const [progress, setProgress] = (0, import_react.useState)(null);
    const [showSettings, setShowSettings] = (0, import_react.useState)(false);
    const [error, setError] = (0, import_react.useState)(null);
    const [success, setSuccess] = (0, import_react.useState)(null);
    const [restoreTarget, setRestoreTarget] = (0, import_react.useState)(null);
    const [verifyResults, setVerifyResults] = (0, import_react.useState)({});
    const [passphrase, setPassphrase] = (0, import_react.useState)("");
    const [showPass, setShowPass] = (0, import_react.useState)(false);
    const [label, setLabel] = (0, import_react.useState)("");
    const [selectedCats, setSelectedCats] = (0, import_react.useState)([...DEFAULT_SETTINGS.defaultCategories]);
    const [scope, setScope] = (0, import_react.useState)("full");
    const [isCreating, setIsCreating] = (0, import_react.useState)(false);
    const [isDragging, setIsDragging] = (0, import_react.useState)(false);
    const dropRef = (0, import_react.useRef)(null);
    const clearMessages = () => {
      setError(null);
      setSuccess(null);
    };
    const fetchData = (0, import_react.useCallback)(async () => {
      try {
        if (context.ipc?.invoke) {
          const list = await context.ipc.invoke("secure-backup:list");
          setBackups(Array.isArray(list) ? list : []);
          const s = await context.ipc.invoke("secure-backup:getSettings");
          if (s) setSettings(s);
        }
      } catch (err) {
        console.error("[Secure Backup] Failed to fetch data:", err);
      }
    }, []);
    (0, import_react.useEffect)(() => {
      fetchData();
      const handleProgress = (p) => setProgress(p);
      const handleListUpdate = () => fetchData();
      if (context.ipc) {
        context.ipc.on("secure-backup:progress", handleProgress);
        context.ipc.on("secure-backup:listUpdated", handleListUpdate);
      }
      return () => {
      };
    }, [fetchData]);
    (0, import_react.useEffect)(() => {
      if (progress && (progress.phase === "complete" || progress.phase === "error")) {
        const timer = setTimeout(() => setProgress(null), 3e3);
        return () => clearTimeout(timer);
      }
    }, [progress]);
    (0, import_react.useEffect)(() => {
      if (success || error) {
        const timer = setTimeout(clearMessages, 5e3);
        return () => clearTimeout(timer);
      }
    }, [success, error]);
    const handleCreate = async () => {
      clearMessages();
      setIsCreating(true);
      try {
        const result = await context.ipc.invoke("secure-backup:create", {
          passphrase: passphrase || void 0,
          categories: selectedCats,
          scope,
          label: label || void 0
        });
        if (result?.success) {
          setSuccess(`Backup created: ${result.backupId?.slice(0, 8) || "OK"}`);
          setPassphrase("");
          setLabel("");
          fetchData();
        } else {
          setError(result?.error || "Backup failed");
        }
      } catch (err) {
        setError(err.message || "Backup failed");
      } finally {
        setIsCreating(false);
      }
    };
    const handleRestore = async (passphrase2, merge) => {
      if (!restoreTarget) return;
      clearMessages();
      setRestoreTarget(null);
      try {
        const result = await context.ipc.invoke("secure-backup:restore", {
          backupId: restoreTarget.id,
          passphrase: passphrase2 || void 0,
          merge
        });
        if (result?.success) {
          setSuccess("Restore completed successfully");
        } else {
          setError(result?.error || "Restore failed");
        }
      } catch (err) {
        setError(err.message || "Restore failed");
      }
    };
    const handleVerify = async (backup) => {
      clearMessages();
      try {
        const result = await context.ipc.invoke("secure-backup:verify", { backupId: backup.id });
        setVerifyResults((prev) => ({
          ...prev,
          [backup.id]: {
            valid: result?.valid ?? false,
            message: result?.valid ? "Integrity verified" : result?.error || "Verification failed"
          }
        }));
      } catch (err) {
        setVerifyResults((prev) => ({
          ...prev,
          [backup.id]: { valid: false, message: err.message || "Verification error" }
        }));
      }
    };
    const handleDelete = async (backup) => {
      clearMessages();
      try {
        const result = await context.ipc.invoke("secure-backup:delete", { backupId: backup.id });
        if (result?.success) {
          setSuccess("Backup deleted");
          fetchData();
        } else {
          setError(result?.error || "Delete failed");
        }
      } catch (err) {
        setError(err.message || "Delete failed");
      }
    };
    const handleExport = async (backup) => {
      clearMessages();
      try {
        const result = await context.ipc.invoke("secure-backup:export", { backupId: backup.id });
        if (result?.success) {
          setSuccess(`Exported to ${result.path}`);
        } else {
          setError(result?.error || "Export failed");
        }
      } catch (err) {
        setError(err.message || "Export failed");
      }
    };
    const updateSettings = async (partial) => {
      const updated = { ...settings, ...partial };
      setSettings(updated);
      try {
        await context.ipc.invoke("secure-backup:updateSettings", partial);
      } catch (err) {
        console.error("[Secure Backup] Failed to update settings:", err);
      }
    };
    const toggleCategory = (catId) => {
      setSelectedCats(
        (prev) => prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
      );
    };
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    const handleDrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      const backupFile = files.find(
        (f) => f.name.endsWith(".json") || f.name.endsWith(".ncbak")
      );
      if (backupFile) {
        try {
          const result = await context.ipc.invoke("secure-backup:import", {
            filePath: backupFile.path
          });
          if (result?.success) {
            setSuccess("Backup imported successfully");
            fetchData();
          } else {
            setError(result?.error || "Import failed");
          }
        } catch (err) {
          setError(err.message || "Import failed");
        }
      } else {
        setError("Drop a .json or .ncbak backup file");
      }
    };
    return /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        ref: dropRef,
        className: `h-full flex flex-col bg-[#1e1e1e] text-white relative ${isDragging ? "ring-2 ring-blue-500 ring-inset" : ""}`,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
      },
      isDragging && /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute inset-0 z-40 flex items-center justify-center bg-blue-900/40 pointer-events-none" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Upload, { size: 40, className: "mx-auto text-blue-400 mb-2" }), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-blue-300 text-sm font-medium" }, "Drop backup file to import"))),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-b border-gray-700 flex justify-between items-center" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-lg font-semibold flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Shield, { size: 18, className: "text-green-400" }), "Secure Backup"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: () => setShowSettings(!showSettings),
          className: `p-1.5 rounded hover:bg-white/10 ${showSettings ? "bg-white/10 text-blue-400" : "text-gray-400"}`,
          title: "Settings"
        },
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Settings, { size: 16 })
      ), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: fetchData,
          className: "p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white",
          title: "Refresh"
        },
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RefreshCw, { size: 16 })
      ))),
      showSettings && /* @__PURE__ */ import_react.default.createElement(SettingsPanel, { settings, onUpdate: updateSettings, onClose: () => setShowSettings(false) }),
      error && /* @__PURE__ */ import_react.default.createElement("div", { className: "mx-4 mt-3 flex items-center gap-2 p-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertCircle, { size: 14 }), /* @__PURE__ */ import_react.default.createElement("span", { className: "flex-1" }, error), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => setError(null), className: "text-red-400 hover:text-red-200" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.X, { size: 12 }))),
      success && /* @__PURE__ */ import_react.default.createElement("div", { className: "mx-4 mt-3 flex items-center gap-2 p-2 bg-green-900/30 border border-green-700/50 rounded text-xs text-green-300" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.CheckCircle, { size: 14 }), /* @__PURE__ */ import_react.default.createElement("span", { className: "flex-1" }, success), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => setSuccess(null), className: "text-green-400 hover:text-green-200" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.X, { size: 12 }))),
      progress && /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-3" }, /* @__PURE__ */ import_react.default.createElement(ProgressBar, { progress })),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-b border-gray-700 space-y-3" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-medium text-gray-300 flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Archive, { size: 14 }), "Create Backup"), /* @__PURE__ */ import_react.default.createElement(
        "input",
        {
          type: "text",
          value: label,
          onChange: (e) => setLabel(e.target.value),
          placeholder: "Backup label (optional)",
          className: "w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500"
        }
      ), /* @__PURE__ */ import_react.default.createElement("div", { className: "relative" }, /* @__PURE__ */ import_react.default.createElement(
        "input",
        {
          type: showPass ? "text" : "password",
          value: passphrase,
          onChange: (e) => setPassphrase(e.target.value),
          placeholder: "Encryption passphrase (optional)",
          className: "w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 pr-10"
        }
      ), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          type: "button",
          onClick: () => setShowPass(!showPass),
          className: "absolute right-2 top-1.5 text-gray-400 hover:text-white"
        },
        showPass ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.EyeOff, { size: 14 }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Eye, { size: 14 })
      )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, ["full", "partial", "incremental"].map((s) => /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          key: s,
          onClick: () => setScope(s),
          className: `px-3 py-1 rounded-full text-xs font-medium capitalize ${scope === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`
        },
        s
      ))), scope !== "full" && /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-wrap gap-1.5" }, CATEGORIES.map((cat) => /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          key: cat.id,
          onClick: () => toggleCategory(cat.id),
          className: `flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${selectedCats.includes(cat.id) ? "bg-blue-600/30 text-blue-300 border border-blue-500/50" : "bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700"}`
        },
        /* @__PURE__ */ import_react.default.createElement("span", null, cat.icon),
        /* @__PURE__ */ import_react.default.createElement("span", null, cat.label)
      ))), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: handleCreate,
          disabled: isCreating || progress !== null && progress.phase !== "complete" && progress.phase !== "error",
          className: "w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        },
        isCreating ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RefreshCw, { size: 14, className: "animate-spin" }), "Creating...") : /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Upload, { size: 14 }), "Create Backup")
      ), !passphrase && /* @__PURE__ */ import_react.default.createElement("p", { className: "flex items-center gap-1 text-[10px] text-yellow-500/70" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Info, { size: 10 }), "No passphrase \u2014 backup will be stored unencrypted")),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-medium text-gray-300 flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Clock, { size: 14 }), "History (", backups.length, ")")), backups.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col items-center justify-center h-32 text-gray-500" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.HardDrive, { size: 28, className: "mb-2 opacity-40" }), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm" }, "No backups yet"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-600 mt-1" }, "Create your first backup above")) : backups.sort((a, b) => b.timestamp - a.timestamp).map((backup) => /* @__PURE__ */ import_react.default.createElement(
        BackupItem,
        {
          key: backup.id,
          backup,
          onRestore: () => setRestoreTarget(backup),
          onVerify: () => handleVerify(backup),
          onDelete: () => handleDelete(backup),
          verifyResult: verifyResults[backup.id] || null
        }
      ))),
      /* @__PURE__ */ import_react.default.createElement("div", { className: "p-2 border-t border-gray-700/50 text-center" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "text-[10px] text-gray-600" }, "Drag & drop a .ncbak file to import")),
      restoreTarget && /* @__PURE__ */ import_react.default.createElement(
        RestoreConfirmDialog,
        {
          backup: restoreTarget,
          onConfirm: handleRestore,
          onCancel: () => setRestoreTarget(null)
        }
      )
    );
  };
  const SecureBackupButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "secure-backup";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-green-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("secure-backup"),
        title: "Secure Backup"
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Shield, { size: 18 })
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "secure-backup-nav",
    component: SecureBackupButton
  });
  context.registerComponent("sidebar:view:secure-backup", {
    id: "secure-backup-panel",
    component: SecureBackupPanel
  });
  const cleanups = [];
  if (context.ui?.registerCommand) {
    cleanups.push(
      context.ui.registerCommand({
        id: "secure-backup:open",
        label: "Open Secure Backup",
        icon: import_lucide_react.Shield,
        category: "Backup",
        action: () => {
          const store = useAppStore?.getState?.();
          store?.setActiveSidebarView?.("secure-backup");
        }
      })
    );
    cleanups.push(
      context.ui.registerCommand({
        id: "secure-backup:create-now",
        label: "Create Backup Now",
        icon: import_lucide_react.Upload,
        category: "Backup",
        action: () => {
          context.ipc?.invoke?.("secure-backup:create", {
            categories: DEFAULT_SETTINGS.defaultCategories,
            scope: "full"
          });
        }
      })
    );
  }
  context._cleanups = cleanups;
};
var deactivate = (context) => {
  console.log("[Secure Backup] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
