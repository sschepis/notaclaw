/**
 * Comprehensive tests for the Secure Backup plugin.
 *
 * Covers:
 *  - CryptoEngine (Enhancement #1, #2, #18)
 *  - BackupScheduler (Enhancement #5)
 *  - BackupManager via activate/deactivate lifecycle (Enhancements #3-#22)
 */
import { CryptoEngine } from '../main/crypto';
import { BackupScheduler } from '../main/scheduler';
import { activate, deactivate, BackupManager } from '../main/index';
import {
  PluginContext,
  BackupSettings,
  DEFAULT_SETTINGS,
  BACKUP_FORMAT_VERSION,
  AutoBackupConfig,
  BackupScope,
  BackupCategory,
  CreateBackupRequest,
  RestoreBackupRequest,
  BackupFile,
  BackupMetadata,
  HookRegistration
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Context Factory
// ═══════════════════════════════════════════════════════════════════════════

function createMockContext(): PluginContext & { _storage: Map<string, any>; _ipcHandlers: Map<string, Function>; _dsnTools: Map<string, Function>; _stopCallbacks: Function[] } {
  const storage = new Map<string, any>();
  const ipcHandlers = new Map<string, Function>();
  const dsnTools = new Map<string, Function>();
  const stopCallbacks: Function[] = [];
  const ipcSendMock = jest.fn();
  const ipcInvokeMock = jest.fn().mockResolvedValue(undefined);

  return {
    _storage: storage,
    _ipcHandlers: ipcHandlers,
    _dsnTools: dsnTools,
    _stopCallbacks: stopCallbacks,

    storage: {
      get: jest.fn(async (key: string) => storage.get(key) ?? null),
      set: jest.fn(async (key: string, value: any) => { storage.set(key, value); }),
      delete: jest.fn(async (key: string) => { storage.delete(key); }),
      keys: jest.fn(async () => Array.from(storage.keys())),
    },
    ipc: {
      handle: jest.fn((channel: string, handler: Function) => {
        ipcHandlers.set(channel, handler);
      }),
      invoke: ipcInvokeMock,
      send: ipcSendMock,
      on: jest.fn(),
    },
    secrets: {
      get: jest.fn(async (_key: string) => null),
      set: jest.fn(async (_key: string, _value: string, _label?: string) => {}),
    },
    dsn: {
      registerTool: jest.fn((def: any, handler: Function) => {
        dsnTools.set(def.name, handler);
      }),
    },
    on: jest.fn((event: string, cb: Function) => {
      if (event === 'stop') stopCallbacks.push(cb);
    }),
    services: {} as any,
    traits: {} as any,
    ai: {} as any,
    registerComponent: jest.fn(),
    ui: { registerCommand: jest.fn() },
    useAppStore: jest.fn(() => ({})),
    _cleanups: [],
  } as any;
}

// ═══════════════════════════════════════════════════════════════════════════
// CryptoEngine Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('CryptoEngine', () => {
  let crypto: CryptoEngine;

  beforeEach(() => {
    crypto = new CryptoEngine();
  });

  describe('encrypt / decrypt', () => {
    test('roundtrip: encrypts and decrypts data correctly', () => {
      const plaintext = Buffer.from('Hello, secure backup world!');
      const passphrase = 'test-passphrase-123';

      const encrypted = crypto.encrypt(plaintext, passphrase);
      const decrypted = crypto.decrypt(encrypted, passphrase);

      expect(decrypted.toString('utf-8')).toBe(plaintext.toString('utf-8'));
    });

    test('produces different ciphertext for same plaintext (random salt/IV)', () => {
      const plaintext = Buffer.from('same data');
      const passphrase = 'same-pass';

      const enc1 = crypto.encrypt(plaintext, passphrase);
      const enc2 = crypto.encrypt(plaintext, passphrase);

      expect(enc1.ciphertext.equals(enc2.ciphertext)).toBe(false);
      expect(enc1.salt.equals(enc2.salt)).toBe(false);
      expect(enc1.iv.equals(enc2.iv)).toBe(false);
    });

    test('wrong passphrase throws error', () => {
      const plaintext = Buffer.from('secret data');
      const encrypted = crypto.encrypt(plaintext, 'correct-pass');

      expect(() => {
        crypto.decrypt(encrypted, 'wrong-pass');
      }).toThrow();
    });

    test('handles empty data', () => {
      const plaintext = Buffer.from('');
      const passphrase = 'pass';

      const encrypted = crypto.encrypt(plaintext, passphrase);
      const decrypted = crypto.decrypt(encrypted, passphrase);

      expect(decrypted.length).toBe(0);
    });

    test('handles large data', () => {
      const plaintext = Buffer.alloc(1024 * 1024, 'A'); // 1MB
      const passphrase = 'large-data-pass';

      const encrypted = crypto.encrypt(plaintext, passphrase);
      const decrypted = crypto.decrypt(encrypted, passphrase);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    test('encrypted payload has correct structure', () => {
      const encrypted = crypto.encrypt(Buffer.from('data'), 'pass');

      expect(encrypted.salt).toBeInstanceOf(Buffer);
      expect(encrypted.iv).toBeInstanceOf(Buffer);
      expect(encrypted.authTag).toBeInstanceOf(Buffer);
      expect(encrypted.ciphertext).toBeInstanceOf(Buffer);
      expect(encrypted.salt.length).toBe(32);
      expect(encrypted.iv.length).toBe(16);
      expect(encrypted.authTag.length).toBe(16);
    });

    test('tampered ciphertext throws (GCM authentication)', () => {
      const encrypted = crypto.encrypt(Buffer.from('important'), 'pass');

      // Flip a byte in the ciphertext
      encrypted.ciphertext[0] ^= 0xff;

      expect(() => {
        crypto.decrypt(encrypted, 'pass');
      }).toThrow();
    });

    test('tampered authTag throws', () => {
      const encrypted = crypto.encrypt(Buffer.from('important'), 'pass');

      encrypted.authTag[0] ^= 0xff;

      expect(() => {
        crypto.decrypt(encrypted, 'pass');
      }).toThrow();
    });
  });

  describe('checksum', () => {
    test('computeChecksum returns consistent hex string', () => {
      const data = Buffer.from('checksum test');
      const hash1 = crypto.computeChecksum(data);
      const hash2 = crypto.computeChecksum(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
    });

    test('verifyChecksum returns true for matching data', () => {
      const data = Buffer.from('verify me');
      const checksum = crypto.computeChecksum(data);

      expect(crypto.verifyChecksum(data, checksum)).toBe(true);
    });

    test('verifyChecksum returns false for non-matching data', () => {
      const data = Buffer.from('original');
      const checksum = crypto.computeChecksum(data);

      const tampered = Buffer.from('tampered');
      expect(crypto.verifyChecksum(tampered, checksum)).toBe(false);
    });

    test('different data produces different checksums', () => {
      const hash1 = crypto.computeChecksum(Buffer.from('data1'));
      const hash2 = crypto.computeChecksum(Buffer.from('data2'));

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashValue', () => {
    test('returns consistent hash for same input', () => {
      const h1 = crypto.hashValue('test');
      const h2 = crypto.hashValue('test');

      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });

    test('different inputs produce different hashes', () => {
      expect(crypto.hashValue('a')).not.toBe(crypto.hashValue('b'));
    });
  });

  describe('generateId', () => {
    test('returns a non-empty string', () => {
      const id = crypto.generateId();
      expect(id.length).toBeGreaterThan(0);
    });

    test('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => crypto.generateId()));
      expect(ids.size).toBe(100);
    });

    test('contains a hyphen separator', () => {
      expect(crypto.generateId()).toContain('-');
    });
  });

  describe('deriveKey', () => {
    test('same passphrase and salt produce same key', () => {
      const salt = Buffer.alloc(32, 1);
      const k1 = crypto.deriveKey('pass', salt);
      const k2 = crypto.deriveKey('pass', salt);

      expect(k1.equals(k2)).toBe(true);
    });

    test('different salt produces different key', () => {
      const salt1 = Buffer.alloc(32, 1);
      const salt2 = Buffer.alloc(32, 2);

      const k1 = crypto.deriveKey('pass', salt1);
      const k2 = crypto.deriveKey('pass', salt2);

      expect(k1.equals(k2)).toBe(false);
    });

    test('key length is 32 bytes', () => {
      const key = crypto.deriveKey('pass', Buffer.alloc(32));
      expect(key.length).toBe(32);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BackupScheduler Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('BackupScheduler', () => {
  let scheduler: BackupScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    scheduler = new BackupScheduler();
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
  });

  test('start with disabled config does not activate timer', () => {
    const config: AutoBackupConfig = { enabled: false, interval: 'daily', lastRun: null };
    const callback = jest.fn().mockResolvedValue(undefined);

    scheduler.start(config, callback);

    expect(scheduler.isActive()).toBe(false);
  });

  test('start with on-shutdown interval does not activate timer', () => {
    const config: AutoBackupConfig = { enabled: true, interval: 'on-shutdown', lastRun: null };
    const callback = jest.fn().mockResolvedValue(undefined);

    scheduler.start(config, callback);

    expect(scheduler.isActive()).toBe(false);
  });

  test('start with hourly interval activates timer', () => {
    const config: AutoBackupConfig = { enabled: true, interval: 'hourly', lastRun: null };
    const callback = jest.fn().mockResolvedValue(undefined);

    scheduler.start(config, callback);

    expect(scheduler.isActive()).toBe(true);
  });

  test('stop clears the timer', () => {
    const config: AutoBackupConfig = { enabled: true, interval: 'daily', lastRun: null };
    scheduler.start(config, jest.fn().mockResolvedValue(undefined));

    expect(scheduler.isActive()).toBe(true);

    scheduler.stop();

    expect(scheduler.isActive()).toBe(false);
  });

  test('fires callback after initial delay when no lastRun', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);
    const config: AutoBackupConfig = { enabled: true, interval: 'hourly', lastRun: null };

    scheduler.start(config, callback);

    // First run should be after 5 seconds (initial delay)
    jest.advanceTimersByTime(5_000);
    await Promise.resolve(); // flush microtasks

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('onShutdown calls callback when not running', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);
    const config: AutoBackupConfig = { enabled: true, interval: 'on-shutdown', lastRun: null };

    scheduler.start(config, callback);
    await scheduler.onShutdown();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('onShutdown does not call callback when already running', async () => {
    let resolveBackup: () => void;
    const backupPromise = new Promise<void>(resolve => { resolveBackup = resolve; });
    const callback = jest.fn(() => backupPromise);

    const config: AutoBackupConfig = { enabled: true, interval: 'hourly', lastRun: null };
    scheduler.start(config, callback);

    // Trigger the first run
    jest.advanceTimersByTime(5_000);
    // callback is now running (promise not resolved)

    // Try onShutdown while running
    const shutdownPromise = scheduler.onShutdown();
    await shutdownPromise;

    // Only the first call should have happened
    expect(callback).toHaveBeenCalledTimes(1);

    // Clean up
    resolveBackup!();
    await backupPromise;
  });

  test('restart clears previous timer', () => {
    const config: AutoBackupConfig = { enabled: true, interval: 'daily', lastRun: null };
    const callback = jest.fn().mockResolvedValue(undefined);

    scheduler.start(config, callback);
    const firstActive = scheduler.isActive();

    scheduler.start(config, callback);
    const secondActive = scheduler.isActive();

    expect(firstActive).toBe(true);
    expect(secondActive).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BackupManager Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('BackupManager', () => {
  let ctx: ReturnType<typeof createMockContext>;
  let manager: BackupManager;

  beforeEach(async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    ctx = createMockContext();
    manager = new BackupManager(ctx as any);
    await manager.init();
  });

  afterEach(async () => {
    await manager.shutdown();
    jest.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────
  // IPC Registration
  // ─────────────────────────────────────────────────────────────────────

  test('registers all expected IPC handlers', () => {
    const channels = Array.from(ctx._ipcHandlers.keys());

    expect(channels).toContain('backup:create');
    expect(channels).toContain('backup:restore');
    expect(channels).toContain('backup:list');
    expect(channels).toContain('backup:delete');
    expect(channels).toContain('backup:verify');
    expect(channels).toContain('backup:get-settings');
    expect(channels).toContain('backup:update-settings');
    expect(channels).toContain('backup:register-hook');
    expect(channels).toContain('backup:get-file');
    expect(channels).toContain('backup:set-passphrase');
  });

  test('registers DSN tools', () => {
    const tools = Array.from(ctx._dsnTools.keys());

    expect(tools).toContain('backup_data');
    expect(tools).toContain('restore_backup');
  });

  test('registers shutdown hook', () => {
    expect(ctx.on).toHaveBeenCalledWith('stop', expect.any(Function));
  });

  // ─────────────────────────────────────────────────────────────────────
  // Create Backup
  // ─────────────────────────────────────────────────────────────────────

  test('creates an encrypted backup', async () => {
    // Seed some app data
    ctx._storage.set('app:conversations', { messages: ['hello'] });
    ctx._storage.set('app:identity', { name: 'TestUser' });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const result = await createHandler({
      passphrase: 'my-secure-pass',
      scope: { mode: 'full', categories: ['graph', 'conversations', 'identity', 'plugin-settings'] },
      type: 'full'
    } as CreateBackupRequest);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(result.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(result.verified).toBe(true);
    expect(result.type).toBe('full');

    // Verify backup file was stored
    const storedFile = ctx._storage.get(`backup-file:${result.id}`);
    expect(storedFile).toBeDefined();
    expect(storedFile.payload).toBeDefined();
    expect(storedFile.salt).toBeDefined();
    expect(storedFile.iv).toBeDefined();
    expect(storedFile.authTag).toBeDefined();
  });

  test('sends progress events during backup', async () => {
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    await createHandler({
      passphrase: 'pass',
      type: 'full'
    } as CreateBackupRequest);

    const progressCalls = (ctx.ipc.send as jest.Mock).mock.calls
      .filter((c: any[]) => c[0] === 'backup:progress');

    expect(progressCalls.length).toBeGreaterThanOrEqual(4); // collecting, encrypting, writing, verifying/complete
  });

  test('rejects backup exceeding max size', async () => {
    // Set tiny max size
    const settingsHandler = ctx._ipcHandlers.get('backup:update-settings')!;
    await settingsHandler({ maxBackupSizeMB: 0.0001 }); // ~100 bytes

    // Seed some data
    ctx._storage.set('app:conversations', { data: 'x'.repeat(1000) });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    await expect(createHandler({
      passphrase: 'pass',
      scope: { mode: 'selective', categories: ['conversations'] },
      type: 'full'
    })).rejects.toThrow(/exceeds maximum/);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Restore Backup
  // ─────────────────────────────────────────────────────────────────────

  test('restore roundtrip: data is correctly restored', async () => {
    // Seed data
    ctx._storage.set('app:conversations', { chats: [1, 2, 3] });
    ctx._storage.set('app:identity', { key: 'value' });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'restore-pass',
      scope: { mode: 'full', categories: ['graph', 'conversations', 'identity', 'plugin-settings'] },
      type: 'full'
    });

    // Clear the app data
    ctx._storage.delete('app:conversations');
    ctx._storage.delete('app:identity');

    // Restore
    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await restoreHandler({
      backupId: metadata.id,
      passphrase: 'restore-pass'
    } as RestoreBackupRequest);

    // Verify data restored
    expect(ctx._storage.get('app:conversations')).toEqual({ chats: [1, 2, 3] });
    expect(ctx._storage.get('app:identity')).toEqual({ key: 'value' });
  });

  test('restore with wrong passphrase throws', async () => {
    ctx._storage.set('app:conversations', { data: 'secret' });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'correct',
      type: 'full'
    });

    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await expect(restoreHandler({
      backupId: metadata.id,
      passphrase: 'wrong'
    })).rejects.toThrow();
  });

  test('restore from fileData (drag-drop)', async () => {
    // Seed data and create backup
    ctx._storage.set('app:conversations', { msg: 'imported' });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'import-pass',
      scope: { mode: 'selective', categories: ['conversations'] },
      type: 'full'
    });

    // Get the file content
    const getFileHandler = ctx._ipcHandlers.get('backup:get-file')!;
    const fileBase64 = await getFileHandler({ backupId: metadata.id });

    // Clear and restore from fileData
    ctx._storage.delete('app:conversations');

    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await restoreHandler({
      fileData: fileBase64,
      passphrase: 'import-pass'
    } as RestoreBackupRequest);

    expect(ctx._storage.get('app:conversations')).toEqual({ msg: 'imported' });
  });

  test('restore non-existent backup throws', async () => {
    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await expect(restoreHandler({
      backupId: 'non-existent',
      passphrase: 'pass'
    })).rejects.toThrow(/not found/i);
  });

  test('restore rejects when no backupId or fileData', async () => {
    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await expect(restoreHandler({
      passphrase: 'pass'
    })).rejects.toThrow(/required/i);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Verify Backup
  // ─────────────────────────────────────────────────────────────────────

  test('verify returns true for valid backup', async () => {
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'verify-pass',
      type: 'full'
    });

    const verifyHandler = ctx._ipcHandlers.get('backup:verify')!;
    const result = await verifyHandler({ backupId: metadata.id });

    expect(result.verified).toBe(true);
  });

  test('verify returns false for tampered backup', async () => {
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'verify-pass',
      type: 'full'
    });

    // Tamper with the stored backup
    const backupFile = ctx._storage.get(`backup-file:${metadata.id}`);
    const payloadBuf = Buffer.from(backupFile.payload, 'base64');
    payloadBuf[0] ^= 0xff;
    backupFile.payload = payloadBuf.toString('base64');
    ctx._storage.set(`backup-file:${metadata.id}`, backupFile);

    const verifyHandler = ctx._ipcHandlers.get('backup:verify')!;
    const result = await verifyHandler({ backupId: metadata.id });

    expect(result.verified).toBe(false);
  });

  test('verify non-existent backup returns error', async () => {
    const verifyHandler = ctx._ipcHandlers.get('backup:verify')!;
    const result = await verifyHandler({ backupId: 'nope' });

    expect(result.verified).toBe(false);
    expect(result.error).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Delete Backup
  // ─────────────────────────────────────────────────────────────────────

  test('delete removes backup from storage and history', async () => {
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'del-pass',
      type: 'full'
    });

    // Verify it exists
    const listBefore = await ctx._ipcHandlers.get('backup:list')!();
    expect(listBefore.some((h: BackupMetadata) => h.id === metadata.id)).toBe(true);

    // Delete it
    const deleteHandler = ctx._ipcHandlers.get('backup:delete')!;
    await deleteHandler({ backupId: metadata.id });

    // Verify it's gone
    const listAfter = await ctx._ipcHandlers.get('backup:list')!();
    expect(listAfter.some((h: BackupMetadata) => h.id === metadata.id)).toBe(false);
    expect(ctx._storage.has(`backup-file:${metadata.id}`)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────
  // List Backups
  // ─────────────────────────────────────────────────────────────────────

  test('list returns backup history sorted by timestamp descending', async () => {
    const createHandler = ctx._ipcHandlers.get('backup:create')!;

    const m1 = await createHandler({ passphrase: 'p', type: 'full' });
    const m2 = await createHandler({ passphrase: 'p', type: 'full' });

    const listHandler = ctx._ipcHandlers.get('backup:list')!;
    const list = await listHandler();

    expect(list.length).toBeGreaterThanOrEqual(2);
    // Should be newest first
    expect(list[0].timestamp).toBeGreaterThanOrEqual(list[1].timestamp);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────────────

  test('get-settings returns default settings initially', async () => {
    const getHandler = ctx._ipcHandlers.get('backup:get-settings')!;
    const settings = await getHandler();

    expect(settings.encryptionAlgorithm).toBe('aes-256-gcm');
    expect(settings.retention.maxBackups).toBe(DEFAULT_SETTINGS.retention.maxBackups);
    expect(settings.maxBackupSizeMB).toBe(DEFAULT_SETTINGS.maxBackupSizeMB);
  });

  test('update-settings persists and returns updated settings', async () => {
    const updateHandler = ctx._ipcHandlers.get('backup:update-settings')!;
    const updated = await updateHandler({
      maxBackupSizeMB: 100,
      retention: { maxBackups: 5, maxAgeDays: 30 }
    });

    expect(updated.maxBackupSizeMB).toBe(100);
    expect(updated.retention.maxBackups).toBe(5);
    expect(updated.retention.maxAgeDays).toBe(30);

    // Verify persisted
    const getHandler = ctx._ipcHandlers.get('backup:get-settings')!;
    const settings = await getHandler();
    expect(settings.maxBackupSizeMB).toBe(100);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Retention Policy
  // ─────────────────────────────────────────────────────────────────────

  test('retention: enforces maxBackups limit', async () => {
    // Set max backups to 2
    const updateHandler = ctx._ipcHandlers.get('backup:update-settings')!;
    await updateHandler({ retention: { maxBackups: 2, maxAgeDays: 365 } });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;

    // Create 3 backups
    await createHandler({ passphrase: 'p', type: 'full' });
    await createHandler({ passphrase: 'p', type: 'full' });
    await createHandler({ passphrase: 'p', type: 'full' });

    const listHandler = ctx._ipcHandlers.get('backup:list')!;
    const list = await listHandler();

    expect(list.length).toBeLessThanOrEqual(2);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Selective / Incremental Backup
  // ─────────────────────────────────────────────────────────────────────

  test('selective backup only includes specified categories', async () => {
    ctx._storage.set('app:conversations', { data: 'conv' });
    ctx._storage.set('app:identity', { data: 'id' });
    ctx._storage.set('app:graph', { data: 'graph' });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({
      passphrase: 'sel-pass',
      scope: { mode: 'selective', categories: ['conversations'] as BackupCategory[] },
      type: 'full'
    });

    // Restore to verify only conversations were backed up
    ctx._storage.delete('app:conversations');
    ctx._storage.delete('app:identity');

    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await restoreHandler({
      backupId: metadata.id,
      passphrase: 'sel-pass'
    });

    expect(ctx._storage.get('app:conversations')).toEqual({ data: 'conv' });
    // identity should NOT be restored because it wasn't in the backup
    expect(ctx._storage.has('app:identity')).toBe(false);
  });

  test('incremental backup only includes changed data', async () => {
    ctx._storage.set('app:conversations', { data: 'original' });
    ctx._storage.set('app:identity', { data: 'unchanged' });

    // Create initial full backup to establish snapshot hashes
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    await createHandler({
      passphrase: 'inc-pass',
      scope: { mode: 'full', categories: ['graph', 'conversations', 'identity', 'plugin-settings'] },
      type: 'full'
    });

    // Change only conversations
    ctx._storage.set('app:conversations', { data: 'modified' });

    // Create incremental backup
    const metadata = await createHandler({
      passphrase: 'inc-pass',
      scope: { mode: 'full', categories: ['graph', 'conversations', 'identity', 'plugin-settings'] },
      type: 'incremental'
    });

    expect(metadata.type).toBe('incremental');

    // Restore incremental - should only have conversations
    ctx._storage.delete('app:conversations');
    ctx._storage.delete('app:identity');

    const restoreHandler = ctx._ipcHandlers.get('backup:restore')!;
    await restoreHandler({
      backupId: metadata.id,
      passphrase: 'inc-pass'
    });

    // conversations was changed, so should be restored
    expect(ctx._storage.get('app:conversations')).toEqual({ data: 'modified' });
    // identity was NOT changed since the full backup, so shouldn't be in incremental
    expect(ctx._storage.has('app:identity')).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Hooks
  // ─────────────────────────────────────────────────────────────────────

  test('register-hook stores hook', async () => {
    const hookHandler = ctx._ipcHandlers.get('backup:register-hook')!;
    const result = await hookHandler({
      pluginId: 'test-plugin',
      phase: 'pre-backup',
      channel: 'test:pre-backup'
    } as HookRegistration);

    expect(result.success).toBe(true);
  });

  test('hooks are invoked during backup', async () => {
    // Register a hook
    const hookHandler = ctx._ipcHandlers.get('backup:register-hook')!;
    await hookHandler({
      pluginId: 'test-plugin',
      phase: 'pre-backup',
      channel: 'test:pre-backup'
    });

    // Create backup
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    await createHandler({ passphrase: 'hook-pass', type: 'full' });

    // ipc.invoke should have been called with the hook channel
    expect(ctx.ipc.invoke).toHaveBeenCalledWith('test:pre-backup', { phase: 'pre-backup' });
  });

  // ─────────────────────────────────────────────────────────────────────
  // DSN Tool Integration
  // ─────────────────────────────────────────────────────────────────────

  test('backup_data DSN tool creates backup', async () => {
    const backupTool = ctx._dsnTools.get('backup_data')!;
    const result = await backupTool({ passphrase: 'dsn-pass' });

    expect(result.success).toBe(true);
    expect(result.backupId).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  test('restore_backup DSN tool restores backup', async () => {
    ctx._storage.set('app:conversations', { from: 'dsn' });

    const backupTool = ctx._dsnTools.get('backup_data')!;
    const backupResult = await backupTool({ passphrase: 'dsn-pass' });

    ctx._storage.delete('app:conversations');

    const restoreTool = ctx._dsnTools.get('restore_backup')!;
    const restoreResult = await restoreTool({
      backupId: backupResult.backupId,
      passphrase: 'dsn-pass'
    });

    expect(restoreResult.success).toBe(true);
    expect(ctx._storage.get('app:conversations')).toEqual({ from: 'dsn' });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Passphrase Management
  // ─────────────────────────────────────────────────────────────────────

  test('set-passphrase stores in secrets', async () => {
    const handler = ctx._ipcHandlers.get('backup:set-passphrase')!;
    await handler({ passphrase: 'secret-pass' });

    expect(ctx.secrets.set).toHaveBeenCalledWith(
      'backup-passphrase',
      'secret-pass',
      'Backup Encryption Passphrase'
    );
  });

  // ─────────────────────────────────────────────────────────────────────
  // Get File (export)
  // ─────────────────────────────────────────────────────────────────────

  test('get-file returns base64 encoded backup file', async () => {
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({ passphrase: 'p', type: 'full' });

    const getFileHandler = ctx._ipcHandlers.get('backup:get-file')!;
    const result = await getFileHandler({ backupId: metadata.id });

    expect(typeof result).toBe('string');
    // Should be valid base64 that decodes to valid JSON
    const decoded = JSON.parse(Buffer.from(result, 'base64').toString('utf-8'));
    expect(decoded.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(decoded.metadata.id).toBe(metadata.id);
  });

  test('get-file throws for non-existent backup', async () => {
    const getFileHandler = ctx._ipcHandlers.get('backup:get-file')!;
    await expect(getFileHandler({ backupId: 'nope' })).rejects.toThrow(/not found/i);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────

  test('activate/deactivate lifecycle works', async () => {
    const freshCtx = createMockContext();
    await activate(freshCtx as any);

    // Should have registered IPC handlers
    expect(freshCtx._ipcHandlers.size).toBeGreaterThan(0);

    await deactivate();
  });

  test('state persists across init/shutdown', async () => {
    // Create a backup
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({ passphrase: 'persist', type: 'full' });

    // Shutdown
    await manager.shutdown();

    // Create new manager using same context (storage persisted)
    const manager2 = new BackupManager(ctx as any);
    await manager2.init();

    // List should contain the backup
    const listHandler = ctx._ipcHandlers.get('backup:list')!;
    const list = await listHandler();
    expect(list.some((h: BackupMetadata) => h.id === metadata.id)).toBe(true);

    await manager2.shutdown();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────

  test('backup with no app data produces a valid backup', async () => {
    // No app data seeded
    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const metadata = await createHandler({ passphrase: 'empty', type: 'full' });

    expect(metadata.id).toBeDefined();
    expect(metadata.verified).toBe(true);
  });

  test('multiple concurrent backups are isolated', async () => {
    ctx._storage.set('app:conversations', { concurrent: true });

    const createHandler = ctx._ipcHandlers.get('backup:create')!;
    const [m1, m2] = await Promise.all([
      createHandler({ passphrase: 'p1', type: 'full' }),
      createHandler({ passphrase: 'p2', type: 'full' }),
    ]);

    expect(m1.id).not.toBe(m2.id);

    // Both should be in history
    const list = await ctx._ipcHandlers.get('backup:list')!();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Format Version Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Format Version', () => {
  test('BACKUP_FORMAT_VERSION is a positive integer', () => {
    expect(Number.isInteger(BACKUP_FORMAT_VERSION)).toBe(true);
    expect(BACKUP_FORMAT_VERSION).toBeGreaterThan(0);
  });

  test('DEFAULT_SETTINGS has valid structure', () => {
    expect(DEFAULT_SETTINGS.encryptionAlgorithm).toBe('aes-256-gcm');
    expect(DEFAULT_SETTINGS.retention.maxBackups).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.retention.maxAgeDays).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.maxBackupSizeMB).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.autoBackup).toBeDefined();
    expect(DEFAULT_SETTINGS.defaultScope).toBeDefined();
  });
});
