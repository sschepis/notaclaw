import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedBackground } from './components/AnimatedBackground';
import { StepIndicator } from './components/StepIndicator';
import { WelcomeStep } from './steps/WelcomeStep';
import { IdentityStep } from './steps/IdentityStep';
import { AISetupStep } from './steps/AISetupStep';
import { ExtensionsStep } from './steps/ExtensionsStep';
import { CompleteStep } from './steps/CompleteStep';
import { OnboardingStep } from './types';

interface OnboardingScreenProps {
  initialStep?: OnboardingStep;
}

// ─── Main Onboarding Screen ─────────────────────────────────────────────────
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ initialStep = 'welcome' }) => {
  const { setHasIdentity } = useAppStore();
  const [step, setStep] = useState<OnboardingStep>(initialStep);

  const handleIdentityComplete = useCallback(() => {
    setStep('ai-setup');
  }, []);

  const handleAIComplete = useCallback(() => {
    setStep('extensions');
  }, []);

  const handleExtensionsComplete = useCallback(() => {
    setStep('complete');
  }, []);

  const handleFinish = useCallback(() => {
    setHasIdentity(true);
  }, [setHasIdentity]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Subtle radial gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-gray-950/50 via-transparent to-gray-950/80 pointer-events-none" style={{ zIndex: 1 }} />

      {/* macOS title bar drag region */}
      <div
        className="fixed top-0 left-0 right-0 h-[38px] z-50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Main content */}
      <motion.div
        className="relative w-full max-w-lg mx-4 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Card */}
        <div className="bg-gray-900/70 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/50 p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <WelcomeStep key="welcome" onNext={() => setStep('identity')} />
            )}
            {step === 'identity' && (
              <IdentityStep key="identity" onComplete={handleIdentityComplete} />
            )}
            {step === 'ai-setup' && (
              <AISetupStep key="ai-setup" onComplete={handleAIComplete} />
            )}
            {step === 'extensions' && (
              <ExtensionsStep key="extensions" onComplete={handleExtensionsComplete} />
            )}
            {step === 'complete' && (
              <CompleteStep key="complete" onFinish={handleFinish} />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="text-[10px] text-white/15 font-mono tracking-widest select-none">
            ALEPH<span className="text-blue-500/30">NET</span> RESONANT TERMINAL v1.0
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};
