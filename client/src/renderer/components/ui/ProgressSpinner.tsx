import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore, GenerationProgress } from '../../store/useAppStore';

interface ProgressSpinnerProps {
  progress?: GenerationProgress | null;
}

// Progress status messages for different stages
const statusMessages = [
  'Initializing request...',
  'Connecting to AI provider...',
  'Processing your message...',
  'Generating response...',
  'Thinking deeply...',
  'Analyzing context...',
  'Formulating response...',
  'Almost there...',
];

export const ProgressSpinner: React.FC<ProgressSpinnerProps> = ({ progress }) => {
  const storeProgress = useAppStore(state => state.generationProgress);
  const currentProgress = progress ?? storeProgress;

  // Default status if none provided
  const status = currentProgress?.status || 'Processing...';
  const details = currentProgress?.details || '';
  const step = currentProgress?.step ?? 0;
  const totalSteps = currentProgress?.totalSteps;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-start mb-6"
    >
      <div className="flex max-w-[85%] flex-row items-end gap-3">
        {/* Avatar placeholder with animated ring */}
        <div className="mb-1 flex-shrink-0 relative">
          <div className="h-8 w-8 rounded-full ring-1 ring-purple-500 bg-gray-800 flex items-center justify-center overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <span className="text-sm relative z-10">AI</span>
          </div>
          {/* Animated outer ring */}
          <motion.div
            className="absolute -inset-0.5 rounded-full border-2 border-transparent border-t-purple-500 border-r-blue-500"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Progress Bubble */}
        <div className="relative p-4 rounded-2xl shadow-sm backdrop-blur-md bg-purple-500/10 border border-purple-500/30 text-purple-100 rounded-bl-none min-w-[200px]">
          <div className="flex items-center gap-3">
            {/* Spinner */}
            <div className="relative w-8 h-8 flex-shrink-0">
              {/* Outer ring */}
              <motion.svg
                className="w-8 h-8 absolute"
                viewBox="0 0 32 32"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="60 28"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </motion.svg>
              
              {/* Inner pulsing dot */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-400 rounded-full -translate-x-1/2 -translate-y-1/2"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>

            {/* Status Text */}
            <div className="flex-1 min-w-0">
              <motion.div
                key={status}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-medium text-purple-100 truncate"
              >
                {status}
              </motion.div>
              
              {details && (
                <motion.div
                  key={details}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-purple-300/70 mt-0.5 truncate"
                >
                  {details}
                </motion.div>
              )}

              {/* Progress bar if total steps known */}
              {totalSteps && totalSteps > 0 && (
                <div className="mt-2 h-1 bg-purple-900/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Animated shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
              animate={{ x: ['0%', '200%'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// Utility to cycle through status messages for demonstration
export const useProgressSimulation = () => {
  const [messageIndex, setMessageIndex] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    status: statusMessages[messageIndex],
    step: messageIndex + 1,
    totalSteps: statusMessages.length,
  };
};
