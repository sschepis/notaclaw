import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Clock, CheckCircle, XCircle, RefreshCw,
    ChevronDown, Calendar, Zap,
    ExternalLink
} from 'lucide-react';
import { TaskExecutionResult, ScheduledTask } from '../../../shared/alephnet-types';
import { MarkdownContent } from '../ui/MarkdownContent';

interface TaskResultMessageProps {
    /** The task execution result */
    result: TaskExecutionResult;
    /** Optional: The full task object for more context */
    task?: ScheduledTask;
    /** Optional: Callback when task title is clicked */
    onTaskClick?: (taskId: string) => void;
    /** Timestamp to display */
    timestamp: string;
}

// ─── Status Configuration ────────────────────────────────────────────────

const STATUS_CONFIG = {
    running: {
        icon: RefreshCw,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        label: 'Running',
        accentColor: 'from-blue-500/20 to-blue-600/20'
    },
    success: {
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        label: 'Completed',
        accentColor: 'from-green-500/20 to-emerald-600/20'
    },
    error: {
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: 'Failed',
        accentColor: 'from-red-500/20 to-rose-600/20'
    }
};

// ─── Task Result Message ─────────────────────────────────────────────────

export const TaskResultMessage: React.FC<TaskResultMessageProps> = ({
    result,
    task,
    onTaskClick,
    timestamp
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const statusConfig = STATUS_CONFIG[result.status];
    const StatusIcon = statusConfig.icon;

    const formattedTime = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="w-full max-w-3xl mx-auto my-3"
        >
            <div className={`
                relative overflow-hidden rounded-xl border
                ${statusConfig.borderColor}
                bg-gradient-to-br ${statusConfig.accentColor}
                backdrop-blur-sm
            `}>
                {/* Decorative accent line at top */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${statusConfig.accentColor.replace('/20', '/50')}`} />
                
                {/* Header */}
                <div className="flex items-start gap-3 p-3">
                    {/* Status Icon */}
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${statusConfig.bgColor} border ${statusConfig.borderColor}
                    `}>
                        <StatusIcon 
                            size={20} 
                            className={`${statusConfig.color} ${result.status === 'running' ? 'animate-spin' : ''}`} 
                        />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Task Info Row */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${statusConfig.color} uppercase tracking-wider`}>
                                Scheduled Task
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className={`text-xs ${statusConfig.color}`}>
                                {statusConfig.label}
                            </span>
                            {result.durationMs && (
                                <>
                                    <span className="text-gray-600">•</span>
                                    <span className="text-xs text-gray-500">
                                        {result.durationMs}ms
                                    </span>
                                </>
                            )}
                        </div>
                        
                        {/* Task Title */}
                        {task ? (
                            <button
                                onClick={() => onTaskClick?.(result.taskId)}
                                className="flex items-center gap-1.5 text-sm font-medium text-gray-200 hover:text-white transition-colors group"
                            >
                                <Clock size={14} className="text-gray-500" />
                                {task.title}
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                <Clock size={14} />
                                Task Execution
                            </div>
                        )}
                        
                        {/* Time */}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                            <Calendar size={10} />
                            <span>{formattedTime}</span>
                        </div>
                    </div>
                    
                    {/* Expand/Collapse Toggle */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    >
                        <motion.div animate={{ rotate: isExpanded ? 0 : -90 }}>
                            <ChevronDown size={16} />
                        </motion.div>
                    </button>
                </div>
                
                {/* Result Content */}
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5"
                    >
                        <div className="p-3">
                            {result.error ? (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <XCircle size={14} className="text-red-400" />
                                        <span className="text-xs font-medium text-red-400">Error</span>
                                    </div>
                                    <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap overflow-x-auto">
                                        {result.error}
                                    </pre>
                                </div>
                            ) : result.output ? (
                                <div className="bg-black/20 rounded-lg p-3 overflow-hidden">
                                    <MarkdownContent content={result.output} />
                                </div>
                            ) : result.status === 'running' ? (
                                <div className="flex items-center gap-3 py-4 justify-center">
                                    <RefreshCw size={16} className="text-blue-400 animate-spin" />
                                    <span className="text-sm text-gray-400">Task is currently executing...</span>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <span className="text-sm text-gray-500 italic">No output available</span>
                                </div>
                            )}
                            
                            {/* Structured Output (if available) */}
                            {result.structuredOutput && Object.keys(result.structuredOutput).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap size={12} className="text-purple-400" />
                                        <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">Structured Output</span>
                                    </div>
                                    <pre className="text-xs text-gray-400 bg-black/30 rounded-lg p-2 overflow-x-auto">
                                        {JSON.stringify(result.structuredOutput, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default TaskResultMessage;
