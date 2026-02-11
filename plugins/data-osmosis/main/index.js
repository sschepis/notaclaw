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

// plugins/data-osmosis/main/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var DataSourceManager = class {
  context;
  sources;
  constructor(context) {
    this.context = context;
    this.sources = /* @__PURE__ */ new Map();
  }
  async load() {
    try {
      const stored = await this.context.storage.get("sources");
      if (stored && Array.isArray(stored)) {
        stored.forEach((s) => this.sources.set(s.id, s));
        console.log(`[Data Osmosis] Loaded ${stored.length} sources.`);
      }
    } catch (err) {
      console.error("[Data Osmosis] Failed to load sources:", err);
    }
  }
  async save() {
    try {
      const sources = Array.from(this.sources.values());
      await this.context.storage.set("sources", sources);
    } catch (err) {
      console.error("[Data Osmosis] Failed to save sources:", err);
    }
  }
  async connect(config) {
    console.log(`[Data Osmosis] Attempting connection to ${config.type}...`);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    if (config.type === "postgres" && !config.connectionString.includes("postgres://")) {
      throw new Error("Invalid PostgreSQL connection string. Must start with postgres://");
    }
    if (config.type === "mongodb" && !config.connectionString.includes("mongodb://")) {
      throw new Error("Invalid MongoDB connection string. Must start with mongodb://");
    }
    const id = "src_" + Date.now().toString(36);
    const newSource = {
      id,
      type: config.type,
      name: config.name || `Source ${id}`,
      connectionString: config.connectionString,
      // In real app, encrypt this!
      status: "connected",
      lastSync: null,
      recordCount: 0
    };
    this.sources.set(id, newSource);
    await this.save();
    console.log(`[Data Osmosis] Connected to ${newSource.name}`);
    return newSource;
  }
  async sync(id) {
    const source = this.sources.get(id);
    if (!source) throw new Error(`Source ${id} not found`);
    console.log(`[Data Osmosis] Syncing ${source.name}...`);
    source.status = "syncing";
    this.context.ipc.send("data-osmosis:update", Array.from(this.sources.values()));
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    const newRecords = Math.floor(Math.random() * 50) + 1;
    source.recordCount += newRecords;
    source.lastSync = Date.now();
    source.status = "connected";
    await this.save();
    console.log(`[Data Osmosis] Synced ${newRecords} records from ${source.name}`);
    this.context.ipc.send("data-osmosis:update", Array.from(this.sources.values()));
    return { recordsIngested: newRecords };
  }
  list() {
    return Array.from(this.sources.values());
  }
  async disconnect(id) {
    if (this.sources.delete(id)) {
      await this.save();
      console.log(`[Data Osmosis] Disconnected source ${id}`);
      this.context.ipc.send("data-osmosis:update", Array.from(this.sources.values()));
      return true;
    }
    return false;
  }
};
var index_default = {
  activate: async (context) => {
    console.log("[Data Osmosis] Activating...");
    const manager = new DataSourceManager(context);
    await manager.load();
    context.ipc.handle("data-osmosis:list", async () => {
      return manager.list();
    });
    context.ipc.handle("data-osmosis:connect", async (config) => {
      return await manager.connect(config);
    });
    context.ipc.handle("data-osmosis:sync", async (id) => {
      return await manager.sync(id);
    });
    context.ipc.handle("data-osmosis:disconnect", async (id) => {
      return await manager.disconnect(id);
    });
    context.dsn.registerTool({
      name: "connectDataSource",
      description: "Connects an external data source to the semantic graph",
      executionLocation: "SERVER",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["postgres", "mysql", "mongodb", "rest"] },
          connectionString: { type: "string" },
          name: { type: "string" },
          mapping: { type: "object" }
        },
        required: ["type", "connectionString"]
      },
      version: "1.0.0",
      semanticDomain: "cognitive",
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: "Neophyte"
    }, async (args) => {
      try {
        const source = await manager.connect(args);
        return { status: "success", source };
      } catch (err) {
        return { status: "error", message: err.message };
      }
    });
    context.dsn.registerTool({
      name: "syncDataSource",
      description: "Triggers a sync for a connected data source",
      executionLocation: "SERVER",
      parameters: {
        type: "object",
        properties: {
          sourceId: { type: "string" }
        },
        required: ["sourceId"]
      },
      version: "1.0.0",
      semanticDomain: "cognitive",
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: "Neophyte"
    }, async (args) => {
      try {
        const result = await manager.sync(args.sourceId);
        return { status: "success", result };
      } catch (err) {
        return { status: "error", message: err.message };
      }
    });
    context.dsn.registerTool({
      name: "listDataSources",
      description: "Lists all connected data sources",
      executionLocation: "SERVER",
      parameters: { type: "object", properties: {} },
      version: "1.0.0",
      semanticDomain: "cognitive",
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: "Neophyte"
    }, async () => {
      return { sources: manager.list() };
    });
    console.log("[Data Osmosis] Activated.");
  },
  deactivate: () => {
    console.log("[Data Osmosis] Deactivated.");
  }
};
