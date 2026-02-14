/**
 * SystemMessageRenderer - Renders system/control messages inline.
 *
 * Centered, no avatar, distinct styling based on level (info, warn, error).
 * Registered as a fence renderer for ```system / ```sys fences.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';
import { parseFenceJSON } from '../../../../shared/rich-content-types';

interface SystemMessageData {
  level?: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
}

const LEVEL_CONFIG = {
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
    accentColor: 'bg-blue-500',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/20',
    accentColor: 'bg-amber-500',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/20',
    accentColor: 'bg-red-500',
  },
};

interface SystemMessageRendererProps {
  block: FenceBlock;
}

export const SystemMessageRenderer: React.FC<SystemMessageRendererProps> = ({ block }) => {
  const data = useMemo<SystemMessageData>(() => {
    // Try JSON parse first
    const parsed = parseFenceJSON<Partial<SystemMessageData>>(block.content, {});
    if (parsed.message) {
      return {
        level: parsed.level || 'info',
        message: parsed.message,
        detail: parsed.detail,
      };
    }
    // Fall back to treating content as plain text
    return {
      level: 'info',
      message: block.content.trim(),
    };
  }, [block.content]);

  const config = LEVEL_CONFIG[data.level || 'info'];
  const LevelIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`my-2 flex items-center gap-2 px-3 py-1.5 rounded-md ${config.bgColor} border ${config.borderColor}`}
    >
      {/* Accent dot */}
      <div className={`w-1 h-1 rounded-full ${config.accentColor} flex-shrink-0`} />

      {/* Icon */}
      <LevelIcon size={12} className={`${config.color} flex-shrink-0`} />

      {/* Message */}
      <span className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">
        {data.message}
      </span>

      {/* Detail */}
      {data.detail && (
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 truncate max-w-[30%]">
          {data.detail}
        </span>
      )}
    </motion.div>
  );
};

export const SYSTEM_LANGUAGES = ['system', 'sys'];
