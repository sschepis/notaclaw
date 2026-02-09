
class DataSourceManager {
  constructor(context) {
    this.context = context;
    this.sources = new Map();
  }

  async load() {
    try {
      const stored = await this.context.storage.get('sources');
      if (stored && Array.isArray(stored)) {
        stored.forEach(s => this.sources.set(s.id, s));
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

  async connect(config) {
    console.log(`[Data Osmosis] Attempting connection to ${config.type}...`);
    
    // Simulate connection validation
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (config.type === 'postgres' && !config.connectionString.includes('postgres://')) {
        throw new Error('Invalid PostgreSQL connection string. Must start with postgres://');
    }
    
    if (config.type === 'mongodb' && !config.connectionString.includes('mongodb://')) {
        throw new Error('Invalid MongoDB connection string. Must start with mongodb://');
    }

    const id = 'src_' + Date.now().toString(36);
    const newSource = {
        id,
        type: config.type,
        name: config.name || `Source ${id}`,
        connectionString: config.connectionString, // In real app, encrypt this!
        status: 'connected',
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
    source.status = 'syncing';
    // Notify renderer of update
    this.context.ipc.send('data-osmosis:update', Array.from(this.sources.values()));
    
    // Simulate data ingestion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newRecords = Math.floor(Math.random() * 50) + 1;
    source.recordCount += newRecords;
    source.lastSync = Date.now();
    source.status = 'connected';
    
    await this.save();
    console.log(`[Data Osmosis] Synced ${newRecords} records from ${source.name}`);
    
    // Notify renderer of update
    this.context.ipc.send('data-osmosis:update', Array.from(this.sources.values()));

    return { recordsIngested: newRecords };
  }

  list() {
    return Array.from(this.sources.values());
  }
  
  async disconnect(id) {
      if (this.sources.delete(id)) {
          await this.save();
          console.log(`[Data Osmosis] Disconnected source ${id}`);
          // Notify renderer
          this.context.ipc.send('data-osmosis:update', Array.from(this.sources.values()));
          return true;
      }
      return false;
  }
}

module.exports = {
  activate: async (context) => {
    console.log('[Data Osmosis] Activating...');
    
    const manager = new DataSourceManager(context);
    await manager.load();

    // IPC Handlers for Renderer
    context.ipc.handle('data-osmosis:list', async () => {
      return manager.list();
    });

    context.ipc.handle('data-osmosis:connect', async (config) => {
      return await manager.connect(config);
    });

    context.ipc.handle('data-osmosis:sync', async (id) => {
      return await manager.sync(id);
    });

    context.ipc.handle('data-osmosis:disconnect', async (id) => {
      return await manager.disconnect(id);
    });

    // DSN Tools
    context.dsn.registerTool({
      name: 'connectDataSource',
      description: 'Connects an external data source to the semantic graph',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['postgres', 'mysql', 'mongodb', 'rest'] },
          connectionString: { type: 'string' },
          name: { type: 'string' },
          mapping: { type: 'object' }
        },
        required: ['type', 'connectionString']
      }
    }, async (args) => {
      try {
          const source = await manager.connect(args);
          return { status: 'success', source };
      } catch (err) {
          return { status: 'error', message: err.message };
      }
    });

    context.dsn.registerTool({
      name: 'syncDataSource',
      description: 'Triggers a sync for a connected data source',
      parameters: {
        type: 'object',
        properties: {
          sourceId: { type: 'string' }
        },
        required: ['sourceId']
      }
    }, async (args) => {
        try {
          const result = await manager.sync(args.sourceId);
          return { status: 'success', result };
        } catch (err) {
            return { status: 'error', message: err.message };
        }
    });

    context.dsn.registerTool({
      name: 'listDataSources',
      description: 'Lists all connected data sources',
      parameters: { type: 'object', properties: {} }
    }, async () => {
        return { sources: manager.list() };
    });

    console.log('[Data Osmosis] Activated.');
  },

  deactivate: () => {
    console.log('[Data Osmosis] Deactivated.');
  }
};

