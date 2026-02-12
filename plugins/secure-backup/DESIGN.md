# Secure Backup — Design Document

## Overview
This document defines the architecture and implementation plan for a release-grade Secure Backup plugin. It addresses all 22 enhancements from [ENHANCEMENTS.md](ENHANCEMENTS.md), transforming the current stub into a fully functional encrypted backup system with scheduling, incremental snapshots, integrity verification, and a rich UI.

## Architecture

### High-Level Components

```
┌─────────────────────────────────┐
│         Renderer Process        │
│  ┌───────────┐ ┌──────────────┐ │
│  │ BackupPanel│ │SettingsPanel │ │
│  │ - History  │ │- Schedule    │ │
│  │ - Progress │ │- Retention   │ │
│  │ - DragDrop │ │- Encryption  │ │
│  │ - Restore  │ │- Destinations│ │
│  └─────┬─────┘ └──────┬───────┘ │
│        │    IPC        │         │
├────────┼───────────────┼─────────┤
│        │ Main Process  │         │
│  ┌─────▼───────────────▼───────┐ │
│  │      BackupManager          │ │
│  │  ┌──────────┐ ┌───────────┐ │ │
│  │  │CryptoEngine│ │Scheduler │ │ │
│  │  │AES-256-GCM│ │Cron/Timer│ │ │
│  │  └──────────┘ └───────────┘ │ │
│  │  ┌──────────┐ ┌───────────┐ │ │
│  │  │Retention │ │Incremental│ │ │
│  │  │Policy    │ │Snapshots  │ │ │
│  │  └──────────┘ └───────────┘ │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │    DSN Tool Registration    │ │
│  │  backup_data / restore_backup│ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │    Hook System              │ │
│  │  pre-backup / post-backup   │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Data Model (`types.ts`)

```typescript
// Backup format version for migration support (Enhancement #12)
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupMetadata {
  id: string;
  formatVersion: number;
  timestamp: number;
  size: number;
  checksum: string;            // SHA-256 of encrypted payload (Enhancement #7)
  type: 'full' | 'incremental';
  scope: BackupScope;
  destination: BackupDestination;
  verified: boolean;
  parentId?: string;           // For incremental: references the base backup
}

export interface BackupScope {
  mode: 'full' | 'selective';
  categories: BackupCategory[];  // Enhancement #10
}

export type BackupCategory = 
  | 'graph'
  | 'conversations'
  | 'identity'
  | 'plugin-settings'
  | 'custom';

export type BackupDestination = 
  | { type: 'local'; path: string }
  | { type: 'custom-dir'; path: string }
  | { type: 'cloud-s3'; bucket: string; key: string }
  | { type: 'dsn-peer'; peerId: string };

export interface BackupFile {
  formatVersion: number;
  metadata: BackupMetadata;
  salt: string;                // Base64 salt for PBKDF2 (Enhancement #11)
  iv: string;                  // Base64 IV for AES-256-GCM
  authTag: string;             // Base64 GCM auth tag
  payload: string;             // Base64 encrypted data
}

export interface BackupSettings {
  backupDir: string;
  encryptionAlgorithm: 'aes-256-gcm';
  autoBackup: AutoBackupConfig;
  retention: RetentionConfig;
  maxBackupSizeMB: number;
  defaultScope: BackupScope;
}

export interface AutoBackupConfig {
  enabled: boolean;
  interval: 'hourly' | 'daily' | 'weekly' | 'on-shutdown';
  lastRun: number | null;
}

export interface RetentionConfig {
  maxBackups: number;           // Enhancement #9
  maxAgeDays: number;
}

export interface BackupState {
  settings: BackupSettings;
  history: BackupMetadata[];    // Enhancement #13
  hooks: HookRegistration[];
}

export interface HookRegistration {
  pluginId: string;
  phase: 'pre-backup' | 'post-backup' | 'pre-restore' | 'post-restore';
  channel: string;
}

export interface BackupProgress {
  phase: 'collecting' | 'encrypting' | 'writing' | 'verifying' | 'complete' | 'error';
  percent: number;
  bytesProcessed: number;
  totalBytes: number;
  estimatedTimeMs: number;
  message: string;
}

export interface RestoreConfirmation {
  backupId: string;
  timestamp: number;
  scope: BackupScope;
  overwriteWarning: string[];
  backupCurrentFirst: boolean;
}
```

## Encryption (Enhancements #2, #11)

### CryptoEngine (`main/crypto.ts`)

All encryption runs in the main process using Node.js `crypto`:

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations from user passphrase
- **Salt**: 32 bytes, randomly generated per backup, stored alongside ciphertext
- **IV**: 16 bytes, randomly generated per encryption operation
- **Auth Tag**: 16 bytes, appended by GCM mode

```typescript
class CryptoEngine {
  deriveKey(passphrase: string, salt: Buffer): Buffer;
  encrypt(data: Buffer, passphrase: string): EncryptedPayload;
  decrypt(payload: EncryptedPayload, passphrase: string): Buffer;
  computeChecksum(data: Buffer): string;  // SHA-256
  verifyChecksum(data: Buffer, expected: string): boolean;
}
```

Key management integrates with the host's `SecretsManager` via `context.secrets` — the passphrase is never stored directly; only the salt persists.

## Backup Logic (Enhancements #1, #3, #6, #10)

### BackupManager (`main/index.ts`)

All data operations execute in the main process (Enhancement #3):

1. **Data Collection**: Read application state via `context.storage.get()` based on selected scope
2. **Incremental Detection** (Enhancement #6): Compare current state hash against last full backup to emit only changed data
3. **Serialization**: JSON.stringify with format version header
4. **Encryption**: Pass through CryptoEngine
5. **Checksum**: SHA-256 of encrypted payload (Enhancement #7)
6. **Write**: To configured destination via filesystem API
7. **Metadata**: Update history with new BackupMetadata entry

### Selective Backup (Enhancement #10)

Users choose categories: `graph`, `conversations`, `identity`, `plugin-settings`, or `custom`. The collector gathers only the selected data slices from the store.

### Incremental Backups (Enhancement #6)

Each full backup stores a snapshot hash map (key → hash). Subsequent incremental backups only include entries whose hashes have changed. On restore, the system replays the base full backup plus all incremental deltas.

## Scheduling (Enhancement #5)

### Scheduler (`main/scheduler.ts`)

```typescript
class BackupScheduler {
  private timer: NodeJS.Timeout | null;
  
  start(config: AutoBackupConfig): void;
  stop(): void;
  onShutdown(): Promise<void>;  // Handle 'on-shutdown' mode
}
```

Intervals: `hourly` (3600s), `daily` (86400s), `weekly` (604800s), `on-shutdown` (triggered by `context.on('stop')`).

## Retention Policy (Enhancement #9)

After each backup:
1. Sort history by timestamp
2. Remove entries exceeding `maxBackups` count (oldest first)
3. Remove entries older than `maxAgeDays`
4. Delete corresponding backup files from disk

## Multiple Destinations (Enhancement #8)

Destination types:
- **local**: Default backup directory within plugin storage
- **custom-dir**: User-specified path
- **cloud-s3**: HTTP PUT to S3-compatible endpoint (uses `network:http` permission)
- **dsn-peer**: Publish encrypted backup to DSN network peer

## Backup Format Versioning (Enhancement #12)

Every `BackupFile` includes `formatVersion`. On restore, a migration pipeline handles version differences:

```typescript
const MIGRATIONS: Record<number, (data: any) => any> = {
  // Future: { 1: (v1Data) => convertToV2(v1Data) }
};
```

## IPC Communication

### Channels (Main → Renderer)

| Channel | Direction | Description |
|---------|-----------|-------------|
| `backup:create` | renderer→main | Start backup with scope/passphrase |
| `backup:restore` | renderer→main | Restore from file with passphrase |
| `backup:list` | renderer→main | Get backup history |
| `backup:delete` | renderer→main | Delete a backup |
| `backup:verify` | renderer→main | Verify backup integrity |
| `backup:get-settings` | renderer→main | Get current settings |
| `backup:update-settings` | renderer→main | Update settings |
| `backup:register-hook` | any→main | Register pre/post hook |

### Events (Main → Renderer, Enhancement #20)

| Event | Payload | Description |
|-------|---------|-------------|
| `backup:started` | `{ backupId }` | Backup operation began |
| `backup:progress` | `BackupProgress` | Progress update (Enhancement #14) |
| `backup:completed` | `BackupMetadata` | Backup finished successfully |
| `backup:failed` | `{ error, backupId }` | Backup failed |
| `backup:restore-started` | `{ backupId }` | Restore began |
| `backup:restore-completed` | `{ backupId }` | Restore finished |
| `backup:restore-failed` | `{ error }` | Restore failed |

## DSN Integration (Enhancement #4)

Register declared skills via `context.dsn.registerTool()`:

```typescript
// backup_data tool
context.dsn.registerTool({
  name: 'backup_data',
  description: 'Create an encrypted backup of application data',
  executionLocation: 'CLIENT',
  parameters: {
    type: 'object',
    properties: {
      scope: { type: 'string', enum: ['full', 'graph', 'conversations', 'identity'] },
      passphrase: { type: 'string', description: 'Encryption passphrase' }
    },
    required: ['passphrase']
  },
  ...
}, handler);

// restore_backup tool
context.dsn.registerTool({
  name: 'restore_backup',
  description: 'Restore data from an encrypted backup',
  executionLocation: 'CLIENT',
  parameters: {
    type: 'object',
    properties: {
      backupId: { type: 'string' },
      passphrase: { type: 'string' }
    },
    required: ['backupId', 'passphrase']
  },
  ...
}, handler);
```

## Hook System (Enhancement #21)

Other plugins register hooks via IPC:

```typescript
// Registration
context.ipc.send('backup:register-hook', {
  pluginId: 'my-plugin',
  phase: 'pre-backup',
  channel: 'my-plugin:pre-backup-handler'
});
```

Before backup, BackupManager invokes each registered pre-backup hook and waits for acknowledgment (with a 10s timeout). Post-backup hooks fire asynchronously.

## UI/UX Design (Enhancements #13–17)

### Renderer Components

1. **BackupPanel** (main view):
   - Header with Shield icon (lucide-react, Enhancement #15)
   - "Create Backup" button with scope selector
   - "Restore from File" button
   - Passphrase input field (shown on demand)
   - Progress bar with phase/percentage/ETA (Enhancement #14)
   - Status messages

2. **BackupHistoryList** (Enhancement #13):
   - Scrollable list of past backups
   - Each entry shows: timestamp, size, type (full/incremental), integrity badge
   - Actions: restore, verify, delete, download

3. **RestoreConfirmDialog** (Enhancement #16):
   - Modal showing what will be overwritten
   - Checkbox: "Backup current state first"
   - Confirm/Cancel buttons

4. **SettingsPanel** (Enhancement #22):
   - Auto-backup toggle with interval selector
   - Retention settings (max count, max age)
   - Backup directory path
   - Max backup size

5. **DragDropZone** (Enhancement #17):
   - Overlay that activates on file drag
   - Accepts `.aleph-backup` files
   - Triggers restore flow

### Navigation Button (Enhancement #15)
Uses lucide-react `Shield` icon instead of "SB" text.

## Settings in aleph.json (Enhancement #22)

```json
{
  "configuration": {
    "backupDir": { "type": "string", "default": "" },
    "encryptionAlgorithm": { "type": "string", "default": "aes-256-gcm" },
    "autoBackupInterval": { "type": "string", "enum": ["disabled", "hourly", "daily", "weekly", "on-shutdown"], "default": "daily" },
    "retentionCount": { "type": "number", "default": 10 },
    "retentionMaxAgeDays": { "type": "number", "default": 90 },
    "maxBackupSizeMB": { "type": "number", "default": 500 }
  }
}
```

## Testing Strategy (Enhancements #18, #19)

### Unit Tests (`tests/main.test.ts`)
- **CryptoEngine**: encrypt/decrypt roundtrip, wrong-password rejection, checksum computation/verification
- **BackupManager**: backup creation, restore, selective scope, incremental detection
- **Scheduler**: interval triggering, shutdown hook
- **Retention**: policy enforcement, old backup cleanup
- **Error handling**: corrupted files, invalid format version, oversized backups

### Integration Tests
- Full backup→restore cycle via IPC
- DSN tool invocation
- Hook system execution
- Progress event emission

### Renderer Tests (Enhancement #19)
- UI states: idle, backing-up, restoring, success, error
- Button disabling during operations
- Progress bar rendering
- History list display
- Drag-and-drop file handling

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `types.ts` with all shared type definitions
2. Implement `main/crypto.ts` — CryptoEngine with AES-256-GCM, PBKDF2 key derivation, SHA-256 checksums
3. Implement `main/scheduler.ts` — Timer-based auto-backup scheduler

### Phase 2: Main Process
4. Rewrite `main/index.ts` with full `BackupManager`:
   - Data collection from `context.storage`
   - Encryption via CryptoEngine
   - File I/O for backup/restore
   - Incremental snapshot diffing
   - Retention policy enforcement
   - IPC handlers for all channels
   - DSN tool registration
   - Hook system
   - Event emission

### Phase 3: Renderer
5. Rewrite `renderer/index.tsx`:
   - BackupPanel with progress indicator
   - BackupHistoryList
   - RestoreConfirmDialog
   - SettingsPanel
   - DragDropZone
   - Shield icon for nav button

### Phase 4: Configuration & Testing
6. Update `manifest.json`, `aleph.json`, `package.json`
7. Write comprehensive tests
8. Validate all functionality

## Enhancement Mapping

| # | Enhancement | Component | Status |
|---|------------|-----------|--------|
| 1 | Actual backup logic | main/index.ts BackupManager | Addressed |
| 2 | Real encryption | main/crypto.ts CryptoEngine | Addressed |
| 3 | Logic in main process | main/index.ts (all IPC handlers) | Addressed |
| 4 | DSN skill registration | main/index.ts registerDsnTools() | Addressed |
| 5 | Scheduled backups | main/scheduler.ts | Addressed |
| 6 | Incremental backups | main/index.ts createIncrementalBackup() | Addressed |
| 7 | Integrity checks | main/crypto.ts computeChecksum/verify | Addressed |
| 8 | Multiple destinations | BackupDestination type, write adapters | Addressed |
| 9 | Retention policy | main/index.ts enforceRetention() | Addressed |
| 10 | Selective backup | BackupScope type, data collector | Addressed |
| 11 | Key management | PBKDF2 + context.secrets integration | Addressed |
| 12 | Format versioning | BackupFile.formatVersion + migrations | Addressed |
| 13 | Backup history list | renderer BackupHistoryList | Addressed |
| 14 | Progress indicator | BackupProgress events + progress bar | Addressed |
| 15 | Proper icon | lucide-react Shield icon | Addressed |
| 16 | Restore confirmation | renderer RestoreConfirmDialog | Addressed |
| 17 | Drag-and-drop | renderer DragDropZone | Addressed |
| 18 | Test coverage | tests/main.test.ts | Addressed |
| 19 | Renderer tests | tests/renderer.test.ts | Addressed |
| 20 | Backup events | IPC event emission | Addressed |
| 21 | Pre/post hooks | Hook registration system | Addressed |
| 22 | Configurable settings | aleph.json configuration section | Addressed |
