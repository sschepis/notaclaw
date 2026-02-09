import { ServiceRegistry } from '../../../src/main/services/ServiceRegistry';
import type { ServiceDefinition, ServiceInstance } from '../../../src/shared/service-types';

// Mock AlephGunBridge
const mockBridge = {
  get: jest.fn(),
  put: jest.fn(),
  getGun: jest.fn(),
  subscribe: jest.fn(),
};

// Create a minimal valid ServiceDefinition for testing
const createMockServiceDefinition = (overrides: Partial<ServiceDefinition> = {}): ServiceDefinition => ({
  id: 'test-service',
  name: 'Test Service',
  description: 'A test service',
  version: '1.0.0',
  providerNodeId: 'node-123',
  providerUserId: 'user-123',
  access: {
    visibility: 'PUBLIC',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
    },
  },
  pricing: {
    model: 'FREE',
    acceptedPayments: ['ALEPH'],
    revenueDistribution: {
      provider: 0.7,
      network: 0.2,
      stakers: 0.1,
    },
  },
  interface: {
    protocol: 'REST',
    authentication: 'NONE',
    endpoints: [],
    semanticDomain: 'reasoning',
    smfAxes: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  sla: {
    uptimeGuarantee: 0.99,
    maxResponseTimeMs: 1000,
    dataRetention: {
      logsRetentionDays: 30,
      resultsRetentionDays: 90,
    },
    supportLevel: 'NONE',
    slaViolationCompensation: {
      uptimeViolation: 0,
      responseTimeViolation: 0,
    },
  },
  tags: ['test'],
  category: 'utility',
  status: 'ACTIVE',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  smfSignature: [0, 0, 0, 0, 0, 0, 0, 0],
  ...overrides,
});

// Create a minimal valid ServiceInstance for testing
const createMockServiceInstance = (overrides: Partial<ServiceInstance> = {}): ServiceInstance => ({
  serviceId: 'test-service',
  nodeId: 'node-123',
  status: 'RUNNING',
  health: {
    healthy: true,
    lastHealthCheck: Date.now(),
    consecutiveFailures: 0,
    uptimeMs: 3600000,
    startedAt: Date.now() - 3600000,
  },
  metrics: {
    totalRequests: 1000,
    successfulRequests: 990,
    failedRequests: 10,
    averageResponseTimeMs: 50,
    p95ResponseTimeMs: 100,
    p99ResponseTimeMs: 200,
    requestsPerSecond: 10,
  },
  economics: {
    totalRevenue: 0,
    pendingPayout: 0,
    lastPayoutAt: 0,
    activeSubscribers: 0,
    totalSubscribers: 0,
  },
  connections: {
    active: 5,
    maxConcurrent: 100,
  },
  ...overrides,
});

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBridge.put.mockResolvedValue(undefined);
    mockBridge.get.mockResolvedValue(null);
    registry = new ServiceRegistry(mockBridge as any);
  });

  describe('registerToolHandler', () => {
    it('should register a tool handler', () => {
      const handler = jest.fn();
      registry.registerToolHandler('test-tool', handler);

      // Handler is registered internally - test via invokeTool
      expect(true).toBe(true); // Registration doesn't throw
    });
  });

  describe('invokeTool', () => {
    it('should invoke a registered tool handler', async () => {
      const handler = jest.fn().mockResolvedValue({ result: 'success' });
      registry.registerToolHandler('test-tool', handler);

      const result = await registry.invokeTool('test-tool', { arg: 'value' });

      expect(handler).toHaveBeenCalledWith({ arg: 'value' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error for unregistered tool', async () => {
      await expect(registry.invokeTool('unknown-tool', {}))
        .rejects.toThrow('Tool unknown-tool not found locally.');
    });

    it('should propagate errors from tool handler', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      registry.registerToolHandler('error-tool', handler);

      await expect(registry.invokeTool('error-tool', {}))
        .rejects.toThrow('Handler error');
    });
  });

  describe('register', () => {
    it('should register a service definition', async () => {
      const service = createMockServiceDefinition({
        tags: ['test', 'example'],
      });

      await registry.register(service);

      expect(mockBridge.put).toHaveBeenCalledWith(
        'services/test-service/definition',
        service
      );
      expect(mockBridge.put).toHaveBeenCalledWith(
        'indexes/services/categories/utility/test-service',
        true
      );
      expect(mockBridge.put).toHaveBeenCalledWith(
        'indexes/services/tags/test/test-service',
        true
      );
      expect(mockBridge.put).toHaveBeenCalledWith(
        'indexes/services/tags/example/test-service',
        true
      );
    });

    it('should register a service with multiple tags', async () => {
      const service = createMockServiceDefinition({
        id: 'multi-tag-service',
        category: 'ai',
        tags: ['ml', 'nlp', 'vision'],
      });

      await registry.register(service);

      // Verify all tags are indexed
      expect(mockBridge.put).toHaveBeenCalledWith(
        'indexes/services/tags/ml/multi-tag-service',
        true
      );
      expect(mockBridge.put).toHaveBeenCalledWith(
        'indexes/services/tags/nlp/multi-tag-service',
        true
      );
      expect(mockBridge.put).toHaveBeenCalledWith(
        'indexes/services/tags/vision/multi-tag-service',
        true
      );
    });
  });

  describe('getService', () => {
    it('should return a service definition by id', async () => {
      const service = createMockServiceDefinition();
      mockBridge.get.mockResolvedValue(service);

      const result = await registry.getService('test-service');

      expect(mockBridge.get).toHaveBeenCalledWith('services/test-service/definition');
      expect(result).toEqual(service);
    });

    it('should return null for non-existent service', async () => {
      mockBridge.get.mockResolvedValue(null);

      const result = await registry.getService('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateHealth', () => {
    it('should update service instance health', async () => {
      const instance = createMockServiceInstance();

      await registry.updateHealth('test-service', instance);

      expect(mockBridge.put).toHaveBeenCalledWith(
        'services/test-service/instances/node-123',
        instance
      );
    });
  });

  describe('search', () => {
    it('should return empty array (stub implementation)', async () => {
      const result = await registry.search({ text: 'test', tags: ['example'] });

      expect(result).toEqual([]);
    });
  });
});
