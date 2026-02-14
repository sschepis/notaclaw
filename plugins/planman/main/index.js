"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/planman/main/index.ts
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);

// plugins/planman/main/types.ts
var DEFAULT_PROJECT_SETTINGS = {
  autoAssign: true,
  autoReplan: false,
  checkInterval: "*/30 * * * *",
  defaultAgentIds: [],
  maxConcurrentTasks: 3,
  notifyOnMilestone: true
};
function createEmptyPlan(projectId) {
  return {
    id: generateId(),
    projectId,
    version: 0,
    tasks: [],
    dependencies: [],
    criticalPath: [],
    estimatedCompletionAt: 0,
    generatedAt: Date.now(),
    generatedBy: "user"
  };
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function computeCompletionPercentage(tasks) {
  if (tasks.length === 0) return 0;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  return Math.round(doneTasks / tasks.length * 100);
}
function getReadyTasks(tasks) {
  const doneIds = new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
  return tasks.filter((t) => {
    if (t.status !== "pending" && t.status !== "ready") return false;
    return t.dependsOn.every((depId) => doneIds.has(depId));
  });
}
function detectCycles(tasks) {
  const inDegree = /* @__PURE__ */ new Map();
  const adjacency = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    if (!inDegree.has(task.id)) inDegree.set(task.id, 0);
    if (!adjacency.has(task.id)) adjacency.set(task.id, []);
    for (const dep of task.dependsOn) {
      if (!adjacency.has(dep)) adjacency.set(dep, []);
      adjacency.get(dep).push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const sorted = [];
  while (queue.length > 0) {
    const node = queue.shift();
    sorted.push(node);
    for (const neighbor of adjacency.get(node) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }
  const allIds = new Set(tasks.map((t) => t.id));
  return [...allIds].filter((id) => !sorted.includes(id));
}
function computeCriticalPath(tasks) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const memo = /* @__PURE__ */ new Map();
  function longestPath(taskId) {
    if (memo.has(taskId)) return memo.get(taskId);
    const task = taskMap.get(taskId);
    if (!task) return [];
    let longest = [];
    for (const depId of task.dependsOn) {
      const path = longestPath(depId);
      if (path.length > longest.length) longest = path;
    }
    const result = [...longest, taskId];
    memo.set(taskId, result);
    return result;
  }
  let criticalPath = [];
  for (const task of tasks) {
    const path = longestPath(task.id);
    if (path.length > criticalPath.length) criticalPath = path;
  }
  return criticalPath;
}

// plugins/planman/main/ProjectStore.ts
var LOG_PREFIX = "[planman:store]";
var ProjectStore = class {
  constructor(storage, ipc) {
    this.projectIndex = [];
    this.projectCache = /* @__PURE__ */ new Map();
    this.storage = storage;
    this.ipc = ipc;
  }
  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  async initialize() {
    try {
      const index = await this.storage.get("planman:index");
      if (Array.isArray(index)) {
        this.projectIndex = index;
      }
    } catch (err) {
      console.error(LOG_PREFIX, "Failed to load project index:", err);
    }
  }
  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------
  async saveProject(project) {
    project.updatedAt = Date.now();
    this.projectCache.set(project.id, project);
    await this.storage.set(`planman:project:${project.id}`, project);
    const indexEntry = {
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
    const existingIdx = this.projectIndex.findIndex((e) => e.id === project.id);
    if (existingIdx >= 0) {
      this.projectIndex[existingIdx] = indexEntry;
    } else {
      this.projectIndex.push(indexEntry);
    }
    await this.storage.set("planman:index", this.projectIndex);
    await this.syncToMemory(project);
  }
  async loadProject(id) {
    if (this.projectCache.has(id)) {
      return this.projectCache.get(id);
    }
    try {
      const project = await this.storage.get(`planman:project:${id}`);
      if (project) {
        this.projectCache.set(id, project);
        return project;
      }
    } catch (err) {
      console.error(LOG_PREFIX, `Failed to load project ${id}:`, err);
    }
    return null;
  }
  async listProjects(statusFilter) {
    if (statusFilter) {
      return this.projectIndex.filter((e) => e.status === statusFilter);
    }
    return [...this.projectIndex];
  }
  async deleteProject(id) {
    this.projectCache.delete(id);
    this.projectIndex = this.projectIndex.filter((e) => e.id !== id);
    try {
      await this.storage.set(`planman:project:${id}`, null);
      await this.storage.set("planman:index", this.projectIndex);
      return true;
    } catch (err) {
      console.error(LOG_PREFIX, `Failed to delete project ${id}:`, err);
      return false;
    }
  }
  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------
  createProject(name, description, goals) {
    const id = generateId();
    const now = Date.now();
    const projectGoals = (goals || []).map((g, i) => ({
      id: generateId(),
      description: g,
      priority: 1 - i * 0.1,
      // First goal = highest priority
      measureOfSuccess: ""
    }));
    return {
      id,
      name,
      description,
      status: "planning",
      createdAt: now,
      updatedAt: now,
      memoryFieldId: `planman:project:${id}`,
      conversationId: "",
      // Populated by ProjectManager after conversation creation
      goals: projectGoals,
      milestones: [],
      plan: createEmptyPlan(id),
      settings: { ...DEFAULT_PROJECT_SETTINGS }
    };
  }
  // ---------------------------------------------------------------------------
  // Task Lookup
  // ---------------------------------------------------------------------------
  /** Find a task by ID across all loaded projects. */
  findTask(projectId, taskId) {
    const project = this.projectCache.get(projectId);
    if (!project) return null;
    return this.findTaskInList(project.plan.tasks, taskId);
  }
  findTaskInList(tasks, taskId) {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      const found = this.findTaskInList(task.subtasks, taskId);
      if (found) return found;
    }
    return null;
  }
  /** Get all tasks flattened (including subtasks) for a project. */
  getAllTasks(projectId) {
    const project = this.projectCache.get(projectId);
    if (!project) return [];
    return this.flattenTasks(project.plan.tasks);
  }
  flattenTasks(tasks) {
    const result = [];
    for (const task of tasks) {
      result.push(task);
      if (task.subtasks.length > 0) {
        result.push(...this.flattenTasks(task.subtasks));
      }
    }
    return result;
  }
  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  /** Local search across all cached project tasks by text match. */
  searchTasks(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    for (const [projectId, project] of this.projectCache) {
      const allTasks = this.flattenTasks(project.plan.tasks);
      for (const task of allTasks) {
        if (task.title.toLowerCase().includes(queryLower) || task.description.toLowerCase().includes(queryLower) || task.tags.some((t) => t.toLowerCase().includes(queryLower))) {
          results.push({ projectId, task });
        }
      }
    }
    return results;
  }
  /** Semantic search via AlephNet memory fields (if available). */
  async searchTasksSemantic(query) {
    if (!this.ipc) {
      return this.searchTasks(query);
    }
    try {
      const results = await this.ipc.invoke("memory:search", {
        query,
        namespace: "planman",
        limit: 20
      });
      if (Array.isArray(results)) {
        return results.filter((r) => r.metadata?.projectId && r.metadata?.taskId).map((r) => {
          const task = this.findTask(r.metadata.projectId, r.metadata.taskId);
          return task ? { projectId: r.metadata.projectId, task } : null;
        }).filter((r) => r !== null);
      }
    } catch (err) {
      console.warn(LOG_PREFIX, "Semantic search failed, falling back to local:", err);
    }
    return this.searchTasks(query);
  }
  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  async getSettings() {
    try {
      const settings = await this.storage.get("planman:settings");
      if (settings) return { ...DEFAULT_PROJECT_SETTINGS, ...settings };
    } catch (err) {
      console.error(LOG_PREFIX, "Failed to load settings:", err);
    }
    return { ...DEFAULT_PROJECT_SETTINGS };
  }
  async saveSettings(settings) {
    await this.storage.set("planman:settings", settings);
  }
  // ---------------------------------------------------------------------------
  // Memory Sync (AlephNet)
  // ---------------------------------------------------------------------------
  async syncToMemory(project) {
    if (!this.ipc) return;
    try {
      const summary = this.buildProjectSummary(project);
      await this.ipc.invoke("memory:store", {
        namespace: "planman",
        key: `project:${project.id}`,
        content: summary,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          type: "project_summary"
        }
      });
      for (const task of this.flattenTasks(project.plan.tasks)) {
        await this.ipc.invoke("memory:store", {
          namespace: "planman",
          key: `task:${project.id}:${task.id}`,
          content: `${task.title}: ${task.description}. Tags: ${task.tags.join(", ")}. Status: ${task.status}.`,
          metadata: {
            projectId: project.id,
            taskId: task.id,
            status: task.status,
            priority: task.priority,
            type: "task"
          }
        });
      }
    } catch (err) {
      console.warn(LOG_PREFIX, "Memory sync failed (non-critical):", err);
    }
  }
  buildProjectSummary(project) {
    const taskCount = this.flattenTasks(project.plan.tasks).length;
    const doneCount = this.flattenTasks(project.plan.tasks).filter((t) => t.status === "done").length;
    return [
      `Project: ${project.name}`,
      `Description: ${project.description}`,
      `Status: ${project.status}`,
      `Tasks: ${doneCount}/${taskCount} complete`,
      `Goals: ${project.goals.map((g) => g.description).join("; ")}`,
      `Milestones: ${project.milestones.map((m) => `${m.name} (${m.completionPercentage}%)`).join("; ")}`
    ].join("\n");
  }
  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------
  /** Ensure a project is loaded into cache. */
  async ensureLoaded(id) {
    if (this.projectCache.has(id)) return this.projectCache.get(id);
    return this.loadProject(id);
  }
  /** Invalidate a project from cache (forces reload on next access). */
  invalidate(id) {
    this.projectCache.delete(id);
  }
  /** Clear the entire cache. */
  clearCache() {
    this.projectCache.clear();
  }
};

// plugins/planman/main/PlanEngine.ts
var LOG_PREFIX2 = "[planman:engine]";
var PlanEngine = class {
  constructor(ai) {
    this.ai = ai;
  }
  // ---------------------------------------------------------------------------
  // Main API
  // ---------------------------------------------------------------------------
  /**
   * Decompose project goals into a structured Plan.
   * Runs the multi-step planning prompt chain.
   */
  async decompose(projectName, projectDescription, goals, constraints) {
    console.log(LOG_PREFIX2, `Decomposing project "${projectName}" with ${goals.length} goals`);
    const analysis = await this.analyze(projectName, projectDescription, goals);
    const rawPlan = await this.decomposeStep(
      projectName,
      projectDescription,
      goals,
      analysis,
      constraints
    );
    const plan = this.buildPlan(rawPlan, projectName);
    const validated = await this.validate(plan, goals);
    console.log(
      LOG_PREFIX2,
      `Plan generated: ${validated.tasks.length} tasks, ${validated.criticalPath.length} in critical path`
    );
    return validated;
  }
  /**
   * AI-estimate effort for a list of tasks.
   */
  async estimate(tasks) {
    const taskSummaries = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      dependsOn: t.dependsOn
    }));
    const result = await this.aiComplete(
      `You are an expert project estimator. For each task, provide a realistic effort estimate.
Consider dependencies, complexity, and typical development velocity.
Return JSON: { "estimates": [{ "id": "task_id", "estimatedEffort": "Xh" or "Xd" }] }`,
      `Estimate effort for these tasks:
${JSON.stringify(taskSummaries, null, 2)}`
    );
    try {
      const parsed = JSON.parse(result);
      if (parsed.estimates && Array.isArray(parsed.estimates)) {
        for (const est of parsed.estimates) {
          const task = tasks.find((t) => t.id === est.id);
          if (task) {
            task.estimatedEffort = est.estimatedEffort || task.estimatedEffort;
          }
        }
      }
    } catch (err) {
      console.warn(LOG_PREFIX2, "Effort estimation parse failed:", err);
    }
    return tasks;
  }
  /**
   * Prioritize tasks considering dependencies and critical path.
   */
  async prioritize(tasks, constraints) {
    const taskSummaries = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dependsOn: t.dependsOn,
      estimatedEffort: t.estimatedEffort
    }));
    const constraintText = constraints ? `
Constraints: ${constraints}` : "";
    const result = await this.aiComplete(
      `You are a project prioritization specialist.
Reorder and re-prioritize tasks based on dependencies, critical path analysis, and value delivery.
Return JSON: { "priorities": [{ "id": "task_id", "priority": "critical|high|medium|low" }] }`,
      `Prioritize these tasks:${constraintText}
${JSON.stringify(taskSummaries, null, 2)}`
    );
    try {
      const parsed = JSON.parse(result);
      if (parsed.priorities && Array.isArray(parsed.priorities)) {
        for (const pri of parsed.priorities) {
          const task = tasks.find((t) => t.id === pri.id);
          if (task && isValidPriority(pri.priority)) {
            task.priority = pri.priority;
          }
        }
      }
    } catch (err) {
      console.warn(LOG_PREFIX2, "Prioritization parse failed:", err);
    }
    return tasks;
  }
  /**
   * Re-plan sections of a project affected by blockers.
   * Only modifies tasks with status 'pending' or 'ready'.
   */
  async replan(plan, blockerInfo, goals) {
    console.log(LOG_PREFIX2, `Re-planning due to: ${blockerInfo}`);
    const currentState = {
      totalTasks: plan.tasks.length,
      completedTasks: plan.tasks.filter((t) => t.status === "done").length,
      blockedTasks: plan.tasks.filter((t) => t.status === "blocked").map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status
      })),
      pendingTasks: plan.tasks.filter((t) => t.status === "pending" || t.status === "ready").map((t) => ({
        id: t.id,
        title: t.title,
        dependsOn: t.dependsOn
      }))
    };
    const result = await this.aiComplete(
      `You are a project recovery specialist. A project has encountered blockers.
Analyze the situation and suggest revised tasks for the pending/ready items.
Do NOT modify completed or in-progress tasks.
Return JSON matching the Plan structure: { "tasks": [...], "dependencies": [...] }`,
      `Blocker: ${blockerInfo}

Current state:
${JSON.stringify(currentState, null, 2)}

Goals: ${goals.map((g) => g.description).join("; ")}`
    );
    try {
      const parsed = JSON.parse(result);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        const preservedTasks = plan.tasks.filter(
          (t) => t.status !== "pending" && t.status !== "ready"
        );
        const newTasks = this.normalizeTasks(parsed.tasks);
        plan.tasks = [...preservedTasks, ...newTasks];
        plan.version += 1;
        plan.generatedAt = Date.now();
        plan.criticalPath = computeCriticalPath(plan.tasks);
      }
    } catch (err) {
      console.error(LOG_PREFIX2, "Re-plan parse failed:", err);
    }
    return plan;
  }
  /**
   * Suggest agent assignments based on task requirements and agent capabilities.
   */
  async suggestAssignments(tasks, agentSummaries) {
    const result = await this.aiComplete(
      `You are a resource allocation specialist.
Match tasks to the most suitable agents based on their capabilities and the task requirements.
Return JSON: { "assignments": [{ "taskId": "...", "agentId": "...", "reason": "..." }] }`,
      `Tasks:
${JSON.stringify(tasks.map((t) => ({ id: t.id, title: t.title, tags: t.tags, description: t.description })), null, 2)}

Agents:
${JSON.stringify(agentSummaries, null, 2)}`
    );
    try {
      const parsed = JSON.parse(result);
      if (parsed.assignments && Array.isArray(parsed.assignments)) {
        return parsed.assignments;
      }
    } catch (err) {
      console.warn(LOG_PREFIX2, "Assignment suggestion parse failed:", err);
    }
    return [];
  }
  // ---------------------------------------------------------------------------
  // Internal Steps
  // ---------------------------------------------------------------------------
  async analyze(name, description, goals) {
    const goalsText = goals.map((g, i) => `${i + 1}. ${g.description} (priority: ${g.priority})`).join("\n");
    return this.aiComplete(
      `You are a senior technical project manager. Analyze a project and identify implicit requirements, technical risks, skill domains needed, and constraints.
Return JSON: {
  "requirements": ["string"],
  "risks": [{"description": "string", "severity": "high|medium|low", "mitigation": "string"}],
  "skillDomains": ["string"],
  "constraints": ["string"]
}`,
      `Analyze this project:
Name: ${name}
Description: ${description}
Goals:
${goalsText}`
    );
  }
  async decomposeStep(name, description, goals, analysis, constraints) {
    const constraintText = constraints ? `
Additional constraints: ${constraints}` : "";
    const goalsText = goals.map((g, i) => `${i + 1}. ${g.description}`).join("\n");
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
      `Project: ${name}
Description: ${description}
Goals:
${goalsText}

Analysis:
${analysis}${constraintText}`
    );
    try {
      return JSON.parse(result);
    } catch (err) {
      console.error(LOG_PREFIX2, "Decomposition parse failed, attempting repair");
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
        }
      }
      return { milestones: [] };
    }
  }
  async validate(plan, goals) {
    const cycles = detectCycles(plan.tasks);
    if (cycles.length > 0) {
      console.warn(LOG_PREFIX2, `Circular dependencies detected in tasks: ${cycles.join(", ")}`);
      for (const task of plan.tasks) {
        if (cycles.includes(task.id)) {
          task.dependsOn = task.dependsOn.filter((dep) => !cycles.includes(dep));
          task.blockedBy = task.blockedBy.filter((dep) => !cycles.includes(dep));
        }
      }
    }
    plan.criticalPath = computeCriticalPath(plan.tasks);
    const validationResult = await this.aiComplete(
      `You are a QA specialist for project plans. Review this plan for completeness.
Check:
1. Every goal is addressed by at least one task
2. No acceptance criteria are vague
3. Effort estimates are reasonable
4. Dependencies are sensible

Return JSON: { "issues": ["string"], "confidence": 0.0-1.0 }`,
      `Plan tasks:
${JSON.stringify(plan.tasks.map((t) => ({ id: t.id, title: t.title, acceptanceCriteria: t.acceptanceCriteria, dependsOn: t.dependsOn })), null, 2)}

Goals:
${goals.map((g) => g.description).join("; ")}`
    );
    try {
      const parsed = JSON.parse(validationResult);
      if (parsed.issues && parsed.issues.length > 0) {
        console.warn(LOG_PREFIX2, "Validation issues:", parsed.issues);
      }
    } catch {
    }
    return plan;
  }
  // ---------------------------------------------------------------------------
  // Plan Construction
  // ---------------------------------------------------------------------------
  buildPlan(raw, projectName) {
    const planId = generateId();
    const allTasks = [];
    const milestones = [];
    const titleToId = /* @__PURE__ */ new Map();
    if (raw.milestones && Array.isArray(raw.milestones)) {
      for (const ms of raw.milestones) {
        const milestoneId = generateId();
        const taskIds = [];
        for (const rawTask of ms.tasks || []) {
          const task = this.createTask(rawTask);
          titleToId.set(rawTask.title.toLowerCase(), task.id);
          allTasks.push(task);
          taskIds.push(task.id);
        }
        milestones.push({
          id: milestoneId,
          name: ms.name || "Unnamed Milestone",
          taskIds,
          status: "pending",
          completionPercentage: 0
        });
      }
    }
    if (raw.tasks && Array.isArray(raw.tasks)) {
      for (const rawTask of raw.tasks) {
        if (!titleToId.has(rawTask.title.toLowerCase())) {
          const task = this.createTask(rawTask);
          titleToId.set(rawTask.title.toLowerCase(), task.id);
          allTasks.push(task);
        }
      }
    }
    const dependencies = [];
    for (const task of allTasks) {
      const resolvedDeps = [];
      for (const dep of task.dependsOn) {
        const resolvedId = titleToId.get(dep.toLowerCase()) || dep;
        if (allTasks.some((t) => t.id === resolvedId)) {
          resolvedDeps.push(resolvedId);
          dependencies.push({ from: resolvedId, to: task.id, type: "blocks" });
        }
      }
      task.dependsOn = resolvedDeps;
    }
    for (const task of allTasks) {
      task.blockedBy = dependencies.filter((d) => d.from === task.id).map((d) => d.to);
    }
    const doneIds = /* @__PURE__ */ new Set();
    for (const task of allTasks) {
      if (task.dependsOn.length === 0) {
        task.status = "ready";
      }
    }
    const criticalPath = computeCriticalPath(allTasks);
    return {
      id: planId,
      projectId: "",
      // Will be set by ProjectManager
      version: 1,
      tasks: allTasks,
      dependencies,
      criticalPath,
      estimatedCompletionAt: 0,
      // Will be computed from effort estimates
      generatedAt: Date.now(),
      generatedBy: "ai"
    };
  }
  createTask(raw) {
    return {
      id: raw.id || generateId(),
      title: raw.title || "Untitled Task",
      description: raw.description || "",
      status: "pending",
      priority: isValidPriority(raw.priority) ? raw.priority : "medium",
      estimatedEffort: raw.estimatedEffort || "unknown",
      dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : [],
      blockedBy: [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      acceptanceCriteria: Array.isArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : [],
      notes: [],
      subtasks: []
    };
  }
  normalizeTasks(rawTasks) {
    return rawTasks.map((raw) => this.createTask(raw));
  }
  // ---------------------------------------------------------------------------
  // AI Helper
  // ---------------------------------------------------------------------------
  async aiComplete(system, user) {
    try {
      const result = await this.ai.complete({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3,
        responseFormat: "json"
      });
      return result.content;
    } catch (err) {
      console.error(LOG_PREFIX2, "AI completion failed:", err);
      return "{}";
    }
  }
};
function isValidPriority(p) {
  return ["critical", "high", "medium", "low"].includes(p);
}

// plugins/planman/main/ExecutionOrchestrator.ts
var LOG_PREFIX3 = "[planman:orchestrator]";
var ExecutionOrchestrator = class {
  constructor(ipc) {
    this.trackedTasks = /* @__PURE__ */ new Map();
    this.maxConcurrent = 3;
    this.ipc = ipc;
  }
  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  setStatusCallback(callback) {
    this.onStatusChange = callback;
  }
  setMaxConcurrent(max) {
    this.maxConcurrent = max;
  }
  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------
  /**
   * Find and dispatch ready tasks in a project, up to the concurrency limit.
   * Returns the number of tasks dispatched.
   */
  async dispatchReadyTasks(project) {
    const plan = project.plan;
    const readyTasks = getReadyTasks(plan.tasks);
    if (readyTasks.length === 0) {
      console.log(LOG_PREFIX3, `No ready tasks for project "${project.name}"`);
      return 0;
    }
    const activeCount = this.getActiveTaskCount(project.id);
    const slotsAvailable = Math.max(0, this.maxConcurrent - activeCount);
    if (slotsAvailable === 0) {
      console.log(LOG_PREFIX3, `Concurrency limit reached for "${project.name}" (${activeCount}/${this.maxConcurrent})`);
      return 0;
    }
    const toDispatch = readyTasks.slice(0, slotsAvailable);
    let dispatched = 0;
    for (const task of toDispatch) {
      const agentId = task.assignedAgentId || await this.selectAgent(task, project);
      if (agentId) {
        const success = await this.assignAndDispatch(project, task, agentId);
        if (success) dispatched++;
      } else {
        console.warn(LOG_PREFIX3, `No agent available for task "${task.title}"`);
        this.addTaskNote(task, "ai", "No suitable agent found for automatic assignment.", "observation");
      }
    }
    console.log(LOG_PREFIX3, `Dispatched ${dispatched}/${toDispatch.length} tasks for "${project.name}"`);
    return dispatched;
  }
  /**
   * Assign a specific task to a specific agent and start execution.
   */
  async assignTask(project, taskId, agentId) {
    const task = project.plan.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(LOG_PREFIX3, `Task ${taskId} not found in project ${project.id}`);
      return false;
    }
    return this.assignAndDispatch(project, task, agentId);
  }
  /**
   * Cancel a running agent task.
   */
  async cancelTask(agentTaskId) {
    const tracked = this.trackedTasks.get(agentTaskId);
    if (!tracked) {
      console.warn(LOG_PREFIX3, `No tracked task for agent task ${agentTaskId}`);
      return false;
    }
    try {
      await this.ipc.invoke("resonant:agent:cancelTask", { taskId: agentTaskId });
      this.trackedTasks.delete(agentTaskId);
      return true;
    } catch (err) {
      console.error(LOG_PREFIX3, `Failed to cancel agent task ${agentTaskId}:`, err);
      return false;
    }
  }
  // ---------------------------------------------------------------------------
  // Event Handlers (called by ProjectManager from IPC subscriptions)
  // ---------------------------------------------------------------------------
  /**
   * Handle agent task update events from AgentTaskRunner.
   */
  async handleAgentTaskUpdate(event) {
    const tracked = this.trackedTasks.get(event.taskId);
    if (!tracked) return;
    console.log(
      LOG_PREFIX3,
      `Agent task ${event.taskId} status: ${event.status} (project: ${tracked.projectId}, task: ${tracked.taskId})`
    );
    switch (event.status) {
      case "completed":
        this.trackedTasks.delete(event.taskId);
        if (this.onStatusChange) {
          await this.onStatusChange(
            tracked.projectId,
            tracked.taskId,
            "in_progress",
            "done",
            event.result
          );
        }
        break;
      case "error":
      case "failed":
        this.trackedTasks.delete(event.taskId);
        if (this.onStatusChange) {
          await this.onStatusChange(
            tracked.projectId,
            tracked.taskId,
            "in_progress",
            "blocked",
            void 0,
            event.error
          );
        }
        break;
      case "cancelled":
        this.trackedTasks.delete(event.taskId);
        if (this.onStatusChange) {
          await this.onStatusChange(
            tracked.projectId,
            tracked.taskId,
            "in_progress",
            "pending"
          );
        }
        break;
      case "running":
        break;
      default:
        console.log(LOG_PREFIX3, `Unknown agent task status: ${event.status}`);
    }
  }
  /**
   * Handle agent task message events (progress/log messages from the agent).
   */
  async handleAgentTaskMessage(event) {
    const tracked = this.trackedTasks.get(event.taskId);
    if (!tracked) return;
    console.log(
      LOG_PREFIX3,
      `Agent message [${tracked.taskId}]: ${event.message.substring(0, 100)}`
    );
  }
  // ---------------------------------------------------------------------------
  // Status Queries
  // ---------------------------------------------------------------------------
  /** Get count of currently active (dispatched) tasks for a project. */
  getActiveTaskCount(projectId) {
    let count = 0;
    for (const tracked of this.trackedTasks.values()) {
      if (tracked.projectId === projectId) count++;
    }
    return count;
  }
  /** Get all tracked (active) tasks. */
  getTrackedTasks() {
    return new Map(this.trackedTasks);
  }
  /** Check if a specific plan task is currently being executed by an agent. */
  isTaskActive(projectId, taskId) {
    for (const tracked of this.trackedTasks.values()) {
      if (tracked.projectId === projectId && tracked.taskId === taskId) return true;
    }
    return false;
  }
  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------
  async assignAndDispatch(project, task, agentId) {
    try {
      const taskPrompt = this.buildTaskPrompt(project, task);
      const result = await this.ipc.invoke("resonant:agent:startTask", {
        agentId,
        conversationId: project.conversationId,
        message: taskPrompt,
        metadata: {
          source: "planman",
          projectId: project.id,
          taskId: task.id,
          taskTitle: task.title
        }
      });
      if (result && result.taskId) {
        this.trackedTasks.set(result.taskId, {
          projectId: project.id,
          taskId: task.id,
          agentId,
          dispatchedAt: Date.now()
        });
        task.assignedAgentId = agentId;
        task.assignedAgentTaskId = result.taskId;
        task.status = "in_progress";
        task.startedAt = Date.now();
        this.addTaskNote(task, "ai", `Dispatched to agent ${agentId}`, "observation");
        console.log(
          LOG_PREFIX3,
          `Task "${task.title}" dispatched to agent ${agentId} (agentTask: ${result.taskId})`
        );
        if (this.onStatusChange) {
          await this.onStatusChange(project.id, task.id, "ready", "in_progress");
        }
        return true;
      } else {
        console.error(LOG_PREFIX3, `Agent dispatch returned no taskId for "${task.title}"`);
        return false;
      }
    } catch (err) {
      console.error(LOG_PREFIX3, `Failed to dispatch task "${task.title}":`, err);
      this.addTaskNote(task, "ai", `Dispatch failed: ${err}`, "blocker");
      return false;
    }
  }
  /**
   * Build the prompt sent to an agent for executing a task.
   */
  buildTaskPrompt(project, task) {
    const depContext = task.dependsOn.map((depId) => {
      const depTask = project.plan.tasks.find((t) => t.id === depId);
      if (depTask && depTask.status === "done" && depTask.output) {
        return `- [${depTask.title}]: ${depTask.output}`;
      }
      return depTask ? `- [${depTask.title}]: completed` : null;
    }).filter(Boolean).join("\n");
    const criteriaText = task.acceptanceCriteria.length > 0 ? task.acceptanceCriteria.map((c) => `- ${c}`).join("\n") : "- Complete the task as described";
    return `You are working on project: "${project.name}"

## Your Task
**${task.title}**
${task.description}

## Acceptance Criteria
${criteriaText}

## Context
${depContext ? `This task depends on completed work:
${depContext}
` : ""}
Project description: ${project.description}

## Instructions
Complete this task according to the acceptance criteria above.
When finished, provide a clear summary of what you accomplished and any artifacts produced.
If you encounter blockers, describe them clearly so the project can be re-planned.`;
  }
  /**
   * Select the best agent for a task using the project's default agent pool.
   */
  async selectAgent(task, project) {
    if (project.settings.defaultAgentIds.length > 0) {
      for (const agentId of project.settings.defaultAgentIds) {
        let agentTaskCount = 0;
        for (const tracked of this.trackedTasks.values()) {
          if (tracked.agentId === agentId) agentTaskCount++;
        }
        if (agentTaskCount < 2) {
          return agentId;
        }
      }
    }
    try {
      const agents = await this.ipc.invoke("resonant:agent:list", {});
      if (Array.isArray(agents) && agents.length > 0) {
        return agents[0].id;
      }
    } catch (err) {
      console.warn(LOG_PREFIX3, "Failed to list agents:", err);
    }
    return null;
  }
  addTaskNote(task, author, content, type) {
    task.notes.push({
      author,
      content,
      timestamp: Date.now(),
      type
    });
  }
};

// plugins/planman/main/ProgressMonitor.ts
var LOG_PREFIX4 = "[planman:monitor]";
var ProgressMonitor = class {
  constructor(ai, ipc, settings) {
    this.monitors = /* @__PURE__ */ new Map();
    this.ai = ai;
    this.ipc = ipc;
    this.settings = settings;
  }
  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  setHealthCheckCallback(callback) {
    this.onHealthCheck = callback;
  }
  setReplanCallback(callback) {
    this.onReplanNeeded = callback;
  }
  updateSettings(settings) {
    this.settings = settings;
  }
  // ---------------------------------------------------------------------------
  // Monitor Lifecycle
  // ---------------------------------------------------------------------------
  /**
   * Start monitoring an active project.
   * Registers a scheduled task with TaskScheduler via IPC.
   */
  async startMonitoring(project) {
    if (this.monitors.has(project.id)) {
      console.log(LOG_PREFIX4, `Already monitoring project "${project.name}"`);
      return;
    }
    const entry = { projectId: project.id };
    try {
      const result = await this.ipc.invoke("scheduler:createTask", {
        name: `planman-monitor-${project.id}`,
        description: `Health check for project "${project.name}"`,
        cronExpression: this.settings.checkInterval,
        drivingPrompt: this.buildHealthCheckPrompt(project),
        metadata: {
          source: "planman",
          projectId: project.id,
          type: "health_check"
        }
      });
      if (result && result.taskId) {
        entry.schedulerTaskId = result.taskId;
      }
    } catch (err) {
      console.warn(LOG_PREFIX4, `Failed to create scheduler task for "${project.name}" (will use manual checks):`, err);
    }
    this.monitors.set(project.id, entry);
    console.log(LOG_PREFIX4, `Started monitoring project "${project.name}"`);
  }
  /**
   * Stop monitoring a project.
   */
  async stopMonitoring(projectId) {
    const entry = this.monitors.get(projectId);
    if (!entry) return;
    if (entry.schedulerTaskId) {
      try {
        await this.ipc.invoke("scheduler:deleteTask", { taskId: entry.schedulerTaskId });
      } catch (err) {
        console.warn(LOG_PREFIX4, `Failed to delete scheduler task:`, err);
      }
    }
    this.monitors.delete(projectId);
    console.log(LOG_PREFIX4, `Stopped monitoring project ${projectId}`);
  }
  /**
   * Stop monitoring all projects.
   */
  async stopAll() {
    const projectIds = [...this.monitors.keys()];
    for (const id of projectIds) {
      await this.stopMonitoring(id);
    }
  }
  // ---------------------------------------------------------------------------
  // Health Check Execution
  // ---------------------------------------------------------------------------
  /**
   * Run a health check on a project. Can be called manually or by the scheduler.
   */
  async runHealthCheck(project) {
    console.log(LOG_PREFIX4, `Running health check for "${project.name}"`);
    const allTasks = project.plan.tasks;
    const metrics = this.computeMetrics(allTasks, project.milestones);
    const aiAssessment = await this.getAIAssessment(project, metrics);
    const report = {
      projectId: project.id,
      timestamp: Date.now(),
      overallHealth: this.determineOverallHealth(metrics, aiAssessment),
      completionPercentage: metrics.completionPercentage,
      estimatedCompletionAt: project.plan.estimatedCompletionAt,
      findings: [...metrics.findings, ...aiAssessment.findings],
      recommendations: aiAssessment.recommendations || []
    };
    const entry = this.monitors.get(project.id);
    if (entry) {
      entry.lastCheck = report;
    }
    if (this.onHealthCheck) {
      await this.onHealthCheck(report);
    }
    this.ipc.send("planman:project:healthUpdate", report);
    if (this.settings.autoReplan && report.overallHealth === "critical") {
      const blockerSummary = report.findings.filter((f) => f.severity === "critical").map((f) => f.message).join("; ");
      if (blockerSummary && this.onReplanNeeded) {
        console.log(LOG_PREFIX4, `Auto-replan triggered for "${project.name}"`);
        await this.onReplanNeeded(project.id, `Auto-replan: ${blockerSummary}`);
      }
    }
    await this.checkMilestones(project);
    return report;
  }
  /**
   * Get the last health report for a project.
   */
  getLastReport(projectId) {
    return this.monitors.get(projectId)?.lastCheck;
  }
  // ---------------------------------------------------------------------------
  // Metrics Computation
  // ---------------------------------------------------------------------------
  computeMetrics(tasks, milestones) {
    const findings = [];
    const now = Date.now();
    const completionPercentage = computeCompletionPercentage(tasks);
    for (const task of tasks) {
      if (task.status === "in_progress" && task.startedAt) {
        const elapsed = now - task.startedAt;
        const estimatedMs = this.parseEffortToMs(task.estimatedEffort);
        if (estimatedMs > 0 && elapsed > estimatedMs * 2) {
          findings.push({
            type: "stale_task",
            severity: "warning",
            taskId: task.id,
            message: `Task "${task.title}" has been in progress for ${this.formatDuration(elapsed)} (estimated: ${task.estimatedEffort})`,
            suggestedAction: "Check agent status or consider re-assigning"
          });
        }
      }
      if (task.status === "blocked") {
        const hasResolution = task.notes.some((n) => n.type === "resolution");
        if (!hasResolution) {
          findings.push({
            type: "blocker",
            severity: "critical",
            taskId: task.id,
            message: `Task "${task.title}" is blocked with no resolution`,
            suggestedAction: "Investigate blocker and either resolve or re-plan"
          });
        }
      }
    }
    return { completionPercentage, findings };
  }
  // ---------------------------------------------------------------------------
  // AI Assessment
  // ---------------------------------------------------------------------------
  async getAIAssessment(project, metrics) {
    const taskSummary = project.plan.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      estimatedEffort: t.estimatedEffort,
      startedAt: t.startedAt,
      dependsOn: t.dependsOn
    }));
    const prompt = `Evaluate the health of this project:

Project: ${project.name}
Completion: ${metrics.completionPercentage}%
Detected issues: ${metrics.findings.length}

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Return JSON: {
  "findings": [
    { "type": "stale_task|blocker|critical_path_drift|agent_error", "severity": "info|warning|critical", "taskId": "optional", "message": "description", "suggestedAction": "optional" }
  ],
  "recommendations": ["string"]
}`;
    try {
      const result = await this.ai.complete({
        messages: [
          {
            role: "system",
            content: "You are a project health analyst. Evaluate the project and identify risks, bottlenecks, and recommendations. Be concise and actionable."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        responseFormat: "json"
      });
      const parsed = JSON.parse(result.content);
      return {
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (err) {
      console.warn(LOG_PREFIX4, "AI health assessment failed:", err);
      return { findings: [], recommendations: [] };
    }
  }
  // ---------------------------------------------------------------------------
  // Milestone Checks
  // ---------------------------------------------------------------------------
  async checkMilestones(project) {
    for (const milestone of project.milestones) {
      if (milestone.status === "completed") continue;
      const milestoneTasks = project.plan.tasks.filter((t) => milestone.taskIds.includes(t.id));
      const doneCount = milestoneTasks.filter((t) => t.status === "done").length;
      const percentage = milestoneTasks.length > 0 ? Math.round(doneCount / milestoneTasks.length * 100) : 0;
      milestone.completionPercentage = percentage;
      if (doneCount > 0 && milestone.status === "pending") {
        milestone.status = "in_progress";
      }
      if (percentage === 100) {
        milestone.status = "completed";
        this.ipc.send("planman:milestone:reached", {
          projectId: project.id,
          milestoneId: milestone.id,
          name: milestone.name
        });
        if (this.settings.notifyOnMilestone) {
          this.ipc.send("notify", {
            title: `Milestone Reached: ${milestone.name}`,
            message: `Project "${project.name}" reached milestone "${milestone.name}"`,
            type: "success",
            priority: "high",
            category: "planman",
            source: "planman"
          });
        }
        console.log(LOG_PREFIX4, `Milestone "${milestone.name}" completed for "${project.name}"`);
      }
    }
  }
  // ---------------------------------------------------------------------------
  // Health Determination
  // ---------------------------------------------------------------------------
  determineOverallHealth(metrics, aiAssessment) {
    const allFindings = [...metrics.findings, ...aiAssessment.findings];
    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const warningCount = allFindings.filter((f) => f.severity === "warning").length;
    if (criticalCount > 0) return "critical";
    if (warningCount >= 3) return "at_risk";
    return "healthy";
  }
  // ---------------------------------------------------------------------------
  // Prompt Building
  // ---------------------------------------------------------------------------
  buildHealthCheckPrompt(project) {
    return `Monitor project "${project.name}" health. Check for stale tasks, blockers, and critical path drift. Report findings.`;
  }
  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------
  parseEffortToMs(effort) {
    const lower = effort.toLowerCase().trim();
    const match = lower.match(/^(\d+(?:\.\d+)?)\s*(h(?:ours?)?|d(?:ays?)?|m(?:in(?:utes?)?)?)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2][0];
    switch (unit) {
      case "m":
        return value * 60 * 1e3;
      case "h":
        return value * 60 * 60 * 1e3;
      case "d":
        return value * 8 * 60 * 60 * 1e3;
      // 8-hour workday
      default:
        return 0;
    }
  }
  formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1e3));
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
};

// plugins/planman/main/ProjectManager.ts
var LOG_PREFIX5 = "[planman:manager]";
var ProjectManager = class {
  constructor(store, engine, orchestrator, monitor2, ipc) {
    this.store = store;
    this.engine = engine;
    this.orchestrator = orchestrator;
    this.monitor = monitor2;
    this.ipc = ipc;
    this.orchestrator.setStatusCallback(this.handleTaskStatusChange.bind(this));
    this.monitor.setHealthCheckCallback(this.handleHealthReport.bind(this));
    this.monitor.setReplanCallback(async (projectId, reason) => {
      await this.replanProject(projectId, reason);
    });
  }
  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  async initialize() {
    await this.store.initialize();
    const projects = await this.store.listProjects("active");
    for (const entry of projects) {
      const project = await this.store.loadProject(entry.id);
      if (project) {
        await this.monitor.startMonitoring(project);
      }
    }
    console.log(LOG_PREFIX5, `Initialized with ${projects.length} active projects`);
  }
  // ---------------------------------------------------------------------------
  // Project Lifecycle
  // ---------------------------------------------------------------------------
  /**
   * Create a new project from name, description, and optional goals.
   */
  async createProject(name, description, goals) {
    console.log(LOG_PREFIX5, `Creating project "${name}"`);
    const project = this.store.createProject(name, description, goals);
    try {
      const conv = await this.ipc.invoke("conversation:create", {
        title: `Project: ${name}`,
        metadata: { source: "planman", projectId: project.id }
      });
      if (conv && conv.id) {
        project.conversationId = conv.id;
      }
    } catch (err) {
      console.warn(LOG_PREFIX5, "Failed to create project conversation:", err);
    }
    await this.store.saveProject(project);
    console.log(LOG_PREFIX5, `Project "${name}" created with ID ${project.id}`);
    return project;
  }
  /**
   * Get a project by ID.
   */
  async getProject(projectId) {
    return this.store.loadProject(projectId);
  }
  /**
   * List all projects with optional status filter.
   */
  async listProjects(status) {
    return this.store.listProjects(status);
  }
  /**
   * Delete (archive) a project.
   */
  async deleteProject(projectId) {
    await this.monitor.stopMonitoring(projectId);
    return this.store.deleteProject(projectId);
  }
  // ---------------------------------------------------------------------------
  // Planning
  // ---------------------------------------------------------------------------
  /**
   * Generate or regenerate the execution plan for a project.
   */
  async generatePlan(projectId, constraints) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    console.log(LOG_PREFIX5, `Generating plan for "${project.name}"`);
    const plan = await this.engine.decompose(
      project.name,
      project.description,
      project.goals,
      constraints
    );
    plan.projectId = project.id;
    project.plan = plan;
    project.status = "planning";
    project.updatedAt = Date.now();
    await this.store.saveProject(project);
    console.log(LOG_PREFIX5, `Plan generated: ${plan.tasks.length} tasks, v${plan.version}`);
    return plan;
  }
  /**
   * Trigger AI re-planning for a project.
   */
  async replanProject(projectId, reason) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    console.log(LOG_PREFIX5, `Re-planning "${project.name}": ${reason}`);
    const updatedPlan = await this.engine.replan(project.plan, reason, project.goals);
    project.plan = updatedPlan;
    project.updatedAt = Date.now();
    await this.store.saveProject(project);
    return updatedPlan;
  }
  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------
  /**
   * Start executing ready tasks in a project.
   */
  async executePlan(projectId) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    if (project.status === "planning") {
      project.status = "active";
      await this.store.saveProject(project);
      await this.monitor.startMonitoring(project);
    }
    this.orchestrator.setMaxConcurrent(project.settings.maxConcurrentTasks);
    const dispatched = await this.orchestrator.dispatchReadyTasks(project);
    await this.store.saveProject(project);
    return { started: dispatched > 0, dispatched };
  }
  /**
   * Pause project execution (does not cancel in-progress agent tasks).
   */
  async pauseProject(projectId) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    project.status = "paused";
    project.updatedAt = Date.now();
    await this.monitor.stopMonitoring(projectId);
    await this.store.saveProject(project);
    console.log(LOG_PREFIX5, `Project "${project.name}" paused`);
    return true;
  }
  // ---------------------------------------------------------------------------
  // Task Operations
  // ---------------------------------------------------------------------------
  /**
   * Update a task's status and/or add a note.
   */
  async updateTask(projectId, taskId, updates) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    const task = this.findTask(project.plan.tasks, taskId);
    if (!task) throw new Error(`Task ${taskId} not found in project ${projectId}`);
    const oldStatus = task.status;
    if (updates.status && updates.status !== task.status) {
      task.status = updates.status;
      if (updates.status === "in_progress" && !task.startedAt) {
        task.startedAt = Date.now();
      }
      if (updates.status === "done") {
        task.completedAt = Date.now();
      }
      this.ipc.send("planman:task:statusChanged", {
        projectId,
        taskId,
        oldStatus,
        newStatus: task.status
      });
    }
    if (updates.notes) {
      task.notes.push({
        author: "user",
        content: updates.notes,
        timestamp: Date.now(),
        type: "comment"
      });
    }
    await this.store.saveProject(project);
    if (updates.status === "done" && project.status === "active") {
      await this.orchestrator.dispatchReadyTasks(project);
      await this.store.saveProject(project);
    }
    return task;
  }
  /**
   * Assign a task to a specific agent.
   */
  async assignTask(projectId, taskId, agentId) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    const task = this.findTask(project.plan.tasks, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    task.assignedAgentId = agentId;
    if (task.status === "ready") {
      await this.orchestrator.assignTask(project, taskId, agentId);
    }
    await this.store.saveProject(project);
    return task;
  }
  /**
   * Search tasks across all projects.
   */
  async searchTasks(query) {
    const projectList = await this.store.listProjects();
    for (const entry of projectList) {
      await this.store.ensureLoaded(entry.id);
    }
    return this.store.searchTasksSemantic(query);
  }
  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------
  /**
   * Generate an AI-powered status report for a project.
   */
  async getProjectReport(projectId) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    return this.monitor.runHealthCheck(project);
  }
  /**
   * Get a quick status summary for a project.
   */
  async getProjectStatus(projectId) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    const tasks = project.plan.tasks;
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      completion: computeCompletionPercentage(tasks),
      totalTasks: tasks.length,
      doneTasks: tasks.filter((t) => t.status === "done").length,
      inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
      blockedTasks: tasks.filter((t) => t.status === "blocked").length,
      readyTasks: getReadyTasks(tasks).length
    };
  }
  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  async getSettings() {
    return this.store.getSettings();
  }
  async updateSettings(updates) {
    const current = await this.store.getSettings();
    const merged = { ...current, ...updates };
    await this.store.saveSettings(merged);
    this.monitor.updateSettings(merged);
    return merged;
  }
  // ---------------------------------------------------------------------------
  // Event Handlers (wired in constructor)
  // ---------------------------------------------------------------------------
  /**
   * Handle task status change from ExecutionOrchestrator.
   */
  async handleTaskStatusChange(projectId, taskId, oldStatus, newStatus, result, error) {
    const project = await this.store.ensureLoaded(projectId);
    if (!project) return;
    const task = this.findTask(project.plan.tasks, taskId);
    if (!task) return;
    task.status = newStatus;
    if (newStatus === "done") {
      task.completedAt = Date.now();
      if (result) {
        task.output = result;
        task.notes.push({
          author: "ai",
          content: `Task completed. Output: ${result.substring(0, 500)}`,
          timestamp: Date.now(),
          type: "observation"
        });
      }
    }
    if (newStatus === "blocked" && error) {
      task.notes.push({
        author: "ai",
        content: `Task blocked: ${error}`,
        timestamp: Date.now(),
        type: "blocker"
      });
    }
    this.ipc.send("planman:task:statusChanged", {
      projectId,
      taskId,
      oldStatus,
      newStatus
    });
    await this.store.saveProject(project);
    if (newStatus === "done" && project.status === "active") {
      await this.orchestrator.dispatchReadyTasks(project);
      await this.store.saveProject(project);
      const allDone = project.plan.tasks.every(
        (t) => t.status === "done" || t.status === "cancelled"
      );
      if (allDone) {
        project.status = "completed";
        await this.store.saveProject(project);
        await this.monitor.stopMonitoring(projectId);
        console.log(LOG_PREFIX5, `Project "${project.name}" completed!`);
        this.ipc.send("notify", {
          title: "Project Completed",
          message: `All tasks in "${project.name}" are done!`,
          type: "success",
          priority: "high",
          category: "planman",
          source: "planman"
        });
      }
    }
  }
  /**
   * Handle health report from ProgressMonitor.
   */
  async handleHealthReport(report) {
    console.log(
      LOG_PREFIX5,
      `Health report for ${report.projectId}: ${report.overallHealth} (${report.completionPercentage}% complete)`
    );
  }
  // ---------------------------------------------------------------------------
  // Agent Event Forwarding
  // ---------------------------------------------------------------------------
  /**
   * Forward agent task update events to the orchestrator.
   */
  async handleAgentTaskUpdate(event) {
    await this.orchestrator.handleAgentTaskUpdate(event);
  }
  /**
   * Forward agent task message events to the orchestrator.
   */
  async handleAgentTaskMessage(event) {
    await this.orchestrator.handleAgentTaskMessage(event);
  }
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  findTask(tasks, taskId) {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      const found = this.findTask(task.subtasks, taskId);
      if (found) return found;
    }
    return null;
  }
};

// plugins/planman/main/index.ts
var LOG_PREFIX6 = "[planman]";
var manager = null;
var monitor = null;
var activate = async (context) => {
  console.log(LOG_PREFIX6, "Activating...");
  let settings = DEFAULT_PROJECT_SETTINGS;
  try {
    const stored = await context.storage.get("planman:settings");
    if (stored) settings = { ...DEFAULT_PROJECT_SETTINGS, ...stored };
  } catch (err) {
    console.warn(LOG_PREFIX6, "Failed to load settings, using defaults");
  }
  const store = new ProjectStore(context.storage, context.ipc);
  const planEngine = new PlanEngine(context.ai);
  const orchestrator = new ExecutionOrchestrator(context.ipc);
  const progressMonitor = new ProgressMonitor(context.ai, context.ipc, settings);
  const projectManager = new ProjectManager(store, planEngine, orchestrator, progressMonitor, context.ipc);
  manager = projectManager;
  monitor = progressMonitor;
  await projectManager.initialize();
  registerTools(context, projectManager);
  registerDSNTools(context, projectManager);
  registerIPCHandlers(context, projectManager);
  context.ipc.on("agent:taskUpdate", async (event) => {
    await projectManager.handleAgentTaskUpdate(event);
  });
  context.ipc.on("agent:taskMessage", async (event) => {
    await projectManager.handleAgentTaskMessage(event);
  });
  if (context.traits) {
    context.traits.register({
      id: "planman",
      name: "Project Manager",
      description: "Create and manage AI-driven projects with task decomposition, agent assignment, and progress monitoring.",
      instruction: `You can manage projects using these tools:
- project_create: Create a new project with name, description, and goals
- project_plan: Generate an AI execution plan for a project
- project_execute: Start executing ready tasks by dispatching to agents
- project_status: Get current project status summary
- project_list: List all projects
- task_update: Update a task status or add notes
- task_assign: Assign a task to a specific agent
- task_search: Search across all project tasks`,
      activationMode: "dynamic",
      triggerKeywords: ["project", "plan", "task", "milestone", "sprint", "kanban", "manage", "schedule"]
    });
  }
  context.on("ready", () => {
    console.log(LOG_PREFIX6, "Plugin ready");
  });
};
var deactivate = async () => {
  console.log(LOG_PREFIX6, "Deactivating...");
  if (monitor) {
    await monitor.stopAll();
  }
  manager = null;
  monitor = null;
};
function registerTools(context, mgr) {
  if (!context.services?.tools) return;
  context.services.tools.register({
    name: "project_create",
    description: "Create a new managed project from a description and goals",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description" },
        goals: { type: "array", items: { type: "string" }, description: "Project goals" }
      },
      required: ["name", "description"]
    },
    handler: async (args) => mgr.createProject(args.name, args.description, args.goals)
  });
  context.services.tools.register({
    name: "project_plan",
    description: "Generate or regenerate the execution plan for a project using AI decomposition",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        constraints: { type: "string", description: "Optional constraints or preferences" }
      },
      required: ["projectId"]
    },
    handler: async (args) => mgr.generatePlan(args.projectId, args.constraints)
  });
  context.services.tools.register({
    name: "project_status",
    description: "Get the current status summary of a project",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" }
      },
      required: ["projectId"]
    },
    handler: async (args) => mgr.getProjectStatus(args.projectId)
  });
  context.services.tools.register({
    name: "project_execute",
    description: "Start executing ready tasks in a project by dispatching to agents",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" }
      },
      required: ["projectId"]
    },
    handler: async (args) => mgr.executePlan(args.projectId)
  });
  context.services.tools.register({
    name: "project_list",
    description: "List all managed projects with optional status filter",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status" }
      }
    },
    handler: async (args) => mgr.listProjects(args.status)
  });
  context.services.tools.register({
    name: "project_pause",
    description: "Pause a project execution",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" }
      },
      required: ["projectId"]
    },
    handler: async (args) => mgr.pauseProject(args.projectId)
  });
  context.services.tools.register({
    name: "project_replan",
    description: "Trigger AI re-planning for a project with a reason",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        reason: { type: "string" }
      },
      required: ["projectId", "reason"]
    },
    handler: async (args) => mgr.replanProject(args.projectId, args.reason)
  });
  context.services.tools.register({
    name: "project_report",
    description: "Generate a detailed AI status report for a project",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" }
      },
      required: ["projectId"]
    },
    handler: async (args) => mgr.getProjectReport(args.projectId)
  });
  context.services.tools.register({
    name: "task_update",
    description: "Update a task status or add notes",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        taskId: { type: "string" },
        status: { type: "string" },
        notes: { type: "string" }
      },
      required: ["projectId", "taskId"]
    },
    handler: async (args) => mgr.updateTask(args.projectId, args.taskId, {
      status: args.status,
      notes: args.notes
    })
  });
  context.services.tools.register({
    name: "task_assign",
    description: "Assign a task to a specific agent",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        taskId: { type: "string" },
        agentId: { type: "string" }
      },
      required: ["projectId", "taskId", "agentId"]
    },
    handler: async (args) => mgr.assignTask(args.projectId, args.taskId, args.agentId)
  });
  context.services.tools.register({
    name: "task_search",
    description: "Semantic search across all project tasks",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    },
    handler: async (args) => mgr.searchTasks(args.query)
  });
}
function registerDSNTools(context, mgr) {
  if (!context.dsn?.registerTool) return;
  const dsnMeta = {
    executionLocation: "SERVER",
    version: "1.0.0",
    semanticDomain: "cognitive",
    primeDomain: [2],
    smfAxes: [0, 0, 0, 0],
    requiredTier: "Neophyte"
  };
  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: "project_create",
      description: "Create a new managed project from a description and goals",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          goals: { type: "array", items: { type: "string" } }
        },
        required: ["name", "description"]
      }
    },
    async (args) => mgr.createProject(args.name, args.description, args.goals)
  );
  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: "project_status",
      description: "Get project status summary",
      parameters: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"]
      }
    },
    async (args) => mgr.getProjectStatus(args.projectId)
  );
  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: "project_list",
      description: "List all managed projects",
      parameters: {
        type: "object",
        properties: { status: { type: "string" } }
      }
    },
    async (args) => mgr.listProjects(args.status)
  );
  context.dsn.registerTool(
    {
      ...dsnMeta,
      name: "task_search",
      description: "Semantic search across all project tasks",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    },
    async (args) => mgr.searchTasks(args.query)
  );
}
function registerIPCHandlers(context, mgr) {
  context.ipc.handle(
    "planman:project:create",
    async (data) => mgr.createProject(data.name, data.description, data.goals)
  );
  context.ipc.handle(
    "planman:project:list",
    async (data) => mgr.listProjects(data?.status)
  );
  context.ipc.handle(
    "planman:project:get",
    async (data) => mgr.getProject(data.projectId)
  );
  context.ipc.handle("planman:project:delete", async (data) => {
    const deleted = await mgr.deleteProject(data.projectId);
    return { deleted };
  });
  context.ipc.handle(
    "planman:project:plan",
    async (data) => mgr.generatePlan(data.projectId, data.constraints)
  );
  context.ipc.handle(
    "planman:project:replan",
    async (data) => mgr.replanProject(data.projectId, data.reason)
  );
  context.ipc.handle(
    "planman:project:execute",
    async (data) => mgr.executePlan(data.projectId)
  );
  context.ipc.handle("planman:project:pause", async (data) => {
    const paused = await mgr.pauseProject(data.projectId);
    return { paused };
  });
  context.ipc.handle(
    "planman:project:report",
    async (data) => mgr.getProjectReport(data.projectId)
  );
  context.ipc.handle(
    "planman:project:status",
    async (data) => mgr.getProjectStatus(data.projectId)
  );
  context.ipc.handle(
    "planman:task:update",
    async (data) => mgr.updateTask(data.projectId, data.taskId, {
      status: data.status,
      notes: data.notes
    })
  );
  context.ipc.handle(
    "planman:task:assign",
    async (data) => mgr.assignTask(data.projectId, data.taskId, data.agentId)
  );
  context.ipc.handle(
    "planman:task:search",
    async (data) => mgr.searchTasks(data.query)
  );
  context.ipc.handle(
    "planman:settings:get",
    async () => mgr.getSettings()
  );
  context.ipc.handle(
    "planman:settings:update",
    async (data) => mgr.updateSettings(data)
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
