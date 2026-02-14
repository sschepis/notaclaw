/**
 * ToolCallCard - Renders an inline tool call report within a message.
 *
 * Displays tool name, status, duration, and expandable args/result.
 * Registered as a fence renderer for ```tool_call fences.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Loader2,
  ChevronDown, Clock, Terminal
} from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';
import { ToolCallReport, parseFenceJSON, sanitizeToolArgs, summarizeToolResult } from '../../../../shared/rich-content-types';

// ─── Status Config ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  animate?: boolean;
}> = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
    label: 'Pending',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Running',
    animate: true,
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Error',
  },
};

// ─── Tool Icon Mapping ────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, string> = {
  read_file: '📄',
  write_file: '✏️',
  list_directory: '📁',
  shell: '🖥️',
  search_files: '🔍',
  memory_store: '🧠',
  memory_query: '🔎',
  task_complete: '✅',
  ask_user: '💬',
  send_update: '📨',
  navigate: '🧭',
  execute_command: '⚡',
};

// ─── Component ────────────────────────────────────────────────────────────

interface ToolCallCardProps {
  block: FenceBlock;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ block }) => {
  const [expanded, setExpanded] = useState(false);

  const report = useMemo<ToolCallReport>(() => {
    const parsed = parseFenceJSON<Partial<ToolCallReport>>(block.content, {});
    return {
      id: parsed.id || `tc-${Date.now()}`,
      toolName: parsed.toolName || 'unknown',
      args: parsed.args || {},
      status: parsed.status || 'success',
      result: parsed.result,
      error: parsed.error,
      durationMs: parsed.durationMs,
      timestamp: parsed.timestamp || Date.now(),
    };
  }, [block.content]);

  const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.success;
  const StatusIcon = config.icon;
  const toolIcon = TOOL_ICONS[report.toolName] || '🔧';
  const sanitizedArgs = useMemo(() => sanitizeToolArgs(report.args), [report.args]);
  const hasDetails = Object.keys(sanitizedArgs).length > 0 || report.result || report.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`my-2 rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${hasDetails ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} transition-colors`}
      >
        {/* Tool icon */}
        <span className="text-sm flex-shrink-0">{toolIcon}</span>

        {/* Tool name */}
        <span className="text-xs font-mono font-semibold text-foreground truncate">
          {report.toolName}
        </span>

        {/* Status badge */}
        <span className={`flex items-center gap-1 text-[10px] font-medium ${config.color} ml-auto flex-shrink-0`}>
          <StatusIcon size={12} className={config.animate ? 'animate-spin' : ''} />
          {config.label}
        </span>

        {/* Duration */}
        {report.durationMs !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
            {report.durationMs}ms
          </span>
        )}

        {/* Expand chevron */}
        {hasDetails && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0"
          >
            <ChevronDown size={12} className="text-muted-foreground" />
          </motion.div>
        )}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="px-3 py-2 space-y-2">
              {/* Arguments */}
              {Object.keys(sanitizedArgs).length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Terminal size={10} className="text-muted-foreground" />
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Arguments
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto max-h-32">
                    {JSON.stringify(sanitizedArgs, null, 2)}
                  </pre>
                </div>
              )}

              {/* Result */}
              {report.result !== undefined && !report.error && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle size={10} className="text-emerald-400" />
                    <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Result
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto max-h-40">
                    {typeof report.result === 'string'
                      ? report.result
                      : summarizeToolResult(report.result)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {report.error && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <XCircle size={10} className="text-red-400" />
                    <span className="text-[9px] font-semibold text-red-400 uppercase tracking-wider">
                      Error
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-red-300/80 bg-red-500/10 rounded p-2 overflow-x-auto max-h-32">
                    {report.error}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const TOOL_CALL_LANGUAGES = ['tool_call', 'tool-call', 'toolcall'];
