import { IdentityManager } from '../../../src/main/services/IdentityManager';
import fs from 'fs/promises';

// Mock crypto module
jest.mock('crypto', () => ({
  generateKeyPairSync: jest.fn().mockReturnValue({
    publicKey: '-----BEGIN PUBLIC KEY-----\nmockPublicKey\n-----END PUBLIC KEY-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nmockPrivateKey\n-----END PRIVATE KEY-----',
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('abcdef1234567890abcdef1234567890'),
  }),
}));

// Mock Gun and SEA
jest.mock('gun', () => {
  return {
    SEA: {
      pair: jest.fn().mockResolvedValue({
        pub: 'seaPub',
        priv: 'seaPriv',
        epriv: 'seaEpriv',
        epub: 'seaEpub'
      })
    }
  };
});
jest.mock('gun/sea', () => ({})); // Empty mock for side-effect import

describe('IdentityManager', () => {
  let identityManager: IdentityManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    identityManager = new IdentityManager();
  });

  describe('checkIdentity', () => {
    it('should return true if identity file exists', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      
      const result = await identityManager.checkIdentity();
      
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalled();
    });

    it('should return false if identity file does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
      
      const result = await identityManager.checkIdentity();
      
      expect(result).toBe(false);
    });
  });

  describe('createIdentity', () => {
    it('should create a new identity with required fields', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      
      const identity = await identityManager.createIdentity();
      
      expect(identity).toHaveProperty('pub');
      expect(identity).toHaveProperty('resonance');
      expect(identity).toHaveProperty('fingerprint');
      expect(identity.resonance).toHaveLength(16);
      expect(identity.fingerprint).toHaveLength(16);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should not include private key in returned identity', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      
      const identity = await identityManager.createIdentity();
      
      expect(identity).not.toHaveProperty('priv');
    });
  });

  describe('importIdentity', () => {
    it('should import a valid identity', async () => {
      const validIdentity = JSON.stringify({
        pub: 'testPub',
        priv: 'testPriv',
        resonance: [0.1, 0.2, 0.3],
        fingerprint: '1234567890abcdef',
      });
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      
      const result = await identityManager.importIdentity(validIdentity);
      
      expect(result.pub).toBe('testPub');
      expect(result).not.toHaveProperty('priv');
    });

    it('should throw error for invalid identity format', async () => {
      const invalidIdentity = JSON.stringify({ pub: 'testPub' }); // missing required fields
      
      await expect(identityManager.importIdentity(invalidIdentity))
        .rejects.toThrow('Invalid identity file format');
    });

    it('should throw error for invalid JSON', async () => {
      await expect(identityManager.importIdentity('not json'))
        .rejects.toThrow('Failed to import identity');
    });
  });

  describe('getIdentity', () => {
    it('should return stored identity', async () => {
      const storedIdentity = {
        pub: 'testPub',
        priv: 'testPriv',
        resonance: [0.1],
        fingerprint: '1234',
        sea: { pub: 'seaPub', priv: 'seaPriv', epriv: 'seaEpriv', epub: 'seaEpub' }
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedIdentity));
      
      const result = await identityManager.getIdentity();
      
      expect(result).toEqual(storedIdentity);
    });

    it('should return null if no identity stored', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
      
      const result = await identityManager.getIdentity();
      
      expect(result).toBeNull();
    });
  });

  describe('getPublicIdentity', () => {
    it('should return full identity (updated behavior)', async () => {
      const storedIdentity = {
        pub: 'testPub',
        priv: 'testPriv',
        resonance: [0.1],
        fingerprint: '1234',
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedIdentity));
      
      const result = await identityManager.getPublicIdentity();
      
      expect(result).toHaveProperty('pub');
      expect(result).toHaveProperty('priv'); // Now returns private key
    });

    it('should return null if no identity stored', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
      
      const result = await identityManager.getPublicIdentity();
      
      expect(result).toBeNull();
    });
  });
});
