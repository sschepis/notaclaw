// =============================================================================
// ProgressMonitor — Scheduled Health Checks
// =============================================================================
// Periodically evaluates project health using AI. Detects stale tasks, blockers,
// critical path drift, and agent errors. See DESIGN.md §ProgressMonitor.

import {
  Project,
  PlanTask,
  Milestone,
  ProjectSettings,
  ProjectHealthReport,
  HealthFinding,
  AICompleteParams,
  AICompleteResult,
  computeCompletionPercentage,
} from './types';

const LOG_PREFIX = '[planman:monitor]';

/** AI completion adapter. */
interface AIAdapter {
  complete: (params: AICompleteParams) => Promise<AICompleteResult>;
}

/** IPC adapter for TaskScheduler and notification communication. */
interface IPCAdapter {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
}

/** Callback for when a health check completes. */
export type HealthCheckCallback = (report: ProjectHealthReport) => Promise<void>;

/** Callback for triggering re-plan on a project. */
export type ReplanCallback = (projectId: string, reason: string) => Promise<void>;

/** Tracks a scheduled monitor for a project. */
interface MonitorEntry {
  projectId: string;
  schedulerTaskId?: string;
  lastCheck?: ProjectHealthReport;
}

export class ProgressMonitor {
  private ai: AIAdapter;
  private ipc: IPCAdapter;
  private monitors: Map<string, MonitorEntry> = new Map();
  private onHealthCheck?: HealthCheckCallback;
  private onReplanNeeded?: ReplanCallback;
  private settings: ProjectSettings;

  constructor(ai: AIAdapter, ipc: IPCAdapter, settings: ProjectSettings) {
    this.ai = ai;
    this.ipc = ipc;
    this.settings = settings;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  setHealthCheckCallback(callback: HealthCheckCallback): void {
    this.onHealthCheck = callback;
  }

  setReplanCallback(callback: ReplanCallback): void {
    this.onReplanNeeded = callback;
  }

  updateSettings(settings: ProjectSettings): void {
    this.settings = settings;
  }

  // ---------------------------------------------------------------------------
  // Monitor Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start monitoring an active project.
   * Registers a scheduled task with TaskScheduler via IPC.
   */
  async startMonitoring(project: Project): Promise<void> {
    if (this.monitors.has(project.id)) {
      console.log(LOG_PREFIX, `Already monitoring project "${project.name}"`);
      return;
    }

    const entry: MonitorEntry = { projectId: project.id };

    try {
      // Create a scheduled task via TaskScheduler IPC
      const result = await this.ipc.invoke('scheduler:createTask', {
        name: `planman-monitor-${project.id}`,
        description: `Health check for project "${project.name}"`,
        cronExpression: this.settings.checkInterval,
        drivingPrompt: this.buildHealthCheckPrompt(project),
        metadata: {
          source: 'planman',
          projectId: project.id,
          type: 'health_check',
        },
      });

      if (result && result.taskId) {
        entry.schedulerTaskId = result.taskId;
      }
    } catch (err) {
      console.warn(LOG_PREFIX, `Failed to create scheduler task for "${project.name}" (will use manual checks):`, err);
    }

    this.monitors.set(project.id, entry);
    console.log(LOG_PREFIX, `Started monitoring project "${project.name}"`);
  }

  /**
   * Stop monitoring a project.
   */
  async stopMonitoring(projectId: string): Promise<void> {
    const entry = this.monitors.get(projectId);
    if (!entry) return;

    if (entry.schedulerTaskId) {
      try {
        await this.ipc.invoke('scheduler:deleteTask', { taskId: entry.schedulerTaskId });
      } catch (err) {
        console.warn(LOG_PREFIX, `Failed to delete scheduler task:`, err);
      }
    }

    this.monitors.delete(projectId);
    console.log(LOG_PREFIX, `Stopped monitoring project ${projectId}`);
  }

  /**
   * Stop monitoring all projects.
   */
  async stopAll(): Promise<void> {
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
  async runHealthCheck(project: Project): Promise<ProjectHealthReport> {
    console.log(LOG_PREFIX, `Running health check for "${project.name}"`);

    // Gather project state metrics
    const allTasks = project.plan.tasks;
    const metrics = this.computeMetrics(allTasks, project.milestones);

    // Run AI health assessment
    const aiAssessment = await this.getAIAssessment(project, metrics);

    // Combine metrics-based findings with AI assessment
    const report: ProjectHealthReport = {
      projectId: project.id,
      timestamp: Date.now(),
      overallHealth: this.determineOverallHealth(metrics, aiAssessment),
      completionPercentage: metrics.completionPercentage,
      estimatedCompletionAt: project.plan.estimatedCompletionAt,
      findings: [...metrics.findings, ...aiAssessment.findings],
      recommendations: aiAssessment.recommendations || [],
    };

    // Store the report
    const entry = this.monitors.get(project.id);
    if (entry) {
      entry.lastCheck = report;
    }

    // Notify listeners
    if (this.onHealthCheck) {
      await this.onHealthCheck(report);
    }

    // Broadcast to renderer
    this.ipc.send('planman:project:healthUpdate', report);

    // Auto-replan if critical issues and setting enabled
    if (this.settings.autoReplan && report.overallHealth === 'critical') {
      const blockerSummary = report.findings
        .filter(f => f.severity === 'critical')
        .map(f => f.message)
        .join('; ');

      if (blockerSummary && this.onReplanNeeded) {
        console.log(LOG_PREFIX, `Auto-replan triggered for "${project.name}"`);
        await this.onReplanNeeded(project.id, `Auto-replan: ${blockerSummary}`);
      }
    }

    // Check milestones
    await this.checkMilestones(project);

    return report;
  }

  /**
   * Get the last health report for a project.
   */
  getLastReport(projectId: string): ProjectHealthReport | undefined {
    return this.monitors.get(projectId)?.lastCheck;
  }

  // ---------------------------------------------------------------------------
  // Metrics Computation
  // ---------------------------------------------------------------------------

  private computeMetrics(
    tasks: PlanTask[],
    milestones: Milestone[]
  ): { completionPercentage: number; findings: HealthFinding[] } {
    const findings: HealthFinding[] = [];
    const now = Date.now();

    const completionPercentage = computeCompletionPercentage(tasks);

    // Detect stale tasks (in_progress for > 2x estimated effort, estimated as > 1 hour)
    for (const task of tasks) {
      if (task.status === 'in_progress' && task.startedAt) {
        const elapsed = now - task.startedAt;
        const estimatedMs = this.parseEffortToMs(task.estimatedEffort);
        if (estimatedMs > 0 && elapsed > estimatedMs * 2) {
          findings.push({
            type: 'stale_task',
            severity: 'warning',
            taskId: task.id,
            message: `Task "${task.title}" has been in progress for ${this.formatDuration(elapsed)} (estimated: ${task.estimatedEffort})`,
            suggestedAction: 'Check agent status or consider re-assigning',
          });
        }
      }

      // Detect blocked tasks with no resolution notes
      if (task.status === 'blocked') {
        const hasResolution = task.notes.some(n => n.type === 'resolution');
        if (!hasResolution) {
          findings.push({
            type: 'blocker',
            severity: 'critical',
            taskId: task.id,
            message: `Task "${task.title}" is blocked with no resolution`,
            suggestedAction: 'Investigate blocker and either resolve or re-plan',
          });
        }
      }
    }

    return { completionPercentage, findings };
  }

  // ---------------------------------------------------------------------------
  // AI Assessment
  // ---------------------------------------------------------------------------

  private async getAIAssessment(
    project: Project,
    metrics: { completionPercentage: number; findings: HealthFinding[] }
  ): Promise<{ findings: HealthFinding[]; recommendations: string[] }> {
    const taskSummary = project.plan.tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      estimatedEffort: t.estimatedEffort,
      startedAt: t.startedAt,
      dependsOn: t.dependsOn,
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
            role: 'system',
            content: 'You are a project health analyst. Evaluate the project and identify risks, bottlenecks, and recommendations. Be concise and actionable.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.content);
      return {
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch (err) {
      console.warn(LOG_PREFIX, 'AI health assessment failed:', err);
      return { findings: [], recommendations: [] };
    }
  }

  // ---------------------------------------------------------------------------
  // Milestone Checks
  // ---------------------------------------------------------------------------

  private async checkMilestones(project: Project): Promise<void> {
    for (const milestone of project.milestones) {
      if (milestone.status === 'completed') continue;

      const milestoneTasks = project.plan.tasks.filter(t => milestone.taskIds.includes(t.id));
      const doneCount = milestoneTasks.filter(t => t.status === 'done').length;
      const percentage = milestoneTasks.length > 0
        ? Math.round((doneCount / milestoneTasks.length) * 100)
        : 0;

      milestone.completionPercentage = percentage;

      if (doneCount > 0 && milestone.status === 'pending') {
        milestone.status = 'in_progress';
      }

      if (percentage === 100) {
        milestone.status = 'completed';

        // Emit milestone reached event
        this.ipc.send('planman:milestone:reached', {
          projectId: project.id,
          milestoneId: milestone.id,
          name: milestone.name,
        });

        // Send notification if configured
        if (this.settings.notifyOnMilestone) {
          this.ipc.send('notify', {
            title: `Milestone Reached: ${milestone.name}`,
            message: `Project "${project.name}" reached milestone "${milestone.name}"`,
            type: 'success',
            priority: 'high',
            category: 'planman',
            source: 'planman',
          });
        }

        console.log(LOG_PREFIX, `Milestone "${milestone.name}" completed for "${project.name}"`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Health Determination
  // ---------------------------------------------------------------------------

  private determineOverallHealth(
    metrics: { completionPercentage: number; findings: HealthFinding[] },
    aiAssessment: { findings: HealthFinding[]; recommendations: string[] }
  ): 'healthy' | 'at_risk' | 'critical' {
    const allFindings = [...metrics.findings, ...aiAssessment.findings];
    const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
    const warningCount = allFindings.filter(f => f.severity === 'warning').length;

    if (criticalCount > 0) return 'critical';
    if (warningCount >= 3) return 'at_risk';
    return 'healthy';
  }

  // ---------------------------------------------------------------------------
  // Prompt Building
  // ---------------------------------------------------------------------------

  private buildHealthCheckPrompt(project: Project): string {
    return `Monitor project "${project.name}" health. Check for stale tasks, blockers, and critical path drift. Report findings.`;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private parseEffortToMs(effort: string): number {
    const lower = effort.toLowerCase().trim();
    const match = lower.match(/^(\d+(?:\.\d+)?)\s*(h(?:ours?)?|d(?:ays?)?|m(?:in(?:utes?)?)?)/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2][0];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 8 * 60 * 60 * 1000; // 8-hour workday
      default: return 0;
    }
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
}
