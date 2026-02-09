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
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[Notification Center] Renderer activated");
  const NotificationPanel = () => {
    const [notifications, setNotifications] = (0, import_react.useState)([]);
    (0, import_react.useEffect)(() => {
      const fetchNotifications = async () => {
        if (context.ipc && context.ipc.invoke) {
          const list = await context.ipc.invoke("notifications:list");
          setNotifications(list);
        }
      };
      fetchNotifications();
      if (context.ipc && context.ipc.on) {
        context.ipc.on("notification:new", (notif) => {
          setNotifications((prev) => [notif, ...prev]);
        });
      }
    }, []);
    const markRead = async (id) => {
      if (context.ipc && context.ipc.invoke) {
        await context.ipc.invoke("notifications:markRead", { id });
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      }
    };
    const clearAll = async () => {
      if (context.ipc && context.ipc.invoke) {
        await context.ipc.invoke("notifications:clear");
        setNotifications([]);
      }
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col p-4 text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold" }, "Notifications"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: clearAll, className: "text-xs text-gray-400 hover:text-white" }, "Clear All")), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto space-y-2" }, notifications.map((notif) => /* @__PURE__ */ import_react.default.createElement(
      "div",
      {
        key: notif.id,
        onClick: () => markRead(notif.id),
        className: `p-3 rounded-lg border transition-colors cursor-pointer ${notif.read ? "bg-white/5 border-transparent opacity-60" : "bg-white/10 border-blue-500/30"}`
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: `text-xs font-bold uppercase ${notif.type === "error" ? "text-red-400" : notif.type === "success" ? "text-green-400" : notif.type === "warning" ? "text-yellow-400" : "text-blue-400"}` }, notif.type), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] text-gray-500" }, new Date(notif.timestamp).toLocaleTimeString())),
      /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-sm font-medium mb-1" }, notif.title),
      /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-300" }, notif.message)
    )), notifications.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center text-gray-500 mt-8" }, "No notifications")));
  };
  const NotificationCenterButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "notification-center";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("notification-center"),
        title: "Notification Center"
      },
      "NOT"
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
};
