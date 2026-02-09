import { create } from 'zustand';
import {
    ScheduledTask,
    ScheduledTaskStatus,
    TaskExecutionResult,
    CreateScheduledTaskOptions,
    UpdateScheduledTaskOptions,
    TaskParseRequest,
    TaskParseResult
} from '../../shared/alephnet-types';

interface TaskState {
    // Data
    tasks: Record<string, ScheduledTask>;
    activeTaskId: string | null;
    loading: boolean;
    error: string | null;

    // Filter state
    statusFilter: ScheduledTaskStatus | 'all';
    conversationFilter: string | null;

    // Actions
    loadTasks: (options?: { status?: ScheduledTaskStatus; parentConversationId?: string }) => Promise<void>;
    createTask: (options: CreateScheduledTaskOptions) => Promise<ScheduledTask | null>;
    updateTask: (taskId: string, updates: UpdateScheduledTaskOptions) => Promise<ScheduledTask | null>;
    deleteTask: (taskId: string) => Promise<boolean>;
    pauseTask: (taskId: string) => Promise<ScheduledTask | null>;
    resumeTask: (taskId: string) => Promise<ScheduledTask | null>;
    executeTask: (taskId: string, inputValues?: Record<string, any>) => Promise<TaskExecutionResult | null>;
    getTaskHistory: (taskId: string, limit?: number) => Promise<TaskExecutionResult[]>;
    parseTaskRequest: (request: TaskParseRequest) => Promise<TaskParseResult | null>;

    // UI Actions
    setActiveTaskId: (id: string | null) => void;
    setStatusFilter: (status: ScheduledTaskStatus | 'all') => void;
    setConversationFilter: (conversationId: string | null) => void;

    // Event handlers (called by subscription)
    handleTaskExecution: (result: TaskExecutionResult) => void;
    handleTaskStatusChange: (taskId: string, status: ScheduledTaskStatus) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: {},
    activeTaskId: null,
    loading: false,
    error: null,
    statusFilter: 'all',
    conversationFilter: null,

    loadTasks: async (options) => {
        set({ loading: true, error: null });
        try {
            const list = await window.electronAPI.taskList(options);
            const tasks: Record<string, ScheduledTask> = {};
            list.forEach(task => {
                tasks[task.id] = task;
            });
            set({ tasks, loading: false });
        } catch (err: any) {
            console.error('Failed to load tasks:', err);
            set({ error: err.message, loading: false });
        }
    },

    createTask: async (options) => {
        set({ loading: true, error: null });
        try {
            const task = await window.electronAPI.taskCreate(options);
            set(state => ({
                tasks: { ...state.tasks, [task.id]: task },
                loading: false
            }));
            return task;
        } catch (err: any) {
            console.error('Failed to create task:', err);
            set({ error: err.message, loading: false });
            return null;
        }
    },

    updateTask: async (taskId, updates) => {
        set({ loading: true, error: null });
        try {
            const task = await window.electronAPI.taskUpdate({ taskId, updates });
            set(state => ({
                tasks: { ...state.tasks, [taskId]: task },
                loading: false
            }));
            return task;
        } catch (err: any) {
            console.error('Failed to update task:', err);
            set({ error: err.message, loading: false });
            return null;
        }
    },

    deleteTask: async (taskId) => {
        set({ loading: true, error: null });
        try {
            const result = await window.electronAPI.taskDelete({ taskId });
            if (result.deleted) {
                set(state => {
                    const { [taskId]: _, ...rest } = state.tasks;
                    return {
                        tasks: rest,
                        activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
                        loading: false
                    };
                });
            }
            return result.deleted;
        } catch (err: any) {
            console.error('Failed to delete task:', err);
            set({ error: err.message, loading: false });
            return false;
        }
    },

    pauseTask: async (taskId) => {
        set({ loading: true, error: null });
        try {
            const task = await window.electronAPI.taskPause({ taskId });
            set(state => ({
                tasks: { ...state.tasks, [taskId]: task },
                loading: false
            }));
            return task;
        } catch (err: any) {
            console.error('Failed to pause task:', err);
            set({ error: err.message, loading: false });
            return null;
        }
    },

    resumeTask: async (taskId) => {
        set({ loading: true, error: null });
        try {
            const task = await window.electronAPI.taskResume({ taskId });
            set(state => ({
                tasks: { ...state.tasks, [taskId]: task },
                loading: false
            }));
            return task;
        } catch (err: any) {
            console.error('Failed to resume task:', err);
            set({ error: err.message, loading: false });
            return null;
        }
    },

    executeTask: async (taskId, inputValues) => {
        set({ loading: true, error: null });
        try {
            const result = await window.electronAPI.taskExecute({ taskId, inputValues });
            // The task will be updated via the event handler
            set({ loading: false });
            return result;
        } catch (err: any) {
            console.error('Failed to execute task:', err);
            set({ error: err.message, loading: false });
            return null;
        }
    },

    getTaskHistory: async (taskId, limit) => {
        try {
            return await window.electronAPI.taskGetHistory({ taskId, limit });
        } catch (err: any) {
            console.error('Failed to get task history:', err);
            return [];
        }
    },

    parseTaskRequest: async (request) => {
        set({ loading: true, error: null });
        try {
            const result = await window.electronAPI.taskParse(request);
            set({ loading: false });
            return result;
        } catch (err: any) {
            console.error('Failed to parse task request:', err);
            set({ error: err.message, loading: false });
            return null;
        }
    },

    setActiveTaskId: (id) => set({ activeTaskId: id }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setConversationFilter: (conversationId) => set({ conversationFilter: conversationId }),

    handleTaskExecution: (result) => {
        // Update the task's execution history in the store
        const { tasks } = get();
        const task = tasks[result.taskId];
        if (task) {
            const updatedTask = {
                ...task,
                executionHistory: [result, ...task.executionHistory].slice(0, 100),
                lastExecutedAt: result.executedAt,
                executionCount: task.executionCount + 1,
                successCount: result.status === 'success' ? task.successCount + 1 : task.successCount,
                errorCount: result.status === 'error' ? task.errorCount + 1 : task.errorCount
            };
            set(state => ({
                tasks: { ...state.tasks, [result.taskId]: updatedTask }
            }));
        }
    },

    handleTaskStatusChange: (taskId, status) => {
        const { tasks } = get();
        const task = tasks[taskId];
        if (task) {
            set(state => ({
                tasks: {
                    ...state.tasks,
                    [taskId]: { ...task, status }
                }
            }));
        }
    }
}));

// Selector for filtered tasks
export const useFilteredTasks = () => {
    const { tasks, statusFilter, conversationFilter } = useTaskStore();
    
    return Object.values(tasks).filter(task => {
        if (statusFilter !== 'all' && task.status !== statusFilter) return false;
        if (conversationFilter && task.parentConversationId !== conversationFilter) return false;
        return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
};

// Selector for tasks by conversation
export const useTasksForConversation = (conversationId: string) => {
    const { tasks } = useTaskStore();
    return Object.values(tasks)
        .filter(task => task.parentConversationId === conversationId)
        .sort((a, b) => b.createdAt - a.createdAt);
};

// Selector for active task
export const useActiveTask = () => {
    const { tasks, activeTaskId } = useTaskStore();
    return activeTaskId ? tasks[activeTaskId] : null;
};
