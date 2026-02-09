import { ServiceClient } from '../../../src/main/services/ServiceClient';
import { ServiceRegistry } from '../../../src/main/services/ServiceRegistry';
import { IdentityManager } from '../../../src/main/services/IdentityManager';
import { AlephGunBridge } from '../../../src/main/services/AlephGunBridge';

// Helper to create mock service definition with minimal required fields for testing
const createMockService = (overrides: any = {}) => ({
  id: 'test-service',
  name: 'Test Service',
  description: 'A test service',
  version: '1.0.0',
  providerNodeId: 'node-1',
  providerUserId: 'user-1',
  category: 'test',
  tags: ['test'],
  status: 'ACTIVE',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  smfSignature: [],
  access: {
    visibility: 'PUBLIC',
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000, burstLimit: 10 },
  },
  interface: {
    protocol: 'REST',
    baseUrl: 'https://api.example.com',
    authentication: 'NONE',
    endpoints: [
      { name: 'getData', description: 'Get data', path: '/data', inputSchema: {}, outputSchema: {}, costMultiplier: 1 },
      { name: 'postData', description: 'Post data', path: '/data', method: 'POST', inputSchema: {}, outputSchema: {}, costMultiplier: 1.5 },
    ],
    semanticDomain: 'cognitive',
    smfAxes: [],
  },
  pricing: {
    model: 'PER_CALL',
    perCallCost: 10,
    acceptedPayments: ['ALEPH'],
    revenueDistribution: { provider: 70, network: 20, stakers: 10 },
  },
  sla: {
    uptimeGuarantee: 99.9,
    maxResponseTimeMs: 5000,
    dataRetention: { logsRetentionDays: 30, resultsRetentionDays: 90 },
    supportLevel: 'COMMUNITY',
    slaViolationCompensation: { uptimeViolation: 10, responseTimeViolation: 5 },
  },
  ...overrides,
});

// Mock fetch
global.fetch = jest.fn();

// Create mock instances
const mockServiceRegistry = {
  getService: jest.fn(),
} as unknown as ServiceRegistry;

const mockIdentityManager = {
  getPublicIdentity: jest.fn(),
} as unknown as IdentityManager;

const mockBridge = {
  put: jest.fn(),
  get: jest.fn(),
  subscribe: jest.fn(),
} as unknown as AlephGunBridge;

describe('ServiceClient', () => {
  let serviceClient: ServiceClient;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceClient = new ServiceClient(mockServiceRegistry, mockIdentityManager, mockBridge);
  });

  describe('call', () => {
    const mockServiceDefinition = createMockService();

    it('should throw error if service not found', async () => {
      (mockServiceRegistry.getService as jest.Mock).mockResolvedValueOnce(null);

      await expect(serviceClient.call('non-existent', 'getData', {}))
        .rejects.toThrow('Service non-existent not found');
    });

    it('should throw error if endpoint not found', async () => {
      (mockServiceRegistry.getService as jest.Mock).mockResolvedValueOnce(mockServiceDefinition);

      await expect(serviceClient.call('test-service', 'nonExistent', {}))
        .rejects.toThrow('Endpoint nonExistent not found');
    });

    it('should throw error if authentication required but no identity', async () => {
      const authService = {
        ...mockServiceDefinition,
        interface: { ...mockServiceDefinition.interface, authentication: 'KEYTRIPLET' },
      };
      (mockServiceRegistry.getService as jest.Mock).mockResolvedValueOnce(authService);
      (mockIdentityManager.getPublicIdentity as jest.Mock).mockResolvedValueOnce(null);

      await expect(serviceClient.call('test-service', 'getData', {}))
        .rejects.toThrow('Authentication required');
    });

    describe('REST protocol', () => {
      beforeEach(() => {
        (mockServiceRegistry.getService as jest.Mock).mockResolvedValue(mockServiceDefinition);
        (mockIdentityManager.getPublicIdentity as jest.Mock).mockResolvedValue(null);
      });

      it('should make REST call with correct URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await serviceClient.call('test-service', 'getData', { id: 1 });

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/data',
          expect.objectContaining({
            method: 'POST', // default method
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('should add authentication headers when identity exists', async () => {
        const authService = {
          ...mockServiceDefinition,
          interface: { ...mockServiceDefinition.interface, authentication: 'KEYTRIPLET' },
        };
        (mockServiceRegistry.getService as jest.Mock).mockResolvedValueOnce(authService);
        (mockIdentityManager.getPublicIdentity as jest.Mock).mockResolvedValueOnce({
          pub: 'test-pub-key',
          fingerprint: '1234',
          resonance: [],
        });
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await serviceClient.call('test-service', 'getData', {});

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-AlephNet-Pub': 'test-pub-key',
            }),
          })
        );
      });

      it('should throw error on failed response', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });

        await expect(serviceClient.call('test-service', 'getData', {}))
          .rejects.toThrow('Service call failed');
      });

      it('should return parsed JSON response', async () => {
        const responseData = { id: 1, name: 'Test' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(responseData),
        });

        const result = await serviceClient.call<typeof responseData>('test-service', 'getData', {});

        expect(result).toEqual(responseData);
      });
    });

    describe('GUN_SYNC protocol', () => {
      const gunSyncService = createMockService({
        interface: {
          ...createMockService().interface,
          protocol: 'GUN_SYNC',
        },
      });

      beforeEach(() => {
        (mockServiceRegistry.getService as jest.Mock).mockResolvedValue(gunSyncService);
        (mockIdentityManager.getPublicIdentity as jest.Mock).mockResolvedValue(null);
      });

      it('should throw error if no bridge provided', async () => {
        const clientWithoutBridge = new ServiceClient(mockServiceRegistry, mockIdentityManager);

        await expect(clientWithoutBridge.call('test-service', 'getData', {}))
          .rejects.toThrow('GUN_SYNC protocol requires AlephGunBridge');
      });

      it('should write request to Gun and subscribe for response', async () => {
        (mockBridge.put as jest.Mock).mockResolvedValueOnce(undefined);
        (mockBridge.subscribe as jest.Mock).mockImplementation((path, callback) => {
          // Simulate async response
          setTimeout(() => {
            callback({ status: 'COMPLETED', result: { data: 'test' } });
          }, 10);
          return jest.fn();
        });

        const result = await serviceClient.call('test-service', 'getData', { id: 1 });

        expect(mockBridge.put).toHaveBeenCalled();
        expect(mockBridge.subscribe).toHaveBeenCalled();
        expect(result).toEqual({ data: 'test' });
      });
    });

    describe('Unsupported protocol', () => {
      it('should throw error for unsupported protocol', async () => {
        const unsupportedService = {
          ...mockServiceDefinition,
          interface: { ...mockServiceDefinition.interface, protocol: 'GRPC' },
        };
        (mockServiceRegistry.getService as jest.Mock).mockResolvedValueOnce(unsupportedService);
        (mockIdentityManager.getPublicIdentity as jest.Mock).mockResolvedValueOnce(null);

        await expect(serviceClient.call('test-service', 'getData', {}))
          .rejects.toThrow('Protocol GRPC not supported');
      });
    });
  });
});
