import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/button';
import { useAppStore } from '../../../store/useAppStore';

export const WorkspaceStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [path, setPath] = useState<string | null>(null);
  const { setWorkspacePath } = useAppStore();

  const handleSelect = async () => {
    try {
      const selectedPath = await (window as any).electronAPI.selectWorkspace();
      if (selectedPath) {
        setPath(selectedPath);
      }
    } catch (error) {
      console.error('Failed to select workspace:', error);
    }
  };

  const handleConfirm = async () => {
    if (path) {
      try {
        await (window as any).electronAPI.configSetWorkspace(path);
        setWorkspacePath(path);
        onNext();
      } catch (error) {
        console.error('Failed to set workspace:', error);
      }
    }
  };

  return (
    <motion.div
      className="text-center space-y-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Icon */}
      <motion.div
        className="relative mx-auto w-24 h-24"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200 }}
      >
        <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        <div className="relative w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/25 border border-purple-500/20">
          <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        </div>
      </motion.div>

      {/* Title */}
      <div className="space-y-3">
        <motion.h1
          className="text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Select Your{' '}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
            Workspace
          </span>
        </motion.h1>

        <motion.p
          className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Choose a folder where AlephNet will store your automations, memories, and project files.
        </motion.p>
      </div>

      {/* Selection Area */}
      <motion.div
        className="max-w-md mx-auto space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between group hover:bg-white/[0.05] transition-colors">
          <div className="flex-1 mr-4 overflow-hidden">
             <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Current Path</div>
             <div className="text-sm text-gray-300 truncate font-mono" title={path || 'No folder selected'}>
                {path || 'No folder selected'}
             </div>
          </div>
          <Button
            onClick={handleSelect}
            variant="outline"
            className="shrink-0 border-white/10 hover:bg-white/10 hover:text-white"
          >
            Browse...
          </Button>
        </div>

        <div className="text-xs text-center text-gray-500">
           A <span className="font-mono text-purple-400">.aleph</span> folder will be created in this location.
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="pt-4"
      >
        <Button
          onClick={handleConfirm}
          disabled={!path}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 border border-purple-500/20 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.02] text-base h-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </motion.div>
    </motion.div>
  );
};
