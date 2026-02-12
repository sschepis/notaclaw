import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Download, Upload, Trash2,
  Settings, Clock, CheckCircle, AlertCircle, AlertTriangle,
  RefreshCw, FileCheck, HardDrive, X, ChevronDown, ChevronUp,
  Eye, EyeOff, Archive, RotateCcw, Info
} from 'lucide-react';

// --- Local Types (renderer-side mirrors) ---

interface BackupMetadata {
  id: string;
  timestamp: number;
  label?: string;
  categories: string[];
  scope: string;
  encrypted: boolean;
  checksum: string;
  sizeBytes: number;
  formatVersion: number;
  incremental: boolean;
  parentId?: string;
}

interface BackupProgress {
  phase: string;
  percent: number;
  message: string;
}

interface BackupSettings {
  autoBackup: { enabled: boolean; intervalMinutes: number };
  retention: { maxBackups: number; maxAgeDays: number };
  maxSizeMB: number;
  defaultScope: string;
  defaultCategories: string[];
  shutdownBackup: boolean;
}

const DEFAULT_SETTINGS: BackupSettings = {
  autoBackup: { enabled: false, intervalMinutes: 60 },
  retention: { maxBackups: 20, maxAgeDays: 90 },
  maxSizeMB: 50,
  defaultScope: 'full',
  defaultCategories: ['conversations', 'settings', 'personality', 'memory', 'plugins', 'identity'],
  shutdownBackup: false,
};

const CATEGORIES = [
  { id: 'conversations', label: 'Conversations', icon: '💬' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'personality', label: 'Personality', icon: '🎭' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'plugins', label: 'Plugins', icon: '🔌' },
  { id: 'identity', label: 'Identity', icon: '🆔' },
];

// --- Helper ---

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// --- Main Export ---

export const activate = (context: any) => {
  console.log('[Secure Backup] Renderer activated');
  const { useAppStore } = context;

  // ========== Progress Bar ==========
  const ProgressBar = ({ progress }: { progress: BackupProgress | null }) => {
    if (!progress) return null;
    const phaseColors: Record<string, string> = {
      collecting: 'bg-blue-500',
      encrypting: 'bg-yellow-500',
      writing: 'bg-green-500',
      verifying: 'bg-purple-500',
      restoring: 'bg-orange-500',
      complete: 'bg-green-600',
      error: 'bg-red-500',
    };
    const color = phaseColors[progress.phase] || 'bg-blue-500';
    return (
      <div className="mx-4 mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span className="capitalize">{progress.phase}</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-300`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-1 truncate">{progress.message}</p>
      </div>
    );
  };

  // ========== Restore Confirm Dialog ==========
  const RestoreConfirmDialog = ({
    backup,
    onConfirm,
    onCancel,
  }: {
    backup: BackupMetadata;
    onConfirm: (passphrase: string, merge: boolean) => void;
    onCancel: () => void;
  }) => {
    const [passphrase, setPassphrase] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [merge, setMerge] = useState(false);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-96 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Confirm Restore</h3>
          </div>

          <p className="text-sm text-gray-300 mb-2">
            Restoring from backup <span className="text-white font-mono text-xs">{backup.id.slice(0, 8)}</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Created {new Date(backup.timestamp).toLocaleString()} &middot; {formatBytes(backup.sizeBytes)}
          </p>

          {backup.encrypted && (
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Passphrase</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter backup passphrase"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-white"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-300 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={merge}
              onChange={(e) => setMerge(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700"
            />
            Merge with existing data (instead of overwrite)
          </label>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(passphrase, merge)}
              disabled={backup.encrypted && !passphrase}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RotateCcw size={14} />
              Restore
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== Settings Panel ==========
  const SettingsPanel = ({
    settings,
    onUpdate,
    onClose,
  }: {
    settings: BackupSettings;
    onUpdate: (s: Partial<BackupSettings>) => void;
    onClose: () => void;
  }) => {
    return (
      <div className="p-4 bg-gray-800 border-b border-gray-700 space-y-3 text-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-white">Backup Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Auto-backup toggle */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Auto-backup</span>
          <button
            onClick={() => onUpdate({ autoBackup: { ...settings.autoBackup, enabled: !settings.autoBackup.enabled } })}
            className={`w-10 h-5 rounded-full relative transition-colors ${settings.autoBackup.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.autoBackup.enabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Auto-backup interval */}
        {settings.autoBackup.enabled && (
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Interval</span>
            <select
              value={settings.autoBackup.intervalMinutes}
              onChange={(e) => onUpdate({ autoBackup: { ...settings.autoBackup, intervalMinutes: parseInt(e.target.value) } })}
              className="bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="360">6 hours</option>
              <option value="1440">24 hours</option>
            </select>
          </div>
        )}

        {/* Shutdown backup */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Backup on shutdown</span>
          <button
            onClick={() => onUpdate({ shutdownBackup: !settings.shutdownBackup })}
            className={`w-10 h-5 rounded-full relative transition-colors ${settings.shutdownBackup ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.shutdownBackup ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Retention */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Max backups</span>
          <select
            value={settings.retention.maxBackups}
            onChange={(e) => onUpdate({ retention: { ...settings.retention, maxBackups: parseInt(e.target.value) } })}
            className="bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Max age</span>
          <select
            value={settings.retention.maxAgeDays}
            onChange={(e) => onUpdate({ retention: { ...settings.retention, maxAgeDays: parseInt(e.target.value) } })}
            className="bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
        </div>

        {/* Max size */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Max backup size</span>
          <select
            value={settings.maxSizeMB}
            onChange={(e) => onUpdate({ maxSizeMB: parseInt(e.target.value) })}
            className="bg-gray-700 rounded px-2 py-1 text-xs border border-gray-600 text-white"
          >
            <option value="10">10 MB</option>
            <option value="25">25 MB</option>
            <option value="50">50 MB</option>
            <option value="100">100 MB</option>
          </select>
        </div>
      </div>
    );
  };

  // ========== Backup History Item ==========
  const BackupItem = ({
    backup,
    onRestore,
    onVerify,
    onDelete,
    verifyResult,
  }: {
    backup: BackupMetadata;
    onRestore: () => void;
    onVerify: () => void;
    onDelete: () => void;
    verifyResult?: { valid: boolean; message: string } | null;
  }) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <div className="group border border-gray-700 rounded-lg hover:border-gray-600 transition-all">
        <div
          className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-shrink-0">
            {backup.encrypted ? (
              <ShieldCheck size={18} className="text-green-400" />
            ) : (
              <ShieldAlert size={18} className="text-yellow-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">
                {backup.label || `Backup ${backup.id.slice(0, 8)}`}
              </span>
              {backup.incremental && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                  incremental
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span>{timeAgo(backup.timestamp)}</span>
              <span>&middot;</span>
              <span>{formatBytes(backup.sizeBytes)}</span>
              <span>&middot;</span>
              <span className="capitalize">{backup.scope}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onVerify(); }}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400"
              title="Verify integrity"
            >
              <FileCheck size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-orange-400"
              title="Restore"
            >
              <Download size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="text-gray-500">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-3 border-t border-gray-700/50 pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-500">ID</span>
              <span className="text-gray-300 font-mono">{backup.id.slice(0, 16)}...</span>
              <span className="text-gray-500">Created</span>
              <span className="text-gray-300">{new Date(backup.timestamp).toLocaleString()}</span>
              <span className="text-gray-500">Format</span>
              <span className="text-gray-300">v{backup.formatVersion}</span>
              <span className="text-gray-500">Checksum</span>
              <span className="text-gray-300 font-mono truncate">{backup.checksum.slice(0, 16)}...</span>
              <span className="text-gray-500">Encrypted</span>
              <span className="text-gray-300">{backup.encrypted ? 'Yes (AES-256-GCM)' : 'No'}</span>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {backup.categories.map((cat) => (
                <span key={cat} className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded capitalize">
                  {cat}
                </span>
              ))}
            </div>

            {verifyResult && (
              <div className={`flex items-center gap-2 p-2 rounded text-xs ${verifyResult.valid ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                {verifyResult.valid ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {verifyResult.message}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========== Main Panel ==========
  const SecureBackupPanel = () => {
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [settings, setSettings] = useState<BackupSettings>(DEFAULT_SETTINGS);
    const [progress, setProgress] = useState<BackupProgress | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<BackupMetadata | null>(null);
    const [verifyResults, setVerifyResults] = useState<Record<string, { valid: boolean; message: string }>>({});

    // Create backup form
    const [passphrase, setPassphrase] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [label, setLabel] = useState('');
    const [selectedCats, setSelectedCats] = useState<string[]>([...DEFAULT_SETTINGS.defaultCategories]);
    const [scope, setScope] = useState<string>('full');
    const [isCreating, setIsCreating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const dropRef = useRef<HTMLDivElement>(null);

    const clearMessages = () => { setError(null); setSuccess(null); };

    const fetchData = useCallback(async () => {
      try {
        if (context.ipc?.invoke) {
          const list = await context.ipc.invoke('secure-backup:list');
          setBackups(Array.isArray(list) ? list : []);
          const s = await context.ipc.invoke('secure-backup:getSettings');
          if (s) setSettings(s);
        }
      } catch (err: any) {
        console.error('[Secure Backup] Failed to fetch data:', err);
      }
    }, []);

    useEffect(() => {
      fetchData();

      const handleProgress = (p: BackupProgress) => setProgress(p);
      const handleListUpdate = () => fetchData();

      if (context.ipc) {
        context.ipc.on('secure-backup:progress', handleProgress);
        context.ipc.on('secure-backup:listUpdated', handleListUpdate);
      }

      return () => {
        // Cleanup listeners if possible
      };
    }, [fetchData]);

    // Auto-clear progress when complete
    useEffect(() => {
      if (progress && (progress.phase === 'complete' || progress.phase === 'error')) {
        const timer = setTimeout(() => setProgress(null), 3000);
        return () => clearTimeout(timer);
      }
    }, [progress]);

    // Auto-clear messages
    useEffect(() => {
      if (success || error) {
        const timer = setTimeout(clearMessages, 5000);
        return () => clearTimeout(timer);
      }
    }, [success, error]);

    const handleCreate = async () => {
      clearMessages();
      setIsCreating(true);
      try {
        const result = await context.ipc.invoke('secure-backup:create', {
          passphrase: passphrase || undefined,
          categories: selectedCats,
          scope,
          label: label || undefined,
        });
        if (result?.success) {
          setSuccess(`Backup created: ${result.backupId?.slice(0, 8) || 'OK'}`);
          setPassphrase('');
          setLabel('');
          fetchData();
        } else {
          setError(result?.error || 'Backup failed');
        }
      } catch (err: any) {
        setError(err.message || 'Backup failed');
      } finally {
        setIsCreating(false);
      }
    };

    const handleRestore = async (passphrase: string, merge: boolean) => {
      if (!restoreTarget) return;
      clearMessages();
      setRestoreTarget(null);
      try {
        const result = await context.ipc.invoke('secure-backup:restore', {
          backupId: restoreTarget.id,
          passphrase: passphrase || undefined,
          merge,
        });
        if (result?.success) {
          setSuccess('Restore completed successfully');
        } else {
          setError(result?.error || 'Restore failed');
        }
      } catch (err: any) {
        setError(err.message || 'Restore failed');
      }
    };

    const handleVerify = async (backup: BackupMetadata) => {
      clearMessages();
      try {
        const result = await context.ipc.invoke('secure-backup:verify', { backupId: backup.id });
        setVerifyResults((prev) => ({
          ...prev,
          [backup.id]: {
            valid: result?.valid ?? false,
            message: result?.valid ? 'Integrity verified' : (result?.error || 'Verification failed'),
          },
        }));
      } catch (err: any) {
        setVerifyResults((prev) => ({
          ...prev,
          [backup.id]: { valid: false, message: err.message || 'Verification error' },
        }));
      }
    };

    const handleDelete = async (backup: BackupMetadata) => {
      clearMessages();
      try {
        const result = await context.ipc.invoke('secure-backup:delete', { backupId: backup.id });
        if (result?.success) {
          setSuccess('Backup deleted');
          fetchData();
        } else {
          setError(result?.error || 'Delete failed');
        }
      } catch (err: any) {
        setError(err.message || 'Delete failed');
      }
    };

    const handleExport = async (backup: BackupMetadata) => {
      clearMessages();
      try {
        const result = await context.ipc.invoke('secure-backup:export', { backupId: backup.id });
        if (result?.success) {
          setSuccess(`Exported to ${result.path}`);
        } else {
          setError(result?.error || 'Export failed');
        }
      } catch (err: any) {
        setError(err.message || 'Export failed');
      }
    };

    const updateSettings = async (partial: Partial<BackupSettings>) => {
      const updated = { ...settings, ...partial };
      setSettings(updated);
      try {
        await context.ipc.invoke('secure-backup:updateSettings', partial);
      } catch (err: any) {
        console.error('[Secure Backup] Failed to update settings:', err);
      }
    };

    const toggleCategory = (catId: string) => {
      setSelectedCats((prev) =>
        prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
      );
    };

    // Drag & drop handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const backupFile = files.find(
        (f) => f.name.endsWith('.json') || f.name.endsWith('.ncbak')
      );
      if (backupFile) {
        try {
          const result = await context.ipc.invoke('secure-backup:import', {
            filePath: (backupFile as any).path,
          });
          if (result?.success) {
            setSuccess('Backup imported successfully');
            fetchData();
          } else {
            setError(result?.error || 'Import failed');
          }
        } catch (err: any) {
          setError(err.message || 'Import failed');
        }
      } else {
        setError('Drop a .json or .ncbak backup file');
      }
    };

    return (
      <div
        ref={dropRef}
        className={`h-full flex flex-col bg-[#1e1e1e] text-white relative ${isDragging ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-blue-900/40 pointer-events-none">
            <div className="text-center">
              <Upload size={40} className="mx-auto text-blue-400 mb-2" />
              <p className="text-blue-300 text-sm font-medium">Drop backup file to import</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield size={18} className="text-green-400" />
            Secure Backup
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded hover:bg-white/10 ${showSettings ? 'bg-white/10 text-blue-400' : 'text-gray-400'}`}
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={fetchData}
              className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <SettingsPanel settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />
        )}

        {/* Status messages */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300">
            <AlertCircle size={14} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X size={12} />
            </button>
          </div>
        )}
        {success && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-2 bg-green-900/30 border border-green-700/50 rounded text-xs text-green-300">
            <CheckCircle size={14} />
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-200">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Progress */}
        {progress && <div className="mt-3"><ProgressBar progress={progress} /></div>}

        {/* Create Backup Section */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Archive size={14} />
            Create Backup
          </h3>

          {/* Label */}
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Backup label (optional)"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500"
          />

          {/* Passphrase */}
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Encryption passphrase (optional)"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1.5 text-gray-400 hover:text-white"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Scope */}
          <div className="flex gap-2">
            {['full', 'partial', 'incremental'].map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${scope === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Categories */}
          {scope !== 'full' && (
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${selectedCats.includes(cat.id) ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'}`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || (progress !== null && progress.phase !== 'complete' && progress.phase !== 'error')}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Upload size={14} />
                Create Backup
              </>
            )}
          </button>

          {!passphrase && (
            <p className="flex items-center gap-1 text-[10px] text-yellow-500/70">
              <Info size={10} />
              No passphrase — backup will be stored unencrypted
            </p>
          )}
        </div>

        {/* Backup History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Clock size={14} />
              History ({backups.length})
            </h3>
          </div>

          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <HardDrive size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No backups yet</p>
              <p className="text-xs text-gray-600 mt-1">Create your first backup above</p>
            </div>
          ) : (
            backups
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((backup) => (
                <BackupItem
                  key={backup.id}
                  backup={backup}
                  onRestore={() => setRestoreTarget(backup)}
                  onVerify={() => handleVerify(backup)}
                  onDelete={() => handleDelete(backup)}
                  verifyResult={verifyResults[backup.id] || null}
                />
              ))
          )}
        </div>

        {/* Drop hint */}
        <div className="p-2 border-t border-gray-700/50 text-center">
          <p className="text-[10px] text-gray-600">
            Drag &amp; drop a .ncbak file to import
          </p>
        </div>

        {/* Restore dialog */}
        {restoreTarget && (
          <RestoreConfirmDialog
            backup={restoreTarget}
            onConfirm={handleRestore}
            onCancel={() => setRestoreTarget(null)}
          />
        )}
      </div>
    );
  };

  // ========== Sidebar Nav Button ==========
  const SecureBackupButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === 'secure-backup';

    return (
      <button
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
        onClick={() => setActiveSidebarView('secure-backup')}
        title="Secure Backup"
      >
        <Shield size={18} />
      </button>
    );
  };

  // ========== Register Components ==========
  context.registerComponent('sidebar:nav-item', {
    id: 'secure-backup-nav',
    component: SecureBackupButton,
  });

  context.registerComponent('sidebar:view:secure-backup', {
    id: 'secure-backup-panel',
    component: SecureBackupPanel,
  });

  // Register commands
  const cleanups: Array<() => void> = [];

  if (context.ui?.registerCommand) {
    cleanups.push(
      context.ui.registerCommand({
        id: 'secure-backup:open',
        label: 'Open Secure Backup',
        icon: Shield,
        category: 'Backup',
        action: () => {
          const store = useAppStore?.getState?.();
          store?.setActiveSidebarView?.('secure-backup');
        },
      })
    );

    cleanups.push(
      context.ui.registerCommand({
        id: 'secure-backup:create-now',
        label: 'Create Backup Now',
        icon: Upload,
        category: 'Backup',
        action: () => {
          context.ipc?.invoke?.('secure-backup:create', {
            categories: DEFAULT_SETTINGS.defaultCategories,
            scope: 'full',
          });
        },
      })
    );
  }

  context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
  console.log('[Secure Backup] Renderer deactivated');
  if (context._cleanups) {
    context._cleanups.forEach((cleanup: any) => cleanup());
  }
};
