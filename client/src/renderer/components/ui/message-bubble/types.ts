export type MessageType = 'perceptual' | 'cognitive' | 'temporal' | 'meta';

export const typeStyles = {
  perceptual: {
    bg: 'bg-blue-900/10',
    border: 'border-blue-500/20', 
    text: 'text-blue-100',
    icon: 'text-blue-400',
    glow: 'shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]'
  },
  cognitive: {
    bg: 'bg-purple-900/10',
    border: 'border-purple-500/20',
    text: 'text-purple-100',
    icon: 'text-purple-400',
    glow: 'shadow-[0_0_15px_-3px_rgba(168,85,247,0.1)]'
  },
  temporal: {
    bg: 'bg-emerald-900/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-100',
    icon: 'text-emerald-400',
    glow: 'shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]'
  },
  meta: {
    bg: 'bg-amber-900/10',
    border: 'border-amber-500/20',
    text: 'text-amber-100',
    icon: 'text-amber-400',
    glow: 'shadow-[0_0_15px_-3px_rgba(245,158,11,0.1)]'
  },
};
