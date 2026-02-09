import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Clock, Calendar, Play, Pause, Trash2,
    RefreshCw, CheckCircle, XCircle, AlertCircle,
    MessageSquare, ChevronRight,
    History, Zap
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { ScheduledTask, TaskExecutionResult, ScheduledTaskStatus } from '../../../shared/alephnet-types';
import { Button } from '../ui/button';

interface TaskDetailDialogProps {
    task: ScheduledTask | null;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Status Configuration ────────────────────────────────────────────────

const STATUS_CONFIG: Record<ScheduledTaskStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
    active: { color: 'text-green-400', bgColor: 'bg-green-500/20', icon: Play },
    paused: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: Pause },
    completed: { color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: CheckCircle },
    failed: { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
    cancelled: { color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: AlertCircle }
};

// ─── Execution Result Item ───────────────────────────────────────────────

const ExecutionResultItem: React.FC<{ result: TaskExecutionResult }> = ({ result }) => {
    const [expanded, setExpanded] = useState(false);
    
    const statusConfig = {
        running: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10', spin: true },
        success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', spin: false },
        error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', spin: false }
    }[result.status];
    
    const StatusIcon = statusConfig.icon;

    return (
        <div className={`border border-white/5 rounded-lg overflow-hidden ${statusConfig.bg}`}>
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
            >
                <StatusIcon 
                    size={16} 
                    className={`${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} 
                />
                <div className="flex-1 text-left">
                    <div className="text-xs text-gray-300">
                        {new Date(result.executedAt).toLocaleString()}
                    </div>
                    {result.durationMs && (
                        <div className="text-[10px] text-gray-500">
                            Duration: {result.durationMs}ms
                        </div>
                    )}
                </div>
                <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
                    <ChevronRight size={14} className="text-gray-500" />
                </motion.div>
            </button>
            
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5"
                    >
                        <div className="p-3">
                            {result.error ? (
                                <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 font-mono">
                                    {result.error}
                                </div>
                            ) : result.output ? (
                                <pre className="text-sm text-gray-300 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                                    {result.output}
                                </pre>
                            ) : (
                                <span className="text-sm text-gray-500 italic">No output recorded</span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Task Detail Dialog ──────────────────────────────────────────────────

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
    task,
    isOpen,
    onClose
}) => {
    const { pauseTask, resumeTask, deleteTask, executeTask, loading } = useTaskStore();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    
    // Reset state when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowDeleteConfirm(false);
            setIsExecuting(false);
        }
    }, [isOpen]);

    if (!task || !isOpen) return null;

    const statusConfig = STATUS_CONFIG[task.status];
    const StatusIcon = statusConfig.icon;

    const handleToggleStatus = async () => {
        if (task.status === 'active') {
            await pauseTask(task.id);
        } else if (task.status === 'paused') {
            await resumeTask(task.id);
        }
    };

    const handleExecuteNow = async () => {
        setIsExecuting(true);
        try {
            await executeTask(task.id);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleDelete = async () => {
        await deleteTask(task.id);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                {/* Dialog */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl max-h-[85vh] overflow-hidden bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between p-4 border-b border-white/10">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                                <StatusIcon size={20} className={statusConfig.color} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-white truncate">{task.title}</h2>
                                {task.description && (
                                    <p className="text-sm text-gray-400 mt-0.5">{task.description}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {/* Driving Prompt */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={14} className="text-purple-400" />
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Driving Prompt</span>
                            </div>
                            <div className="bg-black/30 border border-white/5 rounded-lg p-3">
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.drivingPrompt}</p>
                            </div>
                            {task.systemPrompt && (
                                <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                    <div className="text-[10px] text-purple-400 uppercase font-medium mb-1">System Context</div>
                                    <p className="text-xs text-gray-400">{task.systemPrompt}</p>
                                </div>
                            )}
                        </div>

                        {/* Schedule */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={14} className="text-blue-400" />
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Schedule</span>
                            </div>
                            <div className="bg-black/30 border border-white/5 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Cron Expression</span>
                                    <code className="text-sm text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">
                                        {task.cronSchedule}
                                    </code>
                                </div>
                                {task.timezone && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Timezone</span>
                                        <span className="text-sm text-gray-300">{task.timezone}</span>
                                    </div>
                                )}
                                {task.nextScheduledAt && (
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <span className="text-xs text-gray-500">Next Run</span>
                                        <span className="text-sm text-green-400">
                                            {new Date(task.nextScheduledAt).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">{task.executionCount}</div>
                                <div className="text-[10px] text-gray-500 uppercase">Total Runs</div>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-400">{task.successCount}</div>
                                <div className="text-[10px] text-green-500 uppercase">Successful</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-red-400">{task.errorCount}</div>
                                <div className="text-[10px] text-red-500 uppercase">Failed</div>
                            </div>
                        </div>

                        {/* Execution History */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <History size={14} className="text-gray-400" />
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Execution History</span>
                                <span className="text-[10px] text-gray-600">
                                    ({task.executionHistory.length} runs)
                                </span>
                            </div>
                            
                            {task.executionHistory.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {task.executionHistory.slice(0, 10).map((result) => (
                                        <ExecutionResultItem key={result.id} result={result} />
                                    ))}
                                    {task.executionHistory.length > 10 && (
                                        <div className="text-center py-2">
                                            <span className="text-xs text-gray-500">
                                                + {task.executionHistory.length - 10} more executions
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-black/20 rounded-lg border border-white/5">
                                    <Clock size={24} className="mx-auto text-gray-700 mb-2" />
                                    <p className="text-sm text-gray-500">No executions yet</p>
                                    <p className="text-xs text-gray-600 mt-1">Run the task manually or wait for the scheduled time</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-white/10 p-4">
                        {showDeleteConfirm ? (
                            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <span className="text-sm text-red-400">Delete this task permanently?</span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDelete}
                                        disabled={loading}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Run Now */}
                                <Button
                                    onClick={handleExecuteNow}
                                    disabled={loading || isExecuting}
                                    className="flex-1 gap-2"
                                >
                                    {isExecuting ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <Zap size={14} />
                                    )}
                                    Run Now
                                </Button>
                                
                                {/* Toggle Status */}
                                {(task.status === 'active' || task.status === 'paused') && (
                                    <Button
                                        variant="outline"
                                        onClick={handleToggleStatus}
                                        disabled={loading}
                                        className="gap-2"
                                    >
                                        {task.status === 'active' ? (
                                            <>
                                                <Pause size={14} />
                                                Pause
                                            </>
                                        ) : (
                                            <>
                                                <Play size={14} />
                                                Enable
                                            </>
                                        )}
                                    </Button>
                                )}
                                
                                {/* Delete */}
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TaskDetailDialog;
