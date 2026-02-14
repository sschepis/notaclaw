/**
 * StatusBadge - Renders an inline progress/status indicator within a message.
 *
 * Displays a slim horizontal bar with label, optional detail, and progress bar.
 * Registered as a fence renderer for ```status / ```progress fences.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';
import { ProgressStatus, parseFenceJSON } from '../../../../shared/rich-content-types';

interface StatusBadgeProps {
  block: FenceBlock;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ block }) => {
  const status = useMemo<ProgressStatus>(() => {
    return parseFenceJSON<ProgressStatus>(block.content, {
      label: block.content || 'Processing...',
    });
  }, [block.content]);

  const hasProgress = status.totalSteps !== undefined && status.totalSteps > 0;
  const percentage = status.percentage ?? (hasProgress ? ((status.step ?? 0) / status.totalSteps!) * 100 : undefined);
  const isDone = percentage !== undefined && percentage >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-2 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
    >
      {/* Icon */}
      {isDone ? (
        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
      ) : (
        <Loader2 size={14} className="text-primary animate-spin flex-shrink-0" />
      )}

      {/* Label and detail */}
      <div className="flex-1 min-w-0">
        <motion.div
          key={status.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs font-medium text-foreground truncate"
        >
          {status.label}
        </motion.div>
        {status.detail && (
          <motion.div
            key={status.detail}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-muted-foreground truncate mt-0.5"
          >
            {status.detail}
          </motion.div>
        )}
      </div>

      {/* Step counter */}
      {hasProgress && (
        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
          {status.step}/{status.totalSteps}
        </span>
      )}

      {/* Progress bar */}
      {percentage !== undefined && (
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
          <motion.div
            className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const STATUS_LANGUAGES = ['status', 'progress'];
