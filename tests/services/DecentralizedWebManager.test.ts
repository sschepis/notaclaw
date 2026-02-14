import { DecentralizedWebManager } from '../../src/services/DecentralizedWebManager';
import { AlephGunBridge } from '@sschepis/alephnet-node';
import { DomainManager } from '../../packages/core/src/services/DomainManager';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('@sschepis/alephnet-node');
jest.mock('../../packages/core/src/services/DomainManager');

describe('DecentralizedWebManager', () => {
  let manager: DecentralizedWebManager;
  let mockBridge: jest.Mocked<AlephGunBridge>;
  let mockDomainManager: jest.Mocked<DomainManager>;

  beforeEach(() => {
    mockBridge = new AlephGunBridge() as jest.Mocked<AlephGunBridge>;
    mockDomainManager = new DomainManager({} as any, {} as any, {} as any) as jest.Mocked<DomainManager>;

    // Setup bridge mocks
    mockBridge.put = jest.fn().mockResolvedValue(undefined);
    mockBridge.get = jest.fn();

    manager = new DecentralizedWebManager(mockBridge, mockDomainManager);
  });

  describe('publish', () => {
    it('should publish a directory and update domain metadata', async () => {
      const domainHandle = '@test-app';
      const domainId = 'domain-123';
      const mockFiles = ['index.html', 'style.css'];
      
      // Mock fs
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.stat as jest.Mock).mockImplementation(async (p: string) => ({
        isDirectory: () => false,
        size: 100,
        mtimeMs: Date.now()
      }));
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('content'));

      // Mock DomainManager
      mockDomainManager.getDomainByHandle.mockResolvedValue({
        id: domainId,
        handle: domainHandle,
        metadata: {},
        ownerId: 'fingerprint'
      } as any);
      mockDomainManager.updateDomainMetadata.mockResolvedValue({} as any);

      const cid = await manager.publish('/tmp/test-app', domainHandle);

      expect(cid).toBeDefined();
      expect(mockBridge.put).toHaveBeenCalled(); // Content + Manifest
      expect(mockDomainManager.updateDomainMetadata).toHaveBeenCalledWith(domainId, expect.objectContaining({
        webRoot: expect.any(String)
      }));
    });
  });

  describe('resolve', () => {
    it('should resolve a domain to a CID', async () => {
      const domainHandle = '@test-app';
      const expectedCid = 'Qm123';

      mockDomainManager.getDomainByHandle.mockResolvedValue({
        metadata: { webRoot: expectedCid }
      } as any);

      const cid = await manager.resolve(domainHandle);
      expect(cid).toBe(expectedCid);
    });

    it('should return null if domain or webRoot not found', async () => {
      mockDomainManager.getDomainByHandle.mockResolvedValue(null);
      const cid = await manager.resolve('@unknown');
      expect(cid).toBeNull();
    });
  });

  describe('fetchFile', () => {
    it('should fetch a file from a domain', async () => {
        const domainHandle = '@test-app';
        
        const fileContent = Buffer.from('<h1>Hello</h1>');
        const fileCid = crypto.createHash('sha256').update(fileContent).digest('hex');

        const manifest = {
            version: '1.0.0',
            entries: { 
                'index.html': { 
                    cid: fileCid, 
                    size: fileContent.length, 
                    mimeType: 'text/html', 
                    lastModified: Date.now() 
                } 
            },
            index: 'index.html',
            timestamp: Date.now()
        };
        const manifestBuffer = Buffer.from(JSON.stringify(manifest));
        const rootCid = crypto.createHash('sha256').update(manifestBuffer).digest('hex');
        
        mockDomainManager.getDomainByHandle.mockResolvedValue({
            metadata: { webRoot: rootCid }
        } as any);

        mockBridge.get.mockImplementation(async (key) => {
            if (key === `content/${rootCid}`) return manifestBuffer.toString('base64');
            if (key === `content/${fileCid}`) return fileContent.toString('base64');
            return null;
        });

        const result = await manager.fetchFile(domainHandle, 'index.html');
        expect(result).toBeDefined();
        expect(result!.content.toString()).toBe(fileContent.toString());
        expect(result!.mimeType).toBe('text/html');
    });
  });
});
