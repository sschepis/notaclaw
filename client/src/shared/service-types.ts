import { SemanticDomain } from './types';

// Service Entity Definition
export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  providerNodeId: string;
  providerUserId: string;
  
  access: {
    visibility: 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
    allowedNodes?: string[];
    allowedUsers?: string[];
    allowedTiers?: Array<'Neophyte' | 'Adept' | 'Magus' | 'Archon'>;
    minCoherence?: number;
    minReputation?: number;
    rateLimit: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
      burstLimit: number;
    };
    geoRestrictions?: {
      allowedCountries?: string[];
      blockedCountries?: string[];
    };
  };
  
  pricing: {
    model: 'FREE' | 'PER_CALL' | 'SUBSCRIPTION' | 'STAKE_GATED' | 'HYBRID';
    perCallCost?: number;
    subscriptionTiers?: Array<{
      name: string;
      price: number;
      period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      limits: {
        requestsPerPeriod: number;
        priorityLevel: number;
      };
    }>;
    minStake?: number;
    freeTier?: {
      requestsPerDay: number;
      features: string[];
    };
    acceptedPayments: Array<'ALEPH' | 'STAKED_ALEPH' | 'USD'>;
    revenueDistribution: {
      provider: number;
      network: number;
      stakers: number;
    };
  };
  
  interface: {
    protocol: 'REST' | 'GRAPHQL' | 'WEBSOCKET' | 'GRPC' | 'GUN_SYNC';
    baseUrl?: string;
    authentication: 'NONE' | 'API_KEY' | 'KEYTRIPLET' | 'OAUTH' | 'STAKED_IDENTITY';
    endpoints: Array<{
      name: string;
      description: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      path?: string;
      inputSchema: Record<string, any>;
      outputSchema: Record<string, any>;
      costMultiplier: number;
    }>;
    semanticDomain: SemanticDomain;
    smfAxes: number[];
  };
  
  sla: {
    uptimeGuarantee: number;
    maxResponseTimeMs: number;
    dataRetention: {
      logsRetentionDays: number;
      resultsRetentionDays: number;
    };
    supportLevel: 'NONE' | 'COMMUNITY' | 'EMAIL' | 'PRIORITY';
    slaViolationCompensation: {
      uptimeViolation: number;
      responseTimeViolation: number;
    };
  };
  
  tags: string[];
  category: string;
  documentationUrl?: string;
  iconUrl?: string;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'SUSPENDED';
  createdAt: number;
  updatedAt: number;
  smfSignature: number[];
}

export interface GatewayDefinition {
  id: string;
  name: string;
  type: string;
  status?: 'connected' | 'disconnected' | 'error';
  networkName: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  submitTask(task: any): Promise<string>;
  getTaskStatus(taskId: string): Promise<any>;
}

export interface ServiceInstance {
  serviceId: string;
  nodeId: string;
  status: 'STARTING' | 'RUNNING' | 'DRAINING' | 'STOPPED' | 'ERROR';
  health: {
    healthy: boolean;
    lastHealthCheck: number;
    consecutiveFailures: number;
    uptimeMs: number;
    startedAt: number;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTimeMs: number;
    p95ResponseTimeMs: number;
    p99ResponseTimeMs: number;
    requestsPerSecond: number;
  };
  economics: {
    totalRevenue: number;
    pendingPayout: number;
    lastPayoutAt: number;
    activeSubscribers: number;
    totalSubscribers: number;
  };
  connections: {
    active: number;
    maxConcurrent: number;
  };
}

export interface ServiceSubscription {
  id: string;
  serviceId: string;
  subscriberId: string;
  tierName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  billing: {
    periodStart: number;
    periodEnd: number;
    amount: number;
    currency: 'ALEPH' | 'USD';
    autoRenew: boolean;
  };
  usage: {
    requestsUsed: number;
    requestsLimit: number;
    resetAt: number;
  };
  apiKey: string;
  createdAt: number;
}

