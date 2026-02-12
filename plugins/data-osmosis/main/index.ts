import { PluginContext } from '../../../client/src/shared/plugin-types';
import { ConnectorRegistry } from './ConnectorRegistry';
import { DataSourceConfig, DataConnector } from './types';
import { SyncScheduler } from './scheduler/SyncScheduler';
import { PostgresConnector } from './connectors/PostgresConnector';
import { MongoDBConnector } from './connectors/MongoDBConnector';
import { WebScraperConnector } from './connectors/WebScraperConnector';
import { RSSConnector } from './connectors/RSSConnector';
import { Pipeline } from './pipeline/Pipeline';

class DataSourceManager {
  context: PluginContext;
  sources: Map<string, DataSourceConfig>;
  scheduler: SyncScheduler;

  constructor(context: PluginContext) {
    this.context = context;
    this.sources = new Map();
    this.scheduler = new SyncScheduler(async (id) => {
        await this.sync(id);
    });
    this.registerConnectors();
  }

  private registerConnectors() {
    const registry = ConnectorRegistry.getInstance();
    registry.register('postgres', (config) => new PostgresConnector(config));
    registry.register('mongodb', (config) => new MongoDBConnector(config));
    registry.register('web', (config) => new WebScraperConnector(config));
    registry.register('rss', (config) => new RSSConnector(config));
  }

  async load() {
    try {
      const stored = await this.context.storage.get('sources');
      if (stored && Array.isArray(stored)) {
        stored.forEach(s => {
            this.sources.set(s.id, s);
            this.scheduler.schedule(s);
        });
        console.log(`[Data Osmosis] Loaded ${stored.length} sources.`);
      }
    } catch (err) {
      console.error('[Data Osmosis] Failed to load sources:', err);
    }
  }

  async save() {
    try {
      const sources = Array.from(this.sources.values());
      await this.context.storage.set('sources', sources);
    } catch (err) {
      console.error('[Data Osmosis] Failed to save sources:', err);
    }
  }

  async connect(config: any) {
    console.log(`[Data Osmosis] Attempting connection to ${config.type}...`);
    
    const id = 'src_' + Date.now().toString(36);
    const newConfig: DataSourceConfig = {
        id,
        type: config.type,
        name: config.name || `Source ${id}`,
        connectionString: config.connectionString,
        status: 'disconnected',
        recordCount: 0,
        ...config
    };

    const registry = ConnectorRegistry.getInstance();
    let connector: DataConnector;

    try {
        connector = registry.create(newConfig);
        const success = await connector.connect();
        
        if (success) {
            // Test if needed
            // await connector.testConnection();
            
            this.sources.set(id, newConfig);
            this.scheduler.schedule(newConfig);
            await this.save();
            console.log(`[Data Osmosis] Connected to ${newConfig.name}`);
            return newConfig;
        } else {
            throw new Error(newConfig.errorMessage || 'Connection failed');
        }
    } catch (err: any) {
        console.error(`[Data Osmosis] Connection error: ${err.message}`);
        throw err;
    }
  }

  async sync(id: string) {
    const config = this.sources.get(id);
    if (!config) throw new Error(`Source ${id} not found`);

    console.log(`[Data Osmosis] Syncing ${config.name}...`);
    config.status = 'syncing';
    this.notifyUpdate();
    
    try {
        const registry = ConnectorRegistry.getInstance();
        const connector = registry.create(config);
        
        // Ensure connected
        await connector.connect();

        let data = await connector.fetch(config.lastSync);
        
        // Execute Pipeline
        const pipeline = new Pipeline();
        // Add default steps if configured, or just basic validation/cleaning
        // For now, we'll just log it.
        // pipeline.addStep(new ValidationStep());
        
        data = await pipeline.execute(data);

        // Here we would ingest into the Semantic Graph (using context.dsn or similar)
        // For now, we just count records.
        
        const newRecords = data.length;
        config.recordCount += newRecords;
        config.lastSync = Date.now();
        config.status = 'connected';
        
        await connector.disconnect();
        
        await this.save();
        console.log(`[Data Osmosis] Synced ${newRecords} records from ${config.name}`);
        this.notifyUpdate();

        return { recordsIngested: newRecords };
    } catch (err: any) {
        config.status = 'error';
        config.errorMessage = err.message;
        await this.save();
        this.notifyUpdate();
        console.error(`[Data Osmosis] Sync failed for ${config.name}:`, err);
        throw err;
    }
  }

  notifyUpdate() {
      this.context.ipc.send('data-osmosis:update', Array.from(this.sources.values()));
  }

  list() {
    return Array.from(this.sources.values());
  }
  
  async disconnect(id: string) {
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
}

export default {
  activate: async (context: PluginContext) => {
    console.log('[Data Osmosis] Activating...');
    
    const manager = new DataSourceManager(context);
    await manager.load();

    // IPC Handlers for Renderer
    context.ipc.handle('data-osmosis:list', async () => {
      return manager.list();
    });

    context.ipc.handle('data-osmosis:connect', async (config: any) => {
      return await manager.connect(config);
    });

    context.ipc.handle('data-osmosis:sync', async (id: string) => {
      return await manager.sync(id);
    });

    context.ipc.handle('data-osmosis:disconnect', async (id: string) => {
      return await manager.disconnect(id);
    });

    // DSN Tools
    context.dsn.registerTool({
      name: 'connectDataSource',
      description: 'Connects an external data source to the semantic graph',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['postgres', 'mongodb', 'web', 'rss'] },
          connectionString: { type: 'string', description: 'Connection string or URL' },
          name: { type: 'string' },
          mapping: { type: 'object' },
          selector: { type: 'string', description: 'CSS selector for web scraping' },
          syncIntervalMinutes: { type: 'number', description: 'Auto-sync interval in minutes' }
        },
        required: ['type', 'connectionString']
      },
      version: '1.1.0',
      semanticDomain: 'cognitive',
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: 'Neophyte'
    }, async (args: any) => {
      try {
          const source = await manager.connect(args);
          return { status: 'success', source };
      } catch (err: any) {
          return { status: 'error', message: err.message };
      }
    });

    context.dsn.registerTool({
      name: 'syncDataSource',
      description: 'Triggers a sync for a connected data source',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          sourceId: { type: 'string' }
        },
        required: ['sourceId']
      },
      version: '1.0.0',
      semanticDomain: 'cognitive',
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: 'Neophyte'
    }, async (args: any) => {
        try {
          const result = await manager.sync(args.sourceId);
          return { status: 'success', result };
        } catch (err: any) {
            return { status: 'error', message: err.message };
        }
    });

    context.dsn.registerTool({
      name: 'listDataSources',
      description: 'Lists all connected data sources',
      executionLocation: 'SERVER',
      parameters: { type: 'object', properties: {} },
      version: '1.0.0',
      semanticDomain: 'cognitive',
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: 'Neophyte'
    }, async () => {
        return { sources: manager.list() };
    });

    console.log('[Data Osmosis] Activated.');
    return manager; // Return manager instance for potential external usage or testing
  },

  deactivate: () => {
    // We need access to the manager to stop the scheduler.
    // Ideally we'd store the manager instance somewhere accessible.
    // For now, relies on garbage collection or simple deactivation log.
    console.log('[Data Osmosis] Deactivated.');
  }
};
