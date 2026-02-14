// =============================================================================
// Types & Utility Functions Tests
// =============================================================================

import {
  generateId,
  computeCompletionPercentage,
  getReadyTasks,
  detectCycles,
  computeCriticalPath,
  createEmptyPlan,
  PlanTask,
  TaskStatus,
  DEFAULT_PROJECT_SETTINGS,
} from '../main/types';

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('should return a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('computeCompletionPercentage', () => {
  it('should return 0 for empty task list', () => {
    expect(computeCompletionPercentage([])).toBe(0);
  });

  it('should return 100 when all tasks are done', () => {
    const tasks = [
      makeTask({ status: 'done' }),
      makeTask({ status: 'done' }),
    ];
    expect(computeCompletionPercentage(tasks)).toBe(100);
  });

  it('should return correct percentage', () => {
    const tasks = [
      makeTask({ status: 'done' }),
      makeTask({ status: 'in_progress' }),
      makeTask({ status: 'pending' }),
      makeTask({ status: 'done' }),
    ];
    expect(computeCompletionPercentage(tasks)).toBe(50);
  });

  it('should return 0 when no tasks are done', () => {
    const tasks = [
      makeTask({ status: 'pending' }),
      makeTask({ status: 'in_progress' }),
    ];
    expect(computeCompletionPercentage(tasks)).toBe(0);
  });
});

describe('getReadyTasks', () => {
  it('should return tasks with no dependencies as ready', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'pending', dependsOn: [] }),
      makeTask({ id: 'b', status: 'pending', dependsOn: [] }),
    ];
    const ready = getReadyTasks(tasks);
    expect(ready.length).toBe(2);
  });

  it('should return tasks whose deps are all done', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done', dependsOn: [] }),
      makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
      makeTask({ id: 'c', status: 'pending', dependsOn: ['a', 'b'] }),
    ];
    const ready = getReadyTasks(tasks);
    expect(ready.map(t => t.id)).toEqual(['b']);
  });

  it('should not return done or in_progress tasks', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done', dependsOn: [] }),
      makeTask({ id: 'b', status: 'in_progress', dependsOn: [] }),
      makeTask({ id: 'c', status: 'ready', dependsOn: [] }),
    ];
    const ready = getReadyTasks(tasks);
    expect(ready.map(t => t.id)).toEqual(['c']);
  });

  it('should handle tasks blocked by incomplete deps', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'in_progress', dependsOn: [] }),
      makeTask({ id: 'b', status: 'pending', dependsOn: ['a'] }),
    ];
    const ready = getReadyTasks(tasks);
    expect(ready.length).toBe(0);
  });
});

describe('detectCycles', () => {
  it('should return empty array for acyclic graph', () => {
    const tasks = [
      makeTask({ id: 'a', dependsOn: [] }),
      makeTask({ id: 'b', dependsOn: ['a'] }),
      makeTask({ id: 'c', dependsOn: ['b'] }),
    ];
    expect(detectCycles(tasks)).toEqual([]);
  });

  it('should detect a simple cycle', () => {
    const tasks = [
      makeTask({ id: 'a', dependsOn: ['b'] }),
      makeTask({ id: 'b', dependsOn: ['a'] }),
    ];
    const cycles = detectCycles(tasks);
    expect(cycles.length).toBe(2);
    expect(cycles).toContain('a');
    expect(cycles).toContain('b');
  });

  it('should detect a longer cycle', () => {
    const tasks = [
      makeTask({ id: 'a', dependsOn: ['c'] }),
      makeTask({ id: 'b', dependsOn: ['a'] }),
      makeTask({ id: 'c', dependsOn: ['b'] }),
    ];
    const cycles = detectCycles(tasks);
    expect(cycles.length).toBe(3);
  });

  it('should handle mixed cyclic and acyclic nodes', () => {
    const tasks = [
      makeTask({ id: 'a', dependsOn: [] }),
      makeTask({ id: 'b', dependsOn: ['a'] }),
      makeTask({ id: 'c', dependsOn: ['d'] }),
      makeTask({ id: 'd', dependsOn: ['c'] }),
    ];
    const cycles = detectCycles(tasks);
    expect(cycles).toContain('c');
    expect(cycles).toContain('d');
    expect(cycles).not.toContain('a');
    expect(cycles).not.toContain('b');
  });
});

describe('computeCriticalPath', () => {
  it('should return empty array for no tasks', () => {
    expect(computeCriticalPath([])).toEqual([]);
  });

  it('should return single task for one-task plan', () => {
    const tasks = [makeTask({ id: 'a', dependsOn: [] })];
    expect(computeCriticalPath(tasks)).toEqual(['a']);
  });

  it('should find the longest dependency chain', () => {
    const tasks = [
      makeTask({ id: 'a', dependsOn: [] }),
      makeTask({ id: 'b', dependsOn: ['a'] }),
      makeTask({ id: 'c', dependsOn: ['b'] }),
      makeTask({ id: 'd', dependsOn: ['a'] }), // Shorter branch
    ];
    const path = computeCriticalPath(tasks);
    expect(path).toEqual(['a', 'b', 'c']);
  });
});

describe('createEmptyPlan', () => {
  it('should create a plan with the given projectId', () => {
    const plan = createEmptyPlan('proj-123');
    expect(plan.projectId).toBe('proj-123');
    expect(plan.version).toBe(0);
    expect(plan.tasks).toEqual([]);
    expect(plan.dependencies).toEqual([]);
    expect(plan.criticalPath).toEqual([]);
    expect(plan.generatedBy).toBe('user');
  });
});

describe('DEFAULT_PROJECT_SETTINGS', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_PROJECT_SETTINGS.autoAssign).toBe(true);
    expect(DEFAULT_PROJECT_SETTINGS.autoReplan).toBe(false);
    expect(DEFAULT_PROJECT_SETTINGS.maxConcurrentTasks).toBe(3);
    expect(DEFAULT_PROJECT_SETTINGS.checkInterval).toBe('*/30 * * * *');
  });
});

// =============================================================================
// Helpers
// =============================================================================

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: overrides.id || generateId(),
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A test task',
    status: overrides.status || 'pending',
    priority: overrides.priority || 'medium',
    estimatedEffort: overrides.estimatedEffort || '1h',
    dependsOn: overrides.dependsOn || [],
    blockedBy: overrides.blockedBy || [],
    tags: overrides.tags || [],
    acceptanceCriteria: overrides.acceptanceCriteria || [],
    notes: overrides.notes || [],
    subtasks: overrides.subtasks || [],
    ...overrides,
  };
}
