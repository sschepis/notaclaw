# Embedding Service & SMF Projection

The **Embedding Service** provides the bridge between natural language content and AlephNet's 16-dimensional Sedenion Memory Field (SMF). This document defines how embeddings are generated, projected, cached, and used throughout the system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMBEDDING PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐  │
│  │    INPUT      │────▶│   EMBEDDING   │────▶│   PROJECTION  │  │
│  │               │     │               │     │               │  │
│  │ • Text        │     │ • OpenAI      │     │ • PCA         │  │
│  │ • Images      │     │ • Cohere      │     │ • Autoencoder │  │
│  │ • Audio       │     │ • Local BERT  │     │ • Learned     │  │
│  └───────────────┘     └───────────────┘     └───────────────┘  │
│                              │                      │            │
│                              ▼                      ▼            │
│                    ┌───────────────┐     ┌───────────────┐      │
│                    │    CACHE      │     │  SMF VECTOR   │      │
│                    │               │     │               │      │
│                    │ • Content hash│     │ • 16 floats   │      │
│                    │ • TTL         │     │ • [-1, 1]     │      │
│                    │ • Gun sync    │     │ • Normalized  │      │
│                    └───────────────┘     └───────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Embedding Service Interface

```typescript
/**
 * EmbeddingService - Generate and manage embeddings
 */
export interface EmbeddingService {
  /** Model name for provenance tracking */
  readonly modelName: string;
  
  /** Native embedding dimensions */
  readonly nativeDimensions: number;
  
  /** SMF dimensions (always 16) */
  readonly smfDimensions: 16;
  
  /**
   * Generate embedding for text content
   */
  embed(text: string): Promise<number[]>;
  
  /**
   * Generate SMF projection for text content
   */
  embedToSMF(text: string): Promise<SMFVector>;
  
  /**
   * Batch embed multiple texts
   */
  batchEmbed(texts: string[]): Promise<number[][]>;
  
  /**
   * Batch embed to SMF
   */
  batchEmbedToSMF(texts: string[]): Promise<SMFVector[]>;
  
  /**
   * Calculate similarity between two texts
   */
  similarity(text1: string, text2: string): Promise<number>;
  
  /**
   * Calculate similarity between SMF vectors
   */
  smfSimilarity(smf1: SMFVector, smf2: SMFVector): number;
  
  /**
   * Get embedding from cache or generate
   */
  getOrEmbed(text: string, cacheKey?: string): Promise<CachedEmbedding>;
  
  /**
   * Invalidate cached embeddings
   */
  invalidateCache(pattern?: string): Promise<number>;
}

/**
 * SMF Vector - Always 16 dimensions, normalized
 */
export type SMFVector = [
  number, number, number, number,  // Perceptual (0-3)
  number, number, number, number,  // Cognitive (4-7)
  number, number, number, number,  // Temporal (8-11)
  number, number, number, number   // Meta (12-15)
];

export interface CachedEmbedding {
  smf: SMFVector;
  nativeEmbedding: number[];
  modelName: string;
  generatedAt: number;
  cachedAt: number;
  cacheKey: string;
  hitCount: number;
}
```

## Provider Implementations

### OpenAI Provider

```typescript
export class OpenAIEmbeddingProvider implements EmbeddingService {
  readonly modelName = 'text-embedding-3-small';
  readonly nativeDimensions = 1536;
  readonly smfDimensions = 16 as const;
  
  private projectionMatrix: number[][];  // 1536 x 16
  
  constructor(
    private apiKey: string,
    private cache: EmbeddingCache,
    private projector: SMFProjector
  ) {}
  
  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.modelName,
        input: text
      })
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async embedToSMF(text: string): Promise<SMFVector> {
    const native = await this.embed(text);
    return this.projector.project(native);
  }
  
  smfSimilarity(smf1: SMFVector, smf2: SMFVector): number {
    return cosineSimilarity(smf1, smf2);
  }
}
```

### Local Model Provider

```typescript
export class LocalEmbeddingProvider implements EmbeddingService {
  readonly modelName = 'all-MiniLM-L6-v2';
  readonly nativeDimensions = 384;
  readonly smfDimensions = 16 as const;
  
  private model: any;  // ONNX runtime model
  
  constructor(
    private modelPath: string,
    private cache: EmbeddingCache,
    private projector: SMFProjector
  ) {}
  
  async initialize(): Promise<void> {
    this.model = await loadONNXModel(this.modelPath);
  }
  
  async embed(text: string): Promise<number[]> {
    const tokens = tokenize(text);
    const output = await this.model.run(tokens);
    return meanPooling(output);
  }
  
  async embedToSMF(text: string): Promise<SMFVector> {
    const native = await this.embed(text);
    return this.projector.project(native);
  }
}
```

## SMF Projection

### Projection Strategies

```typescript
export interface SMFProjector {
  /** Project high-dimensional embedding to 16-dim SMF */
  project(embedding: number[]): SMFVector;
  
  /** Train/update projection matrix */
  fit(embeddings: number[][], labels?: SemanticDomain[]): Promise<void>;
  
  /** Save projection parameters */
  save(): Promise<Uint8Array>;
  
  /** Load projection parameters */
  load(data: Uint8Array): Promise<void>;
}

/**
 * PCA-based projector
 * Reduces dimensions while preserving variance
 */
export class PCAProjector implements SMFProjector {
  private components: number[][];  // 16 principal components
  private mean: number[];
  
  project(embedding: number[]): SMFVector {
    // Center the data
    const centered = embedding.map((v, i) => v - this.mean[i]);
    
    // Project onto principal components
    const smf: number[] = new Array(16);
    for (let i = 0; i < 16; i++) {
      smf[i] = dotProduct(centered, this.components[i]);
    }
    
    // Normalize to [-1, 1]
    return normalize(smf) as SMFVector;
  }
  
  async fit(embeddings: number[][]): Promise<void> {
    // Compute mean
    this.mean = computeMean(embeddings);
    
    // Center data
    const centered = embeddings.map(e => 
      e.map((v, i) => v - this.mean[i])
    );
    
    // Compute covariance matrix
    const cov = computeCovariance(centered);
    
    // Eigen decomposition (get top 16 eigenvectors)
    const { eigenvectors } = eigenDecomposition(cov, 16);
    this.components = eigenvectors;
  }
}

/**
 * Domain-aware projector
 * Maps dimensions to semantic domains
 */
export class DomainAwareProjector implements SMFProjector {
  private domainMatrices: Record<SemanticDomain, number[][]>;
  
  project(embedding: number[]): SMFVector {
    const smf: number[] = new Array(16).fill(0);
    
    // Project each domain separately
    for (const [domain, matrix] of Object.entries(this.domainMatrices)) {
      const startIdx = getDomainStartIndex(domain as SemanticDomain);
      const projected = matrixVectorMultiply(matrix, embedding);
      
      for (let i = 0; i < 4; i++) {
        smf[startIdx + i] = projected[i];
      }
    }
    
    return normalize(smf) as SMFVector;
  }
  
  async fit(
    embeddings: number[][],
    labels: SemanticDomain[]
  ): Promise<void> {
    // Group by domain
    const byDomain = groupBy(
      embeddings.map((e, i) => ({ embedding: e, domain: labels[i] })),
      'domain'
    );
    
    // Fit separate projections for each domain
    for (const [domain, samples] of Object.entries(byDomain)) {
      const domainEmbeddings = samples.map(s => s.embedding);
      this.domainMatrices[domain as SemanticDomain] = 
        await fitDomainProjection(domainEmbeddings, 4);
    }
  }
}

/**
 * Neural projector (learned projection)
 */
export class NeuralProjector implements SMFProjector {
  private encoder: any;  // ONNX model
  
  project(embedding: number[]): SMFVector {
    const output = this.encoder.run([embedding]);
    return output[0] as SMFVector;
  }
  
  async train(
    embeddings: number[][],
    targetSMFs: SMFVector[]
  ): Promise<void> {
    // Train autoencoder to reconstruct SMF from embeddings
    // Uses reconstruction loss + domain classification loss
  }
}
```

### Domain Mapping

```typescript
/**
 * Map SMF axes to semantic domains
 */
export const SMF_AXIS_MAPPING = {
  // Perceptual (0-3): Sensory, observational
  0: { name: 'visual_salience', domain: 'perceptual' },
  1: { name: 'auditory_prominence', domain: 'perceptual' },
  2: { name: 'spatial_orientation', domain: 'perceptual' },
  3: { name: 'motion_change', domain: 'perceptual' },
  
  // Cognitive (4-7): Reasoning, analysis
  4: { name: 'logical_complexity', domain: 'cognitive' },
  5: { name: 'emotional_valence', domain: 'cognitive' },
  6: { name: 'certainty', domain: 'cognitive' },
  7: { name: 'relevance', domain: 'cognitive' },
  
  // Temporal (8-11): Time, causality
  8: { name: 'immediacy', domain: 'temporal' },
  9: { name: 'duration', domain: 'temporal' },
  10: { name: 'periodicity', domain: 'temporal' },
  11: { name: 'causal_weight', domain: 'temporal' },
  
  // Meta (12-15): Self-reference, abstraction
  12: { name: 'self_reference', domain: 'meta' },
  13: { name: 'abstraction_level', domain: 'meta' },
  14: { name: 'coherence', domain: 'meta' },
  15: { name: 'network_consensus', domain: 'meta' }
};

/**
 * Determine primary domain from SMF vector
 */
export function determineDomain(smf: SMFVector): SemanticDomain {
  const domainMagnitudes = {
    perceptual: magnitude(smf.slice(0, 4)),
    cognitive: magnitude(smf.slice(4, 8)),
    temporal: magnitude(smf.slice(8, 12)),
    meta: magnitude(smf.slice(12, 16))
  };
  
  return Object.entries(domainMagnitudes)
    .sort((a, b) => b[1] - a[1])[0][0] as SemanticDomain;
}

/**
 * Find secondary domains (above threshold)
 */
export function findSecondaryDomains(
  smf: SMFVector,
  threshold = 0.5
): SemanticDomain[] {
  const domainMagnitudes = {
    perceptual: magnitude(smf.slice(0, 4)),
    cognitive: magnitude(smf.slice(4, 8)),
    temporal: magnitude(smf.slice(8, 12)),
    meta: magnitude(smf.slice(12, 16))
  };
  
  const primary = determineDomain(smf);
  const maxMag = domainMagnitudes[primary];
  
  return Object.entries(domainMagnitudes)
    .filter(([domain, mag]) => 
      domain !== primary && mag >= maxMag * threshold
    )
    .map(([domain]) => domain as SemanticDomain);
}
```

## Caching Strategy

```typescript
export interface EmbeddingCache {
  /** Get cached embedding by content hash */
  get(contentHash: string): Promise<CachedEmbedding | null>;
  
  /** Store embedding with content hash */
  set(contentHash: string, embedding: CachedEmbedding): Promise<void>;
  
  /** Check if content hash exists */
  has(contentHash: string): Promise<boolean>;
  
  /** Invalidate entries matching pattern */
  invalidate(pattern?: string): Promise<number>;
  
  /** Get cache statistics */
  stats(): Promise<CacheStats>;
}

export interface CacheStats {
  entries: number;
  hitRate: number;
  missRate: number;
  avgLatencyMs: number;
  sizeBytes: number;
}

/**
 * Multi-tier cache implementation
 */
export class TieredEmbeddingCache implements EmbeddingCache {
  constructor(
    private memoryCache: LRUCache<string, CachedEmbedding>,
    private gunCache: GunCacheAdapter,
    private ttlMs: number = 7 * 24 * 60 * 60 * 1000  // 7 days
  ) {}
  
  async get(contentHash: string): Promise<CachedEmbedding | null> {
    // Level 1: Memory cache
    const memResult = this.memoryCache.get(contentHash);
    if (memResult) {
      memResult.hitCount++;
      return memResult;
    }
    
    // Level 2: Gun cache (distributed)
    const gunResult = await this.gunCache.get(contentHash);
    if (gunResult && Date.now() - gunResult.cachedAt < this.ttlMs) {
      // Promote to memory cache
      this.memoryCache.set(contentHash, gunResult);
      gunResult.hitCount++;
      return gunResult;
    }
    
    return null;
  }
  
  async set(contentHash: string, embedding: CachedEmbedding): Promise<void> {
    embedding.cachedAt = Date.now();
    embedding.cacheKey = contentHash;
    
    // Store in both tiers
    this.memoryCache.set(contentHash, embedding);
    await this.gunCache.set(contentHash, embedding);
  }
}

/**
 * Gun.js cache adapter for distributed caching
 */
class GunCacheAdapter {
  constructor(private gun: any) {}
  
  async get(key: string): Promise<CachedEmbedding | null> {
    return new Promise((resolve) => {
      this.gun.get('embeddings').get(key).once((data: any) => {
        if (data && data.smf) {
          resolve({
            smf: data.smf,
            nativeEmbedding: data.nativeEmbedding || [],
            modelName: data.modelName,
            generatedAt: data.generatedAt,
            cachedAt: data.cachedAt,
            cacheKey: key,
            hitCount: data.hitCount || 0
          });
        } else {
          resolve(null);
        }
      });
    });
  }
  
  async set(key: string, embedding: CachedEmbedding): Promise<void> {
    await this.gun.get('embeddings').get(key).put({
      smf: embedding.smf,
      // Don't store full native embedding to save space
      modelName: embedding.modelName,
      generatedAt: embedding.generatedAt,
      cachedAt: embedding.cachedAt,
      hitCount: embedding.hitCount
    });
  }
}
```

## Content Hashing

```typescript
/**
 * Generate content hash for cache key
 */
export async function contentHash(
  content: string,
  modelName: string
): Promise<string> {
  const input = `${modelName}:${content}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize text before hashing (for better cache hits)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8192);  // Limit input length
}
```

## Usage Examples

```typescript
// Initialize embedding service
const embeddingService = new OpenAIEmbeddingProvider(
  process.env.OPENAI_API_KEY!,
  new TieredEmbeddingCache(
    new LRUCache({ max: 10000 }),
    new GunCacheAdapter(gun)
  ),
  new DomainAwareProjector()
);

// Embed text to SMF
const smf = await embeddingService.embedToSMF(
  'Analyze the performance metrics from last quarter'
);
console.log('Domain:', determineDomain(smf));  // 'cognitive'

// Calculate similarity
const sim = embeddingService.smfSimilarity(
  smf,
  await embeddingService.embedToSMF('Review Q3 performance data')
);
console.log('Similarity:', sim);  // ~0.85

// Batch processing
const texts = [
  'How is the weather today?',
  'Schedule a meeting for tomorrow',
  'Explain quantum computing'
];
const smfVectors = await embeddingService.batchEmbedToSMF(texts);

// Use cached embeddings
const cached = await embeddingService.getOrEmbed(
  'Frequently used query',
  'user_query_common'
);
console.log('Cache hit count:', cached.hitCount);
```

## Model Selection Guidelines

| Use Case | Recommended Model | Dimensions | Speed | Quality |
|----------|-------------------|------------|-------|---------|
| Production (quality) | text-embedding-3-large | 3072 | Medium | Best |
| Production (balanced) | text-embedding-3-small | 1536 | Fast | Good |
| Local/offline | all-MiniLM-L6-v2 | 384 | Very Fast | Good |
| Multilingual | multilingual-e5-large | 1024 | Medium | Best (multi) |
| Code | code-search-ada-v2 | 1536 | Medium | Best (code) |

## Re-indexing on Model Change

```typescript
/**
 * Handle embedding model migration
 */
async function migrateEmbeddings(
  oldModel: string,
  newModel: string,
  newService: EmbeddingService
): Promise<void> {
  // 1. Find all content with old model
  const contents = await contentStore.query({
    filters: { embeddingModel: oldModel }
  });
  
  // 2. Re-embed in batches
  const batchSize = 100;
  for (let i = 0; i < contents.items.length; i += batchSize) {
    const batch = contents.items.slice(i, i + batchSize);
    
    const newSMFs = await newService.batchEmbedToSMF(
      batch.map(c => c.content.content.inline || c.content.semantic.summary)
    );
    
    // 3. Update content items
    await Promise.all(
      batch.map((item, j) =>
        contentStore.updateSemantic(item.content.contentId, {
          smf: newSMFs[j],
          embeddingModel: newModel,
          lastIndexedAt: Date.now()
        })
      )
    );
  }
  
  // 4. Invalidate old cache entries
  await embeddingCache.invalidate(`${oldModel}:*`);
}
```
