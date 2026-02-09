import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const IdentityStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const handleCreateIdentity = async () => {
    setLoading(true);
    setError(null);
    try {
      const identity = await window.electronAPI.createIdentity();
      setCreatedKey(identity.fingerprint);
      // Brief pause to show the key, then proceed
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      setError('Failed to create identity. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleImportIdentity = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      setError(null);

      try {
        const text = await file.text();
        // Validate it looks like an AlephNet identity, not some other JSON
        const parsed = JSON.parse(text);
        if (!parsed.pub || !parsed.priv) {
          setError('This is not an AlephNet identity file. Expected a file with pub/priv keys. (Tip: Google service account JSON files go on the Intelligence step.)');
          setLoading(false);
          return;
        }
        const identity = await window.electronAPI.importIdentity(text);
        setCreatedKey(identity.fingerprint);
        setTimeout(() => onComplete(), 1500);
      } catch (err) {
        setError('Failed to import identity. The file must be a valid AlephNet identity JSON backup.');
        console.error(err);
        setLoading(false);
      }
    };

    input.click();
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Create Your Identity
        </motion.h2>
        <motion.p
          className="text-gray-400 text-sm max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Your cryptographic identity is your key to the AlephNet. It's generated locally and never leaves your device.
        </motion.p>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-3"
          >
            <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Created Key Success */}
      <AnimatePresence>
        {createdKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Identity Created!
            </div>
            <div className="text-xs text-emerald-300/60 font-mono tracking-wider">
              {createdKey}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!createdKey && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleCreateIdentity}
            disabled={loading}
            className="group w-full p-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all duration-300 flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-colors">
              {loading ? (
                <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              )}
            </div>
            <div className="text-left">
              <div className="font-semibold text-white/90">Generate New Key</div>
              <div className="text-xs text-white/40 mt-0.5">Create a fresh Ed25519 keypair</div>
            </div>
            <svg className="w-5 h-5 text-white/20 ml-auto group-hover:text-white/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-gray-900/80 text-white/30 backdrop-blur-sm">or</span>
            </div>
          </div>

          <button
            onClick={handleImportIdentity}
            disabled={loading}
            className="group w-full p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/10 rounded-xl transition-all duration-300 flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/[0.08] transition-colors">
              <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-white/70">Import Existing Key</div>
              <div className="text-xs text-white/30 mt-0.5">Load from a .json backup file</div>
            </div>
            <svg className="w-5 h-5 text-white/10 ml-auto group-hover:text-white/20 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};
