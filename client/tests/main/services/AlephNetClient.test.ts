
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
    let mockDomain: jest.Mocked<DomainManager>;
    let mockGun: any;
    let mockUser: any;

    beforeEach(() => {
        // Setup Gun mock chain
        const mockMap = { once: jest.fn() };
        const mockGetFragments = { map: jest.fn().mockReturnValue(mockMap) };
        const mockGetField = { 
            put: jest.fn(),
            get: jest.fn((key) => {
                if (key === 'fragments') return mockGetFragments;
                return { put: jest.fn() }; // Generic get return
            })
        };
        const mockGetFields = { 
            map: jest.fn().mockReturnValue({ 
                once: jest.fn((cb) => {
                    // Simulate callback execution if needed
                    // cb({ name: 'Test Field' }, 'field1');
                }) 
            }),
            get: jest.fn().mockReturnValue(mockGetField)
        };
        
        mockUser = {
            get: jest.fn((key) => {
                if (key === 'memory') return { get: jest.fn((k) => {
                    if (k === 'fields') return mockGetFields;
                    return {};
                })};
                return {};
            })
        };

        mockGun = {
            user: jest.fn().mockReturnValue(mockUser)
        };

        mockBridge = new AlephGunBridge() as any;
        mockBridge.getGun = jest.fn().mockReturnValue(mockGun);
        mockBridge.put = jest.fn();

        mockAI = new AIProviderManager() as any;
        mockIdentity = new IdentityManager() as any;
        mockDomain = new DomainManager(mockBridge, mockIdentity, {} as any) as any;

        mockIdentity.getPublicIdentity.mockResolvedValue({
            fingerprint: 'test-node-id',
            pub: 'pub',
            priv: 'priv',
            sea: {} as any,
            resonance: []
        });

        client = new AlephNetClient(mockBridge, mockAI, mockIdentity, mockDomain);
    });

    test('should connect and attempt to load memory data', async () => {
        await client.connect();
        
        expect(mockIdentity.getPublicIdentity).toHaveBeenCalled();
        expect(mockBridge.getGun).toHaveBeenCalled();
        expect(mockUser.get).toHaveBeenCalledWith('memory');
    });

    test('should load memory fields when callback fires', async () => {
        // Setup the map().once() to fire the callback immediately
        const mockOnce = jest.fn((cb) => {
            cb({ name: 'Test Field', scope: 'user' }, 'field1');
        });
        
        const mockGetFields = { 
            map: jest.fn().mockReturnValue({ once: mockOnce }),
            get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue({ map: jest.fn().mockReturnValue({ once: jest.fn() }) }) })
        };

        mockUser.get = jest.fn((key) => {
            if (key === 'memory') return { get: jest.fn((k) => {
                if (k === 'fields') return mockGetFields;
                return {};
            })};
            return {};
        });

        await client.connect();

        // Check if field was loaded into memoryFields map
        // Since memoryFields is private, we can verify by side effect or check internal state if we cast to any
        const fields = await client.memoryList({});
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('field1');
        expect(fields[0].name).toBe('Test Field');
    });

    test('should handle missing callback (data not loaded)', async () => {
        // Setup map().once() to NOT fire
        const mockOnce = jest.fn();
        
        const mockGetFields = { 
            map: jest.fn().mockReturnValue({ once: mockOnce }),
            get: jest.fn()
        };

        mockUser.get = jest.fn((key) => {
            if (key === 'memory') return { get: jest.fn((k) => {
                if (k === 'fields') return mockGetFields;
                return {};
            })};
            return {};
        });

        await client.connect();

        const fields = await client.memoryList({});
        expect(fields).toHaveLength(0);
    });
});
