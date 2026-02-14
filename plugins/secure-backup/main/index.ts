export {
  PluginContext,
  BackupState,
  BackupMetadata,
  BackupFile,
  BackupSettings,
  BackupScope,
  BackupDestination,
  BackupProgress,
  BackupCategory,
  HookRegistration,
  CreateBackupRequest,
  RestoreBackupRequest,
  VerifyBackupRequest,
  DeleteBackupRequest,
  DEFAULT_SETTINGS,
  BACKUP_FORMAT_VERSION
} from '../types';
import { CryptoEngine } from './crypto';
import { BackupScheduler } from './scheduler';

export interface PluginContext {
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  secrets: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, label?: string) => Promise<void>;
  };
  ipc: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
  };
  dsn: {
    registerTool: (metadata: any, handler: (args: any) => Promise<any>) => void;
  };
  traits?: {
    register: (trait: any) => void;
  };
  on: (event: string, handler: () => void) => void;
}

const HOOK_TIMEOUT_MS = 10_000;
const ALL_CATEGORIES: BackupCategory[] = ['graph', 'conversations', 'identity', 'plugin-settings'];

export class BackupManager {
  private context: PluginContext;
  private crypto: CryptoEngine;
  private scheduler: BackupScheduler;
  private state: BackupState;
  private saveTimer: NodeJS.Timeout | null = null;
  private autoPassphrase: string | null = null;

  constructor(context: PluginContext) {
    this.context = context;
    this.crypto = new CryptoEngine();
    this.scheduler = new BackupScheduler();
    this.state = {
      settings: { ...DEFAULT_SETTINGS },
      history: [],
      hooks: [],
      snapshotHashes: {}
    };
  }

  async init(): Promise<void> {
    await this.load();
    this.registerIpcHandlers();
    this.registerDsnTools();
    this.setupScheduler();
    this.setupShutdownHook();

    // Periodic state save
    this.saveTimer = setInterval(() => this.save(), 60_000);

    console.log('[Secure Backup] Initialized');
  }

  async shutdown(): Promise<void> {
    this.scheduler.stop();
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    await this.save();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Persistence
  // ═══════════════════════════════════════════════════════════════════════

  private async load(): Promise<void> {
    const stored = await this.context.storage.get('backup-state');
    if (stored) {
      this.state = {
        ...this.state,
        ...stored,
        settings: { ...DEFAULT_SETTINGS, ...stored.settings }
      };
    }

    // Try to load auto-backup passphrase from secrets
    try {
      const storedPass = await this.context.secrets.get('backup-passphrase');
      if (storedPass) {
        this.autoPassphrase = storedPass;
      }
    } catch {
      // Secrets not available — no auto-passphrase
    }
  }

  private async save(): Promise<void> {
    await this.context.storage.set('backup-state', this.state);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Backup Creation
  // ═══════════════════════════════════════════════════════════════════════

  async createBackup(request: CreateBackupRequest): Promise<BackupMetadata> {
    const backupId = this.crypto.generateId();
    const scope = request.scope || this.state.settings.defaultScope;
    const destination = request.destination || { type: 'local' as const, path: this.getBackupDir() };
    const backupType = request.type || 'full';

    // Emit start event
    this.context.ipc.send('backup:started', { backupId });
    this.sendProgress({ phase: 'collecting', percent: 0, bytesProcessed: 0, totalBytes: 0, estimatedTimeMs: 0, message: 'Collecting data...' });

    try {
      // Run pre-backup hooks
      await this.runHooks('pre-backup');

      // Collect data
      const rawData = await this.collectData(scope, backupType);
      const dataBuffer = Buffer.from(JSON.stringify(rawData), 'utf-8');

      // Size check
      const sizeMB = dataBuffer.length / (1024 * 1024);
      if (sizeMB > this.state.settings.maxBackupSizeMB) {
        throw new Error(`Backup size (${sizeMB.toFixed(1)}MB) exceeds maximum (${this.state.settings.maxBackupSizeMB}MB)`);
      }

      this.sendProgress({ phase: 'encrypting', percent: 30, bytesProcessed: 0, totalBytes: dataBuffer.length, estimatedTimeMs: 0, message: 'Encrypting...' });

      // Encrypt
      const encrypted = this.crypto.encrypt(dataBuffer, request.passphrase);

      this.sendProgress({ phase: 'writing', percent: 60, bytesProcessed: 0, totalBytes: dataBuffer.length, estimatedTimeMs: 0, message: 'Writing backup file...' });

      // Build backup file
      const checksum = this.crypto.computeChecksum(encrypted.ciphertext);
      const metadata: BackupMetadata = {
        id: backupId,
        formatVersion: BACKUP_FORMAT_VERSION,
        timestamp: Date.now(),
        size: encrypted.ciphertext.length,
        checksum,
        type: backupType,
        scope,
        destination,
        verified: true,
        parentId: backupType === 'incremental' ? this.getLatestFullBackupId() : undefined
      };

      const backupFile: BackupFile = {
        formatVersion: BACKUP_FORMAT_VERSION,
        metadata,
        salt: encrypted.salt.toString('base64'),
        iv: encrypted.iv.toString('base64'),
        authTag: encrypted.authTag.toString('base64'),
        payload: encrypted.ciphertext.toString('base64')
      };

      // Write to storage
      await this.writeBackupFile(backupId, backupFile);

      // Update snapshot hashes for incremental support
      if (backupType === 'full') {
        this.updateSnapshotHashes(rawData);
      }

      // Update history
      this.state.history.push(metadata);
      this.state.settings.autoBackup.lastRun = Date.now();
      await this.save();

      // Enforce retention
      await this.enforceRetention();

      this.sendProgress({ phase: 'verifying', percent: 90, bytesProcessed: dataBuffer.length, totalBytes: dataBuffer.length, estimatedTimeMs: 0, message: 'Verifying integrity...' });

      // Verify
      const storedFile = await this.readBackupFile(backupId);
      if (storedFile) {
        const storedCiphertext = Buffer.from(storedFile.payload, 'base64');
        metadata.verified = this.crypto.verifyChecksum(storedCiphertext, checksum);
      }

      this.sendProgress({ phase: 'complete', percent: 100, bytesProcessed: dataBuffer.length, totalBytes: dataBuffer.length, estimatedTimeMs: 0, message: 'Backup complete' });

      // Run post-backup hooks
      await this.runHooks('post-backup');

      // Emit completion
      this.context.ipc.send('backup:completed', metadata);

      return metadata;
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      this.sendProgress({ phase: 'error', percent: 0, bytesProcessed: 0, totalBytes: 0, estimatedTimeMs: 0, message });
      this.context.ipc.send('backup:failed', { error: message, backupId });
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Restore
  // ═══════════════════════════════════════════════════════════════════════

  async restoreBackup(request: RestoreBackupRequest): Promise<void> {
    let backupFile: BackupFile;

    if (request.fileData) {
      // Drag-drop or file upload
      backupFile = JSON.parse(Buffer.from(request.fileData, 'base64').toString('utf-8'));
    } else if (request.backupId) {
      const stored = await this.readBackupFile(request.backupId);
      if (!stored) throw new Error(`Backup ${request.backupId} not found`);
      backupFile = stored;
    } else {
      throw new Error('Either backupId or fileData is required');
    }

    // Version check & migration
    if (backupFile.formatVersion > BACKUP_FORMAT_VERSION) {
      throw new Error(`Backup format version ${backupFile.formatVersion} is newer than supported (${BACKUP_FORMAT_VERSION})`);
    }
    backupFile = this.migrateBackupFormat(backupFile);

    this.context.ipc.send('backup:restore-started', { backupId: backupFile.metadata.id });

    try {
      // Optional: backup current state first
      if (request.backupCurrentFirst && this.autoPassphrase) {
        await this.createBackup({
          passphrase: this.autoPassphrase,
          scope: { mode: 'full', categories: ALL_CATEGORIES },
          type: 'full'
        });
      }

      // Run pre-restore hooks
      await this.runHooks('pre-restore');

      // Verify integrity
      const ciphertext = Buffer.from(backupFile.payload, 'base64');
      const checksumValid = this.crypto.verifyChecksum(ciphertext, backupFile.metadata.checksum);
      if (!checksumValid) {
        throw new Error('Backup integrity check failed — file may be corrupted');
      }

      // Decrypt
      const decrypted = this.crypto.decrypt({
        salt: Buffer.from(backupFile.salt, 'base64'),
        iv: Buffer.from(backupFile.iv, 'base64'),
        authTag: Buffer.from(backupFile.authTag, 'base64'),
        ciphertext
      }, request.passphrase);

      const data = JSON.parse(decrypted.toString('utf-8'));

      // Apply restored data
      await this.applyRestoredData(data, backupFile.metadata.scope);

      // Run post-restore hooks
      await this.runHooks('post-restore');

      this.context.ipc.send('backup:restore-completed', { backupId: backupFile.metadata.id });
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      this.context.ipc.send('backup:restore-failed', { error: message });
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Verify
  // ═══════════════════════════════════════════════════════════════════════

  async verifyBackup(backupId: string): Promise<{ verified: boolean; error?: string }> {
    const backupFile = await this.readBackupFile(backupId);
    if (!backupFile) return { verified: false, error: 'Backup not found' };

    try {
      const ciphertext = Buffer.from(backupFile.payload, 'base64');
      const verified = this.crypto.verifyChecksum(ciphertext, backupFile.metadata.checksum);

      // Update metadata
      const metaIdx = this.state.history.findIndex(h => h.id === backupId);
      if (metaIdx >= 0) {
        this.state.history[metaIdx].verified = verified;
        await this.save();
      }

      return { verified };
    } catch (err: any) {
      return { verified: false, error: err?.message || 'Verification failed' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Delete
  // ═══════════════════════════════════════════════════════════════════════

  async deleteBackup(backupId: string): Promise<void> {
    await this.context.storage.delete(`backup-file:${backupId}`);
    this.state.history = this.state.history.filter(h => h.id !== backupId);
    await this.save();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Data Collection (Enhancement #10 — Selective)
  // ═══════════════════════════════════════════════════════════════════════

  private async collectData(scope: BackupScope, type: 'full' | 'incremental'): Promise<Record<string, any>> {
    const data: Record<string, any> = {};
    const categories = scope.mode === 'full' ? ALL_CATEGORIES : scope.categories;

    for (const category of categories) {
      const key = `app:${category}`;
      const value = await this.context.storage.get(key);
      if (value !== null && value !== undefined) {
        if (type === 'incremental') {
          // Only include if changed
          const valueStr = JSON.stringify(value);
          const hash = this.crypto.hashValue(valueStr);
          if (this.state.snapshotHashes[key] !== hash) {
            data[key] = value;
          }
        } else {
          data[key] = value;
        }
      }
    }

    return data;
  }

  private updateSnapshotHashes(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      this.state.snapshotHashes[key] = this.crypto.hashValue(JSON.stringify(value));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Data Restoration
  // ═══════════════════════════════════════════════════════════════════════

  private async applyRestoredData(data: Record<string, any>, scope: BackupScope): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.context.storage.set(key, value);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // File I/O
  // ═══════════════════════════════════════════════════════════════════════

  private async writeBackupFile(backupId: string, file: BackupFile): Promise<void> {
    await this.context.storage.set(`backup-file:${backupId}`, file);
  }

  private async readBackupFile(backupId: string): Promise<BackupFile | null> {
    return await this.context.storage.get(`backup-file:${backupId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Format Migration (Enhancement #12)
  // ═══════════════════════════════════════════════════════════════════════

  private migrateBackupFormat(file: BackupFile): BackupFile {
    // Currently at version 1 — no migrations needed yet.
    // Future migrations would be applied here:
    // if (file.formatVersion === 1) { file = migrateV1toV2(file); }
    return file;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Retention Policy (Enhancement #9)
  // ═══════════════════════════════════════════════════════════════════════

  async enforceRetention(): Promise<void> {
    const { maxBackups, maxAgeDays } = this.state.settings.retention;
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 86_400_000;

    // Sort by timestamp descending (newest first)
    this.state.history.sort((a, b) => b.timestamp - a.timestamp);

    const toRemove: string[] = [];

    for (let i = 0; i < this.state.history.length; i++) {
      const entry = this.state.history[i];
      const tooOld = (now - entry.timestamp) > maxAgeMs;
      const overCount = i >= maxBackups;

      if (tooOld || overCount) {
        toRemove.push(entry.id);
      }
    }

    for (const id of toRemove) {
      await this.context.storage.delete(`backup-file:${id}`);
    }

    this.state.history = this.state.history.filter(h => !toRemove.includes(h.id));
    if (toRemove.length > 0) {
      await this.save();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Hook System (Enhancement #21)
  // ═══════════════════════════════════════════════════════════════════════

  registerHook(hook: HookRegistration): void {
    // Deduplicate
    const exists = this.state.hooks.some(
      h => h.pluginId === hook.pluginId && h.phase === hook.phase
    );
    if (!exists) {
      this.state.hooks.push(hook);
      this.save();
    }
  }

  private async runHooks(phase: HookRegistration['phase']): Promise<void> {
    const hooks = this.state.hooks.filter(h => h.phase === phase);
    
    const promises = hooks.map(hook => {
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`[Secure Backup] Hook ${hook.channel} timed out`);
          resolve();
        }, HOOK_TIMEOUT_MS);

        try {
          this.context.ipc.invoke(hook.channel, { phase }).then(() => {
            clearTimeout(timeout);
            resolve();
          }).catch(() => {
            clearTimeout(timeout);
            resolve();
          });
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await Promise.all(promises);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Scheduler (Enhancement #5)
  // ═══════════════════════════════════════════════════════════════════════

  private setupScheduler(): void {
    if (!this.state.settings.autoBackup.enabled) return;

    this.scheduler.start(this.state.settings.autoBackup, async () => {
      if (!this.autoPassphrase) {
        console.warn('[Secure Backup] Cannot run auto-backup: no passphrase configured');
        return;
      }

      try {
        await this.createBackup({
          passphrase: this.autoPassphrase,
          scope: this.state.settings.defaultScope,
          type: 'full'
        });
        console.log('[Secure Backup] Scheduled backup completed');
      } catch (err) {
        console.error('[Secure Backup] Scheduled backup failed:', err);
      }
    });
  }

  private setupShutdownHook(): void {
    this.context.on('stop', () => {
      if (
        this.state.settings.autoBackup.enabled &&
        this.state.settings.autoBackup.interval === 'on-shutdown'
      ) {
        this.scheduler.onShutdown();
      }
      this.shutdown();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Progress Events (Enhancement #14, #20)
  // ═══════════════════════════════════════════════════════════════════════

  private sendProgress(progress: BackupProgress): void {
    this.context.ipc.send('backup:progress', progress);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════

  private getBackupDir(): string {
    return this.state.settings.backupDir || 'backups';
  }

  private getLatestFullBackupId(): string | undefined {
    const fullBackups = this.state.history
      .filter(h => h.type === 'full')
      .sort((a, b) => b.timestamp - a.timestamp);
    return fullBackups[0]?.id;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // IPC Handlers (Enhancement #3 — all logic in main process)
  // ═══════════════════════════════════════════════════════════════════════

  private registerIpcHandlers(): void {
    // Create backup
    this.context.ipc.handle('backup:create', async (req: CreateBackupRequest) => {
      return await this.createBackup(req);
    });

    // Restore backup
    this.context.ipc.handle('backup:restore', async (req: RestoreBackupRequest) => {
      await this.restoreBackup(req);
      return { success: true };
    });

    // List backup history
    this.context.ipc.handle('backup:list', async () => {
      return this.state.history.sort((a, b) => b.timestamp - a.timestamp);
    });

    // Delete backup
    this.context.ipc.handle('backup:delete', async (req: DeleteBackupRequest) => {
      await this.deleteBackup(req.backupId);
      return { success: true };
    });

    // Verify backup integrity
    this.context.ipc.handle('backup:verify', async (req: VerifyBackupRequest) => {
      return await this.verifyBackup(req.backupId);
    });

    // Get settings
    this.context.ipc.handle('backup:get-settings', async () => {
      return this.state.settings;
    });

    // Update settings
    this.context.ipc.handle('backup:update-settings', async (settings: Partial<BackupSettings>) => {
      this.state.settings = { ...this.state.settings, ...settings };
      await this.save();

      // Restart scheduler with new settings
      this.scheduler.stop();
      this.setupScheduler();

      return this.state.settings;
    });

    // Register hook
    this.context.ipc.handle('backup:register-hook', async (hook: HookRegistration) => {
      this.registerHook(hook);
      return { success: true };
    });

    // Get backup file content (for download)
    this.context.ipc.handle('backup:get-file', async (req: { backupId: string }) => {
      const file = await this.readBackupFile(req.backupId);
      if (!file) throw new Error('Backup not found');
      return Buffer.from(JSON.stringify(file)).toString('base64');
    });

    // Set auto-backup passphrase (stored in secrets manager)
    this.context.ipc.handle('backup:set-passphrase', async (req: { passphrase: string }) => {
      await this.context.secrets.set('backup-passphrase', req.passphrase, 'Backup Encryption Passphrase');
      this.autoPassphrase = req.passphrase;
      return { success: true };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DSN Tools (Enhancement #4)
  // ═══════════════════════════════════════════════════════════════════════

  private registerDsnTools(): void {
    this.context.dsn.registerTool({
      name: 'backup_data',
      description: 'Create an encrypted backup of application data',
      executionLocation: 'CLIENT',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'Backup scope: full, graph, conversations, identity, or plugin-settings'
          },
          passphrase: {
            type: 'string',
            description: 'Encryption passphrase'
          }
        },
        required: ['passphrase']
      },
      version: '1.0.0',
      semanticDomain: 'temporal',
      primeDomain: [],
      smfAxes: [],
      requiredTier: 'Neophyte'
    }, async (args: { scope?: string; passphrase: string }) => {
      const scope: BackupScope = args.scope && args.scope !== 'full'
        ? { mode: 'selective', categories: [args.scope as BackupCategory] }
        : { mode: 'full', categories: ALL_CATEGORIES };

      const metadata = await this.createBackup({
        passphrase: args.passphrase,
        scope,
        type: 'full'
      });
      return { success: true, backupId: metadata.id, timestamp: metadata.timestamp };
    });

    this.context.dsn.registerTool({
      name: 'restore_backup',
      description: 'Restore data from an encrypted backup',
      executionLocation: 'CLIENT',
      parameters: {
        type: 'object',
        properties: {
          backupId: {
            type: 'string',
            description: 'ID of the backup to restore'
          },
          passphrase: {
            type: 'string',
            description: 'Decryption passphrase'
          }
        },
        required: ['backupId', 'passphrase']
      },
      version: '1.0.0',
      semanticDomain: 'temporal',
      primeDomain: [],
      smfAxes: [],
      requiredTier: 'Neophyte'
    }, async (args: { backupId: string; passphrase: string }) => {
      await this.restoreBackup({
        backupId: args.backupId,
        passphrase: args.passphrase
      });
      return { success: true };
    });

    if (this.context.traits) {
      this.context.traits.register({
        id: 'secure-backup',
        name: 'Secure Backup',
        description: 'Create and restore encrypted backups.',
        instruction: 'You can create and restore encrypted backups of system data using `backup_data` and `restore_backup`. Always ensure a passphrase is provided for security.',
        activationMode: 'dynamic',
        triggerKeywords: ['backup', 'restore', 'save data', 'recover', 'snapshot', 'encrypted', 'archive']
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Plugin Lifecycle
// ═══════════════════════════════════════════════════════════════════════════

let manager: BackupManager | null = null;

export const activate = async (context: PluginContext) => {
  console.log('[Secure Backup] Activating...');
  manager = new BackupManager(context);
  await manager.init();
  console.log('[Secure Backup] Activated');
};

export const deactivate = async () => {
  if (manager) {
    await manager.shutdown();
    manager = null;
  }
  console.log('[Secure Backup] Deactivated');
};

// Export for testing
export { CryptoEngine } from './crypto';
export { BackupScheduler } from './scheduler';
