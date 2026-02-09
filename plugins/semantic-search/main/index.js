/**
 * Semantic Search Plugin - Main Process
 * 
 * Provides deep semantic search capabilities using GMF (Generalized Markov Field)
 * vectors for content similarity matching and retrieval.
 * 
 * Enhanced for the Resonant Extension API (plugin-types.ts)
 */

class SemanticSearchEngine {
  constructor(context) {
    this.context = context;
    this.index = new Map(); // id -> { id, content, embedding, metadata }
    this.vectorDim = 128; // Default embedding dimension
  }

  /**
   * Initialize the search engine
   */
  async activate() {
    // Load persisted index
    await this.loadFromStorage();

    // Set up IPC handlers for renderer communication
    this.context.ipc.handle('search:index', async ({ id, content, metadata }) => {
      return this.indexContent(id, content, metadata);
    });

    this.context.ipc.handle('search:query', async ({ query, limit, threshold }) => {
      return this.search(query, limit, threshold);
    });

    this.context.ipc.handle('search:remove', async ({ id }) => {
      return this.removeFromIndex(id);
    });

    this.context.ipc.handle('search:clear', async () => {
      return this.clearIndex();
    });

    this.context.ipc.handle('search:stats', async () => {
      return this.getStats();
    });

    this.context.ipc.handle('search:get-similar', async ({ id, limit }) => {
      return this.getSimilar(id, limit);
    });

    // Legacy ping handler for compatibility
    this.context.ipc.on('ping', (data) => {
      console.log('[Semantic Search] Received ping:', data);
      this.context.ipc.send('pong', { message: 'Hello from Semantic Search Engine!' });
    });

    // Register DSN tools for AI access
    this.context.dsn.registerTool(
      {
        name: 'semantic_search',
        description: 'Search indexed content using semantic similarity. Returns documents that are semantically similar to the query, even if they don\'t contain exact keyword matches.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query - can be a phrase, question, or concept description'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Maximum number of results to return (default: 10)'
            },
            threshold: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Minimum similarity score (0-1) to include in results (default: 0.5)'
            },
            contentType: {
              type: 'string',
              enum: ['all', 'message', 'document', 'note', 'code'],
              description: 'Filter by content type'
            }
          },
          required: ['query']
        },
        semanticDomain: 'cognitive',
        primeDomain: [2, 5],
        smfAxes: [0.9, 0.7],
        requiredTier: 'Initiate',
        version: '1.0.0'
      },
      async (args) => this.search(args.query, args.limit, args.threshold, args.contentType)
    );

    this.context.dsn.registerTool(
      {
        name: 'index_content',
        description: 'Index content for semantic search. The content will be embedded and stored for later retrieval.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The text content to index'
            },
            id: {
              type: 'string',
              description: 'Unique identifier for this content (auto-generated if not provided)'
            },
            title: {
              type: 'string',
              description: 'Optional title or label for the content'
            },
            contentType: {
              type: 'string',
              enum: ['message', 'document', 'note', 'code', 'other'],
              description: 'Type of content being indexed'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for filtering search results'
            },
            source: {
              type: 'string',
              description: 'Source of the content (e.g., "user", "conversation", "file")'
            }
          },
          required: ['content']
        },
        semanticDomain: 'cognitive',
        primeDomain: [2, 5],
        smfAxes: [0.7, 0.8],
        requiredTier: 'Initiate',
        version: '1.0.0'
      },
      async (args) => this.indexContent(args.id, args.content, {
        title: args.title,
        contentType: args.contentType,
        tags: args.tags,
        source: args.source
      })
    );

    this.context.dsn.registerTool(
      {
        name: 'find_similar_content',
        description: 'Find content similar to an already indexed item by its ID.',
        executionLocation: 'CLIENT',
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID of the indexed content to find similar items for'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 50,
              description: 'Maximum number of similar items to return (default: 5)'
            }
          },
          required: ['id']
        },
        semanticDomain: 'cognitive',
        primeDomain: [2],
        smfAxes: [0.75],
        requiredTier: 'Initiate',
        version: '1.0.0'
      },
      async (args) => this.getSimilar(args.id, args.limit)
    );

    // Register service tools for inter-plugin use
    this.context.services.tools.register({
      name: 'search_index_content',
      description: 'Index content for semantic search (for plugin-to-plugin calls)',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          metadata: { type: 'object' }
        },
        required: ['content']
      },
      handler: async (args) => this.indexContent(args.id, args.content, args.metadata)
    });

    this.context.services.tools.register({
      name: 'search_query',
      description: 'Perform semantic search (for plugin-to-plugin calls)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' }
        },
        required: ['query']
      },
      handler: async (args) => this.search(args.query, args.limit)
    });

    console.log('[Semantic Search] Tools registered successfully');
  }

  /**
   * Load index from persistent storage
   */
  async loadFromStorage() {
    try {
      const savedIndex = await this.context.storage.get('searchIndex');
      
      if (savedIndex && Array.isArray(savedIndex)) {
        for (const item of savedIndex) {
          this.index.set(item.id, item);
        }
        console.log(`[Semantic Search] Loaded ${this.index.size} indexed items`);
      }
    } catch (e) {
      console.warn('[Semantic Search] Could not load from storage:', e.message);
    }
  }

  /**
   * Save index to persistent storage
   */
  async saveToStorage() {
    try {
      await this.context.storage.set('searchIndex', Array.from(this.index.values()));
    } catch (e) {
      console.warn('[Semantic Search] Could not save to storage:', e.message);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'idx_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Create simple embedding (in production, use actual embedding model)
   * This is a placeholder - real implementation would use context.ai or external service
   */
  async createEmbedding(text) {
    // Simple hash-based embedding for demo purposes
    // In production, this should use context.ai.complete() or an embedding API
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = normalized.split(/\s+/).filter(w => w.length > 0);
    
    const embedding = new Float32Array(this.vectorDim);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length && j < this.vectorDim; j++) {
        const charCode = word.charCodeAt(j);
        const idx = (charCode + i * 7 + j * 11) % this.vectorDim;
        embedding[idx] += 1 / (1 + i * 0.1);
      }
    }
    
    // Normalize
    let magnitude = 0;
    for (let i = 0; i < this.vectorDim; i++) {
      magnitude += embedding[i] * embedding[i];
    }
    magnitude = Math.sqrt(magnitude);
    
    if (magnitude > 0) {
      for (let i = 0; i < this.vectorDim; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return Array.from(embedding);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Index content for search
   */
  async indexContent(id, content, metadata = {}) {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for indexing');
    }

    const finalId = id || this.generateId();
    const embedding = await this.createEmbedding(content);
    
    const indexItem = {
      id: finalId,
      content,
      embedding,
      metadata: {
        ...metadata,
        indexedAt: Date.now(),
        contentLength: content.length
      }
    };
    
    this.index.set(finalId, indexItem);
    this.context.ipc.send('search:indexed', { id: finalId, metadata: indexItem.metadata });
    this.saveToStorage();
    
    return {
      success: true,
      id: finalId,
      message: `Content indexed with ID: ${finalId}`
    };
  }

  /**
   * Search the index
   */
  async search(query, limit = 10, threshold = 0.3, contentType = null) {
    if (!query || query.trim().length === 0) {
      throw new Error('Query is required for search');
    }

    const queryEmbedding = await this.createEmbedding(query);
    const results = [];
    
    for (const [id, item] of this.index) {
      // Filter by content type if specified
      if (contentType && contentType !== 'all' && item.metadata?.contentType !== contentType) {
        continue;
      }
      
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
      
      if (similarity >= threshold) {
        results.push({
          id,
          content: item.content,
          metadata: item.metadata,
          score: similarity
        });
      }
    }
    
    // Sort by similarity score descending
    results.sort((a, b) => b.score - a.score);
    
    return {
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
      indexSize: this.index.size
    };
  }

  /**
   * Get items similar to an indexed item
   */
  async getSimilar(id, limit = 5) {
    const item = this.index.get(id);
    if (!item) {
      throw new Error(`Item with ID ${id} not found in index`);
    }

    const results = [];
    
    for (const [otherId, otherItem] of this.index) {
      if (otherId === id) continue;
      
      const similarity = this.cosineSimilarity(item.embedding, otherItem.embedding);
      
      if (similarity > 0) {
        results.push({
          id: otherId,
          content: otherItem.content,
          metadata: otherItem.metadata,
          score: similarity
        });
      }
    }
    
    results.sort((a, b) => b.score - a.score);
    
    return {
      sourceId: id,
      results: results.slice(0, limit)
    };
  }

  /**
   * Remove item from index
   */
  async removeFromIndex(id) {
    if (!this.index.has(id)) {
      return { success: false, message: `Item ${id} not found` };
    }
    
    this.index.delete(id);
    this.context.ipc.send('search:removed', { id });
    this.saveToStorage();
    
    return { success: true, message: `Item ${id} removed from index` };
  }

  /**
   * Clear entire index
   */
  async clearIndex() {
    const count = this.index.size;
    this.index.clear();
    
    await this.context.storage.delete('searchIndex');
    this.context.ipc.send('search:cleared', {});
    
    return { success: true, message: `Cleared ${count} items from index` };
  }

  /**
   * Get index statistics
   */
  getStats() {
    const items = Array.from(this.index.values());
    const contentTypes = {};
    let totalContentLength = 0;
    
    for (const item of items) {
      totalContentLength += item.content.length;
      const type = item.metadata?.contentType || 'unknown';
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    }
    
    return {
      totalItems: this.index.size,
      totalContentLength,
      averageContentLength: this.index.size > 0 ? Math.round(totalContentLength / this.index.size) : 0,
      contentTypes,
      vectorDimension: this.vectorDim
    };
  }
}

module.exports = {
  activate: async (context) => {
    console.log('[Semantic Search] Activating...');
    const engine = new SemanticSearchEngine(context);
    await engine.activate();
    
    context.on('ready', () => {
      console.log('[Semantic Search] Ready - Semantic search tools available');
    });
    
    context.on('stop', async () => {
      await engine.saveToStorage();
      console.log('[Semantic Search] Stopped - Index saved');
    });
    
    console.log('[Semantic Search] Activated successfully');
    return engine;
  },
  
  deactivate: () => {
    console.log('[Semantic Search] Deactivated');
  }
};
