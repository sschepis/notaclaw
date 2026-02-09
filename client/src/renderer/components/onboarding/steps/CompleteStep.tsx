import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/button';

export const CompleteStep: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => onFinish(), 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      className="text-center space-y-6 py-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Success Animation */}
      <motion.div
        className="relative mx-auto w-24 h-24"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.div
          className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
          <motion.svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
            />
          </motion.svg>
        </div>
      </motion.div>

      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className="text-3xl font-bold">You're All Set!</h2>
        <p className="text-gray-400 text-base">
          Your sovereign terminal is ready. Entering AlephNet...
        </p>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        className="flex items-center justify-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-500"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <Button
          onClick={onFinish}
          variant="ghost"
          className="text-white/40 hover:text-white/60 text-sm"
        >
          Enter now →
        </Button>
      </motion.div>
    </motion.div>
  );
};
