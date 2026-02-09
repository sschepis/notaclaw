import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/button';

export const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <motion.div
      className="text-center space-y-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Logo */}
      <motion.div
        className="relative mx-auto w-24 h-24"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200 }}
      >
        <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 border border-blue-500/20">
          <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
      </motion.div>

      {/* Title */}
      <div className="space-y-3">
        <motion.h1
          className="text-4xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AlephNet
          </span>
        </motion.h1>

        <motion.p
          className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Your sovereign AI terminal. Let's set up your identity and connect your intelligence.
        </motion.p>
      </div>

      {/* Features */}
      <motion.div
        className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        {[
          { icon: '🔐', label: 'Sovereign Identity', desc: 'Your keys, your data' },
          { icon: '🧠', label: 'AI Intelligence', desc: 'Local or cloud powered' },
          { icon: '🌐', label: 'Mesh Network', desc: 'Decentralized by design' },
        ].map((feature, i) => (
          <motion.div
            key={feature.label}
            className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
          >
            <div className="text-2xl mb-2">{feature.icon}</div>
            <div className="text-xs font-semibold text-white/80">{feature.label}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{feature.desc}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <Button
          onClick={onNext}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 border border-blue-500/20 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.02] text-base h-auto"
        >
          Get Started
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </motion.div>
    </motion.div>
  );
};
