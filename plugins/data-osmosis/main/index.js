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

// plugins/data-osmosis/main/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// plugins/data-osmosis/main/ConnectorRegistry.ts
var ConnectorRegistry = class _ConnectorRegistry {
  static instance;
  factories;
  constructor() {
    this.factories = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!_ConnectorRegistry.instance) {
      _ConnectorRegistry.instance = new _ConnectorRegistry();
    }
    return _ConnectorRegistry.instance;
  }
  register(type, factory) {
    this.factories.set(type, factory);
  }
  create(config) {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`Unknown connector type: ${config.type}`);
    }
    return factory(config);
  }
  getTypes() {
    return Array.from(this.factories.keys());
  }
};

// plugins/data-osmosis/main/scheduler/SyncScheduler.ts
var SyncScheduler = class {
  intervals = /* @__PURE__ */ new Map();
  syncCallback;
  constructor(syncCallback) {
    this.syncCallback = syncCallback;
  }
  schedule(source) {
    if (this.intervals.has(source.id)) {
      clearInterval(this.intervals.get(source.id));
      this.intervals.delete(source.id);
    }
    if (source.syncIntervalMinutes && source.syncIntervalMinutes > 0) {
      const intervalMs = source.syncIntervalMinutes * 60 * 1e3;
      const interval = setInterval(() => {
        this.syncCallback(source.id).catch(console.error);
      }, intervalMs);
      this.intervals.set(source.id, interval);
    }
  }
  unschedule(sourceId) {
    if (this.intervals.has(sourceId)) {
      clearInterval(this.intervals.get(sourceId));
      this.intervals.delete(sourceId);
    }
  }
  stopAll() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
};

// plugins/data-osmosis/main/connectors/BaseConnector.ts
var BaseConnector = class {
  id;
  config;
  constructor(config) {
    this.id = config.id;
    this.config = config;
  }
};

// plugins/data-osmosis/main/connectors/PostgresConnector.ts
var import_pg = require("pg");
var PostgresConnector = class extends BaseConnector {
  client = null;
  constructor(config) {
    super(config);
  }
  async connect() {
    try {
      this.client = new import_pg.Client({
        connectionString: this.config.connectionString
      });
      await this.client.connect();
      this.config.status = "connected";
      return true;
    } catch (error) {
      console.error(`[PostgresConnector] Connection failed: ${error.message}`);
      this.config.status = "error";
      this.config.errorMessage = error.message;
      return false;
    }
  }
  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.config.status = "disconnected";
      return true;
    }
    return false;
  }
  async testConnection() {
    try {
      const tempClient = new import_pg.Client({
        connectionString: this.config.connectionString
      });
      await tempClient.connect();
      await tempClient.query("SELECT 1");
      await tempClient.end();
      return true;
    } catch (error) {
      return false;
    }
  }
  async fetch(lastSyncTimestamp) {
    if (!this.client) {
      throw new Error("Not connected");
    }
    try {
      let query = "";
      if (this.config.query) {
        query = this.config.query;
      } else if (this.config.table) {
        query = `SELECT * FROM ${this.config.table}`;
        if (lastSyncTimestamp && this.config.timestampColumn) {
          query += ` WHERE ${this.config.timestampColumn} > to_timestamp(${lastSyncTimestamp / 1e3})`;
        }
      } else {
        query = `
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                `;
      }
      const res = await this.client.query(query);
      return res.rows;
    } catch (error) {
      console.error(`[PostgresConnector] Fetch failed: ${error.message}`);
      throw error;
    }
  }
  async getSchema() {
    if (!this.client) throw new Error("Not connected");
    const res = await this.client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
        `);
    const schema = {};
    res.rows.forEach((row) => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        name: row.column_name,
        type: row.data_type
      });
    });
    return schema;
  }
};

// plugins/data-osmosis/main/connectors/MongoDBConnector.ts
var import_mongodb = require("mongodb");
var MongoDBConnector = class extends BaseConnector {
  client = null;
  db = null;
  constructor(config) {
    super(config);
  }
  async connect() {
    try {
      this.client = new import_mongodb.MongoClient(this.config.connectionString);
      await this.client.connect();
      const dbName = this.config.databaseName;
      this.db = this.client.db(dbName);
      this.config.status = "connected";
      return true;
    } catch (error) {
      console.error(`[MongoDBConnector] Connection failed: ${error.message}`);
      this.config.status = "error";
      this.config.errorMessage = error.message;
      return false;
    }
  }
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.config.status = "disconnected";
      return true;
    }
    return false;
  }
  async testConnection() {
    try {
      const tempClient = new import_mongodb.MongoClient(this.config.connectionString);
      await tempClient.connect();
      await tempClient.db(this.config.databaseName).command({ ping: 1 });
      await tempClient.close();
      return true;
    } catch (error) {
      return false;
    }
  }
  async fetch(lastSyncTimestamp) {
    if (!this.db) {
      throw new Error("Not connected");
    }
    try {
      const collectionName = this.config.collection;
      if (!collectionName) {
        const collections = await this.db.listCollections().toArray();
        return collections.map((c) => ({ name: c.name, type: "collection" }));
      }
      const collection = this.db.collection(collectionName);
      let query = {};
      if (lastSyncTimestamp && this.config.timestampField) {
        query[this.config.timestampField] = { $gt: new Date(lastSyncTimestamp) };
      }
      const results = await collection.find(query).toArray();
      return results;
    } catch (error) {
      console.error(`[MongoDBConnector] Fetch failed: ${error.message}`);
      throw error;
    }
  }
  async getSchema() {
    if (!this.db) throw new Error("Not connected");
    const collections = await this.db.listCollections().toArray();
    const schema = {};
    for (const col of collections) {
      const sample = await this.db.collection(col.name).findOne({});
      if (sample) {
        schema[col.name] = Object.keys(sample).map((key) => ({
          name: key,
          type: typeof sample[key]
        }));
      } else {
        schema[col.name] = [];
      }
    }
    return schema;
  }
};

// plugins/data-osmosis/main/connectors/WebScraperConnector.ts
var import_axios = __toESM(require("axios"));
var WebScraperConnector = class extends BaseConnector {
  constructor(config) {
    super(config);
  }
  async connect() {
    this.config.status = "connected";
    return true;
  }
  async disconnect() {
    this.config.status = "disconnected";
    return true;
  }
  async testConnection() {
    try {
      await import_axios.default.head(this.config.url);
      return true;
    } catch (error) {
      try {
        await import_axios.default.get(this.config.url);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
  async fetch(lastSyncTimestamp) {
    try {
      const response = await import_axios.default.get(this.config.url);
      const html = response.data;
      const selector = this.config.selector;
      const data = [];
      if (selector) {
        const tag = selector.replace(/[^\w]/g, "");
        const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gi");
        let match;
        while ((match = regex.exec(html)) !== null) {
          data.push({ content: match[1].replace(/<[^>]*>?/gm, "") });
        }
      } else {
        data.push({
          url: this.config.url,
          title: (html.match(/<title>(.*?)<\/title>/) || [])[1],
          length: html.length,
          timestamp: Date.now()
        });
      }
      return data;
    } catch (error) {
      console.error(`[WebScraperConnector] Fetch failed: ${error.message}`);
      throw error;
    }
  }
  async getSchema() {
    return {
      page: [
        { name: "content", type: "string" },
        { name: "url", type: "string" },
        { name: "title", type: "string" }
      ]
    };
  }
};

// plugins/data-osmosis/main/connectors/RSSConnector.ts
var import_axios2 = __toESM(require("axios"));
var RSSConnector = class extends BaseConnector {
  constructor(config) {
    super(config);
  }
  async connect() {
    this.config.status = "connected";
    return true;
  }
  async disconnect() {
    this.config.status = "disconnected";
    return true;
  }
  async testConnection() {
    try {
      await import_axios2.default.get(this.config.url);
      return true;
    } catch (error) {
      return false;
    }
  }
  async fetch(lastSyncTimestamp) {
    try {
      const response = await import_axios2.default.get(this.config.url);
      const xml = response.data;
      const items = [];
      const itemRegex = /<(item|entry)>([\s\S]*?)<\/\1>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null) {
        const content = match[2];
        const title = (content.match(/<title[^>]*>(.*?)<\/title>/) || [])[1];
        const link = (content.match(/<link[^>]*href="([^"]*)"/) || content.match(/<link>(.*?)<\/link>/) || [])[1];
        const description = (content.match(/<description>(.*?)<\/description>/) || content.match(/<summary>(.*?)<\/summary>/) || [])[1];
        const pubDate = (content.match(/<pubDate>(.*?)<\/pubDate>/) || content.match(/<updated>(.*?)<\/updated>/) || [])[1];
        const guid = (content.match(/<guid[^>]*>(.*?)<\/guid>/) || content.match(/<id>(.*?)<\/id>/) || [])[1];
        const itemTimestamp = pubDate ? new Date(pubDate).getTime() : Date.now();
        if (!lastSyncTimestamp || itemTimestamp > lastSyncTimestamp) {
          items.push({
            title: this.decodeHtml(title),
            link,
            description: this.decodeHtml(description),
            pubDate,
            guid,
            timestamp: itemTimestamp
          });
        }
      }
      return items;
    } catch (error) {
      console.error(`[RSSConnector] Fetch failed: ${error.message}`);
      throw error;
    }
  }
  async getSchema() {
    return {
      item: [
        { name: "title", type: "string" },
        { name: "link", type: "string" },
        { name: "description", type: "string" },
        { name: "pubDate", type: "string" },
        { name: "guid", type: "string" }
      ]
    };
  }
  decodeHtml(html) {
    if (!html) return "";
    return html.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"').replace(/&#039;/g, "'").replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1");
  }
};

// plugins/data-osmosis/main/pipeline/Pipeline.ts
var Pipeline = class {
  steps = [];
  addStep(step) {
    this.steps.push(step);
  }
  async execute(data) {
    let result = data;
    for (const step of this.steps) {
      result = await step.process(result);
    }
    return result;
  }
};

// plugins/data-osmosis/main/index.ts
var DataSourceManager = class {
  context;
  sources;
  scheduler;
  constructor(context) {
    this.context = context;
    this.sources = /* @__PURE__ */ new Map();
    this.scheduler = new SyncScheduler(async (id) => {
      await this.sync(id);
    });
    this.registerConnectors();
  }
  registerConnectors() {
    const registry = ConnectorRegistry.getInstance();
    registry.register("postgres", (config) => new PostgresConnector(config));
    registry.register("mongodb", (config) => new MongoDBConnector(config));
    registry.register("web", (config) => new WebScraperConnector(config));
    registry.register("rss", (config) => new RSSConnector(config));
  }
  async load() {
    try {
      const stored = await this.context.storage.get("sources");
      if (stored && Array.isArray(stored)) {
        stored.forEach((s) => {
          this.sources.set(s.id, s);
          this.scheduler.schedule(s);
        });
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
    const id = "src_" + Date.now().toString(36);
    const newConfig = {
      id,
      type: config.type,
      name: config.name || `Source ${id}`,
      connectionString: config.connectionString,
      status: "disconnected",
      recordCount: 0,
      ...config
    };
    const registry = ConnectorRegistry.getInstance();
    let connector;
    try {
      connector = registry.create(newConfig);
      const success = await connector.connect();
      if (success) {
        this.sources.set(id, newConfig);
        this.scheduler.schedule(newConfig);
        await this.save();
        console.log(`[Data Osmosis] Connected to ${newConfig.name}`);
        return newConfig;
      } else {
        throw new Error(newConfig.errorMessage || "Connection failed");
      }
    } catch (err) {
      console.error(`[Data Osmosis] Connection error: ${err.message}`);
      throw err;
    }
  }
  async sync(id) {
    const config = this.sources.get(id);
    if (!config) throw new Error(`Source ${id} not found`);
    console.log(`[Data Osmosis] Syncing ${config.name}...`);
    config.status = "syncing";
    this.notifyUpdate();
    try {
      const registry = ConnectorRegistry.getInstance();
      const connector = registry.create(config);
      await connector.connect();
      let data = await connector.fetch(config.lastSync);
      const pipeline = new Pipeline();
      data = await pipeline.execute(data);
      const newRecords = data.length;
      config.recordCount += newRecords;
      config.lastSync = Date.now();
      config.status = "connected";
      await connector.disconnect();
      await this.save();
      console.log(`[Data Osmosis] Synced ${newRecords} records from ${config.name}`);
      this.notifyUpdate();
      return { recordsIngested: newRecords };
    } catch (err) {
      config.status = "error";
      config.errorMessage = err.message;
      await this.save();
      this.notifyUpdate();
      console.error(`[Data Osmosis] Sync failed for ${config.name}:`, err);
      throw err;
    }
  }
  notifyUpdate() {
    this.context.ipc.send("data-osmosis:update", Array.from(this.sources.values()));
  }
  list() {
    return Array.from(this.sources.values());
  }
  async disconnect(id) {
    const config = this.sources.get(id);
    if (config) {
      this.scheduler.unschedule(id);
      this.sources.delete(id);
      await this.save();
      console.log(`[Data Osmosis] Disconnected source ${id}`);
      this.notifyUpdate();
      return true;
    }
    return false;
  }
  stop() {
    this.scheduler.stopAll();
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
          type: { type: "string", enum: ["postgres", "mongodb", "web", "rss"] },
          connectionString: { type: "string", description: "Connection string or URL" },
          name: { type: "string" },
          mapping: { type: "object" },
          selector: { type: "string", description: "CSS selector for web scraping" },
          syncIntervalMinutes: { type: "number", description: "Auto-sync interval in minutes" }
        },
        required: ["type", "connectionString"]
      },
      version: "1.1.0",
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
    context.traits.register({
      id: "data-osmosis",
      name: "Data Ingestion",
      description: "Ingest data from external sources (Postgres, MongoDB, Web, RSS).",
      instruction: "You can ingest data from external sources. Use `connectDataSource` to link a new source (Postgres, Mongo, Web, RSS) and `syncDataSource` to fetch data. Use `listDataSources` to see what is available.",
      activationMode: "dynamic",
      triggerKeywords: ["data", "database", "postgres", "mongodb", "sql", "ingest", "scrape", "rss", "feed", "sync"]
    });
    console.log("[Data Osmosis] Activated.");
    return manager;
  },
  deactivate: () => {
    console.log("[Data Osmosis] Deactivated.");
  }
};
