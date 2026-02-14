// =============================================================================
// PlanEngine — AI-Driven Planning
// =============================================================================
// Decomposes project goals into structured plans using AI. Uses multi-step
// prompt chains (analyze → decompose → sequence → validate). See DESIGN.md §PlanEngine.

import {
  Plan,
  PlanTask,
  Milestone,
  Dependency,
  ProjectGoal,
  TaskPriority,
  AICompleteParams,
  AICompleteResult,
  generateId,
  detectCycles,
  computeCriticalPath,
} from './types';

const LOG_PREFIX = '[planman:engine]';

/** AI completion adapter matching PluginContext.ai */
interface AIAdapter {
  complete: (params: AICompleteParams) => Promise<AICompleteResult>;
}

/** Raw AI-generated plan output before normalization. */
interface RawDecomposition {
  milestones?: Array<{
    name: string;
    tasks: Array<{
      title: string;
      description: string;
      priority?: string;
      estimatedEffort?: string;
      dependsOn?: string[];
      tags?: string[];
      acceptanceCriteria?: string[];
    }>;
  }>;
  tasks?: Array<{
    id?: string;
    title: string;
    description: string;
    priority?: string;
    estimatedEffort?: string;
    dependsOn?: string[];
    tags?: string[];
    acceptanceCriteria?: string[];
  }>;
  criticalPath?: string[];
  warnings?: string[];
  confidence?: number;
}

export class PlanEngine {
  private ai: AIAdapter;

  constructor(ai: AIAdapter) {
    this.ai = ai;
  }

  // ---------------------------------------------------------------------------
  // Main API
  // ---------------------------------------------------------------------------

  /**
   * Decompose project goals into a structured Plan.
   * Runs the multi-step planning prompt chain.
   */
  async decompose(
    projectName: string,
    projectDescription: string,
    goals: ProjectGoal[],
    constraints?: string
  ): Promise<Plan> {
    console.log(LOG_PREFIX, `Decomposing project "${projectName}" with ${goals.length} goals`);

    // Step 1: Analyze
    const analysis = await this.analyze(projectName, projectDescription, goals);

    // Step 2: Decompose into milestones and tasks
    const rawPlan = await this.decomposeStep(
      projectName,
      projectDescription,
      goals,
      analysis,
      constraints
    );

    // Step 3: Build structured plan
    const plan = this.buildPlan(rawPlan, projectName);

    // Step 4: Validate
    const validated = await this.validate(plan, goals);

    console.log(
      LOG_PREFIX,
      `Plan generated: ${validated.tasks.length} tasks, ${validated.criticalPath.length} in critical path`
    );

    return validated;
  }

  /**
   * AI-estimate effort for a list of tasks.
   */
  async estimate(tasks: PlanTask[]): Promise<PlanTask[]> {
    const taskSummaries = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      dependsOn: t.dependsOn,
    }));

    const result = await this.aiComplete(
      `You are an expert project estimator. For each task, provide a realistic effort estimate.
Consider dependencies, complexity, and typical development velocity.
Return JSON: { "estimates": [{ "id": "task_id", "estimatedEffort": "Xh" or "Xd" }] }`,
      `Estimate effort for these tasks:\n${JSON.stringify(taskSummaries, null, 2)}`
    );

    try {
      const parsed = JSON.parse(result);
      if (parsed.estimates && Array.isArray(parsed.estimates)) {
        for (const est of parsed.estimates) {
          const task = tasks.find(t => t.id === est.id);
          if (task) {
            task.estimatedEffort = est.estimatedEffort || task.estimatedEffort;
          }
        }
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Effort estimation parse failed:', err);
    }

    return tasks;
  }

  /**
   * Prioritize tasks considering dependencies and critical path.
   */
  async prioritize(tasks: PlanTask[], constraints?: string): Promise<PlanTask[]> {
    const taskSummaries = tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dependsOn: t.dependsOn,
      estimatedEffort: t.estimatedEffort,
    }));

    const constraintText = constraints ? `\nConstraints: ${constraints}` : '';

    const result = await this.aiComplete(
      `You are a project prioritization specialist.
Reorder and re-prioritize tasks based on dependencies, critical path analysis, and value delivery.
Return JSON: { "priorities": [{ "id": "task_id", "priority": "critical|high|medium|low" }] }`,
      `Prioritize these tasks:${constraintText}\n${JSON.stringify(taskSummaries, null, 2)}`
    );

    try {
      const parsed = JSON.parse(result);
      if (parsed.priorities && Array.isArray(parsed.priorities)) {
        for (const pri of parsed.priorities) {
          const task = tasks.find(t => t.id === pri.id);
          if (task && isValidPriority(pri.priority)) {
            task.priority = pri.priority;
          }
        }
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Prioritization parse failed:', err);
    }

    return tasks;
  }

  /**
   * Re-plan sections of a project affected by blockers.
   * Only modifies tasks with status 'pending' or 'ready'.
   */
  async replan(
    plan: Plan,
    blockerInfo: string,
    goals: ProjectGoal[]
  ): Promise<Plan> {
    console.log(LOG_PREFIX, `Re-planning due to: ${blockerInfo}`);

    const currentState = {
      totalTasks: plan.tasks.length,
      completedTasks: plan.tasks.filter(t => t.status === 'done').length,
      blockedTasks: plan.tasks.filter(t => t.status === 'blocked').map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
      })),
      pendingTasks: plan.tasks.filter(t => t.status === 'pending' || t.status === 'ready').map(t => ({
        id: t.id,
        title: t.title,
        dependsOn: t.dependsOn,
      })),
    };

    const result = await this.aiComplete(
      `You are a project recovery specialist. A project has encountered blockers.
Analyze the situation and suggest revised tasks for the pending/ready items.
Do NOT modify completed or in-progress tasks.
Return JSON matching the Plan structure: { "tasks": [...], "dependencies": [...] }`,
      `Blocker: ${blockerInfo}\n\nCurrent state:\n${JSON.stringify(currentState, null, 2)}\n\nGoals: ${goals.map(g => g.description).join('; ')}`
    );

    try {
      const parsed = JSON.parse(result);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        // Replace only pending/ready tasks, keep everything else
        const preservedTasks = plan.tasks.filter(
          t => t.status !== 'pending' && t.status !== 'ready'
        );
        const newTasks = this.normalizeTasks(parsed.tasks);
        plan.tasks = [...preservedTasks, ...newTasks];
        plan.version += 1;
        plan.generatedAt = Date.now();
        plan.criticalPath = computeCriticalPath(plan.tasks);
      }
    } catch (err) {
      console.error(LOG_PREFIX, 'Re-plan parse failed:', err);
    }

    return plan;
  }

  /**
   * Suggest agent assignments based on task requirements and agent capabilities.
   */
  async suggestAssignments(
    tasks: PlanTask[],
    agentSummaries: Array<{ id: string; name: string; template: string; capabilities: string[] }>
  ): Promise<Array<{ taskId: string; agentId: string; reason: string }>> {
    const result = await this.aiComplete(
      `You are a resource allocation specialist.
Match tasks to the most suitable agents based on their capabilities and the task requirements.
Return JSON: { "assignments": [{ "taskId": "...", "agentId": "...", "reason": "..." }] }`,
      `Tasks:\n${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, tags: t.tags, description: t.description })), null, 2)}\n\nAgents:\n${JSON.stringify(agentSummaries, null, 2)}`
    );

    try {
      const parsed = JSON.parse(result);
      if (parsed.assignments && Array.isArray(parsed.assignments)) {
        return parsed.assignments;
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Assignment suggestion parse failed:', err);
    }

    return [];
  }

  // ---------------------------------------------------------------------------
  // Internal Steps
  // ---------------------------------------------------------------------------

  private async analyze(
    name: string,
    description: string,
    goals: ProjectGoal[]
  ): Promise<string> {
    const goalsText = goals.map((g, i) => `${i + 1}. ${g.description} (priority: ${g.priority})`).join('\n');

    return this.aiComplete(
      `You are a senior technical project manager. Analyze a project and identify implicit requirements, technical risks, skill domains needed, and constraints.
Return JSON: {
  "requirements": ["string"],
  "risks": [{"description": "string", "severity": "high|medium|low", "mitigation": "string"}],
  "skillDomains": ["string"],
  "constraints": ["string"]
}`,
      `Analyze this project:\nName: ${name}\nDescription: ${description}\nGoals:\n${goalsText}`
    );
  }

  private async decomposeStep(
    name: string,
    description: string,
    goals: ProjectGoal[],
    analysis: string,
    constraints?: string
  ): Promise<RawDecomposition> {
    const constraintText = constraints ? `\nAdditional constraints: ${constraints}` : '';
    const goalsText = goals.map((g, i) => `${i + 1}. ${g.description}`).join('\n');

    const result = await this.aiComplete(
      `You are a project decomposition specialist. Break the project into milestones and tasks.
Each task MUST have:
- A clear, actionable title
- Detailed description
- Acceptance criteria (testable conditions)
- Dependencies on other tasks (by title reference)
- Priority: critical, high, medium, or low
- Estimated effort (e.g., "2 hours", "1 day")
- Tags (skill domains needed)

Return JSON: {
  "milestones": [
    {
      "name": "Milestone Name",
      "tasks": [
        {
          "title": "Task title",
          "description": "What to do",
          "priority": "high",
          "estimatedEffort": "2 hours",
          "dependsOn": ["Other task title"],
          "tags": ["backend", "database"],
          "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
        }
      ]
    }
  ]
}`,
      `Project: ${name}\nDescription: ${description}\nGoals:\n${goalsText}\n\nAnalysis:\n${analysis}${constraintText}`
    );

    try {
      return JSON.parse(result);
    } catch (err) {
      console.error(LOG_PREFIX, 'Decomposition parse failed, attempting repair');
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // Fall through
        }
      }
      return { milestones: [] };
    }
  }

  private async validate(plan: Plan, goals: ProjectGoal[]): Promise<Plan> {
    // Check for circular dependencies
    const cycles = detectCycles(plan.tasks);
    if (cycles.length > 0) {
      console.warn(LOG_PREFIX, `Circular dependencies detected in tasks: ${cycles.join(', ')}`);
      // Remove the circular dependency edges
      for (const task of plan.tasks) {
        if (cycles.includes(task.id)) {
          task.dependsOn = task.dependsOn.filter(dep => !cycles.includes(dep));
          task.blockedBy = task.blockedBy.filter(dep => !cycles.includes(dep));
        }
      }
    }

    // Recompute critical path after fixing cycles
    plan.criticalPath = computeCriticalPath(plan.tasks);

    // AI validation pass
    const validationResult = await this.aiComplete(
      `You are a QA specialist for project plans. Review this plan for completeness.
Check:
1. Every goal is addressed by at least one task
2. No acceptance criteria are vague
3. Effort estimates are reasonable
4. Dependencies are sensible

Return JSON: { "issues": ["string"], "confidence": 0.0-1.0 }`,
      `Plan tasks:\n${JSON.stringify(plan.tasks.map(t => ({ id: t.id, title: t.title, acceptanceCriteria: t.acceptanceCriteria, dependsOn: t.dependsOn })), null, 2)}\n\nGoals:\n${goals.map(g => g.description).join('; ')}`
    );

    try {
      const parsed = JSON.parse(validationResult);
      if (parsed.issues && parsed.issues.length > 0) {
        console.warn(LOG_PREFIX, 'Validation issues:', parsed.issues);
      }
    } catch {
      // Non-critical validation parse failure
    }

    return plan;
  }

  // ---------------------------------------------------------------------------
  // Plan Construction
  // ---------------------------------------------------------------------------

  private buildPlan(raw: RawDecomposition, projectName: string): Plan {
    const planId = generateId();
    const allTasks: PlanTask[] = [];
    const milestones: Milestone[] = [];
    const titleToId = new Map<string, string>();

    // Phase 1: Create tasks from milestones (without resolving dependency IDs)
    if (raw.milestones && Array.isArray(raw.milestones)) {
      for (const ms of raw.milestones) {
        const milestoneId = generateId();
        const taskIds: string[] = [];

        for (const rawTask of ms.tasks || []) {
          const task = this.createTask(rawTask);
          titleToId.set(rawTask.title.toLowerCase(), task.id);
          allTasks.push(task);
          taskIds.push(task.id);
        }

        milestones.push({
          id: milestoneId,
          name: ms.name || 'Unnamed Milestone',
          taskIds,
          status: 'pending',
          completionPercentage: 0,
        });
      }
    }

    // Phase 1b: Handle standalone tasks (not in milestones)
    if (raw.tasks && Array.isArray(raw.tasks)) {
      for (const rawTask of raw.tasks) {
        if (!titleToId.has(rawTask.title.toLowerCase())) {
          const task = this.createTask(rawTask);
          titleToId.set(rawTask.title.toLowerCase(), task.id);
          allTasks.push(task);
        }
      }
    }

    // Phase 2: Resolve dependency references (title → ID)
    const dependencies: Dependency[] = [];
    for (const task of allTasks) {
      const resolvedDeps: string[] = [];
      for (const dep of task.dependsOn) {
        // dep might be a title reference or an ID
        const resolvedId = titleToId.get(dep.toLowerCase()) || dep;
        // Only add if the resolved ID actually exists as a task
        if (allTasks.some(t => t.id === resolvedId)) {
          resolvedDeps.push(resolvedId);
          dependencies.push({ from: resolvedId, to: task.id, type: 'blocks' });
        }
      }
      task.dependsOn = resolvedDeps;
    }

    // Phase 3: Compute blockedBy (reverse of dependsOn)
    for (const task of allTasks) {
      task.blockedBy = dependencies
        .filter(d => d.from === task.id)
        .map(d => d.to);
    }

    // Phase 4: Mark tasks with no unmet dependencies as 'ready'
    const doneIds = new Set<string>();
    for (const task of allTasks) {
      if (task.dependsOn.length === 0) {
        task.status = 'ready';
      }
    }

    // Phase 5: Compute critical path
    const criticalPath = computeCriticalPath(allTasks);

    return {
      id: planId,
      projectId: '', // Will be set by ProjectManager
      version: 1,
      tasks: allTasks,
      dependencies,
      criticalPath,
      estimatedCompletionAt: 0, // Will be computed from effort estimates
      generatedAt: Date.now(),
      generatedBy: 'ai',
    };
  }

  private createTask(raw: any): PlanTask {
    return {
      id: raw.id || generateId(),
      title: raw.title || 'Untitled Task',
      description: raw.description || '',
      status: 'pending',
      priority: isValidPriority(raw.priority) ? raw.priority : 'medium',
      estimatedEffort: raw.estimatedEffort || 'unknown',
      dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : [],
      blockedBy: [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      acceptanceCriteria: Array.isArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : [],
      notes: [],
      subtasks: [],
    };
  }

  private normalizeTasks(rawTasks: any[]): PlanTask[] {
    return rawTasks.map(raw => this.createTask(raw));
  }

  // ---------------------------------------------------------------------------
  // AI Helper
  // ---------------------------------------------------------------------------

  private async aiComplete(system: string, user: string): Promise<string> {
    try {
      const result = await this.ai.complete({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        responseFormat: 'json',
      });
      return result.content;
    } catch (err) {
      console.error(LOG_PREFIX, 'AI completion failed:', err);
      return '{}';
    }
  }
}

// --- Validation Helpers ---

function isValidPriority(p: any): p is TaskPriority {
  return ['critical', 'high', 'medium', 'low'].includes(p);
}
