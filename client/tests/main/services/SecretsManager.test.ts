import fs from 'fs/promises';

// We must mock crypto BEFORE importing SecretsManager because the module
// references crypto at the top level.
const mockCipherUpdate = jest.fn().mockReturnValue('encrypted_hex');
const mockCipherFinal = jest.fn().mockReturnValue('');
const mockCipherGetAuthTag = jest.fn().mockReturnValue(Buffer.alloc(16, 0xCC));

const mockDecipherUpdate = jest.fn();
const mockDecipherFinal = jest.fn();
const mockDecipherSetAuthTag = jest.fn();

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockImplementation((size: number) => Buffer.alloc(size, 0xAB)),
  createCipheriv: jest.fn().mockReturnValue({
    update: (...args: any[]) => mockCipherUpdate(...args),
    final: (...args: any[]) => mockCipherFinal(...args),
    getAuthTag: () => mockCipherGetAuthTag(),
  }),
  createDecipheriv: jest.fn().mockReturnValue({
    update: (...args: any[]) => mockDecipherUpdate(...args),
    final: (...args: any[]) => mockDecipherFinal(...args),
    setAuthTag: (...args: any[]) => mockDecipherSetAuthTag(...args),
  }),
  pbkdf2: jest.fn().mockImplementation(
    (_password: string, _salt: Buffer, _iterations: number, keyLen: number, _digest: string, callback: Function) => {
      callback(null, Buffer.alloc(keyLen, 0xDD));
    }
  ),
}));

// Override the electron mock from setup.ts to include safeStorage
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    quit: jest.fn(),
    on: jest.fn(),
  },
  safeStorage: {
    isEncryptionAvailable: jest.fn().mockReturnValue(false),
    encryptString: jest.fn().mockReturnValue(Buffer.from('encrypted')),
    decryptString: jest.fn().mockReturnValue('dd'.repeat(32)),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
}));

// Now import after mocks are set up
import { SecretsManager } from '../../../src/main/services/SecretsManager';
import { safeStorage } from 'electron';

describe('SecretsManager', () => {
  let manager: SecretsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new SecretsManager();

    // Default: no vault file exists, no master key file exists
    (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    // mock decrypt to return empty vault data for loadVault
    mockDecipherUpdate.mockReturnValue('{"entries":{},"savedAt":1000}');
    mockDecipherFinal.mockReturnValue('');
  });

  afterEach(async () => {
    // Clean up timers from autoSave
    try { await manager.shutdown(); } catch { /* ignore */ }
  });

  describe('initialize', () => {
    it('should initialize successfully with fallback key derivation', async () => {
      await manager.initialize();

      const status = await manager.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.locked).toBe(false);
    });

    it('should not re-initialize if already initialized', async () => {
      await manager.initialize();
      const callCount = (fs.writeFile as jest.Mock).mock.calls.length;
      
      await manager.initialize();
      // No additional writes
      expect((fs.writeFile as jest.Mock).mock.calls.length).toBe(callCount);
    });

    it('should use safeStorage when available', async () => {
      (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(true);
      // safeStorage.decryptString will fail on first read (no existing key), so create new
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      await manager.initialize();

      expect(safeStorage.encryptString).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should load existing master key via safeStorage', async () => {
      (safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(true);
      // First readFile (master key) succeeds, second (vault) fails
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(Buffer.from('encrypted_master_key'))
        .mockRejectedValueOnce({ code: 'ENOENT' });
      (safeStorage.decryptString as jest.Mock).mockReturnValue('dd'.repeat(32));

      await manager.initialize();

      expect(safeStorage.decryptString).toHaveBeenCalled();
    });
  });

  describe('setSecret / getSecret', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should store and retrieve a secret', async () => {
      await manager.setSecret({
        namespace: 'ai-providers',
        key: 'openai-key',
        value: 'sk-test-123',
        label: 'OpenAI API Key',
      });

      const value = await manager.getSecret({
        namespace: 'ai-providers',
        key: 'openai-key',
      });

      expect(value).toBe('sk-test-123');
    });

    it('should return null for non-existent secret', async () => {
      const value = await manager.getSecret({
        namespace: 'ai-providers',
        key: 'nonexistent',
      });

      expect(value).toBeNull();
    });

    it('should overwrite existing secret and mark as rotated', async () => {
      await manager.setSecret({
        namespace: 'ai-providers',
        key: 'key1',
        value: 'v1',
      });

      await manager.setSecret({
        namespace: 'ai-providers',
        key: 'key1',
        value: 'v2',
      });

      const value = await manager.getSecret({
        namespace: 'ai-providers',
        key: 'key1',
      });

      expect(value).toBe('v2');
    });

    it('should throw if vault not initialized', async () => {
      const fresh = new SecretsManager();

      await expect(
        fresh.setSecret({ namespace: 'user', key: 'k', value: 'v' })
      ).rejects.toThrow('not initialized');
    });
  });

  describe('TTL expiration', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should expire secrets past their TTL', async () => {
      await manager.setSecret({
        namespace: 'user',
        key: 'temp',
        value: 'temporary',
        ttl: 1, // 1ms TTL
      });

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 10));

      const value = await manager.getSecret({
        namespace: 'user',
        key: 'temp',
      });

      expect(value).toBeNull();
    });

    it('should not expire secrets without TTL', async () => {
      await manager.setSecret({
        namespace: 'user',
        key: 'permanent',
        value: 'keep-me',
      });

      const value = await manager.getSecret({
        namespace: 'user',
        key: 'permanent',
      });

      expect(value).toBe('keep-me');
    });
  });

  describe('hasSecret', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return true for existing secret', async () => {
      await manager.setSecret({
        namespace: 'identity',
        key: 'priv',
        value: 'secret-key',
      });

      const exists = await manager.hasSecret({
        namespace: 'identity',
        key: 'priv',
      });

      expect(exists).toBe(true);
    });

    it('should return false for missing secret', async () => {
      const exists = await manager.hasSecret({
        namespace: 'identity',
        key: 'nonexistent',
      });

      expect(exists).toBe(false);
    });
  });

  describe('deleteSecret', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should delete an existing secret', async () => {
      await manager.setSecret({
        namespace: 'ai-providers',
        key: 'key1',
        value: 'value1',
      });

      const deleted = await manager.deleteSecret({
        namespace: 'ai-providers',
        key: 'key1',
      });

      expect(deleted).toBe(true);

      const value = await manager.getSecret({
        namespace: 'ai-providers',
        key: 'key1',
      });
      expect(value).toBeNull();
    });

    it('should return false when deleting non-existent secret', async () => {
      const deleted = await manager.deleteSecret({
        namespace: 'ai-providers',
        key: 'nonexistent',
      });

      expect(deleted).toBe(false);
    });
  });

  describe('listSecrets', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should list all secrets (redacted)', async () => {
      await manager.setSecret({ namespace: 'ai-providers', key: 'k1', value: 'v1' });
      await manager.setSecret({ namespace: 'plugins', key: 'p1', value: 'v2' });

      const list = await manager.listSecrets();

      expect(list).toHaveLength(2);
      // Values should not be present
      for (const entry of list) {
        expect(entry).not.toHaveProperty('value');
        expect(entry.hasValue).toBe(true);
      }
    });

    it('should filter by namespace', async () => {
      await manager.setSecret({ namespace: 'ai-providers', key: 'k1', value: 'v1' });
      await manager.setSecret({ namespace: 'plugins', key: 'p1', value: 'v2' });

      const list = await manager.listSecrets({ namespace: 'ai-providers' });

      expect(list).toHaveLength(1);
      expect(list[0].namespace).toBe('ai-providers');
    });

    it('should filter by key prefix', async () => {
      await manager.setSecret({ namespace: 'plugins', key: 'my-plugin/token', value: 'v1' });
      await manager.setSecret({ namespace: 'plugins', key: 'other-plugin/token', value: 'v2' });

      const list = await manager.listSecrets({
        namespace: 'plugins',
        keyPrefix: 'my-plugin/',
      });

      expect(list).toHaveLength(1);
      expect(list[0].key).toBe('my-plugin/token');
    });

    it('should exclude expired entries from listing', async () => {
      await manager.setSecret({
        namespace: 'user',
        key: 'expired',
        value: 'gone',
        ttl: 1,
      });
      await manager.setSecret({
        namespace: 'user',
        key: 'valid',
        value: 'here',
      });

      await new Promise((r) => setTimeout(r, 10));

      const list = await manager.listSecrets({ namespace: 'user' });

      expect(list).toHaveLength(1);
      expect(list[0].key).toBe('valid');
    });
  });

  describe('clearNamespace', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should clear all secrets in a namespace', async () => {
      await manager.setSecret({ namespace: 'plugins', key: 'a', value: '1' });
      await manager.setSecret({ namespace: 'plugins', key: 'b', value: '2' });
      await manager.setSecret({ namespace: 'ai-providers', key: 'c', value: '3' });

      const count = await manager.clearNamespace('plugins');

      expect(count).toBe(2);
      expect(await manager.listSecrets({ namespace: 'plugins' })).toHaveLength(0);
      // Other namespace unaffected
      expect(await manager.listSecrets({ namespace: 'ai-providers' })).toHaveLength(1);
    });

    it('should return 0 if namespace is empty', async () => {
      const count = await manager.clearNamespace('plugins');
      expect(count).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return status before initialization', async () => {
      const freshManager = new SecretsManager();
      const status = await freshManager.getStatus();

      expect(status.initialized).toBe(false);
      expect(status.locked).toBe(true);
      expect(status.entryCount).toBe(0);
    });

    it('should return accurate status after initialization and secrets', async () => {
      await manager.initialize();
      await manager.setSecret({ namespace: 'ai-providers', key: 'k1', value: 'v1' });
      await manager.setSecret({ namespace: 'plugins', key: 'k2', value: 'v2' });

      const status = await manager.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.locked).toBe(false);
      expect(status.entryCount).toBe(2);
      expect(status.namespaces['ai-providers']).toBe(1);
      expect(status.namespaces['plugins']).toBe(1);
    });
  });

  describe('lock / unlock', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should lock the vault — operations fail while locked', async () => {
      await manager.setSecret({ namespace: 'user', key: 'k', value: 'v' });
      await manager.lock();

      await expect(
        manager.getSecret({ namespace: 'user', key: 'k' })
      ).rejects.toThrow('locked');
    });

    it('should unlock and resume operations', async () => {
      await manager.setSecret({ namespace: 'user', key: 'k', value: 'v' });
      await manager.lock();

      // Re-mock readFile for unlock's loadVault
      (fs.readFile as jest.Mock).mockRejectedValueOnce({ code: 'ENOENT' });
      await manager.unlock();

      const status = await manager.getStatus();
      expect(status.locked).toBe(false);
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should persist vault to disk on save', async () => {
      await manager.setSecret({ namespace: 'user', key: 'k', value: 'v' });
      
      (fs.writeFile as jest.Mock).mockClear();
      
      await manager.save();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('secrets-vault.enc'),
        expect.any(String)
      );
    });

    it('should write valid JSON envelope format', async () => {
      await manager.setSecret({ namespace: 'user', key: 'k', value: 'v' });
      (fs.writeFile as jest.Mock).mockClear();
      
      await manager.save();
      
      const writtenData = (fs.writeFile as jest.Mock).mock.calls[0][1];
      const envelope = JSON.parse(writtenData);
      
      expect(envelope).toHaveProperty('version', 1);
      expect(envelope).toHaveProperty('iv');
      expect(envelope).toHaveProperty('authTag');
      expect(envelope).toHaveProperty('ciphertext');
    });
  });

  describe('shutdown', () => {
    it('should save dirty vault on shutdown', async () => {
      await manager.initialize();
      await manager.setSecret({ namespace: 'user', key: 'k', value: 'v' });
      
      (fs.writeFile as jest.Mock).mockClear();
      await manager.shutdown();

      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should emit secret:set on setSecret', async () => {
      const events: any[] = [];
      manager.on('secret-event', (e) => events.push(e));

      await manager.setSecret({ namespace: 'user', key: 'test', value: 'v' });

      const setEvent = events.find((e) => e.type === 'secret:set');
      expect(setEvent).toBeDefined();
      expect(setEvent.namespace).toBe('user');
      expect(setEvent.key).toBe('test');
    });

    it('should emit secret:get on getSecret', async () => {
      await manager.setSecret({ namespace: 'user', key: 'test', value: 'v' });
      
      const events: any[] = [];
      manager.on('secret-event', (e) => events.push(e));

      await manager.getSecret({ namespace: 'user', key: 'test' });

      const getEvent = events.find((e) => e.type === 'secret:get');
      expect(getEvent).toBeDefined();
    });

    it('should emit secret:delete on deleteSecret', async () => {
      await manager.setSecret({ namespace: 'user', key: 'test', value: 'v' });
      
      const events: any[] = [];
      manager.on('secret-event', (e) => events.push(e));

      await manager.deleteSecret({ namespace: 'user', key: 'test' });

      const deleteEvent = events.find((e) => e.type === 'secret:delete');
      expect(deleteEvent).toBeDefined();
    });

    it('should emit secret:expired when retrieving expired secret', async () => {
      await manager.setSecret({
        namespace: 'user',
        key: 'expiring',
        value: 'temp',
        ttl: 1,
      });

      await new Promise((r) => setTimeout(r, 10));

      const events: any[] = [];
      manager.on('secret-event', (e) => events.push(e));

      await manager.getSecret({ namespace: 'user', key: 'expiring' });

      const expiredEvent = events.find((e) => e.type === 'secret:expired');
      expect(expiredEvent).toBeDefined();
    });
  });

  describe('metadata', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should set label and origin in metadata', async () => {
      await manager.setSecret({
        namespace: 'ai-providers',
        key: 'openai',
        value: 'sk-123',
        label: 'My OpenAI Key',
        origin: 'settings-panel',
      });

      const list = await manager.listSecrets({ namespace: 'ai-providers' });

      expect(list[0].metadata.label).toBe('My OpenAI Key');
      expect(list[0].metadata.origin).toBe('settings-panel');
    });

    it('should preserve createdAt on update and change updatedAt', async () => {
      await manager.setSecret({
        namespace: 'user', key: 'k', value: 'v1',
      });

      const list1 = await manager.listSecrets({ namespace: 'user' });
      const createdAt = list1[0].metadata.createdAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 5));

      await manager.setSecret({
        namespace: 'user', key: 'k', value: 'v2',
      });

      const list2 = await manager.listSecrets({ namespace: 'user' });

      expect(list2[0].metadata.createdAt).toBe(createdAt);
      expect(list2[0].metadata.updatedAt).toBeGreaterThan(createdAt);
      expect(list2[0].metadata.rotated).toBe(true);
    });
  });

  describe('namespace isolation', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should isolate secrets across namespaces with same key', async () => {
      await manager.setSecret({ namespace: 'ai-providers', key: 'token', value: 'ai-value' });
      await manager.setSecret({ namespace: 'plugins', key: 'token', value: 'plugin-value' });

      expect(await manager.getSecret({ namespace: 'ai-providers', key: 'token' })).toBe('ai-value');
      expect(await manager.getSecret({ namespace: 'plugins', key: 'token' })).toBe('plugin-value');
    });

    it('should not cross-delete across namespaces', async () => {
      await manager.setSecret({ namespace: 'ai-providers', key: 'token', value: 'ai-value' });
      await manager.setSecret({ namespace: 'plugins', key: 'token', value: 'plugin-value' });

      await manager.deleteSecret({ namespace: 'ai-providers', key: 'token' });

      expect(await manager.getSecret({ namespace: 'ai-providers', key: 'token' })).toBeNull();
      expect(await manager.getSecret({ namespace: 'plugins', key: 'token' })).toBe('plugin-value');
    });
  });
});
