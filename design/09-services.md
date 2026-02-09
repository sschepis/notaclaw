# Network Services: Monetizable Service Layer

**Network Services** enable nodes in the AlephNet mesh to expose capabilities that can be discovered, accessed, and monetized. Services can be public, restricted to specific nodes/users, or paywalled through the AlephNet token economy.

## Service Entity Definition

```typescript
/**
 * Service - A monetizable capability exposed by a node
 */
export interface ServiceDefinition {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  
  /** Unique service identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description */
  description: string;
  
  /** Version string (semver) */
  version: string;
  
  /** Owner node ID */
  providerNodeId: string;
  
  /** Owner user ID */
  providerUserId: string;
  
  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Access configuration
   */
  access: {
    /** Visibility level */
    visibility: 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
    
    /** For RESTRICTED: allowed node IDs */
    allowedNodes?: string[];
    
    /** For RESTRICTED: allowed user IDs */
    allowedUsers?: string[];
    
    /** For RESTRICTED: allowed staking tiers */
    allowedTiers?: Array<'Neophyte' | 'Adept' | 'Magus' | 'Archon'>;
    
    /** Minimum coherence score required */
    minCoherence?: number;
    
    /** Minimum reputation required */
    minReputation?: number;
    
    /** Rate limiting */
    rateLimit: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
      burstLimit: number;
    };
    
    /** Geographic restrictions (if applicable) */
    geoRestrictions?: {
      allowedCountries?: string[];
      blockedCountries?: string[];
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // MONETIZATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Pricing configuration
   */
  pricing: {
    /** Pricing model */
    model: 'FREE' | 'PER_CALL' | 'SUBSCRIPTION' | 'STAKE_GATED' | 'HYBRID';
    
    /** For PER_CALL: cost per request in Aleph tokens */
    perCallCost?: number;
    
    /** For SUBSCRIPTION: subscription tiers */
    subscriptionTiers?: Array<{
      name: string;
      price: number;
      period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      limits: {
        requestsPerPeriod: number;
        priorityLevel: number;
      };
    }>;
    
    /** For STAKE_GATED: minimum stake required */
    minStake?: number;
    
    /** Free tier configuration */
    freeTier?: {
      requestsPerDay: number;
      features: string[];
    };
    
    /** Payment accepted */
    acceptedPayments: Array<'ALEPH' | 'STAKED_ALEPH' | 'USD'>;
    
    /** Revenue distribution */
    revenueDistribution: {
      provider: number;      // Service provider share
      network: number;       // Network fee
      stakers: number;       // Staker rewards
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INTERFACE SPECIFICATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * API interface definition
   */
  interface: {
    /** Protocol type */
    protocol: 'REST' | 'GRAPHQL' | 'WEBSOCKET' | 'GRPC' | 'GUN_SYNC';
    
    /** Base endpoint URL (if external) */
    baseUrl?: string;
    
    /** Authentication method */
    authentication: 'NONE' | 'API_KEY' | 'KEYTRIPLET' | 'OAUTH' | 'STAKED_IDENTITY';
    
    /** Available endpoints/methods */
    endpoints: Array<{
      name: string;
      description: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      path?: string;
      inputSchema: Record<string, any>;
      outputSchema: Record<string, any>;
      costMultiplier: number;
    }>;
    
    /** Semantic domain */
    semanticDomain: SemanticDomain;
    
    /** SMF axes used */
    smfAxes: number[];
  };
  
  // ═══════════════════════════════════════════════════════════════
  // QUALITY & SLA
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Service Level Agreement
   */
  sla: {
    /** Uptime guarantee (0-1) */
    uptimeGuarantee: number;
    
    /** Maximum response time (ms) */
    maxResponseTimeMs: number;
    
    /** Data retention policy */
    dataRetention: {
      logsRetentionDays: number;
      resultsRetentionDays: number;
    };
    
    /** Support level */
    supportLevel: 'NONE' | 'COMMUNITY' | 'EMAIL' | 'PRIORITY';
    
    /** Compensation for SLA violations */
    slaViolationCompensation: {
      uptimeViolation: number;      // Tokens per 1% below guarantee
      responseTimeViolation: number; // Tokens per incident
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  
  /** Tags for discovery */
  tags: string[];
  
  /** Category */
  category: string;
  
  /** Documentation URL */
  documentationUrl?: string;
  
  /** Icon/logo URL */
  iconUrl?: string;
  
  /** Status */
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'SUSPENDED';
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last updated timestamp */
  updatedAt: number;
  
  /** SMF signature of the service definition */
  smfSignature: number[];
}
```

## Service Instance (Runtime State)

```typescript
/**
 * Runtime state of a service instance
 */
export interface ServiceInstance {
  /** Service definition ID */
  serviceId: string;
  
  /** Node hosting this instance */
  nodeId: string;
  
  /** Current status */
  status: 'STARTING' | 'RUNNING' | 'DRAINING' | 'STOPPED' | 'ERROR';
  
  /** Health metrics */
  health: {
    healthy: boolean;
    lastHealthCheck: number;
    consecutiveFailures: number;
    uptimeMs: number;
    startedAt: number;
  };
  
  /** Performance metrics */
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTimeMs: number;
    p95ResponseTimeMs: number;
    p99ResponseTimeMs: number;
    requestsPerSecond: number;
  };
  
  /** Economics */
  economics: {
    totalRevenue: number;
    pendingPayout: number;
    lastPayoutAt: number;
    activeSubscribers: number;
    totalSubscribers: number;
  };
  
  /** Active connections */
  connections: {
    active: number;
    maxConcurrent: number;
  };
}
```

## Service Subscription

```typescript
/**
 * User subscription to a service
 */
export interface ServiceSubscription {
  /** Subscription ID */
  id: string;
  
  /** Service ID */
  serviceId: string;
  
  /** Subscriber user ID */
  subscriberId: string;
  
  /** Subscription tier name */
  tierName: string;
  
  /** Status */
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  
  /** Billing period */
  billing: {
    periodStart: number;
    periodEnd: number;
    amount: number;
    currency: 'ALEPH' | 'USD';
    autoRenew: boolean;
  };
  
  /** Usage in current period */
  usage: {
    requestsUsed: number;
    requestsLimit: number;
    resetAt: number;
  };
  
  /** API key for this subscription */
  apiKey: string;
  
  /** Creation timestamp */
  createdAt: number;
}
```

## Service Discovery & Registry

```typescript
/**
 * Service Registry for discovery
 */
export interface ServiceRegistry {
  /** Search for services */
  search(query: {
    text?: string;
    tags?: string[];
    category?: string;
    semanticDomain?: SemanticDomain;
    smfQuery?: number[];
    pricing?: 'FREE' | 'PAID' | 'ALL';
    minUptime?: number;
    maxPrice?: number;
  }): Promise<ServiceDefinition[]>;
  
  /** Register a new service */
  register(service: ServiceDefinition): Promise<{ 
    serviceId: string; 
    registrationFee: number;
  }>;
  
  /** Update service definition */
  update(serviceId: string, updates: Partial<ServiceDefinition>): Promise<void>;
  
  /** Deprecate a service */
  deprecate(serviceId: string, migrationPath?: string): Promise<void>;
  
  /** Get service health across all instances */
  getHealth(serviceId: string): Promise<{
    instances: ServiceInstance[];
    aggregateHealth: number;
    recommendedInstance: string;
  }>;
}
```

## Graph Schema for Services

```javascript
// gun.get('services').get(serviceId)
{
  definition: ServiceDefinition,
  
  // Active instances
  instances: {
    'node_1': ServiceInstance,
    'node_2': ServiceInstance
  },
  
  // Subscriptions
  subscriptions: {
    'sub_1': ServiceSubscription,
    'sub_2': ServiceSubscription
  },
  
  // Usage logs (rolling window)
  usage: {
    hourly: Record<number, { requests: number, revenue: number }>,
    daily: Record<number, { requests: number, revenue: number }>
  },
  
  // Reviews and ratings
  reviews: {
    'review_1': {
      userId: string,
      rating: number,
      comment: string,
      timestamp: number
    }
  },
  
  // Aggregate stats
  stats: {
    averageRating: 4.5,
    totalReviews: 123,
    totalRevenue: 50000,
    totalRequests: 1000000,
    monthlyActiveUsers: 500
  }
}
```

## Service Client Implementation

```typescript
/**
 * Client for consuming services
 */
export class ServiceClient {
  constructor(
    private registry: ServiceRegistry,
    private identity: KeyTriplet,
    private wallet: AlephWallet
  ) {}
  
  /**
   * Call a service endpoint
   */
  async call<T>(
    serviceId: string,
    endpoint: string,
    input: Record<string, any>,
    options?: {
      timeout?: number;
      preferredNode?: string;
      maxCost?: number;
    }
  ): Promise<{
    result: T;
    cost: number;
    executorNode: string;
    responseTimeMs: number;
    coherenceProof?: any;
  }> {
    // 1. Get service definition
    const service = await this.registry.getService(serviceId);
    
    // 2. Check access
    await this.verifyAccess(service);
    
    // 3. Select best instance
    const { instances, recommendedInstance } = await this.registry.getHealth(serviceId);
    const targetNode = options?.preferredNode || recommendedInstance;
    
    // 4. Calculate cost
    const cost = this.calculateCost(service, endpoint, input);
    if (options?.maxCost && cost > options.maxCost) {
      throw new Error(`Cost ${cost} exceeds maximum ${options.maxCost}`);
    }
    
    // 5. Pre-authorize payment
    const paymentAuth = await this.wallet.authorizePayment(
      service.providerNodeId,
      cost
    );
    
    // 6. Execute call
    const startTime = Date.now();
    const result = await this.executeCall(
      targetNode,
      service,
      endpoint,
      input,
      paymentAuth
    );
    const responseTimeMs = Date.now() - startTime;
    
    // 7. Finalize payment
    await this.wallet.finalizePayment(paymentAuth.id);
    
    return {
      result: result.data as T,
      cost,
      executorNode: targetNode,
      responseTimeMs,
      coherenceProof: result.coherenceProof
    };
  }
  
  /**
   * Subscribe to a service
   */
  async subscribe(
    serviceId: string,
    tierName: string,
    options?: {
      autoRenew?: boolean;
      paymentMethod?: 'ALEPH' | 'STAKED_ALEPH';
    }
  ): Promise<ServiceSubscription> {
    const service = await this.registry.getService(serviceId);
    const tier = service.pricing.subscriptionTiers?.find(t => t.name === tierName);
    
    if (!tier) {
      throw new Error(`Tier ${tierName} not found for service ${serviceId}`);
    }
    
    // Process payment
    await this.wallet.transfer(
      service.providerNodeId,
      tier.price,
      options?.paymentMethod || 'ALEPH'
    );
    
    // Create subscription
    const subscription: ServiceSubscription = {
      id: generateId(),
      serviceId,
      subscriberId: this.identity.fingerprint,
      tierName,
      status: 'ACTIVE',
      billing: {
        periodStart: Date.now(),
        periodEnd: Date.now() + this.periodToMs(tier.period),
        amount: tier.price,
        currency: 'ALEPH',
        autoRenew: options?.autoRenew ?? true
      },
      usage: {
        requestsUsed: 0,
        requestsLimit: tier.limits.requestsPerPeriod,
        resetAt: Date.now() + this.periodToMs(tier.period)
      },
      apiKey: this.generateApiKey(),
      createdAt: Date.now()
    };
    
    // Store subscription
    await this.registry.createSubscription(subscription);
    
    return subscription;
  }
}
```

## Example Service Definitions

### Analytics Service

```javascript
{
  id: 'svc_analytics',
  name: 'AlephNet Analytics',
  description: 'Semantic analytics and insight generation for conversation data',
  version: '1.0.0',
  providerNodeId: 'node_analytics_1',
  
  access: {
    visibility: 'PUBLIC',
    allowedTiers: ['Adept', 'Magus', 'Archon'],
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 100
    }
  },
  
  pricing: {
    model: 'HYBRID',
    perCallCost: 1,
    subscriptionTiers: [
      {
        name: 'Starter',
        price: 100,
        period: 'MONTHLY',
        limits: { requestsPerPeriod: 10000, priorityLevel: 1 }
      },
      {
        name: 'Pro',
        price: 500,
        period: 'MONTHLY',
        limits: { requestsPerPeriod: 100000, priorityLevel: 3 }
      }
    ],
    freeTier: {
      requestsPerDay: 100,
      features: ['basic_analytics']
    },
    acceptedPayments: ['ALEPH', 'STAKED_ALEPH'],
    revenueDistribution: { provider: 0.8, network: 0.1, stakers: 0.1 }
  },
  
  interface: {
    protocol: 'REST',
    authentication: 'KEYTRIPLET',
    endpoints: [
      {
        name: 'analyze',
        description: 'Analyze conversation for insights',
        method: 'POST',
        path: '/analyze',
        inputSchema: { conversationId: 'string', depth: 'string' },
        outputSchema: { insights: 'array', confidence: 'number' },
        costMultiplier: 1
      },
      {
        name: 'summarize',
        description: 'Generate semantic summary',
        method: 'POST',
        path: '/summarize',
        inputSchema: { content: 'string' },
        outputSchema: { summary: 'string', smf: 'array' },
        costMultiplier: 0.5
      }
    ],
    semanticDomain: 'cognitive',
    smfAxes: [4, 5, 6, 7]
  },
  
  sla: {
    uptimeGuarantee: 0.99,
    maxResponseTimeMs: 5000,
    dataRetention: { logsRetentionDays: 30, resultsRetentionDays: 90 },
    supportLevel: 'EMAIL',
    slaViolationCompensation: { uptimeViolation: 10, responseTimeViolation: 1 }
  },
  
  tags: ['analytics', 'insights', 'semantic'],
  category: 'analytics',
  status: 'ACTIVE'
}
```

### LLM Gateway Service

```javascript
{
  id: 'svc_llm_gateway',
  name: 'Multi-Provider LLM Gateway',
  description: 'Unified access to multiple LLM providers with semantic routing',
  version: '2.0.0',
  providerNodeId: 'node_llm_1',
  
  access: {
    visibility: 'PUBLIC',
    minCoherence: 0.5,
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
      burstLimit: 50
    }
  },
  
  pricing: {
    model: 'PER_CALL',
    perCallCost: 5,  // Base cost, actual depends on model
    acceptedPayments: ['ALEPH'],
    revenueDistribution: { provider: 0.7, network: 0.15, stakers: 0.15 }
  },
  
  interface: {
    protocol: 'REST',
    authentication: 'KEYTRIPLET',
    endpoints: [
      {
        name: 'complete',
        description: 'Generate completion with optimal model selection',
        method: 'POST',
        path: '/complete',
        inputSchema: {
          prompt: 'string',
          preferredProvider: 'string?',
          maxTokens: 'number?',
          temperature: 'number?'
        },
        outputSchema: {
          completion: 'string',
          model: 'string',
          usage: 'object'
        },
        costMultiplier: 1
      },
      {
        name: 'embed',
        description: 'Generate embeddings for semantic search',
        method: 'POST',
        path: '/embed',
        inputSchema: { text: 'string' },
        outputSchema: { embedding: 'array', dimensions: 'number' },
        costMultiplier: 0.2
      }
    ],
    semanticDomain: 'cognitive',
    smfAxes: [4, 5, 6, 7]
  },
  
  sla: {
    uptimeGuarantee: 0.995,
    maxResponseTimeMs: 30000,
    dataRetention: { logsRetentionDays: 7, resultsRetentionDays: 0 },
    supportLevel: 'COMMUNITY',
    slaViolationCompensation: { uptimeViolation: 20, responseTimeViolation: 5 }
  },
  
  tags: ['llm', 'ai', 'completion', 'embedding'],
  category: 'ai',
  status: 'ACTIVE'
}
```
