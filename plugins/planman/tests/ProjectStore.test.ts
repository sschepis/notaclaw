// =============================================================================
// ProjectStore Tests
// =============================================================================

import { ProjectStore } from '../main/ProjectStore';
import { Project, PlanTask, DEFAULT_PROJECT_SETTINGS } from '../main/types';

// --- Mock Storage ---
function createMockStorage() {
  const data: Record<string, any> = {};
  return {
    get: jest.fn(async (key: string) => data[key] ?? null),
    set: jest.fn(async (key: string, value: any) => { data[key] = value; }),
    _data: data,
  };
}

function createMockIPC() {
  return {
    invoke: jest.fn(async () => null),
    send: jest.fn(),
  };
}

describe('ProjectStore', () => {
  let storage: ReturnType<typeof createMockStorage>;
  let store: ProjectStore;

  beforeEach(() => {
    storage = createMockStorage();
    store = new ProjectStore(storage);
  });

  describe('initialize', () => {
    it('should load the project index from storage', async () => {
      storage._data['planman:index'] = [
        { id: 'p1', name: 'Project 1', status: 'active', createdAt: 1, updatedAt: 1 },
      ];
      await store.initialize();
      const list = await store.listProjects();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Project 1');
    });

    it('should handle empty storage gracefully', async () => {
      await store.initialize();
      const list = await store.listProjects();
      expect(list.length).toBe(0);
    });
  });

  describe('createProject', () => {
    it('should create a project with default settings', () => {
      const project = store.createProject('Test', 'A test project');
      expect(project.name).toBe('Test');
      expect(project.description).toBe('A test project');
      expect(project.status).toBe('planning');
      expect(project.settings).toEqual(DEFAULT_PROJECT_SETTINGS);
      expect(project.plan.tasks).toEqual([]);
      expect(project.id).toBeTruthy();
    });

    it('should convert goals from strings to ProjectGoal objects', () => {
      const project = store.createProject('Test', 'desc', ['Goal 1', 'Goal 2']);
      expect(project.goals.length).toBe(2);
      expect(project.goals[0].description).toBe('Goal 1');
      expect(project.goals[1].description).toBe('Goal 2');
      expect(project.goals[0].priority).toBeGreaterThan(project.goals[1].priority);
    });
  });

  describe('saveProject / loadProject', () => {
    it('should save and reload a project', async () => {
      const project = store.createProject('Test', 'desc');
      await store.saveProject(project);

      // Clear cache to force storage read
      store.invalidate(project.id);

      const loaded = await store.loadProject(project.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('Test');
      expect(loaded!.id).toBe(project.id);
    });

    it('should update the project index on save', async () => {
      const project = store.createProject('Test', 'desc');
      await store.saveProject(project);

      const list = await store.listProjects();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(project.id);
    });

    it('should return from cache on subsequent loads', async () => {
      const project = store.createProject('Test', 'desc');
      await store.saveProject(project);

      const loaded1 = await store.loadProject(project.id);
      const loaded2 = await store.loadProject(project.id);
      // Second load should not call storage.get for the project again
      // (only initial save triggers a storage.set, not additional get)
      expect(loaded1).toBe(loaded2);
    });
  });

  describe('deleteProject', () => {
    it('should remove a project from storage and index', async () => {
      const project = store.createProject('Test', 'desc');
      await store.saveProject(project);

      const deleted = await store.deleteProject(project.id);
      expect(deleted).toBe(true);

      const list = await store.listProjects();
      expect(list.length).toBe(0);
    });
  });

  describe('listProjects', () => {
    it('should filter by status', async () => {
      const p1 = store.createProject('Active', 'desc');
      p1.status = 'active';
      const p2 = store.createProject('Planning', 'desc');

      await store.saveProject(p1);
      await store.saveProject(p2);

      const active = await store.listProjects('active');
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('Active');
    });
  });

  describe('searchTasks', () => {
    it('should find tasks by title', async () => {
      const project = store.createProject('Test', 'desc');
      project.plan.tasks = [
        makeTask({ id: 't1', title: 'Implement auth', description: 'Add JWT auth' }),
        makeTask({ id: 't2', title: 'Setup database', description: 'Configure postgres' }),
      ];
      await store.saveProject(project);

      const results = store.searchTasks('auth');
      expect(results.length).toBe(1);
      expect(results[0].task.title).toBe('Implement auth');
    });

    it('should find tasks by description', async () => {
      const project = store.createProject('Test', 'desc');
      project.plan.tasks = [
        makeTask({ id: 't1', title: 'Task 1', description: 'Setup postgres database' }),
      ];
      await store.saveProject(project);

      const results = store.searchTasks('postgres');
      expect(results.length).toBe(1);
    });

    it('should find tasks by tags', async () => {
      const project = store.createProject('Test', 'desc');
      project.plan.tasks = [
        makeTask({ id: 't1', title: 'Task 1', tags: ['backend', 'api'] }),
      ];
      await store.saveProject(project);

      const results = store.searchTasks('backend');
      expect(results.length).toBe(1);
    });
  });

  describe('settings', () => {
    it('should return defaults when no settings stored', async () => {
      const settings = await store.getSettings();
      expect(settings).toEqual(DEFAULT_PROJECT_SETTINGS);
    });

    it('should save and load settings', async () => {
      const custom = { ...DEFAULT_PROJECT_SETTINGS, maxConcurrentTasks: 5 };
      await store.saveSettings(custom);

      const loaded = await store.getSettings();
      expect(loaded.maxConcurrentTasks).toBe(5);
    });
  });
});

// =============================================================================
// Helpers
// =============================================================================

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: overrides.id || 'test-id',
    title: overrides.title || 'Test Task',
    description: overrides.description || 'A test task',
    status: 'pending',
    priority: 'medium',
    estimatedEffort: '1h',
    dependsOn: [],
    blockedBy: [],
    tags: overrides.tags || [],
    acceptanceCriteria: [],
    notes: [],
    subtasks: [],
    ...overrides,
  };
}
