# Secure Backup — Enhancements

## Critical Issues

### 1. No Actual Backup Logic — Main Process is a Stub
- **Current**: `main/index.ts` only logs messages and responds to a generic `ping` IPC channel. Despite the manifest declaring `fs:write`, `store:read`, and `network:http` permissions, no backup/restore functionality exists in the backend.
- **Enhancement**: Implement actual backup logic: serialize the application graph/store data, encrypt it using a user-provided passphrase or derived key, and write to disk via `context.storage` or filesystem APIs.
- **Priority**: Critical

### 2. No Actual Encryption
- **Current**: The renderer simulates a backup by creating a JSON blob with `content: 'Encrypted Data'` — no encryption occurs.
- **Enhancement**: Integrate real encryption (e.g., AES-256-GCM via Node.js `crypto` module) in the main process. The renderer should trigger backup via IPC, not handle it directly.
- **Priority**: Critical

### 3. Backup/Restore Logic Lives in Renderer Instead of Main
- **Current**: All backup creation and restore logic is in `renderer/index.tsx` using browser APIs (Blob, document.createElement). This is an architectural inversion — file I/O and crypto should run in the main process.
- **Enhancement**: Move all data operations to main process IPC handlers. The renderer should only trigger actions and display status.
- **Priority**: Critical

### 4. DSN Skills Declared but Not Registered
- **Current**: `aleph.json` declares `backup_data` and `restore_backup` skills but `main/index.ts` never registers them via `context.dsn.registerTool()`.
- **Enhancement**: Register the declared skills so agents can programmatically trigger backups.
- **Priority**: High

---

## Functional Enhancements

### 5. Scheduled Automatic Backups
- Add configurable auto-backup scheduling (daily, weekly, on shutdown). Leverage the host's `TaskScheduler` service or implement an internal cron-like mechanism.

### 6. Incremental Backups
- Rather than full snapshots every time, implement incremental/differential backups that only capture changes since the last backup. Reduces storage usage and backup time.

### 7. Backup Verification & Integrity Checks
- After creating a backup, verify its integrity by computing and storing a checksum (SHA-256). On restore, verify the checksum before applying. Display verification status in the UI.

### 8. Multiple Backup Destinations
- Support writing backups to: local filesystem, user-specified directory, cloud storage (S3, GCS), or DSN network peers. The `network:http` permission is already declared but unused.

### 9. Backup Rotation & Retention
- Implement a retention policy: keep N most recent backups, delete older ones. Prevent unbounded storage growth.

### 10. Selective Backup & Restore
- Allow users to choose what to back up: full graph, conversations only, identity/keys only, plugin settings, or custom selections.

### 11. Password / Key Management
- Implement a proper key derivation flow (PBKDF2/scrypt) from a user passphrase. Store the salt but never the key. Integrate with the host's `SecretsManager` for key storage.

### 12. Backup Format Versioning
- Add a schema version to backup files so future versions can handle format migrations during restore.

---

## UI/UX Enhancements

### 13. Backup History List
- Display a list of previous backups with timestamps, sizes, and integrity status. Allow one-click restore from any historical backup.

### 14. Progress Indicator
- Show real-time progress during backup/restore operations (percentage, bytes processed, estimated time remaining) instead of the current generic "Creating backup..." message.

### 15. Use Proper Icon
- The nav button displays text "SB" instead of an icon. Use a lucide-react icon (e.g., `Shield`, `HardDrive`, `Download`).

### 16. Restore Confirmation Dialog
- Before restoring, show a confirmation dialog with details about what will be overwritten and offer a "backup current state first" option.

### 17. Drag-and-Drop Restore
- Allow users to drag a backup file onto the panel to initiate restore, in addition to the file picker.

---

## Testing Enhancements

### 18. Expand Test Coverage
- Current tests only cover ping/pong and basic activation. Add tests for: backup creation, encryption/decryption roundtrip, file I/O, restore validation, error handling (corrupted files, wrong password), and scheduled backup triggering.

### 19. Renderer Component Tests
- Test UI states: idle, backing up, restoring, success, and error. Verify progress display and button disabling during operations.

---

## Architecture Enhancements

### 20. Backup Events
- Emit IPC events (`backup:started`, `backup:progress`, `backup:completed`, `backup:failed`) so the Notification Center and other plugins can react.

### 21. Pre/Post Backup Hooks
- Allow other plugins to register hooks that run before or after a backup (e.g., flush caches, pause agents, snapshot in-flight state).

### 22. Configurable Settings in aleph.json
- Add settings for: backup directory path, encryption algorithm, auto-backup interval, retention count, and max backup size.
