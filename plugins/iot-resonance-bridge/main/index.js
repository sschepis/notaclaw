"use strict";

// plugins/iot-resonance-bridge/main/index.js
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
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_home_assistant_js_websocket = require("home-assistant-js-websocket");
var import_ws = __toESM(require("ws"), 1);
if (!global.WebSocket) {
  global.WebSocket = import_ws.default;
}
var DeviceManager = class {
  constructor(context) {
    this.context = context;
    this.devices = /* @__PURE__ */ new Map();
    this.connection = null;
    this.unsubscribeEntities = null;
    this.config = { url: "", token: "" };
    this.initializeMockDevices();
    this.loadConfig();
  }
  async loadConfig() {
    try {
      const config = await this.context.storage.get("iot-config");
      if (config && config.url) {
        this.config = config;
        const token = await this.context.secrets.get("ha-token");
        if (token) {
          this.config.token = token;
          this.connectToHomeAssistant();
        }
      }
    } catch (e) {
      console.error("[IoT Bridge] Failed to load config:", e);
    }
  }
  async connectToHomeAssistant() {
    if (!this.config.url || !this.config.token) return;
    console.log(`[IoT Bridge] Connecting to Home Assistant at ${this.config.url}...`);
    try {
      const auth = (0, import_home_assistant_js_websocket.createLongLivedTokenAuth)(
        this.config.url,
        this.config.token
      );
      this.connection = await (0, import_home_assistant_js_websocket.createConnection)({ auth });
      console.log("[IoT Bridge] Connected to Home Assistant!");
      this.unsubscribeEntities = (0, import_home_assistant_js_websocket.subscribeEntities)(
        this.connection,
        (entities) => this.handleEntityUpdates(entities)
      );
    } catch (err) {
      console.error("[IoT Bridge] Connection failed:", err);
    }
  }
  handleEntityUpdates(entities) {
    Object.keys(entities).forEach((entityId) => {
      const entity = entities[entityId];
      const domain = entityId.split(".")[0];
      let type = "unknown";
      if (domain === "light") type = "light";
      if (domain === "switch") type = "switch";
      if (domain === "lock") type = "lock";
      if (domain === "climate") type = "thermostat";
      if (["light", "switch", "lock", "climate"].includes(domain)) {
        const device = {
          id: entityId,
          name: entity.attributes.friendly_name || entityId,
          type,
          state: this.mapHAState(entity, type),
          raw: entity
        };
        this.devices.set(entityId, device);
      }
    });
    if (this.onDeviceUpdate) {
      this.onDeviceUpdate(Array.from(this.devices.values()));
    }
  }
  mapHAState(entity, type) {
    const state = {};
    if (type === "light" || type === "switch") {
      state.on = entity.state === "on";
      if (entity.attributes.brightness) state.brightness = Math.round(entity.attributes.brightness / 255 * 100);
    }
    if (type === "lock") {
      state.locked = entity.state === "locked";
    }
    if (type === "thermostat") {
      state.temperature = entity.attributes.current_temperature;
      state.mode = entity.state;
    }
    return state;
  }
  async controlDevice(deviceId, action, value) {
    if (this.connection) {
      const domain = deviceId.split(".")[0];
      let service = "";
      let data = { entity_id: deviceId };
      if (action === "turn_on") service = "turn_on";
      if (action === "turn_off") service = "turn_off";
      if (action === "lock") service = "lock";
      if (action === "unlock") service = "unlock";
      if (service) {
        await (0, import_home_assistant_js_websocket.callService)(this.connection, domain, service, data);
        return;
      }
    }
    this.updateDeviceState(deviceId, this.mapActionToState(action, value));
  }
  mapActionToState(action, value) {
    let updates = {};
    if (action === "turn_on") updates.on = true;
    if (action === "turn_off") updates.on = false;
    if (action === "set_level") updates.brightness = value;
    if (action === "lock") updates.locked = true;
    if (action === "unlock") updates.locked = false;
    if (action === "set_temperature") updates.temperature = value;
    return updates;
  }
  initializeMockDevices() {
    this.addDevice({
      id: "light_living_room",
      name: "Living Room Light (Mock)",
      type: "light",
      state: { on: true, brightness: 80 }
    });
    this.addDevice({
      id: "thermostat_main",
      name: "Main Thermostat (Mock)",
      type: "thermostat",
      state: { temperature: 72, mode: "cool" }
    });
    this.addDevice({
      id: "lock_front_door",
      name: "Front Door (Mock)",
      type: "lock",
      state: { locked: true }
    });
  }
  addDevice(device) {
    this.devices.set(device.id, device);
  }
  getDevice(id) {
    return this.devices.get(id);
  }
  getAllDevices() {
    return Array.from(this.devices.values());
  }
  updateDeviceState(id, newState) {
    const device = this.devices.get(id);
    if (device) {
      device.state = { ...device.state, ...newState };
      this.devices.set(id, device);
      return device;
    }
    return null;
  }
};
function activate(context) {
  console.log("[IoT Resonance Bridge] Activating...");
  const deviceManager = new DeviceManager(context);
  deviceManager.onDeviceUpdate = (devices) => {
    context.ipc.send("devices", devices);
  };
  context.dsn.registerTool({
    name: "controlDevice",
    description: "Sends a command to a connected IoT device",
    parameters: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        action: { type: "string", enum: ["turn_on", "turn_off", "set_level", "lock", "unlock", "set_temperature"] },
        value: { type: "number" }
      },
      required: ["deviceId", "action"]
    }
  }, async (args) => {
    console.log(`[IoT Resonance Bridge] Device ${args.deviceId} -> ${args.action}`);
    await deviceManager.controlDevice(args.deviceId, args.action, args.value);
    return { status: "success", newState: "pending_update" };
  });
  context.dsn.registerTool({
    name: "listDevices",
    description: "Lists all connected IoT devices and their states",
    parameters: { type: "object", properties: {} }
  }, async () => {
    return { devices: deviceManager.getAllDevices() };
  });
  context.ipc.on("getDevices", () => {
    context.ipc.send("devices", deviceManager.getAllDevices());
  });
  context.ipc.on("controlDevice", async (args) => {
    await deviceManager.controlDevice(args.deviceId, args.action, args.value);
    context.ipc.send("devices", deviceManager.getAllDevices());
  });
  context.ipc.on("reload-iot-config", () => {
    deviceManager.loadConfig();
  });
  console.log("[IoT Resonance Bridge] Activated.");
}
