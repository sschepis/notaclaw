import { PluginContext } from '../../client/src/shared/plugin-types';

export { PluginContext };

// ═══════════════════════════════════════════════════════════════════════════
// Backup Format Version
// ═══════════════════════════════════════════════════════════════════════════

export const BACKUP_FORMAT_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════
// Backup Categories & Scope
// ═══════════════════════════════════════════════════════════════════════════

export type BackupCategory =
  | 'graph'
  | 'conversations'
  | 'identity'
  | 'plugin-settings'
  | 'custom';

export interface BackupScope {
  mode: 'full' | 'selective';
  categories: BackupCategory[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Backup Destinations
// ═══════════════════════════════════════════════════════════════════════════

export type BackupDestination =
  | { type: 'local'; path: string }
  | { type: 'custom-dir'; path: string };

// ═══════════════════════════════════════════════════════════════════════════
// Backup Metadata & File Format
// ═══════════════════════════════════════════════════════════════════════════

export interface BackupMetadata {
  id: string;
  formatVersion: number;
  timestamp: number;
  size: number;
  checksum: string;
  type: 'full' | 'incremental';
  scope: BackupScope;
  destination: BackupDestination;
  verified: boolean;
  parentId?: string;
}

export interface BackupFile {
  formatVersion: number;
  metadata: BackupMetadata;
  salt: string;       // Base64-encoded PBKDF2 salt
  iv: string;         // Base64-encoded AES-GCM IV
  authTag: string;    // Base64-encoded GCM authentication tag
  payload: string;    // Base64-encoded encrypted data
}

// ═══════════════════════════════════════════════════════════════════════════
// Encrypted Payload (internal)
// ═══════════════════════════════════════════════════════════════════════════

export interface EncryptedPayload {
  salt: Buffer;
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings & Configuration
// ═══════════════════════════════════════════════════════════════════════════

export interface AutoBackupConfig {
  enabled: boolean;
  interval: 'hourly' | 'daily' | 'weekly' | 'on-shutdown';
  lastRun: number | null;
}

export interface RetentionConfig {
  maxBackups: number;
  maxAgeDays: number;
}

export interface BackupSettings {
  backupDir: string;
  encryptionAlgorithm: 'aes-256-gcm';
  autoBackup: AutoBackupConfig;
  retention: RetentionConfig;
  maxBackupSizeMB: number;
  defaultScope: BackupScope;
}

// ═══════════════════════════════════════════════════════════════════════════
// State & Hooks
// ═══════════════════════════════════════════════════════════════════════════

export interface HookRegistration {
  pluginId: string;
  phase: 'pre-backup' | 'post-backup' | 'pre-restore' | 'post-restore';
  channel: string;
}

export interface BackupState {
  settings: BackupSettings;
  history: BackupMetadata[];
  hooks: HookRegistration[];
  snapshotHashes: Record<string, string>;  // key → hash for incremental detection
}

// ═══════════════════════════════════════════════════════════════════════════
// Progress Tracking
// ═══════════════════════════════════════════════════════════════════════════

export type BackupPhase =
  | 'collecting'
  | 'encrypting'
  | 'writing'
  | 'verifying'
  | 'complete'
  | 'error';

export interface BackupProgress {
  phase: BackupPhase;
  percent: number;
  bytesProcessed: number;
  totalBytes: number;
  estimatedTimeMs: number;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Restore Confirmation
// ═══════════════════════════════════════════════════════════════════════════

export interface RestoreConfirmation {
  backupId: string;
  timestamp: number;
  scope: BackupScope;
  overwriteWarning: string[];
  backupCurrentFirst: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// IPC Request/Response Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateBackupRequest {
  passphrase: string;
  scope?: BackupScope;
  destination?: BackupDestination;
  type?: 'full' | 'incremental';
}

export interface RestoreBackupRequest {
  backupId?: string;
  fileData?: string;  // Base64-encoded backup file content for drag-drop/file upload
  passphrase: string;
  backupCurrentFirst?: boolean;
}

export interface VerifyBackupRequest {
  backupId: string;
}

export interface DeleteBackupRequest {
  backupId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Settings
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_SETTINGS: BackupSettings = {
  backupDir: '',
  encryptionAlgorithm: 'aes-256-gcm',
  autoBackup: {
    enabled: false,
    interval: 'daily',
    lastRun: null
  },
  retention: {
    maxBackups: 10,
    maxAgeDays: 90
  },
  maxBackupSizeMB: 500,
  defaultScope: {
    mode: 'full',
    categories: ['graph', 'conversations', 'identity', 'plugin-settings']
  }
};
