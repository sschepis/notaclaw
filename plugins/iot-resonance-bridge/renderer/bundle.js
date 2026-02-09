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

// plugins/iot-resonance-bridge/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var activate = (context) => {
  console.log("[IoT Resonance Bridge] Renderer activated");
  const IoTView = () => {
    const [devices, setDevices] = (0, import_react.useState)([]);
    const [view, setView] = (0, import_react.useState)("dashboard");
    const [config, setConfig] = (0, import_react.useState)({ url: "", token: "" });
    (0, import_react.useEffect)(() => {
      context.ipc.send("getDevices");
      context.ipc.on("devices", setDevices);
      context.storage.get("iot-config").then((c) => {
        if (c) setConfig(c);
      });
    }, []);
    const toggleDevice = (deviceId, currentState) => {
      context.ipc.send("controlDevice", {
        deviceId,
        action: currentState ? "turn_off" : "turn_on"
      });
    };
    const saveConfig = async () => {
      await context.storage.set("iot-config", config);
      await context.secrets.set("ha-token", config.token);
      context.ipc.send("reload-iot-config");
      setView("dashboard");
    };
    if (view === "settings") {
      return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 h-full overflow-y-auto text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-2xl font-bold" }, "IoT Settings"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => setView("dashboard"), className: "text-gray-400 hover:text-white" }, "Cancel")), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4 max-w-md" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm font-medium text-gray-400 mb-1" }, "Home Assistant URL"), /* @__PURE__ */ import_react.default.createElement(
        "input",
        {
          type: "text",
          value: config.url,
          onChange: (e) => setConfig({ ...config, url: e.target.value }),
          placeholder: "http://homeassistant.local:8123",
          className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        }
      )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm font-medium text-gray-400 mb-1" }, "Access Token"), /* @__PURE__ */ import_react.default.createElement(
        "input",
        {
          type: "password",
          value: config.token,
          onChange: (e) => setConfig({ ...config, token: e.target.value }),
          placeholder: "Long-lived access token",
          className: "w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        }
      )), /* @__PURE__ */ import_react.default.createElement(
        "button",
        {
          onClick: saveConfig,
          className: "w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors"
        },
        "Save & Connect"
      )));
    }
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 h-full overflow-y-auto text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-2xl font-bold" }, "IoT Resonance Bridge"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => setView("settings"),
        className: "p-2 bg-white/5 hover:bg-white/10 rounded text-gray-300",
        title: "Settings"
      },
      "\u2699\uFE0F"
    )), devices.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center text-gray-400 mt-10" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "mb-4" }, "No devices connected."), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => setView("settings"), className: "text-blue-400 hover:underline" }, "Configure Home Assistant")) : /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" }, devices.map((device) => /* @__PURE__ */ import_react.default.createElement("div", { key: device.id, className: "border border-white/10 p-4 rounded bg-white/5 flex flex-col items-center relative group" }, /* @__PURE__ */ import_react.default.createElement("div", { className: `text-4xl mb-2 transition-opacity ${device.state.unavailable ? "opacity-30" : "opacity-100"}` }, device.type === "light" ? "\u{1F4A1}" : device.type === "thermostat" ? "\u{1F321}\uFE0F" : device.type === "lock" ? "\u{1F512}" : device.type === "switch" ? "\u{1F50C}" : "\u{1F4F1}"), /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-bold text-center truncate w-full" }, device.name), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-2 text-sm text-gray-400" }, device.state.unavailable ? "Unavailable" : device.type === "light" ? device.state.on ? "On" : "Off" : device.type === "lock" ? device.state.locked ? "Locked" : "Unlocked" : device.type === "thermostat" ? `${device.state.temperature}\xB0F` : JSON.stringify(device.state)), !device.state.unavailable && /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-4 flex gap-2" }, device.type === "light" && /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => toggleDevice(device.id, device.state.on),
        className: `px-4 py-2 rounded font-medium transition-colors ${device.state.on ? "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30" : "bg-white/10 hover:bg-white/20"}`
      },
      device.state.on ? "Turn Off" : "Turn On"
    ), device.type === "lock" && /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: () => context.ipc.send("controlDevice", { deviceId: device.id, action: device.state.locked ? "unlock" : "lock" }),
        className: `px-4 py-2 rounded font-medium transition-colors ${device.state.locked ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-green-500/20 text-green-300 hover:bg-green-500/30"}`
      },
      device.state.locked ? "Unlock" : "Lock"
    ))))));
  };
  const IoTButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "iot-bridge";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("iot-bridge"),
        title: "IoT Bridge"
      },
      "\u{1F3E0}"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "iot-bridge-nav",
    component: IoTButton
  });
  context.registerComponent("sidebar:view:iot-bridge", {
    id: "iot-bridge-panel",
    component: IoTView
  });
};
