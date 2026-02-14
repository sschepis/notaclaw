// =============================================================================
// ExecutionOrchestrator Tests
// =============================================================================

import { ExecutionOrchestrator } from '../main/ExecutionOrchestrator';
import { Project, PlanTask, Plan, DEFAULT_PROJECT_SETTINGS, generateId, createEmptyPlan } from '../main/types';

function createMockIPC() {
  return {
    invoke: jest.fn(async (channel: string, data?: any) => {
      if (channel === 'resonant:agent:startTask') {
        return { taskId: `agent-task-${Date.now()}` };
      }
      if (channel === 'resonant:agent:list') {
        return [{ id: 'agent-1', name: 'Test Agent' }];
      }
      return null;
    }),
    send: jest.fn(),
  };
}

function makeProject(tasks: PlanTask[]): Project {
  const plan = createEmptyPlan('proj-1');
  plan.tasks = tasks;
  return {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memoryFieldId: 'planman:project:proj-1',
    conversationId: 'conv-1',
    goals: [],
    milestones: [],
    plan,
    settings: { ...DEFAULT_PROJECT_SETTINGS, defaultAgentIds: ['agent-1'] },
  };
}

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: overrides.id || generateId(),
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A test task',
    status: overrides.status || 'ready',
    priority: 'medium',
    estimatedEffort: '1h',
    dependsOn: overrides.dependsOn || [],
    blockedBy: [],
    tags: [],
    acceptanceCriteria: ['Complete the task'],
    notes: [],
    subtasks: [],
    ...overrides,
  };
}

describe('ExecutionOrchestrator', () => {
  let ipc: ReturnType<typeof createMockIPC>;
  let orchestrator: ExecutionOrchestrator;

  beforeEach(() => {
    ipc = createMockIPC();
    orchestrator = new ExecutionOrchestrator(ipc);
  });

  describe('dispatchReadyTasks', () => {
    it('should dispatch ready tasks', async () => {
      const project = makeProject([
        makeTask({ id: 't1', status: 'ready' }),
        makeTask({ id: 't2', status: 'ready' }),
      ]);

      const dispatched = await orchestrator.dispatchReadyTasks(project);
      expect(dispatched).toBe(2);
      expect(ipc.invoke).toHaveBeenCalledWith('resonant:agent:startTask', expect.any(Object));
    });

    it('should not dispatch non-ready tasks', async () => {
      const project = makeProject([
        makeTask({ id: 't1', status: 'done' }),
        makeTask({ id: 't2', status: 'in_progress' }),
        makeTask({ id: 't3', status: 'pending', dependsOn: ['t2'] }),
      ]);

      const dispatched = await orchestrator.dispatchReadyTasks(project);
      expect(dispatched).toBe(0);
    });

    it('should respect concurrency limits', async () => {
      orchestrator.setMaxConcurrent(1);
      const project = makeProject([
        makeTask({ id: 't1', status: 'ready' }),
        makeTask({ id: 't2', status: 'ready' }),
      ]);

      const dispatched = await orchestrator.dispatchReadyTasks(project);
      expect(dispatched).toBe(1);
    });

    it('should update task status to in_progress on dispatch', async () => {
      const task = makeTask({ id: 't1', status: 'ready' });
      const project = makeProject([task]);

      await orchestrator.dispatchReadyTasks(project);
      expect(task.status).toBe('in_progress');
      expect(task.startedAt).toBeDefined();
      expect(task.assignedAgentId).toBe('agent-1');
    });
  });

  describe('handleAgentTaskUpdate', () => {
    it('should handle task completion', async () => {
      const task = makeTask({ id: 't1', status: 'ready' });
      const project = makeProject([task]);

      let statusChanged = false;
      orchestrator.setStatusCallback(async (projectId, taskId, oldStatus, newStatus, result) => {
        statusChanged = true;
        expect(newStatus).toBe('done');
      });

      // Dispatch the task first
      await orchestrator.dispatchReadyTasks(project);
      const agentTaskId = task.assignedAgentTaskId!;

      // Simulate completion
      await orchestrator.handleAgentTaskUpdate({
        taskId: agentTaskId,
        agentId: 'agent-1',
        status: 'completed',
        result: 'Task done successfully',
      });

      expect(statusChanged).toBe(true);
    });

    it('should handle task failure', async () => {
      const task = makeTask({ id: 't1', status: 'ready' });
      const project = makeProject([task]);

      let newStatus = '';
      orchestrator.setStatusCallback(async (projectId, taskId, old, status, result, error) => {
        newStatus = status;
      });

      await orchestrator.dispatchReadyTasks(project);
      const agentTaskId = task.assignedAgentTaskId!;

      await orchestrator.handleAgentTaskUpdate({
        taskId: agentTaskId,
        agentId: 'agent-1',
        status: 'error',
        error: 'Something failed',
      });

      expect(newStatus).toBe('blocked');
    });

    it('should ignore events for untracked tasks', async () => {
      let callbackCalled = false;
      orchestrator.setStatusCallback(async () => { callbackCalled = true; });

      await orchestrator.handleAgentTaskUpdate({
        taskId: 'unknown-task',
        agentId: 'agent-1',
        status: 'completed',
      });

      expect(callbackCalled).toBe(false);
    });
  });

  describe('getActiveTaskCount', () => {
    it('should track active tasks per project', async () => {
      const project = makeProject([
        makeTask({ id: 't1', status: 'ready' }),
        makeTask({ id: 't2', status: 'ready' }),
      ]);

      expect(orchestrator.getActiveTaskCount('proj-1')).toBe(0);
      await orchestrator.dispatchReadyTasks(project);
      expect(orchestrator.getActiveTaskCount('proj-1')).toBe(2);
    });
  });
});
