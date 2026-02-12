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

// plugins/notification-center/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
var DEFAULT_SETTINGS = {
  maxHistory: 100,
  soundEnabled: true,
  soundVolume: 0.5,
  dndEnabled: false,
  desktopNotifications: false
};
var activate = (context) => {
  console.log("[Notification Center] Renderer activated");
  const { ui, useAppStore } = context;
  const Toast = ({ notification, onClose }) => {
    (0, import_react.useEffect)(() => {
      const timer = setTimeout(() => {
        onClose();
      }, 5e3);
      return () => clearTimeout(timer);
    }, [onClose]);
    const icon = {
      info: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Info, { size: 16, className: "text-blue-400" }),
      success: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.CheckCircle, { size: 16, className: "text-green-400" }),
      warning: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertTriangle, { size: 16, className: "text-yellow-400" }),
      error: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertCircle, { size: 16, className: "text-red-400" })
    }[notification.type];
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-start p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg animate-in slide-in-from-right w-80" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "mr-3 mt-1" }, icon), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "text-sm font-medium text-white truncate" }, notification.title), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-400 line-clamp-2" }, notification.message)), /* @__PURE__ */ import_react.default.createElement("button", { onClick: onClose, className: "ml-2 text-gray-500 hover:text-white" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.X, { size: 14 })));
  };
  const ToastManager = () => {
    const [toasts, setToasts] = (0, import_react.useState)([]);
    (0, import_react.useEffect)(() => {
      const handleNewNotification = (notif) => {
        context.ipc.invoke("notifications:getSettings").then((settings) => {
          if (!settings.dndEnabled) {
            setToasts((prev) => [...prev, notif]);
            if (settings.soundEnabled) {
            }
          }
        });
      };
      if (context.ipc && context.ipc.on) {
        context.ipc.on("notification:new", handleNewNotification);
      }
      return () => {
      };
    }, []);
    const removeToast = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };
    if (toasts.length === 0) return null;
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "pointer-events-auto" }, toasts.map((t) => /* @__PURE__ */ import_react.default.createElement(Toast, { key: t.id, notification: t, onClose: () => removeToast(t.id) }))));
  };
  const NotificationPanel = () => {
    const [notifications, setNotifications] = (0, import_react.useState)([]);
    const [settings, setSettings] = (0, import_react.useState)(DEFAULT_SETTINGS);
    const [filter, setFilter] = (0, import_react.useState)("all");
    const [showSettings, setShowSettings] = (0, import_react.useState)(false);
    const fetchData = async () => {
      if (context.ipc && context.ipc.invoke) {
        const list = await context.ipc.invoke("notifications:list");
        setNotifications(list);
        const s = await context.ipc.invoke("notifications:getSettings");
        setSettings(s || DEFAULT_SETTINGS);
      }
    };
    (0, import_react.useEffect)(() => {
      fetchData();
      const handleNew = (n) => setNotifications((prev) => [n, ...prev]);
      const handleUpdate = (n) => setNotifications((prev) => prev.map((x) => x.id === n.id ? n : x));
      const handleListUpdate = (list) => setNotifications(list);
      const handleAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      const handleCleared = () => setNotifications([]);
      const handleSettingsUpdate = (s) => setSettings(s);
      if (context.ipc) {
        context.ipc.on("notification:new", handleNew);
        context.ipc.on("notification:update", handleUpdate);
        context.ipc.on("notifications:listUpdated", handleListUpdate);
        context.ipc.on("notifications:allRead", handleAllRead);
        context.ipc.on("notifications:cleared", handleCleared);
        context.ipc.on("notifications:settingsUpdated", handleSettingsUpdate);
      }
    }, []);
    const filteredNotifications = (0, import_react.useMemo)(() => {
      return notifications.filter((n) => {
        if (filter === "unread") return !n.read;
        if (filter === "system") return n.category === "system";
        if (filter === "agent") return n.category === "agent";
        return true;
      });
    }, [notifications, filter]);
    const markRead = (id) => context.ipc.invoke("notifications:markRead", { id });
    const markAllRead = () => context.ipc.invoke("notifications:markAllRead");
    const clearAll = () => context.ipc.invoke("notifications:clear");
    const deleteNotification = (id, e) => {
      e.stopPropagation();
      context.ipc.invoke("notifications:delete", { id });
    };
    const updateSettings = (partial) => {
      context.ipc.invoke("notifications:updateSettings", partial);
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col bg-[#1e1e1e] text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-b border-gray-700 flex justify-between items-center" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-lg font-semibold flex items-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Bell, { size: 18 }), "Notifications"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(
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
        onClick: markAllRead,
        className: "p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-green-400",
        title: "Mark all as read"
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.CheckCheck, { size: 16 })
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: clearAll,
        className: "p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400",
        title: "Clear all"
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Trash2, { size: 16 })
    ))), showSettings && /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 bg-gray-800 border-b border-gray-700 space-y-3 text-sm" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Do Not Disturb"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => updateSettings({ dndEnabled: !settings.dndEnabled }),
        className: `w-10 h-5 rounded-full relative transition-colors ${settings.dndEnabled ? "bg-blue-600" : "bg-gray-600"}`
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: `absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.dndEnabled ? "translate-x-5" : ""}` })
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", null, "Sound"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => updateSettings({ soundEnabled: !settings.soundEnabled }),
        className: `w-10 h-5 rounded-full relative transition-colors ${settings.soundEnabled ? "bg-blue-600" : "bg-gray-600"}`
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: `absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.soundEnabled ? "translate-x-5" : ""}` })
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react.default.createElement("span", null, "History Limit"), /* @__PURE__ */ import_react.default.createElement(
      "select",
      {
        value: settings.maxHistory,
        onChange: (e) => updateSettings({ maxHistory: parseInt(e.target.value) }),
        className: "bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600"
      },
      /* @__PURE__ */ import_react.default.createElement("option", { value: "50" }, "50"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "100" }, "100"),
      /* @__PURE__ */ import_react.default.createElement("option", { value: "200" }, "200")
    ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 p-2 border-b border-gray-700 overflow-x-auto" }, ["all", "unread", "system", "agent"].map((f) => /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        key: f,
        onClick: () => setFilter(f),
        className: `px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${filter === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`
      },
      f
    ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-2 space-y-2" }, filteredNotifications.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col items-center justify-center h-40 text-gray-500" }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Inbox, { size: 32, className: "mb-2 opacity-50" }), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm" }, "No notifications")) : filteredNotifications.map((notif) => /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        key: notif.id,
        onClick: () => markRead(notif.id),
        className: `group relative p-3 rounded-lg border transition-all cursor-pointer ${notif.read ? "bg-transparent border-transparent opacity-60 hover:bg-white/5" : "bg-white/5 border-gray-700 hover:border-gray-600"}`
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: `mt-1 ${notif.type === "error" ? "text-red-400" : notif.type === "success" ? "text-green-400" : notif.type === "warning" ? "text-yellow-400" : "text-blue-400"}` }, notif.type === "error" ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertCircle, { size: 16 }) : notif.type === "success" ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.CheckCircle, { size: 16 }) : notif.type === "warning" ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertTriangle, { size: 16 }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Info, { size: 16 })), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: `text-sm font-medium ${!notif.read ? "text-white" : "text-gray-400"}` }, notif.title), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] text-gray-500 whitespace-nowrap ml-2" }, new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-300 mt-1 break-words" }, notif.message), notif.actions && notif.actions.length > 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 mt-2" }, notif.actions.map((action) => /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          key: action.id,
          onClick: (e) => {
            e.stopPropagation();
            context.ipc.send(action.action, action.data);
          },
          className: "px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white flex items-center gap-1"
        },
        action.label,
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.ExternalLink, { size: 10 })
      ))))),
      /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: (e) => deleteNotification(notif.id, e),
          className: "absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        },
        /* @__PURE__ */ import_react.default.createElement(import_lucide_react.X, { size: 14 })
      )
    ))));
  };
  const NotificationCenterButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "notification-center";
    const [unreadCount, setUnreadCount] = (0, import_react.useState)(0);
    (0, import_react.useEffect)(() => {
      const updateCount = async () => {
        if (context.ipc) {
          const list = await context.ipc.invoke("notifications:list");
          setUnreadCount(list.filter((n) => !n.read).length);
        }
      };
      updateCount();
      const handleUpdate = () => updateCount();
      if (context.ipc) {
        context.ipc.on("notification:new", handleUpdate);
        context.ipc.on("notification:update", handleUpdate);
        context.ipc.on("notifications:listUpdated", handleUpdate);
        context.ipc.on("notifications:allRead", handleUpdate);
        context.ipc.on("notifications:cleared", handleUpdate);
      }
    }, []);
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("notification-center"),
        title: "Notification Center"
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Bell, { size: 18 }),
      unreadCount > 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#1e1e1e]" }, unreadCount > 99 ? "99+" : unreadCount)
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "notification-center-nav",
    component: NotificationCenterButton
  });
  context.registerComponent("sidebar:view:notification-center", {
    id: "notification-center-panel",
    component: NotificationPanel
  });
  context.registerComponent("layout:overlay", {
    id: "notification-toasts",
    component: ToastManager
  });
  const cleanups = [];
  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: "notifications:open",
      label: "Open Notification Center",
      icon: import_lucide_react.Bell,
      category: "Notifications",
      action: () => {
        const store = useAppStore?.getState?.();
        store?.setActiveSidebarView?.("notification-center");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "notifications:mark-all-read",
      label: "Mark All Notifications as Read",
      icon: import_lucide_react.CheckCheck,
      category: "Notifications",
      action: () => {
        context.ipc?.invoke?.("notifications:markAllRead");
      }
    }));
  }
  context._cleanups = cleanups;
};
var deactivate = (context) => {
  console.log("[Notification Center] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
