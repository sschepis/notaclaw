import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus, Trash2, Key, Shield, Search, RefreshCw, X } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type SecretNamespace =
  | 'ai-providers'
  | 'identity'
  | 'services'
  | 'plugins'
  | 'user'
  | 'system';

interface SecretEntry {
  id: string;
  namespace: SecretNamespace;
  key: string;
  metadata: {
    label?: string;
    updatedAt: number;
    createdAt: number;
  };
  hasValue: boolean;
}

interface VaultStatus {
  initialized: boolean;
  locked: boolean;
  entryCount: number;
  encryptionAvailable: boolean;
  namespaces: Record<SecretNamespace, number>;
}

declare global {
  interface Window {
    electronAPI: {
      secretsList: (options?: { namespace?: string; keyPrefix?: string }) => Promise<SecretEntry[]>;
      secretsSet: (options: { namespace: string; key: string; value: string; label?: string }) => Promise<void>;
      secretsDelete: (options: { namespace: string; key: string }) => Promise<boolean>;
      secretsStatus: () => Promise<VaultStatus>;
      secretsLock: () => Promise<void>;
      secretsUnlock: () => Promise<void>;
      secretsClearNamespace: (namespace: string) => Promise<number>;
    };
  }
}

// ── Components ──────────────────────────────────────────────────────────────

const NAMESPACES: SecretNamespace[] = [
  'user',
  'plugins',
  'ai-providers',
  'services',
  'identity',
  'system',
];

export const SecretsSidebar = () => {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterNamespace, setFilterNamespace] = useState<SecretNamespace | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Secret Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newNamespace, setNewNamespace] = useState<SecretNamespace>('user');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStatus();
    loadSecrets();
    
    // Set up polling for status updates (e.g. auto-lock)
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reload secrets when filter changes
  useEffect(() => {
    loadSecrets();
  }, [filterNamespace]);

  const loadStatus = async () => {
    try {
      const s = await window.electronAPI.secretsStatus();
      setStatus(s);
      // If vault becomes locked, clear secrets list
      if (s.locked) {
        setSecrets([]);
      }
    } catch (err) {
      console.error('Failed to load vault status:', err);
    }
  };

  const loadSecrets = async () => {
    if (status?.locked) return;
    
    setLoading(true);
    try {
      const options: any = {};
      if (filterNamespace !== 'all') {
        options.namespace = filterNamespace;
      }
      
      const results = await window.electronAPI.secretsList(options);
      setSecrets(results || []);
    } catch (err) {
      console.error('Failed to load secrets:', err);
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newKey || !newValue) return;
    
    setSaving(true);
    try {
      await window.electronAPI.secretsSet({
        namespace: newNamespace,
        key: newKey,
        value: newValue,
        label: newLabel || undefined,
      });
      
      // Reset form
      setNewKey('');
      setNewValue('');
      setNewLabel('');
      setIsAdding(false);
      
      // Refresh list
      loadSecrets();
      loadStatus();
    } catch (err) {
      console.error('Failed to save secret:', err);
      alert('Failed to save secret. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (namespace: string, key: string) => {
    if (!confirm(`Are you sure you want to delete ${namespace}/${key}?`)) return;
    
    try {
      await window.electronAPI.secretsDelete({ namespace, key });
      loadSecrets();
      loadStatus();
    } catch (err) {
      console.error('Failed to delete secret:', err);
    }
  };

  const toggleLock = async () => {
    try {
      if (status?.locked) {
        await window.electronAPI.secretsUnlock();
      } else {
        await window.electronAPI.secretsLock();
      }
      await loadStatus();
      if (status?.locked) { // If we just unlocked
        loadSecrets();
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  // Filter secrets locally by search query
  const filteredSecrets = secrets.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.key.toLowerCase().includes(q) ||
      s.metadata.label?.toLowerCase().includes(q) ||
      s.namespace.toLowerCase().includes(q)
    );
  });

  if (!status) {
    return <div className="p-4 text-gray-500 text-center">Connecting to vault...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/95 text-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${status.locked ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
            <Shield className={`w-5 h-5 ${status.locked ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider">Secrets Vault</h1>
            <p className="text-[10px] text-gray-500 flex items-center">
              {status.locked ? 'Encrypted & Locked' : 'Unlocked & Active'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleLock}
          className={`p-2 rounded-md transition-colors ${
            status.locked 
              ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' 
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
          title={status.locked ? 'Unlock Vault' : 'Lock Vault'}
        >
          {status.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </div>

      {status.locked ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-300">Vault is Locked</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Unlock the vault to access or manage your secure credentials.
          </p>
          <button
            onClick={toggleLock}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors"
          >
            Unlock Vault
          </button>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="p-3 space-y-3 bg-gray-900/50">
            <div className="flex space-x-2">
              <select
                value={filterNamespace}
                onChange={(e) => setFilterNamespace(e.target.value as any)}
                className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 focus:border-blue-500 outline-none flex-1"
              >
                <option value="all">All Namespaces</option>
                {NAMESPACES.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className={`p-1.5 rounded border transition-colors ${
                  isAdding 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
                title="Add Secret"
              >
                {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keys..."
                className="w-full bg-gray-800 border border-gray-700 rounded pl-8 pr-2 py-1.5 text-xs focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Add Form */}
          {isAdding && (
            <div className="p-3 bg-blue-900/10 border-b border-blue-900/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase">New Secret</span>
              </div>
              
              <div className="space-y-2">
                <select
                  value={newNamespace}
                  onChange={(e) => setNewNamespace(e.target.value as any)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none"
                >
                  {NAMESPACES.map(ns => (
                    <option key={ns} value={ns}>{ns}</option>
                  ))}
                </select>
                
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Key (e.g. api-key)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                />
                
                <input
                  type="password"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Secret value"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                />
                
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                />
                
                <button
                  onClick={handleSave}
                  disabled={!newKey || !newValue || saving}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Encrypting...' : 'Save Secret'}
                </button>
              </div>
            </div>
          )}

          {/* Secrets List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
              </div>
            ) : filteredSecrets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xs">No secrets found matching your criteria.</p>
              </div>
            ) : (
              filteredSecrets.map((secret) => (
                <div key={`${secret.namespace}/${secret.key}`} className="group bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700/50 hover:border-gray-600 rounded-lg p-2.5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          secret.namespace === 'user' ? 'bg-purple-500/20 text-purple-300' :
                          secret.namespace === 'system' ? 'bg-red-500/20 text-red-300' :
                          secret.namespace === 'ai-providers' ? 'bg-green-500/20 text-green-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {secret.namespace}
                        </span>
                        <span className="text-xs font-mono text-gray-300 truncate" title={secret.key}>
                          {secret.key}
                        </span>
                      </div>
                      {secret.metadata.label && (
                        <p className="text-[10px] text-gray-400 italic truncate mb-1">
                          {secret.metadata.label}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-[9px] text-gray-600">
                        <span>Updated: {new Date(secret.metadata.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(secret.namespace, secret.key)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-all"
                      title="Delete Secret"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer Status */}
          <div className="p-2 border-t border-gray-800 bg-gray-900 text-[10px] text-gray-500 flex justify-between">
            <span>{filteredSecrets.length} secrets</span>
            <span>{status.entryCount} total in vault</span>
          </div>
        </>
      )}
    </div>
  );
};
