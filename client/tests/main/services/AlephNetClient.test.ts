import { AlephNetClient } from '../../../src/main/services/AlephNetClient';
import { AlephGunBridge } from '@sschepis/alephnet-node';
import { AIProviderManager } from '../../../src/main/services/AIProviderManager';
import { IdentityManager } from '../../../src/main/services/IdentityManager';
import { DomainManager } from '../../../src/main/services/DomainManager';

// Mock dependencies
jest.mock('@sschepis/alephnet-node');
jest.mock('../../../src/main/services/AIProviderManager');
jest.mock('../../../src/main/services/IdentityManager');
jest.mock('../../../src/main/services/DomainManager');

describe('AlephNetClient', () => {
  let client: AlephNetClient;
  let mockBridge: jest.Mocked<AlephGunBridge>;
  let mockAI: jest.Mocked<AIProviderManager>;
  let mockIdentity: jest.Mocked<IdentityManager>;
  let mockDomains: jest.Mocked<DomainManager>;

  beforeEach(() => {
    mockBridge = new AlephGunBridge() as jest.Mocked<AlephGunBridge>;
    mockAI = new AIProviderManager() as jest.Mocked<AIProviderManager>;
    mockIdentity = new IdentityManager() as jest.Mocked<IdentityManager>;
    mockDomains = new DomainManager(mockBridge, mockIdentity, {} as any) as jest.Mocked<DomainManager>;

    client = new AlephNetClient(mockBridge, mockAI, mockIdentity, mockDomains);
  });

  describe('connect', () => {
    it('should connect using existing identity', async () => {
      mockIdentity.getPublicIdentity.mockResolvedValue({
        fingerprint: 'test-fingerprint',
        pub: 'pub',
        priv: 'priv',
        resonance: [],
        bodyPrimes: []
      });

      const result = await client.connect();
      expect(result.connected).toBe(true);
      
      const status = await client.getStatus();
      expect(status.id).toBe('test-fingerprint');
      expect(status.status).toBe('ONLINE');
    });

    it('should generate temporary ID if no identity', async () => {
      mockIdentity.getPublicIdentity.mockResolvedValue(null);

      const result = await client.connect();
      expect(result.connected).toBe(true);
      
      const status = await client.getStatus();
      expect(status.id).toContain('node_');
    });
  });

  describe('think (Semantic Tier)', () => {
    it('should use AI manager to analyze text', async () => {
      mockAI.processRequest.mockResolvedValue({
        content: JSON.stringify({
          themes: ['t1', 't2'],
          insight: 'insight',
          coherence: 0.9,
          suggestedActions: []
        }),
        providerId: 'mock',
        model: 'mock'
      });

      const result = await client.think({ text: 'test input' });
      expect(result.coherence).toBe(0.9);
      expect(result.themes).toEqual(['t1', 't2']);
      expect(mockAI.processRequest).toHaveBeenCalled();
    });

    it('should fallback if AI fails', async () => {
      mockAI.processRequest.mockRejectedValue(new Error('AI fail'));

      const result = await client.think({ text: 'test input text' });
      expect(result.themes.length).toBeGreaterThan(0);
      expect(result.insight).toContain('Analysis of');
    });
  });

  describe('memory (Tier 1.5)', () => {
    it('should create memory field', async () => {
      const field = await client.memoryCreate({ name: 'test', scope: 'user' });
      expect(field.name).toBe('test');
      expect(field.id).toBeDefined();
      expect(mockBridge.put).toHaveBeenCalled();
    });

    it('should store memory fragment', async () => {
      // Create field first
      const field = await client.memoryCreate({ name: 'test', scope: 'user' });
      
      const frag = await client.memoryStore({
        fieldId: field.id,
        content: 'test content'
      });
      
      expect(frag.content).toBe('test content');
      expect(frag.fieldId).toBe(field.id);
    });
  });
});
