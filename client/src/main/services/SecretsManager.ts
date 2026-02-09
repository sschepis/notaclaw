/**
 * SecretsManager — Encrypted vault for sensitive data in the main process.
 *
 * Architecture
 * ────────────
 *  1. On first run a random 256-bit master key is generated.
 *  2. The master key is persisted via Electron `safeStorage` (OS keychain).
 *     If safeStorage is unavailable, a machine-specific derivation is used.
 *  3. All secret entries are AES-256-GCM encrypted with the master key
 *     and stored in a single vault file under `userData`.
 *  4. Secrets are namespaced so plugins / services cannot cross-read each other.
 *  5. The service emits audit events through the LogManager singleton.
 *
 * Threat model assumptions
 * ────────────────────────
 *  • The main process memory is trusted during execution.
 *  • At-rest protection guards against file-system theft.
 *  • Renderer never receives raw secret values except through explicit
 *    IPC `secrets:get` calls (never bulk-exposed).
 */

import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  SecretNamespace,
  SecretEntryRedacted,
  SecretMetadata,
  SetSecretOptions,
  GetSecretOptions,
  DeleteSecretOptions,
  ListSecretsOptions,
  VaultStatus,
  SecretEvent,
  SecretEventType,
} from '../../shared/secrets-types';

// ── Constants ───────────────────────────────────────────────────────────────

const VAULT_FILE = 'secrets-vault.enc';
const MASTER_KEY_FILE = 'vault-master.key';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key
const PBKDF2_ITERATIONS = 100_000;

// ── Internal Types ──────────────────────────────────────────────────────────

/** Serialisable vault envelope written to disk. */
interface VaultEnvelope {
  version: 1;
  iv: string; // hex-encoded
  authTag: string; // hex-encoded
  ciphertext: string; // hex-encoded encrypted JSON of VaultData
}

/** Decrypted in-memory representation of the vault contents. */
interface VaultData {
  entries: Record<string, VaultEntry>;
  savedAt: number;
}

/** Internal entry stored inside the vault data. */
interface VaultEntry {
  namespace: SecretNamespace;
  key: string;
  value: string; // the actual secret
  metadata: SecretMetadata;
}

// ── SecretsManager ──────────────────────────────────────────────────────────

export class SecretsManager extends EventEmitter {
  private vaultPath: string;
  private masterKeyPath: string;
  private masterKey: Buffer | null = null;
  private vault: VaultData | null = null;
  private initialized = false;
  private locked = true;
  private dirty = false;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    const userDataPath = app.getPath('userData');
    this.vaultPath = path.join(userDataPath, VAULT_FILE);
    this.masterKeyPath = path.join(userDataPath, MASTER_KEY_FILE);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Initialise the vault: load or create the master key, then decrypt
   * or create the vault file.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.masterKey = await this.loadOrCreateMasterKey();
      this.vault = await this.loadVault();
      this.locked = false;
      this.initialized = true;
      this.startAutoSave();
      this.emitEvent('vault:initialized');
    } catch (err) {
      this.emitEvent('vault:error', undefined, undefined, `Initialization failed: ${err}`);
      throw err;
    }
  }

  /**
   * Lock the vault — clears decrypted data from memory.
   * Saves any pending changes first.
   */
  async lock(): Promise<void> {
    if (this.dirty) await this.save();
    this.vault = null;
    this.locked = true;
    this.stopAutoSave();
    this.emitEvent('vault:locked');
  }

  /**
   * Unlock the vault — re-loads and decrypts vault data.
   */
  async unlock(): Promise<void> {
    this.ensureMasterKey();
    this.vault = await this.loadVault();
    this.locked = false;
    this.startAutoSave();
    this.emitEvent('vault:unlocked');
  }

  /**
   * Persist any pending changes and tear down timers.
   * Call this during app shutdown (before-quit).
   */
  async shutdown(): Promise<void> {
    this.stopAutoSave();
    if (this.dirty && this.vault && this.masterKey) {
      await this.save();
    }
  }

  // ── CRUD Operations ───────────────────────────────────────────────────────

  /**
   * Store a secret in the vault.
   */
  async setSecret(options: SetSecretOptions): Promise<void> {
    this.ensureUnlocked();
    const id = this.composeId(options.namespace, options.key);
    const now = Date.now();

    const existing = this.vault!.entries[id];
    const metadata: SecretMetadata = {
      createdAt: existing?.metadata.createdAt ?? now,
      updatedAt: now,
      ttl: options.ttl,
      label: options.label,
      origin: options.origin,
      rotated: !!existing,
    };

    this.vault!.entries[id] = {
      namespace: options.namespace,
      key: options.key,
      value: options.value,
      metadata,
    };

    this.dirty = true;
    this.emitEvent('secret:set', options.namespace, options.key);
  }

  /**
   * Retrieve a secret value. Returns `null` if not found or expired.
   */
  async getSecret(options: GetSecretOptions): Promise<string | null> {
    this.ensureUnlocked();
    const id = this.composeId(options.namespace, options.key);
    const entry = this.vault!.entries[id];

    if (!entry) return null;

    // Check TTL expiration
    if (this.isExpired(entry)) {
      await this.deleteSecret({ namespace: options.namespace, key: options.key });
      this.emitEvent('secret:expired', options.namespace, options.key);
      return null;
    }

    this.emitEvent('secret:get', options.namespace, options.key);
    return entry.value;
  }

  /**
   * Delete a secret from the vault.
   */
  async deleteSecret(options: DeleteSecretOptions): Promise<boolean> {
    this.ensureUnlocked();
    const id = this.composeId(options.namespace, options.key);

    if (!(id in this.vault!.entries)) return false;

    delete this.vault!.entries[id];
    this.dirty = true;
    this.emitEvent('secret:delete', options.namespace, options.key);
    return true;
  }

  /**
   * Check whether a secret exists (and is not expired).
   */
  async hasSecret(options: GetSecretOptions): Promise<boolean> {
    this.ensureUnlocked();
    const id = this.composeId(options.namespace, options.key);
    const entry = this.vault!.entries[id];
    if (!entry) return false;
    if (this.isExpired(entry)) {
      await this.deleteSecret({ namespace: options.namespace, key: options.key });
      return false;
    }
    return true;
  }

  /**
   * List secrets, returning redacted entries (no values).
   */
  async listSecrets(options: ListSecretsOptions = {}): Promise<SecretEntryRedacted[]> {
    this.ensureUnlocked();
    const results: SecretEntryRedacted[] = [];

    for (const [id, entry] of Object.entries(this.vault!.entries)) {
      // Filter by namespace
      if (options.namespace && entry.namespace !== options.namespace) continue;

      // Filter by key prefix
      if (options.keyPrefix && !entry.key.startsWith(options.keyPrefix)) continue;

      // Skip expired
      if (this.isExpired(entry)) continue;

      results.push({
        id,
        namespace: entry.namespace,
        key: entry.key,
        metadata: { ...entry.metadata },
        hasValue: entry.value.length > 0,
      });
    }

    return results;
  }

  /**
   * Delete all secrets within a namespace.
   */
  async clearNamespace(namespace: SecretNamespace): Promise<number> {
    this.ensureUnlocked();
    let count = 0;

    for (const [id, entry] of Object.entries(this.vault!.entries)) {
      if (entry.namespace === namespace) {
        delete this.vault!.entries[id];
        count++;
      }
    }

    if (count > 0) {
      this.dirty = true;
      this.emitEvent('secret:delete', namespace, undefined, `Cleared ${count} entries`);
    }

    return count;
  }

  /**
   * Get vault status (safe to expose to renderer).
   */
  async getStatus(): Promise<VaultStatus> {
    const namespaces: Record<SecretNamespace, number> = {
      'ai-providers': 0,
      'identity': 0,
      'services': 0,
      'plugins': 0,
      'user': 0,
      'system': 0,
    };

    if (this.vault) {
      for (const entry of Object.values(this.vault.entries)) {
        if (!this.isExpired(entry)) {
          namespaces[entry.namespace] = (namespaces[entry.namespace] || 0) + 1;
        }
      }
    }

    return {
      initialized: this.initialized,
      locked: this.locked,
      entryCount: this.vault ? Object.keys(this.vault.entries).length : 0,
      encryptionAvailable: this.isEncryptionAvailable(),
      lastSavedAt: this.vault?.savedAt ?? null,
      namespaces,
    };
  }

  /**
   * Force save the vault to disk immediately.
   */
  async save(): Promise<void> {
    if (!this.vault || !this.masterKey) return;

    this.vault.savedAt = Date.now();
    const plaintext = JSON.stringify(this.vault);
    const encrypted = this.encrypt(plaintext, this.masterKey);

    const envelope: VaultEnvelope = {
      version: 1,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
    };

    await fs.writeFile(this.vaultPath, JSON.stringify(envelope));
    this.dirty = false;
    this.emitEvent('vault:saved');
  }

  // ── Master Key Management ─────────────────────────────────────────────────

  /**
   * Load an existing master key or generate a new one.
   * Prefers Electron safeStorage (OS keychain), falls back to PBKDF2
   * derived from a persisted random salt.
   */
  private async loadOrCreateMasterKey(): Promise<Buffer> {
    if (this.isEncryptionAvailable()) {
      return this.loadOrCreateMasterKeyViaSafeStorage();
    }
    return this.loadOrCreateMasterKeyViaFile();
  }

  private isEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  /**
   * safeStorage path: encrypt the master key using the OS credential store.
   */
  private async loadOrCreateMasterKeyViaSafeStorage(): Promise<Buffer> {
    try {
      const encryptedData = await fs.readFile(this.masterKeyPath);
      const decrypted = safeStorage.decryptString(encryptedData);
      return Buffer.from(decrypted, 'hex');
    } catch {
      // No existing key — generate a fresh random master key
      const key = crypto.randomBytes(KEY_LENGTH);
      const encrypted = safeStorage.encryptString(key.toString('hex'));
      await fs.writeFile(this.masterKeyPath, encrypted);
      return key;
    }
  }

  /**
   * Fallback path: derive master key from a persisted random salt using PBKDF2.
   * Less secure than safeStorage but still better than plaintext.
   * The salt acts as a machine-bound secret stored alongside the vault.
   */
  private async loadOrCreateMasterKeyViaFile(): Promise<Buffer> {
    let salt: Buffer;

    try {
      const data = await fs.readFile(this.masterKeyPath, 'utf-8');
      salt = Buffer.from(data, 'hex');
    } catch {
      salt = crypto.randomBytes(32);
      await fs.writeFile(this.masterKeyPath, salt.toString('hex'));
    }

    // Derive key using PBKDF2 with the machine-specific salt
    // The "password" here is a fixed app identifier — the entropy comes from the salt.
    return new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        'alephnet-secrets-vault',
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha512',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  // ── Vault File I/O ────────────────────────────────────────────────────────

  private async loadVault(): Promise<VaultData> {
    this.ensureMasterKey();

    try {
      const raw = await fs.readFile(this.vaultPath, 'utf-8');
      const envelope: VaultEnvelope = JSON.parse(raw);

      if (envelope.version !== 1) {
        throw new Error(`Unsupported vault version: ${envelope.version}`);
      }

      const plaintext = this.decrypt(
        envelope.ciphertext,
        envelope.iv,
        envelope.authTag,
        this.masterKey!
      );

      return JSON.parse(plaintext);
    } catch (err: any) {
      // If file doesn't exist or is corrupt, start fresh
      if (err?.code === 'ENOENT' || err?.message?.includes('Unsupported')) {
        return { entries: {}, savedAt: Date.now() };
      }
      // For decryption errors, also start fresh (vault may be from a different key)
      if (err?.message?.includes('decrypt') || err?.message?.includes('auth tag')) {
        console.warn('Vault decryption failed — starting with empty vault.');
        return { entries: {}, savedAt: Date.now() };
      }
      throw err;
    }
  }

  // ── Crypto Primitives ─────────────────────────────────────────────────────

  private encrypt(
    plaintext: string,
    key: Buffer
  ): { ciphertext: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  private decrypt(
    ciphertext: string,
    ivHex: string,
    authTagHex: string,
    key: Buffer
  ): string {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private composeId(namespace: SecretNamespace, key: string): string {
    return `${namespace}/${key}`;
  }

  private isExpired(entry: VaultEntry): boolean {
    if (!entry.metadata.ttl) return false;
    return Date.now() > entry.metadata.createdAt + entry.metadata.ttl;
  }

  private ensureUnlocked(): void {
    if (!this.initialized) throw new Error('SecretsManager not initialized');
    if (this.locked) throw new Error('Vault is locked');
    if (!this.vault) throw new Error('Vault data not loaded');
  }

  private ensureMasterKey(): void {
    if (!this.masterKey) throw new Error('Master key not loaded');
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    // Auto-save every 30 seconds if dirty
    this.autoSaveTimer = setInterval(async () => {
      if (this.dirty) {
        try {
          await this.save();
        } catch (err) {
          console.error('Auto-save of secrets vault failed:', err);
        }
      }
    }, 30_000);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private emitEvent(
    type: SecretEventType,
    namespace?: SecretNamespace,
    key?: string,
    details?: string
  ): void {
    const event: SecretEvent = {
      type,
      namespace,
      key,
      timestamp: Date.now(),
      details,
    };
    this.emit('secret-event', event);
  }
}
