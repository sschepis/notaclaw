import { useTaskStore } from '../../../src/renderer/store/useTaskStore';
import type { ScheduledTask, TaskExecutionResult, ScheduledTaskStatus } from '../../../src/shared/alephnet-types';

// Mock window.electronAPI
const mockElectronAPI = {
  taskList: jest.fn(),
  taskCreate: jest.fn(),
  taskUpdate: jest.fn(),
  taskDelete: jest.fn(),
  taskPause: jest.fn(),
  taskResume: jest.fn(),
  taskExecute: jest.fn(),
  taskGetHistory: jest.fn(),
  taskParse: jest.fn(),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

// Helper to create a mock task
const createMockTask = (overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'A test task',
  parentConversationId: 'conv-1',
  cronSchedule: '0 9 * * *',
  drivingPrompt: 'Do something',
  inputFields: [],
  outputFormat: { type: 'text' },
  status: 'active',
  executionHistory: [],
  executionCount: 0,
  successCount: 0,
  errorCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// Helper to create a mock execution result
const createMockExecutionResult = (overrides: Partial<TaskExecutionResult> = {}): TaskExecutionResult => ({
  id: 'exec-1',
  taskId: 'task-1',
  executedAt: Date.now(),
  status: 'success',
  inputValues: {},
  ...overrides,
});

// Helper to reset store
const resetStore = () => {
  useTaskStore.setState({
    tasks: {},
    activeTaskId: null,
    loading: false,
    error: null,
    statusFilter: 'all',
    conversationFilter: null,
  });
};

describe('useTaskStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('loadTasks', () => {
    it('should load tasks from API', async () => {
      const mockTasks = [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
      ];
      mockElectronAPI.taskList.mockResolvedValue(mockTasks);

      await useTaskStore.getState().loadTasks();

      expect(mockElectronAPI.taskList).toHaveBeenCalled();
      expect(Object.keys(useTaskStore.getState().tasks).length).toBe(2);
      expect(useTaskStore.getState().loading).toBe(false);
    });

    it('should handle load error', async () => {
      mockElectronAPI.taskList.mockRejectedValue(new Error('Load failed'));

      await useTaskStore.getState().loadTasks();

      expect(useTaskStore.getState().error).toBe('Load failed');
      expect(useTaskStore.getState().loading).toBe(false);
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const newTask = createMockTask({ id: 'new-task' });
      mockElectronAPI.taskCreate.mockResolvedValue(newTask);

      const result = await useTaskStore.getState().createTask({
        title: 'New Task',
        description: 'A new task',
        parentConversationId: 'conv-1',
        cronSchedule: '0 9 * * *',
        drivingPrompt: 'test prompt',
      });

      expect(result).toEqual(newTask);
      expect(useTaskStore.getState().tasks['new-task']).toBeDefined();
    });

    it('should handle create error', async () => {
      mockElectronAPI.taskCreate.mockRejectedValue(new Error('Create failed'));

      const result = await useTaskStore.getState().createTask({
        title: 'New Task',
        description: 'A new task',
        parentConversationId: 'conv-1',
        cronSchedule: '0 9 * * *',
        drivingPrompt: 'test prompt',
      });

      expect(result).toBeNull();
      expect(useTaskStore.getState().error).toBe('Create failed');
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const task = createMockTask({ id: 'task-1' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      const updatedTask = { ...task, title: 'Updated Title' };
      mockElectronAPI.taskUpdate.mockResolvedValue(updatedTask);

      const result = await useTaskStore.getState().updateTask('task-1', { title: 'Updated Title' });

      expect(result?.title).toBe('Updated Title');
      expect(useTaskStore.getState().tasks['task-1'].title).toBe('Updated Title');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task = createMockTask({ id: 'task-1' });
      useTaskStore.setState({ tasks: { 'task-1': task } });
      mockElectronAPI.taskDelete.mockResolvedValue({ deleted: true });

      const result = await useTaskStore.getState().deleteTask('task-1');

      expect(result).toBe(true);
      expect(useTaskStore.getState().tasks['task-1']).toBeUndefined();
    });

    it('should clear activeTaskId if deleted task was active', async () => {
      const task = createMockTask({ id: 'task-1' });
      useTaskStore.setState({ tasks: { 'task-1': task }, activeTaskId: 'task-1' });
      mockElectronAPI.taskDelete.mockResolvedValue({ deleted: true });

      await useTaskStore.getState().deleteTask('task-1');

      expect(useTaskStore.getState().activeTaskId).toBeNull();
    });
  });

  describe('pauseTask', () => {
    it('should pause a task', async () => {
      const task = createMockTask({ id: 'task-1', status: 'active' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      const pausedTask = { ...task, status: 'paused' as ScheduledTaskStatus };
      mockElectronAPI.taskPause.mockResolvedValue(pausedTask);

      const result = await useTaskStore.getState().pauseTask('task-1');

      expect(result?.status).toBe('paused');
    });
  });

  describe('resumeTask', () => {
    it('should resume a task', async () => {
      const task = createMockTask({ id: 'task-1', status: 'paused' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      const resumedTask = { ...task, status: 'active' as ScheduledTaskStatus };
      mockElectronAPI.taskResume.mockResolvedValue(resumedTask);

      const result = await useTaskStore.getState().resumeTask('task-1');

      expect(result?.status).toBe('active');
    });
  });

  describe('executeTask', () => {
    it('should execute a task', async () => {
      const task = createMockTask({ id: 'task-1' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      const executionResult = createMockExecutionResult({
        taskId: 'task-1',
        status: 'success',
        output: 'Task completed',
      });
      mockElectronAPI.taskExecute.mockResolvedValue(executionResult);

      const result = await useTaskStore.getState().executeTask('task-1');

      expect(result?.status).toBe('success');
    });
  });

  describe('getTaskHistory', () => {
    it('should get task execution history', async () => {
      const history: TaskExecutionResult[] = [
        createMockExecutionResult({ id: 'exec-1', status: 'success' }),
        createMockExecutionResult({ id: 'exec-2', status: 'error' }),
      ];
      mockElectronAPI.taskGetHistory.mockResolvedValue(history);

      const result = await useTaskStore.getState().getTaskHistory('task-1', 10);

      expect(result.length).toBe(2);
    });
  });

  describe('setActiveTaskId', () => {
    it('should set active task id', () => {
      useTaskStore.getState().setActiveTaskId('task-1');

      expect(useTaskStore.getState().activeTaskId).toBe('task-1');
    });

    it('should clear active task id', () => {
      useTaskStore.setState({ activeTaskId: 'task-1' });
      useTaskStore.getState().setActiveTaskId(null);

      expect(useTaskStore.getState().activeTaskId).toBeNull();
    });
  });

  describe('setStatusFilter', () => {
    it('should set status filter to active', () => {
      useTaskStore.getState().setStatusFilter('active');

      expect(useTaskStore.getState().statusFilter).toBe('active');
    });

    it('should set status filter to all', () => {
      useTaskStore.getState().setStatusFilter('all');

      expect(useTaskStore.getState().statusFilter).toBe('all');
    });

    it('should set status filter to paused', () => {
      useTaskStore.getState().setStatusFilter('paused');

      expect(useTaskStore.getState().statusFilter).toBe('paused');
    });
  });

  describe('setConversationFilter', () => {
    it('should set conversation filter', () => {
      useTaskStore.getState().setConversationFilter('conv-123');

      expect(useTaskStore.getState().conversationFilter).toBe('conv-123');
    });

    it('should clear conversation filter', () => {
      useTaskStore.setState({ conversationFilter: 'conv-123' });
      useTaskStore.getState().setConversationFilter(null);

      expect(useTaskStore.getState().conversationFilter).toBeNull();
    });
  });

  describe('handleTaskExecution', () => {
    it('should update task with execution result', () => {
      const task = createMockTask({
        id: 'task-1',
        executionCount: 5,
        successCount: 4,
        errorCount: 1,
        executionHistory: [],
      });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      const result = createMockExecutionResult({
        taskId: 'task-1',
        status: 'success',
      });

      useTaskStore.getState().handleTaskExecution(result);

      const updatedTask = useTaskStore.getState().tasks['task-1'];
      expect(updatedTask.executionCount).toBe(6);
      expect(updatedTask.successCount).toBe(5);
      expect(updatedTask.executionHistory.length).toBe(1);
    });

    it('should increment error count on error result', () => {
      const task = createMockTask({
        id: 'task-1',
        executionCount: 5,
        successCount: 4,
        errorCount: 1,
      });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      const result = createMockExecutionResult({
        taskId: 'task-1',
        status: 'error',
        error: 'Something went wrong',
      });

      useTaskStore.getState().handleTaskExecution(result);

      const updatedTask = useTaskStore.getState().tasks['task-1'];
      expect(updatedTask.errorCount).toBe(2);
    });
  });

  describe('handleTaskStatusChange', () => {
    it('should update task status to paused', () => {
      const task = createMockTask({ id: 'task-1', status: 'active' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      useTaskStore.getState().handleTaskStatusChange('task-1', 'paused');

      expect(useTaskStore.getState().tasks['task-1'].status).toBe('paused');
    });

    it('should update task to completed status', () => {
      const task = createMockTask({ id: 'task-1', status: 'active' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      useTaskStore.getState().handleTaskStatusChange('task-1', 'completed');

      expect(useTaskStore.getState().tasks['task-1'].status).toBe('completed');
    });

    it('should update task to failed status', () => {
      const task = createMockTask({ id: 'task-1', status: 'active' });
      useTaskStore.setState({ tasks: { 'task-1': task } });

      useTaskStore.getState().handleTaskStatusChange('task-1', 'failed');

      expect(useTaskStore.getState().tasks['task-1'].status).toBe('failed');
    });
  });
});
