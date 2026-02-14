/**
 * InlineAgentStatus - Renders inline agent status within the message timeline.
 *
 * Replaces the floating ProgressSpinner with an in-flow status element that
 * shows what the agent is currently doing: thinking, executing tools, etc.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Wrench, MessageCircle, CheckCircle, XCircle,
  Loader2, AlertCircle
} from 'lucide-react';
import { AgentTask, AgentTaskStatus } from '../../../shared/agent-types';
import { useAppStore } from '../../store/useAppStore';

interface InlineAgentStatusProps {
  task?: AgentTask | null;
}

const STATUS_CONFIG: Record<AgentTaskStatus | 'generating', {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  animate?: boolean;
}> = {
  generating: {
    icon: Loader2,
    label: 'Generating response...',
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    animate: true,
  },
  thinking: {
    icon: Brain,
    label: 'Thinking...',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/5',
    borderColor: 'border-purple-500/20',
    animate: true,
  },
  running: {
    icon: Loader2,
    label: 'Working...',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
    animate: true,
  },
  tool_executing: {
    icon: Wrench,
    label: 'Executing tool...',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/20',
    animate: true,
  },
  waiting_user: {
    icon: MessageCircle,
    label: 'Waiting for your response',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
  },
  completed: {
    icon: CheckCircle,
    label: 'Task completed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/20',
  },
  cancelled: {
    icon: XCircle,
    label: 'Task cancelled',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/5',
    borderColor: 'border-border',
  },
  error: {
    icon: AlertCircle,
    label: 'Task failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/20',
  },
};

export const InlineAgentStatus: React.FC<InlineAgentStatusProps> = ({ task }) => {
  const { generationProgress } = useAppStore();

  // Determine which status to show
  // This component is only rendered when isGenerating is true (see ChatView),
  // so we fall back to 'generating' when no task is active.
  const effectiveStatus: AgentTaskStatus | 'generating' = task?.status || 'generating';
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.generating;
  const StatusIcon = config.icon;

  // Build label
  let label = config.label;
  if (task?.status === 'tool_executing' && task.currentTool) {
    label = `Executing: ${task.currentTool}`;
  }
  if (!task && generationProgress?.status) {
    label = generationProgress.status;
  }

  // Progress info
  const progress = generationProgress;
  const hasProgress = progress?.totalSteps !== undefined && progress.totalSteps > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-start mb-3"
    >
      <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full ${config.bgColor} border ${config.borderColor} backdrop-blur-sm max-w-[80%]`}>
        {/* Animated icon */}
        <StatusIcon
          size={14}
          className={`${config.color} flex-shrink-0 ${config.animate ? 'animate-spin' : ''}`}
        />

        {/* Status label */}
        <motion.span
          key={label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-xs font-medium ${config.color} truncate`}
        >
          {label}
        </motion.span>

        {/* Step progress */}
        {hasProgress && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground">
              {progress!.step}/{progress!.totalSteps}
            </span>
            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500`}
                initial={{ width: 0 }}
                animate={{ width: `${((progress!.step ?? 0) / progress!.totalSteps!) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </>
        )}

        {/* Progress detail */}
        {progress?.details && (
          <span className="text-[10px] text-muted-foreground truncate max-w-32">
            {progress.details}
          </span>
        )}

        {/* Pulsing dot for active states */}
        {config.animate && (
          <motion.div
            className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default InlineAgentStatus;
