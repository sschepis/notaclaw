import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingStep } from '../types';

const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'identity', label: 'Identity' },
  { key: 'ai-setup', label: 'Intelligence' },
  { key: 'complete', label: 'Ready' },
];

export const StepIndicator: React.FC<{ currentStep: OnboardingStep }> = ({ currentStep }) => {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`h-px w-8 transition-colors duration-500 ${isCompleted ? 'bg-blue-500' : 'bg-white/10'}`} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  isCompleted
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : isActive
                    ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50'
                    : 'bg-white/5 text-white/30'
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </motion.div>
              <span className={`text-[10px] font-medium tracking-wide transition-colors duration-500 ${
                isActive ? 'text-blue-400' : isCompleted ? 'text-blue-500/70' : 'text-white/20'
              }`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
