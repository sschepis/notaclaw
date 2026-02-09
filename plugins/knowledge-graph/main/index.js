/**
 * Knowledge Graph Plugin - Main Process
 * 
 * Provides a semantic knowledge graph for storing and querying
 * entities, relationships, and concepts within the AlephNet ecosystem.
 * 
 * Enhanced for the Resonant Extension API (plugin-types.ts)
 */

class GraphStore {
  constructor(context) {
    this.context = context;
    this.triples = [];
    this.entities = new Map(); // id -> { id, type, name, properties }
    this.relations = new Map(); // id -> { id, subject, predicate, object, metadata }
  }

  /**
   * Initialize the graph store and register tools
   */
  async activate() {
    // Load persisted data
    await this.loadFromStorage();

    // Set up IPC handlers for renderer communication
    this.context.ipc.handle('kg:query', async ({ subject, predicate, object }) => {
      return this.query(subject, predicate, object);
    });
    
    this.context.ipc.handle('kg:insert', async (triple) => {
      return this.insert(triple);
    });

    this.context.ipc.handle('kg:add-entity', async (entity) => {
      return this.addEntity(entity);
    });

    this.context.ipc.handle('kg:get-entity', async ({ id }) => {
      return this.getEntity(id);
    });

    this.context.ipc.handle('kg:search-entities', async ({ query, type }) => {
      return this.searchEntities(query, type);
    });

    this.context.ipc.handle('kg:get-related', async ({ entityId, depth }) => {
      return this.getRelated(entityId, depth);
    });

    this.context.ipc.handle('kg:get-graph', async () => {
      return this.getGraph();
    });

    this.context.ipc.handle('kg:clear', async () => {
      return this.clear();
    });

    // Register DSN tools for AI access
    this.context.dsn.registerTool(
      {
        name: 'query_knowledge',
        description: 'Query the knowledge graph for entities and relationships. Use subject/predicate/object patterns to find matching triples.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Subject entity ID or name to match (optional)'
            },
            predicate: {
              type: 'string',
              description: 'Relationship type to match (optional)'
            },
            object: {
              type: 'string',
              description: 'Object entity ID or name to match (optional)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)'
            }
          },
          required: []
        },
        semanticDomain: 'cognitive',
        primeDomain: [2, 5],
        smfAxes: [0.8, 0.6],
        requiredTier: 'Initiate',
        version: '1.0.0'
      },
      async (args) => this.query(args.subject, args.predicate, args.object, args.limit)
    );

    this.context.dsn.registerTool(
      {
        name: 'add_knowledge',
        description: 'Add new knowledge to the graph. Creates entities and relationships between concepts.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'The subject entity (source of the relationship)'
            },
            predicate: {
              type: 'string',
              description: 'The relationship type (e.g., "is_a", "has_property", "related_to")'
            },
            object: {
              type: 'string',
              description: 'The object entity (target of the relationship)'
            },
            subjectType: {
              type: 'string',
              description: 'Type of the subject entity (e.g., "person", "concept", "organization")'
            },
            objectType: {
              type: 'string',
              description: 'Type of the object entity'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence score for this knowledge (0-1)'
            },
            source: {
              type: 'string',
              description: 'Source of this knowledge (e.g., "user", "inference", "external")'
            }
          },
          required: ['subject', 'predicate', 'object']
        },
        semanticDomain: 'cognitive',
        primeDomain: [2, 5],
        smfAxes: [0.7, 0.8],
        requiredTier: 'Initiate',
        version: '1.0.0'
      },
      async (args) => this.addKnowledge(args)
    );

    this.context.dsn.registerTool(
      {
        name: 'get_related_entities',
        description: 'Get all entities related to a given entity, traversing the knowledge graph.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            entityId: {
              type: 'string',
              description: 'The ID or name of the entity to explore'
            },
            depth: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'How many hops to traverse (default: 2)'
            },
            relationTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific relationship types'
            }
          },
          required: ['entityId']
        },
        semanticDomain: 'cognitive',
        primeDomain: [2, 3, 5],
        smfAxes: [0.7, 0.5, 0.8],
        requiredTier: 'Adept',
        version: '1.0.0'
      },
      async (args) => this.getRelated(args.entityId, args.depth, args.relationTypes)
    );

    this.context.dsn.registerTool(
      {
        name: 'search_knowledge',
        description: 'Search entities in the knowledge graph by text query and/or type.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for in entity names and properties'
            },
            type: {
              type: 'string',
              description: 'Filter by entity type'
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)'
            }
          },
          required: []
        },
        semanticDomain: 'cognitive',
        primeDomain: [2],
        smfAxes: [0.6],
        requiredTier: 'Initiate',
        version: '1.0.0'
      },
      async (args) => this.searchEntities(args.query, args.type, args.limit)
    );

    // Register service tools for inter-plugin use
    this.context.services.tools.register({
      name: 'kg_add_triple',
      description: 'Add a triple to the knowledge graph (for plugin-to-plugin calls)',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          predicate: { type: 'string' },
          object: { type: 'string' }
        },
        required: ['subject', 'predicate', 'object']
      },
      handler: async (args) => this.insert(args)
    });

    this.context.services.tools.register({
      name: 'kg_query',
      description: 'Query the knowledge graph (for plugin-to-plugin calls)',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          predicate: { type: 'string' },
          object: { type: 'string' }
        },
        required: []
      },
      handler: async (args) => this.query(args.subject, args.predicate, args.object)
    });

    console.log('[Knowledge Graph] Tools registered successfully');
  }

  /**
   * Load graph from persistent storage
   */
  async loadFromStorage() {
    try {
      const savedTriples = await this.context.storage.get('triples');
      const savedEntities = await this.context.storage.get('entities');
      const savedRelations = await this.context.storage.get('relations');
      
      if (savedTriples && Array.isArray(savedTriples)) {
        this.triples = savedTriples;
      }
      
      if (savedEntities && Array.isArray(savedEntities)) {
        for (const entity of savedEntities) {
          this.entities.set(entity.id, entity);
        }
      }
      
      if (savedRelations && Array.isArray(savedRelations)) {
        for (const relation of savedRelations) {
          this.relations.set(relation.id, relation);
        }
      }
      
      console.log(`[Knowledge Graph] Loaded ${this.triples.length} triples, ${this.entities.size} entities`);
    } catch (e) {
      console.warn('[Knowledge Graph] Could not load from storage:', e.message);
    }
  }

  /**
   * Save graph to persistent storage
   */
  async saveToStorage() {
    try {
      await this.context.storage.set('triples', this.triples);
      await this.context.storage.set('entities', Array.from(this.entities.values()));
      await this.context.storage.set('relations', Array.from(this.relations.values()));
    } catch (e) {
      console.warn('[Knowledge Graph] Could not save to storage:', e.message);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Normalize entity name/ID for consistent lookup
   */
  normalizeId(str) {
    return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Add or get entity by name
   */
  getOrCreateEntity(name, type = 'concept') {
    const normalizedId = this.normalizeId(name);
    
    if (this.entities.has(normalizedId)) {
      return this.entities.get(normalizedId);
    }
    
    const entity = {
      id: normalizedId,
      name: name,
      type: type,
      properties: {},
      createdAt: Date.now()
    };
    
    this.entities.set(normalizedId, entity);
    return entity;
  }

  /**
   * Add entity directly
   */
  addEntity(entity) {
    if (!entity.name) {
      throw new Error('Entity name is required');
    }
    
    const id = entity.id || this.normalizeId(entity.name);
    const newEntity = {
      id,
      name: entity.name,
      type: entity.type || 'concept',
      properties: entity.properties || {},
      createdAt: Date.now()
    };
    
    this.entities.set(id, newEntity);
    this.context.ipc.send('kg:entity-added', newEntity);
    this.saveToStorage();
    
    return newEntity;
  }

  /**
   * Get entity by ID
   */
  getEntity(id) {
    return this.entities.get(id) || this.entities.get(this.normalizeId(id));
  }

  /**
   * Search entities by query and type
   */
  searchEntities(query, type, limit = 20) {
    let results = Array.from(this.entities.values());
    
    if (type) {
      results = results.filter(e => e.type === type);
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(e => 
        e.name.toLowerCase().includes(lowerQuery) ||
        e.id.includes(lowerQuery) ||
        JSON.stringify(e.properties).toLowerCase().includes(lowerQuery)
      );
    }
    
    return results.slice(0, limit);
  }

  /**
   * Add knowledge (subject-predicate-object with automatic entity creation)
   */
  addKnowledge({ subject, predicate, object, subjectType, objectType, confidence = 1, source = 'user' }) {
    const subjectEntity = this.getOrCreateEntity(subject, subjectType);
    const objectEntity = this.getOrCreateEntity(object, objectType);
    
    const relation = {
      id: this.generateId(),
      subject: subjectEntity.id,
      predicate: predicate,
      object: objectEntity.id,
      confidence,
      source,
      createdAt: Date.now()
    };
    
    this.relations.set(relation.id, relation);
    
    // Also add to triples for backward compatibility
    this.triples.push({
      subject: subjectEntity.id,
      predicate,
      object: objectEntity.id,
      timestamp: Date.now(),
      confidence,
      source
    });
    
    this.context.ipc.send('kg:knowledge-added', {
      relation,
      subjectEntity,
      objectEntity
    });
    
    this.saveToStorage();
    
    return {
      success: true,
      relation,
      subjectEntity,
      objectEntity,
      message: `Added: ${subject} --[${predicate}]--> ${object}`
    };
  }

  /**
   * Insert a triple (legacy compatibility)
   */
  insert(triple) {
    const newTriple = {
      ...triple,
      timestamp: Date.now()
    };
    
    this.triples.push(newTriple);
    this.context.ipc.send('kg:update', newTriple);
    this.saveToStorage();
    
    return {
      success: true,
      triple: newTriple
    };
  }

  /**
   * Query triples
   */
  query(s, p, o, limit = 20) {
    let results = this.triples.filter(t => 
      (!s || t.subject === s || t.subject === this.normalizeId(s)) &&
      (!p || t.predicate === p) &&
      (!o || t.object === o || t.object === this.normalizeId(o))
    );
    
    return results.slice(0, limit);
  }

  /**
   * Get related entities with traversal
   */
  getRelated(entityId, depth = 2, relationTypes = null) {
    const normalizedId = this.normalizeId(entityId);
    const visited = new Set();
    const result = {
      entities: [],
      relations: [],
      root: normalizedId
    };
    
    const traverse = (currentId, currentDepth) => {
      if (currentDepth > depth || visited.has(currentId)) return;
      visited.add(currentId);
      
      const entity = this.entities.get(currentId);
      if (entity && !result.entities.find(e => e.id === entity.id)) {
        result.entities.push(entity);
      }
      
      // Find outgoing relations
      for (const [, rel] of this.relations) {
        if (rel.subject === currentId) {
          if (!relationTypes || relationTypes.includes(rel.predicate)) {
            if (!result.relations.find(r => r.id === rel.id)) {
              result.relations.push(rel);
            }
            traverse(rel.object, currentDepth + 1);
          }
        }
        // Also check incoming
        if (rel.object === currentId) {
          if (!relationTypes || relationTypes.includes(rel.predicate)) {
            if (!result.relations.find(r => r.id === rel.id)) {
              result.relations.push(rel);
            }
            traverse(rel.subject, currentDepth + 1);
          }
        }
      }
    };
    
    traverse(normalizedId, 0);
    return result;
  }

  /**
   * Get the entire graph
   */
  getGraph() {
    return {
      entities: Array.from(this.entities.values()),
      relations: Array.from(this.relations.values()),
      triples: this.triples,
      stats: {
        entityCount: this.entities.size,
        relationCount: this.relations.size,
        tripleCount: this.triples.length
      }
    };
  }

  /**
   * Clear the entire graph
   */
  async clear() {
    this.triples = [];
    this.entities.clear();
    this.relations.clear();
    
    await this.context.storage.delete('triples');
    await this.context.storage.delete('entities');
    await this.context.storage.delete('relations');
    
    this.context.ipc.send('kg:cleared', {});
    
    return { success: true, message: 'Knowledge graph cleared' };
  }
}

module.exports = {
  activate: async (context) => {
    console.log('[Knowledge Graph] Activating...');
    const store = new GraphStore(context);
    await store.activate();
    
    context.on('ready', () => {
      console.log('[Knowledge Graph] Ready - Knowledge graph tools available');
    });
    
    context.on('stop', async () => {
      await store.saveToStorage();
      console.log('[Knowledge Graph] Stopped - State saved');
    });
    
    console.log('[Knowledge Graph] Activated successfully');
    return store;
  },
  
  deactivate: () => {
    console.log('[Knowledge Graph] Deactivated');
  }
};
