import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Play, Pause, Trash2, RefreshCw, Plus,
    Calendar, CheckCircle, XCircle, AlertCircle,
    ChevronDown, ChevronRight, History
} from 'lucide-react';
import { useTaskStore, useFilteredTasks } from '../../store/useTaskStore';
import { ScheduledTask, ScheduledTaskStatus, TaskExecutionResult } from '../../../shared/alephnet-types';

// ─── Status Badge ───────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ScheduledTaskStatus }> = ({ status }) => {
    const config = {
        active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play },
        paused: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Pause },
        completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
        failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
        cancelled: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: AlertCircle }
    }[status];

    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color}`}>
            <Icon size={10} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// ─── Execution Result Item ──────────────────────────────────────────────

const ExecutionResultItem: React.FC<{ result: TaskExecutionResult }> = ({ result }) => {
    const [expanded, setExpanded] = useState(false);
    
    const statusIcon = {
        running: <RefreshCw size={12} className="text-blue-400 animate-spin" />,
        success: <CheckCircle size={12} className="text-green-400" />,
        error: <XCircle size={12} className="text-red-400" />
    }[result.status];

    return (
        <div className="border border-white/5 rounded-lg bg-black/20 overflow-hidden">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-2 p-2 hover:bg-white/5 transition-colors"
            >
                {statusIcon}
                <span className="text-xs text-gray-400 flex-1 text-left">
                    {new Date(result.executedAt).toLocaleString()}
                </span>
                {result.durationMs && (
                    <span className="text-[10px] text-gray-600">{result.durationMs}ms</span>
                )}
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5"
                    >
                        <div className="p-2 text-xs">
                            {result.error ? (
                                <div className="text-red-400 bg-red-500/10 rounded p-2">
                                    {result.error}
                                </div>
                            ) : result.output ? (
                                <pre className="text-gray-300 bg-black/40 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                                    {result.output}
                                </pre>
                            ) : (
                                <span className="text-gray-500 italic">No output</span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Task Card ──────────────────────────────────────────────────────────

const TaskCard: React.FC<{ 
    task: ScheduledTask; 
    isActive: boolean;
    onSelect: () => void;
    onPause: () => void;
    onResume: () => void;
    onDelete: () => void;
    onExecute: () => void;
}> = ({ task, isActive, onSelect, onPause, onResume, onDelete, onExecute }) => {
    const [showHistory, setShowHistory] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
                border rounded-lg p-3 transition-all cursor-pointer
                ${isActive 
                    ? 'border-blue-500/50 bg-blue-500/5' 
                    : 'border-white/10 bg-black/20 hover:border-white/20'
                }
            `}
            onClick={onSelect}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-200 truncate">{task.title}</h3>
                    {task.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{task.description}</p>
                    )}
                </div>
                <StatusBadge status={task.status} />
            </div>

            {/* Schedule */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Calendar size={12} />
                <span className="font-mono">{task.cronSchedule}</span>
                {task.nextScheduledAt && (
                    <span className="text-gray-600">
                        • Next: {new Date(task.nextScheduledAt).toLocaleString()}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                    <RefreshCw size={10} />
                    {task.executionCount} runs
                </span>
                <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle size={10} />
                    {task.successCount}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                    <XCircle size={10} />
                    {task.errorCount}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {task.status === 'active' ? (
                    <button
                        onClick={onPause}
                        className="p-1.5 rounded hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Pause"
                    >
                        <Pause size={14} />
                    </button>
                ) : task.status === 'paused' ? (
                    <button
                        onClick={onResume}
                        className="p-1.5 rounded hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors"
                        title="Resume"
                    >
                        <Play size={14} />
                    </button>
                ) : null}
                
                <button
                    onClick={onExecute}
                    className="p-1.5 rounded hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Execute Now"
                >
                    <RefreshCw size={14} />
                </button>
                
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-1.5 rounded transition-colors ${
                        showHistory 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'hover:bg-purple-500/20 text-gray-400 hover:text-purple-400'
                    }`}
                    title="History"
                >
                    <History size={14} />
                </button>
                
                <div className="flex-1" />
                
                <button
                    onClick={onDelete}
                    className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Execution History */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-white/5 space-y-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Recent Executions</h4>
                        {task.executionHistory.length > 0 ? (
                            task.executionHistory.slice(0, 5).map((result) => (
                                <ExecutionResultItem key={result.id} result={result} />
                            ))
                        ) : (
                            <p className="text-xs text-gray-600 italic">No executions yet</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Tasks Panel ────────────────────────────────────────────────────────

export const TasksPanel: React.FC = () => {
    const { 
        loadTasks, 
        setActiveTaskId, 
        activeTaskId,
        pauseTask,
        resumeTask,
        deleteTask,
        executeTask,
        loading,
        error,
        statusFilter,
        setStatusFilter
    } = useTaskStore();
    
    const tasks = useFilteredTasks();

    // Load tasks on mount
    useEffect(() => {
        loadTasks();
        
        // Subscribe to task events
        const unsubExecution = window.electronAPI.onTaskExecution((_, result) => {
            useTaskStore.getState().handleTaskExecution(result);
        });
        const unsubStatus = window.electronAPI.onTaskStatusChange((_, { taskId, status }) => {
            useTaskStore.getState().handleTaskStatusChange(taskId, status);
        });

        return () => {
            unsubExecution();
            unsubStatus();
        };
    }, [loadTasks]);

    const handleCreateTask = () => {
        // TODO: Open task creation modal
        console.log('Create task clicked');
    };

    return (
        <div className="h-full flex flex-col bg-gray-950">
            {/* Header */}
            <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" />
                        <h2 className="text-sm font-bold text-gray-200 tracking-wide">Scheduled Tasks</h2>
                    </div>
                    <button
                        onClick={handleCreateTask}
                        className="p-1.5 rounded hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors"
                        title="Create Task"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1">
                    {(['all', 'active', 'paused', 'completed', 'failed'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`
                                px-2 py-1 rounded text-[10px] font-medium transition-colors
                                ${statusFilter === status
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }
                            `}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw size={20} className="text-gray-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle size={24} className="text-red-400 mb-2" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock size={32} className="text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500">No scheduled tasks</p>
                        <p className="text-xs text-gray-600 mt-1">
                            Create a task to run AI prompts on a schedule
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                isActive={activeTaskId === task.id}
                                onSelect={() => setActiveTaskId(task.id)}
                                onPause={() => pauseTask(task.id)}
                                onResume={() => resumeTask(task.id)}
                                onDelete={() => deleteTask(task.id)}
                                onExecute={() => executeTask(task.id)}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default TasksPanel;
