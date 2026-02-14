// =============================================================================
// ProgressMonitor Tests
// =============================================================================

import { ProgressMonitor } from '../main/ProgressMonitor';
import { Project, PlanTask, DEFAULT_PROJECT_SETTINGS, createEmptyPlan, generateId } from '../main/types';

function createMockAI() {
  return {
    complete: jest.fn(async () => ({
      content: JSON.stringify({
        findings: [],
        recommendations: ['All looks good'],
      }),
    })),
  };
}

function createMockIPC() {
  return {
    invoke: jest.fn(async (channel: string) => {
      if (channel === 'scheduler:createTask') return { taskId: 'sched-1' };
      if (channel === 'scheduler:deleteTask') return { success: true };
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
    milestones: [
      { id: 'm1', name: 'Milestone 1', taskIds: ['t1', 't2'], status: 'pending', completionPercentage: 0 },
    ],
    plan,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  };
}

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: overrides.id || generateId(),
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A test task',
    status: overrides.status || 'pending',
    priority: 'medium',
    estimatedEffort: overrides.estimatedEffort || '1h',
    dependsOn: [],
    blockedBy: [],
    tags: [],
    acceptanceCriteria: [],
    notes: overrides.notes || [],
    subtasks: [],
    startedAt: overrides.startedAt,
    ...overrides,
  };
}

describe('ProgressMonitor', () => {
  let ai: ReturnType<typeof createMockAI>;
  let ipc: ReturnType<typeof createMockIPC>;
  let monitor: ProgressMonitor;

  beforeEach(() => {
    ai = createMockAI();
    ipc = createMockIPC();
    monitor = new ProgressMonitor(ai, ipc, { ...DEFAULT_PROJECT_SETTINGS });
  });

  describe('startMonitoring / stopMonitoring', () => {
    it('should register a scheduled task on start', async () => {
      const project = makeProject([]);
      await monitor.startMonitoring(project);
      expect(ipc.invoke).toHaveBeenCalledWith('scheduler:createTask', expect.any(Object));
    });

    it('should delete the scheduled task on stop', async () => {
      const project = makeProject([]);
      await monitor.startMonitoring(project);
      await monitor.stopMonitoring(project.id);
      expect(ipc.invoke).toHaveBeenCalledWith('scheduler:deleteTask', expect.any(Object));
    });

    it('should not create duplicate monitors', async () => {
      const project = makeProject([]);
      await monitor.startMonitoring(project);
      await monitor.startMonitoring(project);
      // Only one createTask call
      const createCalls = ipc.invoke.mock.calls.filter(
        (c: any[]) => c[0] === 'scheduler:createTask'
      );
      expect(createCalls.length).toBe(1);
    });
  });

  describe('runHealthCheck', () => {
    it('should return a health report', async () => {
      const project = makeProject([
        makeTask({ id: 't1', status: 'done' }),
        makeTask({ id: 't2', status: 'pending' }),
      ]);

      const report = await monitor.runHealthCheck(project);
      expect(report.projectId).toBe('proj-1');
      expect(report.completionPercentage).toBe(50);
      expect(report.overallHealth).toBeDefined();
    });

    it('should detect stale tasks', async () => {
      const twoHoursAgo = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago
      const project = makeProject([
        makeTask({
          id: 't1',
          status: 'in_progress',
          startedAt: twoHoursAgo,
          estimatedEffort: '1h', // 1 hour estimate, but 3 hours elapsed = stale
        }),
      ]);

      const report = await monitor.runHealthCheck(project);
      const staleFinding = report.findings.find(f => f.type === 'stale_task');
      expect(staleFinding).toBeDefined();
      expect(staleFinding?.severity).toBe('warning');
    });

    it('should detect blocked tasks without resolution', async () => {
      const project = makeProject([
        makeTask({
          id: 't1',
          status: 'blocked',
          notes: [
            { author: 'ai', content: 'Something broke', timestamp: Date.now(), type: 'blocker' },
          ],
        }),
      ]);

      const report = await monitor.runHealthCheck(project);
      const blockerFinding = report.findings.find(f => f.type === 'blocker');
      expect(blockerFinding).toBeDefined();
      expect(blockerFinding?.severity).toBe('critical');
    });

    it('should broadcast health report via IPC', async () => {
      const project = makeProject([makeTask({ id: 't1', status: 'pending' })]);
      await monitor.runHealthCheck(project);
      expect(ipc.send).toHaveBeenCalledWith('planman:project:healthUpdate', expect.any(Object));
    });

    it('should call health check callback', async () => {
      let callbackReport: any = null;
      monitor.setHealthCheckCallback(async (report) => {
        callbackReport = report;
      });

      const project = makeProject([makeTask({ id: 't1', status: 'done' })]);
      await monitor.runHealthCheck(project);
      expect(callbackReport).not.toBeNull();
      expect(callbackReport.projectId).toBe('proj-1');
    });
  });

  describe('milestone checks', () => {
    it('should detect milestone completion', async () => {
      const project = makeProject([
        makeTask({ id: 't1', status: 'done' }),
        makeTask({ id: 't2', status: 'done' }),
      ]);

      await monitor.runHealthCheck(project);
      expect(project.milestones[0].status).toBe('completed');
      expect(project.milestones[0].completionPercentage).toBe(100);
      expect(ipc.send).toHaveBeenCalledWith('planman:milestone:reached', expect.objectContaining({
        projectId: 'proj-1',
        milestoneId: 'm1',
      }));
    });

    it('should update milestone progress', async () => {
      const project = makeProject([
        makeTask({ id: 't1', status: 'done' }),
        makeTask({ id: 't2', status: 'in_progress' }),
      ]);

      await monitor.runHealthCheck(project);
      expect(project.milestones[0].completionPercentage).toBe(50);
      expect(project.milestones[0].status).toBe('in_progress');
    });
  });

  describe('auto-replan', () => {
    it('should trigger replan when critical issues and autoReplan is on', async () => {
      // Mock AI to return critical findings
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          findings: [
            { type: 'blocker', severity: 'critical', message: 'Major blocker', suggestedAction: 'Replan' },
          ],
          recommendations: ['Re-plan the project'],
        }),
      });

      let replanCalled = false;
      monitor.updateSettings({ ...DEFAULT_PROJECT_SETTINGS, autoReplan: true });
      monitor.setReplanCallback(async () => { replanCalled = true; });

      const project = makeProject([
        makeTask({
          id: 't1',
          status: 'blocked',
          notes: [{ author: 'ai', content: 'Blocked', timestamp: Date.now(), type: 'blocker' }],
        }),
      ]);

      await monitor.runHealthCheck(project);
      expect(replanCalled).toBe(true);
    });
  });

  describe('stopAll', () => {
    it('should stop all monitors', async () => {
      const p1 = makeProject([]);
      p1.id = 'proj-1';
      const p2 = makeProject([]);
      p2.id = 'proj-2';

      await monitor.startMonitoring(p1);
      await monitor.startMonitoring(p2);
      await monitor.stopAll();

      const deleteCalls = ipc.invoke.mock.calls.filter(
        (c: any[]) => c[0] === 'scheduler:deleteTask'
      );
      expect(deleteCalls.length).toBe(2);
    });
  });
});
