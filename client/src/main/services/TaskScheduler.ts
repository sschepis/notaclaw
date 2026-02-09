import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { AlephGunBridge, gunObjectsToArrays } from '@sschepis/alephnet-node';
import { IdentityManager } from './IdentityManager';
import { AIProviderManager } from './AIProviderManager';
import { ConversationManager } from './ConversationManager';
import { AlephNetClient } from './AlephNetClient';
import { logManager } from './LogManager';
import {
    ScheduledTask,
    ScheduledTaskStatus,
    TaskExecutionResult,
    CreateScheduledTaskOptions,
    UpdateScheduledTaskOptions,
    TaskParseRequest,
    TaskParseResult
} from '../../shared/alephnet-types';

/**
 * Cron expression parser and scheduler
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */
class CronParser {
    private static parseField(field: string, min: number, max: number): number[] {
        const values: number[] = [];
        
        if (field === '*') {
            for (let i = min; i <= max; i++) values.push(i);
            return values;
        }
        
        // Handle step values (*/5, 0-30/5)
        const stepMatch = field.match(/^(.+)\/(\d+)$/);
        if (stepMatch) {
            const base = this.parseField(stepMatch[1], min, max);
            const step = parseInt(stepMatch[2], 10);
            return base.filter((_, i) => i % step === 0);
        }
        
        // Handle ranges (1-5)
        const rangeMatch = field.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            for (let i = start; i <= end; i++) values.push(i);
            return values;
        }
        
        // Handle lists (1,3,5)
        if (field.includes(',')) {
            return field.split(',').flatMap(f => this.parseField(f.trim(), min, max));
        }
        
        // Single value
        const num = parseInt(field, 10);
        if (!isNaN(num) && num >= min && num <= max) {
            values.push(num);
        }
        
        return values;
    }
    
    static parse(expression: string): { minutes: number[]; hours: number[]; days: number[]; months: number[]; weekdays: number[] } {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) {
            throw new Error(`Invalid cron expression: ${expression}. Expected 5 fields.`);
        }
        
        return {
            minutes: this.parseField(parts[0], 0, 59),
            hours: this.parseField(parts[1], 0, 23),
            days: this.parseField(parts[2], 1, 31),
            months: this.parseField(parts[3], 1, 12),
            weekdays: this.parseField(parts[4], 0, 6) // 0 = Sunday
        };
    }
    
    static getNextRun(expression: string, after: Date = new Date()): Date {
        const schedule = this.parse(expression);
        const next = new Date(after.getTime());
        next.setSeconds(0, 0);
        next.setMinutes(next.getMinutes() + 1);
        
        // Find next valid time (max 1 year ahead)
        const maxIterations = 525600; // Minutes in a year
        for (let i = 0; i < maxIterations; i++) {
            const month = next.getMonth() + 1;
            const day = next.getDate();
            const weekday = next.getDay();
            const hour = next.getHours();
            const minute = next.getMinutes();
            
            if (
                schedule.months.includes(month) &&
                schedule.days.includes(day) &&
                schedule.weekdays.includes(weekday) &&
                schedule.hours.includes(hour) &&
                schedule.minutes.includes(minute)
            ) {
                return next;
            }
            
            next.setMinutes(next.getMinutes() + 1);
        }
        
        throw new Error('Could not find next run time within 1 year');
    }
    
    static validate(expression: string): { valid: boolean; error?: string } {
        try {
            this.parse(expression);
            return { valid: true };
        } catch (err: any) {
            return { valid: false, error: err.message };
        }
    }
    
    static toHumanReadable(expression: string): string {
        try {
            const schedule = this.parse(expression);
            const parts: string[] = [];
            
            // Minutes
            if (schedule.minutes.length === 60) {
                parts.push('every minute');
            } else if (schedule.minutes.length === 1) {
                parts.push(`at minute ${schedule.minutes[0]}`);
            } else {
                parts.push(`at minutes ${schedule.minutes.join(', ')}`);
            }
            
            // Hours
            if (schedule.hours.length === 24) {
                parts.push('of every hour');
            } else if (schedule.hours.length === 1) {
                parts.push(`of hour ${schedule.hours[0]}`);
            } else {
                parts.push(`of hours ${schedule.hours.join(', ')}`);
            }
            
            // Days
            if (schedule.days.length < 31) {
                parts.push(`on days ${schedule.days.join(', ')}`);
            }
            
            // Weekdays
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            if (schedule.weekdays.length < 7) {
                parts.push(`on ${schedule.weekdays.map(d => dayNames[d]).join(', ')}`);
            }
            
            return parts.join(' ');
        } catch {
            return expression;
        }
    }
}

/**
 * TaskScheduler - Manages scheduled AI tasks
 * Handles task persistence, cron scheduling, and execution
 */
export class TaskScheduler extends EventEmitter {
    private bridge: AlephGunBridge;
    private identity: IdentityManager;
    private aiManager: AIProviderManager;
    private conversationManager: ConversationManager;
    private alephNetClient: AlephNetClient;
    private tasks: Map<string, ScheduledTask> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private initialized: boolean = false;

    constructor(
        bridge: AlephGunBridge,
        identity: IdentityManager,
        aiManager: AIProviderManager,
        conversationManager: ConversationManager,
        alephNetClient: AlephNetClient
    ) {
        super();
        this.bridge = bridge;
        this.identity = identity;
        this.aiManager = aiManager;
        this.conversationManager = conversationManager;
        this.alephNetClient = alephNetClient;
    }

    private get user() {
        return this.bridge.getGun().user();
    }

    /**
     * Initialize the scheduler - load existing tasks and start scheduling
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        
        logManager.info('TaskScheduler', 'Initializing', 'Loading scheduled tasks...');
        
        try {
            const tasks = await this.listTasks();
            for (const task of tasks) {
                this.tasks.set(task.id, task);
                if (task.status === 'active') {
                    this.scheduleTask(task);
                }
            }
            
            this.initialized = true;
            logManager.info('TaskScheduler', 'Initialized', `Loaded ${tasks.length} tasks, ${this.timers.size} active`);
        } catch (err: any) {
            logManager.error('TaskScheduler', 'Initialization Failed', err.message);
        }
    }

    /**
     * Create a new scheduled task
     */
    async createTask(options: CreateScheduledTaskOptions): Promise<ScheduledTask> {
        if (!this.user?.is) throw new Error('User not authenticated');
        
        // Validate cron expression
        const cronValidation = CronParser.validate(options.cronSchedule);
        if (!cronValidation.valid) {
            throw new Error(`Invalid cron schedule: ${cronValidation.error}`);
        }
        
        const id = randomUUID();
        const now = Date.now();
        
        const task: ScheduledTask = {
            id,
            title: options.title,
            description: options.description,
            parentConversationId: options.parentConversationId,
            cronSchedule: options.cronSchedule,
            timezone: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            drivingPrompt: options.drivingPrompt,
            systemPrompt: options.systemPrompt,
            inputFields: options.inputFields || [],
            outputFormat: options.outputFormat || { type: 'text' },
            status: 'active',
            executionHistory: [],
            executionCount: 0,
            successCount: 0,
            errorCount: 0,
            modelAlias: options.modelAlias,
            assignedAgentIds: options.assignedAgentIds || [],
            contentType: options.contentType || 'agent',
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            createdAt: now,
            updatedAt: now,
            tags: options.tags
        };
        
        // Calculate next scheduled run
        task.nextScheduledAt = CronParser.getNextRun(task.cronSchedule).getTime();
        
        // Persist to GunDB
        await this.persistTask(task);
        
        // Add to local cache and schedule
        this.tasks.set(id, task);
        this.scheduleTask(task);
        
        logManager.info('TaskScheduler', 'Task Created', `${task.title} (${id.substring(0, 8)})`);
        this.emit('task:created', task);
        
        return task;
    }

    /**
     * Get a task by ID
     */
    async getTask(taskId: string): Promise<ScheduledTask> {
        // Check local cache first
        const cached = this.tasks.get(taskId);
        if (cached) return cached;
        
        if (!this.user?.is) throw new Error('User not authenticated');
        
        return new Promise((resolve, reject) => {
            this.user.get('tasks').get(taskId).once((data: any) => {
                if (!data) {
                    reject(new Error('Task not found'));
                    return;
                }
                const task = gunObjectsToArrays(data) as ScheduledTask;
                if (!task.executionHistory) task.executionHistory = [];
                if (!task.inputFields) task.inputFields = [];
                this.tasks.set(taskId, task);
                resolve(task);
            });
        });
    }

    /**
     * List all tasks, optionally filtered by status or parent conversation
     */
    async listTasks(options?: { status?: ScheduledTaskStatus; parentConversationId?: string }): Promise<ScheduledTask[]> {
        if (!this.user?.is) throw new Error('User not authenticated');
        
        return new Promise((resolve) => {
            const tasks: Record<string, ScheduledTask> = {};
            
            this.user.get('tasks').map().once((data: any, key: string) => {
                if (data && !data._) {
                    if (data === null) {
                        delete tasks[key];
                        return;
                    }
                    const task = gunObjectsToArrays(data) as ScheduledTask;
                    if (!task.executionHistory) task.executionHistory = [];
                    if (!task.inputFields) task.inputFields = [];
                    
                    // Apply filters
                    if (options?.status && task.status !== options.status) return;
                    if (options?.parentConversationId && task.parentConversationId !== options.parentConversationId) return;
                    
                    tasks[key] = task;
                }
            });
            
            setTimeout(() => {
                const list = Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt);
                resolve(list);
            }, 200);
        });
    }

    /**
     * Update a task
     */
    async updateTask(taskId: string, updates: UpdateScheduledTaskOptions): Promise<ScheduledTask> {
        const task = await this.getTask(taskId);
        
        // Validate cron if being updated
        if (updates.cronSchedule) {
            const cronValidation = CronParser.validate(updates.cronSchedule);
            if (!cronValidation.valid) {
                throw new Error(`Invalid cron schedule: ${cronValidation.error}`);
            }
        }
        
        // Apply updates
        const updatedTask: ScheduledTask = {
            ...task,
            ...updates,
            updatedAt: Date.now()
        };
        
        // Recalculate next run if schedule changed
        if (updates.cronSchedule) {
            updatedTask.nextScheduledAt = CronParser.getNextRun(updates.cronSchedule).getTime();
        }
        
        // Persist
        await this.persistTask(updatedTask);
        this.tasks.set(taskId, updatedTask);
        
        // Reschedule if needed
        if (updates.cronSchedule || updates.status) {
            this.cancelSchedule(taskId);
            if (updatedTask.status === 'active') {
                this.scheduleTask(updatedTask);
            }
        }
        
        logManager.info('TaskScheduler', 'Task Updated', `${updatedTask.title} (${taskId.substring(0, 8)})`);
        this.emit('task:updated', updatedTask);
        
        return updatedTask;
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string): Promise<boolean> {
        if (!this.user?.is) throw new Error('User not authenticated');
        
        this.cancelSchedule(taskId);
        this.tasks.delete(taskId);
        
        return new Promise((resolve, reject) => {
            this.user.get('tasks').get(taskId).put(null, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else {
                    logManager.info('TaskScheduler', 'Task Deleted', taskId.substring(0, 8));
                    this.emit('task:deleted', { taskId });
                    resolve(true);
                }
            });
        });
    }

    /**
     * Pause a task
     */
    async pauseTask(taskId: string): Promise<ScheduledTask> {
        return this.updateTask(taskId, { status: 'paused' });
    }

    /**
     * Resume a paused task
     */
    async resumeTask(taskId: string): Promise<ScheduledTask> {
        return this.updateTask(taskId, { status: 'active' });
    }

    /**
     * Execute a task immediately (manual trigger or scheduled)
     */
    async executeTask(taskId: string, inputValues?: Record<string, any>): Promise<TaskExecutionResult> {
        const task = await this.getTask(taskId);
        const executionId = randomUUID();
        const startTime = Date.now();
        
        const result: TaskExecutionResult = {
            id: executionId,
            taskId,
            executedAt: startTime,
            status: 'running',
            inputValues: inputValues || {}
        };
        
        logManager.info('TaskScheduler', 'Task Executing', `${task.title} (${taskId.substring(0, 8)})`);
        this.emit('task:executing', result);
        
        try {
            // Validate required inputs
            for (const field of task.inputFields) {
                if (field.required && !(field.name in (inputValues || {}))) {
                    if (field.defaultValue !== undefined) {
                        result.inputValues[field.name] = field.defaultValue;
                    } else {
                        throw new Error(`Missing required input: ${field.name}`);
                    }
                }
            }
            
            // Build the prompt with input values
            let prompt = task.drivingPrompt;
            for (const [key, value] of Object.entries(result.inputValues)) {
                prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
            }
            
            // Check for multi-agent execution
            if (task.assignedAgentIds && task.assignedAgentIds.length > 0) {
                await this.executeMultiAgentTask(task, prompt, startTime, result);
            } else {
                await this.executeSingleAgentTask(task, prompt, startTime, result);
            }
            
            // Update task statistics
            task.executionCount++;
            if (result.status === 'success') {
                task.successCount++;
            } else {
                task.errorCount++;
            }
            task.lastExecutedAt = startTime;
            
        } catch (err: any) {
            result.completedAt = Date.now();
            result.durationMs = result.completedAt - startTime;
            result.status = 'error';
            result.error = err.message;
            
            task.executionCount++;
            task.errorCount++;
            task.lastExecutedAt = startTime;
            
            logManager.error('TaskScheduler', 'Task Execution Failed', `${task.title}: ${err.message}`);
        }
        
        // Add to execution history (keep last 100)
        task.executionHistory = [result, ...task.executionHistory].slice(0, 100);
        
        // Calculate next run
        task.nextScheduledAt = CronParser.getNextRun(task.cronSchedule).getTime();
        task.updatedAt = Date.now();
        
        // Persist updated task
        await this.persistTask(task);
        this.tasks.set(taskId, task);
        
        // Reschedule if still active
        if (task.status === 'active') {
            this.scheduleTask(task);
        }
        
        this.emit('task:executed', result);
        return result;
    }

    private async executeMultiAgentTask(
        task: ScheduledTask,
        prompt: string,
        startTime: number,
        result: TaskExecutionResult
    ): Promise<void> {
        // Create a conversation for this execution
        const conversation = await this.conversationManager.createConversation(`Task: ${task.title} - ${new Date(startTime).toLocaleString()}`);
        result.conversationId = conversation.id;
        
        // Add system prompt if present
        if (task.systemPrompt) {
            await this.conversationManager.addMessage(conversation.id, {
                id: randomUUID(),
                role: 'system',
                content: task.systemPrompt,
                timestamp: Date.now()
            });
        }
        
        // Add driving prompt as User
        await this.conversationManager.addMessage(conversation.id, {
            id: randomUUID(),
            role: 'user',
            content: prompt,
            timestamp: Date.now()
        });
        
        result.agentResults = {};
        const agentIds = task.assignedAgentIds || [];
        
        // Helper for batch execution
        const executeAgent = async (agentId: string) => {
            let agentName = agentId;
            try {
                let agentSystemPrompt = '';
                try {
                    const agent = await this.alephNetClient.agentGet({ agentId });
                    agentName = agent.name;
                    agentSystemPrompt = `You are ${agent.name}. Goals: ${JSON.stringify(agent.goalPriors)}. Beliefs: ${JSON.stringify(agent.beliefs)}.`;
                } catch (e) {
                    logManager.warn('TaskScheduler', 'Agent Not Found', `Agent ${agentId} not found, using default behavior`);
                }

                const combinedSystemPrompt = `${task.systemPrompt || ''}\n\n${agentSystemPrompt}`;
                const fullAgentPrompt = `System: ${combinedSystemPrompt}\n\nUser: ${prompt}`;
                
                const completion = await this.aiManager.processRequest(fullAgentPrompt, {
                    contentType: task.contentType || 'agent',
                    model: task.modelAlias,
                    maxTokens: task.maxTokens,
                    temperature: task.temperature
                });

                const responseContent = completion.content;

                // Post response to conversation
                await this.conversationManager.addMessage(conversation.id, {
                    id: randomUUID(),
                    role: 'assistant',
                    content: `${agentName}: ${responseContent}`,
                    timestamp: Date.now()
                });

                if (result.agentResults) {
                    result.agentResults[agentId] = {
                        name: agentName,
                        output: responseContent,
                        status: 'success'
                    };
                }
                return `${agentName}: ${responseContent}`;
            } catch (err: any) {
                logManager.error('TaskScheduler', 'Agent Execution Failed', `${agentId}: ${err.message}`);
                if (result.agentResults) {
                    result.agentResults[agentId] = {
                        name: agentName,
                        output: '',
                        status: 'error',
                        error: err.message
                    };
                }
                return `[Error executing agent ${agentName}: ${err.message}]`;
            }
        };

        // Execute in batches of 5
        const batchSize = 5;
        const responses: string[] = [];
        
        for (let i = 0; i < agentIds.length; i += batchSize) {
            const batch = agentIds.slice(i, i + batchSize);
            const batchResponses = await Promise.all(batch.map(executeAgent));
            responses.push(...batchResponses);
        }

        result.output = responses.join('\n\n---\n\n');
        result.completedAt = Date.now();
        result.durationMs = result.completedAt - startTime;
        
        // Determine overall status - success if at least one agent succeeded? Or all?
        // Let's say success if not all failed.
        const errorCount = Object.values(result.agentResults).filter(r => r.status === 'error').length;
        if (errorCount === agentIds.length && agentIds.length > 0) {
            result.status = 'error';
            result.error = 'All agents failed to execute';
        } else {
            result.status = 'success';
        }
    }

    private async executeSingleAgentTask(
        task: ScheduledTask,
        prompt: string,
        startTime: number,
        result: TaskExecutionResult
    ): Promise<void> {
        // Build messages for AI (Single Agent/Default)
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
        
        if (task.systemPrompt) {
            messages.push({ role: 'system', content: task.systemPrompt });
        }
        
        // Add output format instructions if structured
        if (task.outputFormat.type === 'json' || task.outputFormat.type === 'structured') {
            const formatInstruction = task.outputFormat.schema
                ? `Respond with valid JSON matching this schema: ${JSON.stringify(task.outputFormat.schema)}`
                : 'Respond with valid JSON.';
            messages.push({ role: 'system', content: formatInstruction });
        }
        
        messages.push({ role: 'user', content: prompt });
        
        // Execute AI completion
        const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        
        const completion = await this.aiManager.processRequest(fullPrompt, {
            contentType: task.contentType || 'agent',
            model: task.modelAlias,
            maxTokens: task.maxTokens,
            temperature: task.temperature
        });
        
        result.output = completion.content;
        result.completedAt = Date.now();
        result.durationMs = result.completedAt - startTime;
        result.status = 'success';
        
        // Parse structured output if applicable
        if (task.outputFormat.type === 'json' || task.outputFormat.type === 'structured') {
            try {
                result.structuredOutput = JSON.parse(completion.content);
            } catch {
                logManager.warn('TaskScheduler', 'JSON Parse Failed', 'Output was not valid JSON');
            }
        }
    }

    /**
     * Get execution history for a task
     */
    async getTaskHistory(taskId: string, limit: number = 50): Promise<TaskExecutionResult[]> {
        const task = await this.getTask(taskId);
        return task.executionHistory.slice(0, limit);
    }

    /**
     * Parse a user message to extract task configuration
     * Uses AI to understand natural language task requests
     */
    async parseTaskRequest(request: TaskParseRequest): Promise<TaskParseResult> {
        const systemPrompt = `You are a task configuration assistant. Parse the user's request into a scheduled task configuration.

Extract the following from the user's message:
1. Task title (brief description)
2. Cron schedule (convert natural language to cron expression)
3. The driving prompt (what the AI should do each time)
4. Any input fields needed (variables the user might want to change)
5. Output format preference
6. Assigned agents (if mentioned, e.g., "Agent Smith", "researcher")
7. Preferred model (if mentioned, e.g., "gpt-4", "claude-3")

Common cron patterns:
- Every hour: 0 * * * *
- Every day at 9am: 0 9 * * *
- Every Monday at 10am: 0 10 * * 1
- Every 5 minutes: */5 * * * *
- Twice daily (9am and 5pm): 0 9,17 * * *

Respond in JSON format:
{
  "title": "string",
  "description": "string",
  "cronSchedule": "string (5-field cron)",
  "drivingPrompt": "string",
  "systemPrompt": "string (optional)",
  "inputFields": [{"name": "string", "type": "string|number|boolean", "description": "string", "required": boolean, "defaultValue": any}],
  "outputFormat": {"type": "text|json|markdown|html|structured"},
  "assignedAgentIds": ["string"], // List of agent names or IDs
  "modelAlias": "string", // Preferred model alias
  "clarificationNeeded": "string (if request is unclear)",
  "validationErrors": ["string"] (if any issues)
}`;

        try {
            const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: request.userMessage }
            ];
            
            // Add conversation context if provided
            if (request.conversationContext) {
                for (const msg of request.conversationContext.slice(-5)) {
                    messages.push({ role: msg.role as any, content: msg.content });
                }
            }
            
            // Build prompt from messages
            const parsePrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
            
            const completion = await this.aiManager.processRequest(parsePrompt, {
                contentType: 'agent'
            });
            
            const parsed = JSON.parse(completion.content);
            
            if (parsed.clarificationNeeded) {
                return {
                    success: false,
                    clarificationNeeded: parsed.clarificationNeeded,
                    validationErrors: parsed.validationErrors
                };
            }
            
            // Validate the cron expression
            const cronValidation = CronParser.validate(parsed.cronSchedule);
            if (!cronValidation.valid) {
                return {
                    success: false,
                    validationErrors: [`Invalid cron schedule: ${cronValidation.error}`]
                };
            }

            // Resolve agent names to IDs
            const assignedAgentIds: string[] = [];
            if (parsed.assignedAgentIds && Array.isArray(parsed.assignedAgentIds)) {
                for (const agentName of parsed.assignedAgentIds) {
                    try {
                        const agents = await this.alephNetClient.agentList({ name: agentName });
                        if (agents.length > 0) {
                            assignedAgentIds.push(agents[0].id);
                        } else if (agentName.startsWith('agent_')) {
                            assignedAgentIds.push(agentName);
                        }
                    } catch (e) {
                        // ignore errors resolving agents
                    }
                }
            }
            
            return {
                success: true,
                suggestedTask: {
                    title: parsed.title,
                    description: parsed.description,
                    parentConversationId: '', // Will be filled by caller
                    cronSchedule: parsed.cronSchedule,
                    drivingPrompt: parsed.drivingPrompt,
                    systemPrompt: parsed.systemPrompt,
                    inputFields: parsed.inputFields || [],
                    outputFormat: parsed.outputFormat || { type: 'text' },
                    assignedAgentIds,
                    modelAlias: parsed.modelAlias
                }
            };
        } catch (err: any) {
            return {
                success: false,
                validationErrors: [`Failed to parse task request: ${err.message}`]
            };
        }
    }

    /**
     * Get a human-readable description of a cron schedule
     */
    getCronDescription(expression: string): string {
        return CronParser.toHumanReadable(expression);
    }

    /**
     * Validate a cron expression
     */
    validateCron(expression: string): { valid: boolean; error?: string; nextRun?: number } {
        const validation = CronParser.validate(expression);
        if (validation.valid) {
            return {
                valid: true,
                nextRun: CronParser.getNextRun(expression).getTime()
            };
        }
        return validation;
    }

    /**
     * Shutdown the scheduler gracefully
     */
    shutdown(): void {
        for (const [taskId] of this.timers) {
            this.cancelSchedule(taskId);
        }
        this.tasks.clear();
        logManager.info('TaskScheduler', 'Shutdown', 'All scheduled tasks stopped');
    }

    // ────────────────────────────────────────────────────────────────────
    // Private helpers
    // ────────────────────────────────────────────────────────────────────

    private async persistTask(task: ScheduledTask): Promise<void> {
        if (!this.user?.is) throw new Error('User not authenticated');
        
        // GunDB doesn't handle arrays well, so we store execution history separately
        const taskForStorage = { ...task };
        
        return new Promise((resolve, reject) => {
            this.user.get('tasks').get(task.id).put(taskForStorage, (ack: any) => {
                if (ack.err) reject(new Error(ack.err));
                else resolve();
            });
        });
    }

    private scheduleTask(task: ScheduledTask): void {
        // Cancel any existing schedule
        this.cancelSchedule(task.id);
        
        if (task.status !== 'active') return;
        
        const now = Date.now();
        const nextRun = task.nextScheduledAt || CronParser.getNextRun(task.cronSchedule).getTime();
        const delay = Math.max(0, nextRun - now);
        
        // Cap delay to 24 hours to avoid Node.js timer issues with large values
        // For longer delays, we'll reschedule when the timer fires
        const maxDelay = 24 * 60 * 60 * 1000;
        const effectiveDelay = Math.min(delay, maxDelay);
        
        const timer = setTimeout(async () => {
            if (delay > maxDelay) {
                // Not time yet, reschedule
                this.scheduleTask(task);
            } else {
                // Time to execute
                try {
                    await this.executeTask(task.id);
                } catch (err: any) {
                    logManager.error('TaskScheduler', 'Scheduled Execution Failed', err.message);
                }
            }
        }, effectiveDelay);
        
        this.timers.set(task.id, timer);
        
        logManager.debug('TaskScheduler', 'Task Scheduled', 
            `${task.title} next run at ${new Date(nextRun).toISOString()}`);
    }

    private cancelSchedule(taskId: string): void {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
    }
}
