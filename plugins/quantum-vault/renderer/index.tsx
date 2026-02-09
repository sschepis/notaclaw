import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, RefreshCw, Eye } from 'lucide-react';

// Mock interface
interface AlephAPI {
    invoke: (tool: string, args: any) => Promise<any>;
}
declare const window: Window & { aleph: AlephAPI };

export default function QuantumVault() {
  const [secrets, setSecrets] = useState<any[]>([]); // In real app, only show metadata
  const [logs, setLogs] = useState<any[]>([]);
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');

  const refreshLogs = () => {
      window.aleph?.invoke('getAuditLog', {}).then(res => {
          if (res.logs) setLogs(res.logs);
      });
  };

  useEffect(() => {
      refreshLogs();
  }, []);

  const handleStore = async () => {
      await window.aleph?.invoke('storeSecret', { key: keyName, value: keyValue });
      setKeyName('');
      setKeyValue('');
      refreshLogs();
      alert('Secret encrypted & stored.');
  };

  const handleRotate = async () => {
      await window.aleph?.invoke('rotateKeys', {});
      refreshLogs();
      alert('Keys rotated.');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-8">
      <div className="flex justify-between items-start mb-8">
          <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 text-emerald-400">
                  <Shield className="w-8 h-8" />
                  Quantum Vault
              </h1>
              <p className="text-slate-400 mt-2">Post-Quantum Cryptography Secure Storage (Kyber/Dilithium)</p>
          </div>
          <button 
            onClick={handleRotate}
            className="flex items-center gap-2 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-4 py-2 rounded transition"
          >
              <RefreshCw className="w-4 h-4" />
              Rotate Keys
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Storage Form */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-400" />
                  Store Secret
              </h2>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm text-slate-400 mb-1">Key ID</label>
                      <input 
                        type="text" 
                        value={keyName}
                        onChange={e => setKeyName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 focus:border-emerald-500 outline-none"
                        placeholder="e.g. API_MASTER_KEY"
                      />
                  </div>
                  <div>
                      <label className="block text-sm text-slate-400 mb-1">Payload</label>
                      <textarea 
                        value={keyValue}
                        onChange={e => setKeyValue(e.target.value)}
                        className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-2 focus:border-emerald-500 outline-none font-mono text-sm"
                        placeholder="Sensitive data..."
                      />
                  </div>
                  <button 
                    onClick={handleStore}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition"
                  >
                      Encrypt (Kyber-1024)
                  </button>
              </div>
          </div>

          {/* Audit Log */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex flex-col">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-400" />
                  Audit Log (Dilithium Verified)
              </h2>
              <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded border border-slate-700 p-4 font-mono text-xs space-y-2">
                  {logs.length === 0 && <span className="text-slate-500 italic">No activity recorded.</span>}
                  {logs.map((log, i) => (
                      <div key={i} className="flex gap-4 border-b border-slate-800 pb-2 last:border-0">
                          <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className={`font-bold ${log.action === 'STORE' ? 'text-green-400' : 'text-blue-400'}`}>
                              {log.action}
                          </span>
                          <span className="text-slate-300">{log.key}</span>
                          <span className="text-slate-600 ml-auto">{log.agent}</span>
                      </div>
                  ))}
              </div>
          </div>

      </div>
    </div>
  );
}
