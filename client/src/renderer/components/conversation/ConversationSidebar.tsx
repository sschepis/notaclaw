import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, Users, Clock, Bot, User,
    Play, Pause, Settings, AlertCircle
} from 'lucide-react';
import { useTaskStore, useTasksForConversation } from '../../store/useTaskStore';
import { useAppStore } from '../../store/useAppStore';
import { ScheduledTask, ScheduledTaskStatus } from '../../../shared/alephnet-types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { MemoryFieldExplorer } from '../memory/MemoryFieldExplorer';

// ─── Types ───────────────────────────────────────────────────────────────

export interface Participant {
    id: string;
    name: string;
    type: 'user' | 'ai' | 'agent';
    status: 'active' | 'idle' | 'offline';
    avatar?: string;
    role?: string;
}

interface ConversationSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onTaskClick: (task: ScheduledTask) => void;
}

// ─── Status Indicator ────────────────────────────────────────────────────

const StatusIndicator: React.FC<{ status: 'active' | 'idle' | 'offline' }> = ({ status }) => {
    const colors = {
        active: 'bg-green-500',
        idle: 'bg-yellow-500',
        offline: 'bg-gray-500'
    };
    
    return (
        <span className={`w-2 h-2 rounded-full ${colors[status]} ring-2 ring-gray-900`} />
    );
};

// ─── Task Status Badge ───────────────────────────────────────────────────

const TaskStatusBadge: React.FC<{ status: ScheduledTaskStatus }> = ({ status }) => {
    const config = {
        active: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Play },
        paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Pause },
        completed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: null },
        failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle },
        cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: null }
    }[status];
    
    const Icon = config.icon;
    
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${config.bg} ${config.text}`}>
            {Icon && <Icon size={8} />}
            {status}
        </span>
    );
};

// ─── Participant Item ────────────────────────────────────────────────────

const ParticipantItem: React.FC<{ participant: Participant }> = ({ participant }) => {
    const TypeIcon = participant.type === 'ai' ? Bot : participant.type === 'agent' ? Bot : User;
    
    return (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors">
            <div className="relative">
                <Avatar className="h-7 w-7 rounded-lg">
                    <AvatarFallback className={`text-[10px] ${
                        participant.type === 'ai' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : participant.type === 'agent'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-800 text-gray-300'
                    }`}>
                        <TypeIcon size={14} />
                    </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusIndicator status={participant.status} />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">{participant.name}</div>
                {participant.role && (
                    <div className="text-[10px] text-gray-500 truncate">{participant.role}</div>
                )}
            </div>
        </div>
    );
};

// ─── Task Item ───────────────────────────────────────────────────────────

const TaskItem: React.FC<{ 
    task: ScheduledTask; 
    onClick: () => void;
}> = ({ task, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-start gap-2 p-2 rounded-lg border border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/10 transition-all text-left group"
        >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                <Clock size={14} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-200 truncate flex-1">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                </div>
                <div className="text-[10px] text-gray-500 font-mono">{task.cronSchedule}</div>
                {task.nextScheduledAt && (
                    <div className="text-[10px] text-gray-600 mt-0.5">
                        Next: {new Date(task.nextScheduledAt).toLocaleString()}
                    </div>
                )}
            </div>
        </button>
    );
};

// ─── Section Header ──────────────────────────────────────────────────────

const SectionHeader: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    count?: number;
    action?: React.ReactNode;
}> = ({ icon, title, count, action }) => (
    <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
            <span className="text-gray-500">{icon}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
            {count !== undefined && (
                <span className="text-[10px] text-gray-600">({count})</span>
            )}
        </div>
        {action}
    </div>
);

// ─── Conversation Sidebar ────────────────────────────────────────────────

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    isOpen,
    onToggle,
    onTaskClick
}) => {
    const { activeConversationId } = useAppStore();
    const { loadTasks } = useTaskStore();
    const tasks = useTasksForConversation(activeConversationId || '');
    
    // Mock participants - in real implementation, this would come from a store
    const [participants] = useState<Participant[]>([
        { id: 'user', name: 'You', type: 'user', status: 'active', role: 'Owner' },
        { id: 'ai-assistant', name: 'AI Assistant', type: 'ai', status: 'active', role: 'Assistant' }
    ]);
    
    // Load tasks when conversation changes
    useEffect(() => {
        if (activeConversationId) {
            loadTasks({ parentConversationId: activeConversationId });
        }
    }, [activeConversationId, loadTasks]);

    return (
        <>
            {/* Toggle Button - Always visible */}
            <button
                onClick={onToggle}
                className={`
                    absolute right-0 top-1/2 -translate-y-1/2 z-30
                    w-5 h-16 flex items-center justify-center
                    bg-gray-900/80 border border-white/10 border-r-0
                    rounded-l-lg text-gray-500 hover:text-white hover:bg-gray-800
                    transition-all duration-200
                    ${isOpen ? 'translate-x-0' : 'translate-x-0'}
                `}
                title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight size={14} />
                </motion.div>
            </button>
            
            {/* Sidebar Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="h-full border-l border-white/10 bg-gray-950/50 backdrop-blur-sm overflow-hidden flex-shrink-0"
                    >
                        <div className="w-[280px] h-full flex flex-col">
                            {/* Header */}
                            <div className="p-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Settings size={14} className="text-gray-500" />
                                    <span className="text-xs font-medium text-gray-300">Conversation Details</span>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                                {/* Participants Section */}
                                <div>
                                    <SectionHeader 
                                        icon={<Users size={12} />} 
                                        title="Participants" 
                                        count={participants.length}
                                    />
                                    <div className="space-y-1">
                                        {participants.map(participant => (
                                            <ParticipantItem key={participant.id} participant={participant} />
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Memory Field Explorer */}
                                {activeConversationId && (
                                    <MemoryFieldExplorer conversationId={activeConversationId} />
                                )}

                                {/* Tasks Section */}
                                <div>
                                    <SectionHeader
                                        icon={<Clock size={12} />}
                                        title="Scheduled Tasks"
                                        count={tasks.length}
                                    />
                                    <div className="space-y-2">
                                        {tasks.length > 0 ? (
                                            tasks.map(task => (
                                                <TaskItem
                                                    key={task.id}
                                                    task={task}
                                                    onClick={() => onTaskClick(task)}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-4">
                                                <Clock size={20} className="mx-auto text-gray-700 mb-2" />
                                                <p className="text-xs text-gray-600">No scheduled tasks</p>
                                                <p className="text-[10px] text-gray-700 mt-1">
                                                    Ask the assistant to create a task
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ConversationSidebar;
