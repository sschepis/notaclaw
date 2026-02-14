// =============================================================================
// PlanEngine Tests
// =============================================================================

import { PlanEngine } from '../main/PlanEngine';
import { ProjectGoal, PlanTask, Plan, createEmptyPlan } from '../main/types';

function createMockAI() {
  return {
    complete: jest.fn(),
  };
}

const sampleDecomposeResult = {
  milestones: [
    {
      name: 'Foundation',
      tasks: [
        {
          title: 'Set up repo',
          description: 'Create project skeleton',
          estimatedEffort: '2h',
          priority: 'high',
          tags: ['setup'],
          acceptanceCriteria: ['Repo created'],
          dependsOn: [],
        },
        {
          title: 'Configure CI',
          description: 'Set up continuous integration',
          estimatedEffort: '1h',
          priority: 'medium',
          tags: ['ci'],
          acceptanceCriteria: ['CI pipeline runs'],
          dependsOn: ['Set up repo'],
        },
      ],
    },
    {
      name: 'Implementation',
      tasks: [
        {
          title: 'Build core module',
          description: 'Implement the main logic',
          estimatedEffort: '8h',
          priority: 'critical',
          tags: ['core'],
          acceptanceCriteria: ['Module passes tests'],
          dependsOn: ['Configure CI'],
        },
      ],
    },
  ],
};

describe('PlanEngine', () => {
  let ai: ReturnType<typeof createMockAI>;
  let engine: PlanEngine;

  beforeEach(() => {
    ai = createMockAI();
    engine = new PlanEngine(ai);
  });

  describe('decompose', () => {
    it('should decompose goals into a plan with tasks', async () => {
      // Step 1: analysis
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          requirements: ['Node.js runtime'],
          risks: [],
          skillDomains: ['backend'],
          constraints: [],
        }),
      });
      // Step 2: decompose
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify(sampleDecomposeResult),
      });
      // Step 3: validation
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          issues: [],
          confidence: 0.9,
        }),
      });

      const goals: ProjectGoal[] = [
        { id: 'g1', description: 'Build a web app', priority: 0.9, measureOfSuccess: 'App deployed' },
      ];

      const plan = await engine.decompose('TestProject', 'A test project', goals);

      expect(plan).toBeDefined();
      expect(plan.tasks.length).toBe(3);
      expect(plan.tasks[0].title).toBe('Set up repo');
      expect(plan.tasks[1].title).toBe('Configure CI');
      expect(plan.tasks[2].title).toBe('Build core module');
    });

    it('should resolve title-based dependencies to task IDs', async () => {
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({ requirements: [], risks: [], skillDomains: [], constraints: [] }),
      });
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify(sampleDecomposeResult),
      });
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({ issues: [], confidence: 1.0 }),
      });

      const goals: ProjectGoal[] = [
        { id: 'g1', description: 'Build something', priority: 0.5, measureOfSuccess: 'Builds' },
      ];

      const plan = await engine.decompose('TestProject', 'Test', goals);

      // "Configure CI" depends on "Set up repo" by title
      const configTask = plan.tasks.find(t => t.title === 'Configure CI');
      const setupTask = plan.tasks.find(t => t.title === 'Set up repo');
      expect(configTask).toBeDefined();
      expect(setupTask).toBeDefined();
      expect(configTask!.dependsOn).toContain(setupTask!.id);
    });

    it('should mark tasks with no dependencies as ready', async () => {
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({ requirements: [], risks: [], skillDomains: [], constraints: [] }),
      });
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify(sampleDecomposeResult),
      });
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({ issues: [], confidence: 1.0 }),
      });

      const goals: ProjectGoal[] = [
        { id: 'g1', description: 'Build something', priority: 0.5, measureOfSuccess: 'Works' },
      ];

      const plan = await engine.decompose('TestProject', 'Test', goals);
      const setupTask = plan.tasks.find(t => t.title === 'Set up repo');
      expect(setupTask!.status).toBe('ready');
    });
  });

  describe('estimate', () => {
    it('should request AI estimation for tasks', async () => {
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          estimates: [
            { id: 't1', estimatedEffort: '4h' },
          ],
        }),
      });

      const tasks: PlanTask[] = [
        {
          id: 't1', title: 'Task 1', description: 'Do something',
          status: 'pending', priority: 'medium', estimatedEffort: '',
          dependsOn: [], blockedBy: [], tags: [],
          acceptanceCriteria: [], notes: [], subtasks: [],
        },
      ];

      const estimated = await engine.estimate(tasks);
      expect(estimated.length).toBe(1);
      expect(ai.complete).toHaveBeenCalled();
    });
  });

  describe('prioritize', () => {
    it('should request AI prioritization', async () => {
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          priorities: [{ id: 't2', priority: 'critical' }, { id: 't1', priority: 'low' }],
        }),
      });

      const tasks: PlanTask[] = [
        {
          id: 't1', title: 'Task 1', description: 'Low priority task',
          status: 'pending', priority: 'low', estimatedEffort: '1h',
          dependsOn: [], blockedBy: [], tags: [],
          acceptanceCriteria: [], notes: [], subtasks: [],
        },
        {
          id: 't2', title: 'Task 2', description: 'High priority task',
          status: 'pending', priority: 'high', estimatedEffort: '2h',
          dependsOn: [], blockedBy: [], tags: [],
          acceptanceCriteria: [], notes: [], subtasks: [],
        },
      ];

      const result = await engine.prioritize(tasks, 'Focus on backend first');
      expect(ai.complete).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('replan', () => {
    it('should preserve in-progress tasks during replan', async () => {
      // replan calls aiComplete once
      ai.complete.mockResolvedValueOnce({
        content: JSON.stringify({
          tasks: [
            {
              title: 'New Task',
              description: 'A replacement task',
              estimatedEffort: '3h',
              priority: 'high',
              tags: [],
              acceptanceCriteria: ['Done'],
              dependsOn: [],
            },
          ],
          dependencies: [],
        }),
      });

      const existingPlan = createEmptyPlan('proj-1');
      existingPlan.tasks = [
        {
          id: 't1', title: 'In Progress Task', description: 'Being worked on',
          status: 'in_progress', priority: 'medium', estimatedEffort: '2h',
          dependsOn: [], blockedBy: [], tags: [],
          acceptanceCriteria: [], notes: [], subtasks: [],
          assignedAgentId: 'agent-1',
        },
        {
          id: 't2', title: 'Pending Task', description: 'Not started',
          status: 'pending', priority: 'low', estimatedEffort: '1h',
          dependsOn: [], blockedBy: [], tags: [],
          acceptanceCriteria: [], notes: [], subtasks: [],
        },
      ];

      const goals: ProjectGoal[] = [
        { id: 'g1', description: 'Finish project', priority: 0.9, measureOfSuccess: 'Project done' },
      ];

      const newPlan = await engine.replan(existingPlan, 'Need to change approach', goals);

      // In-progress task should be preserved
      const preserved = newPlan.tasks.find(t => t.title === 'In Progress Task');
      expect(preserved).toBeDefined();
      expect(preserved!.status).toBe('in_progress');

      // Pending task should be replaced
      const oldPending = newPlan.tasks.find(t => t.title === 'Pending Task');
      expect(oldPending).toBeUndefined();

      // New task should be added
      const newTask = newPlan.tasks.find(t => t.title === 'New Task');
      expect(newTask).toBeDefined();
    });
  });

  describe('JSON parsing resilience', () => {
    it('should handle markdown-wrapped JSON responses', async () => {
      ai.complete.mockResolvedValueOnce({
        content: '```json\n{"requirements":[],"risks":[],"skillDomains":[],"constraints":[]}\n```',
      });
      ai.complete.mockResolvedValueOnce({
        content: '```json\n' + JSON.stringify(sampleDecomposeResult) + '\n```',
      });
      ai.complete.mockResolvedValueOnce({
        content: '```json\n{"issues":[],"confidence":1.0}\n```',
      });

      const goals: ProjectGoal[] = [
        { id: 'g1', description: 'Test', priority: 0.5, measureOfSuccess: 'Tests pass' },
      ];

      const plan = await engine.decompose('TestProject', 'Test', goals);
      expect(plan.tasks.length).toBe(3);
    });
  });
});
