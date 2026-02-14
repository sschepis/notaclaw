import { app } from 'electron';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as vm from 'vm';
import path from 'path';
import fs from 'fs/promises';
import { 
  RISAScript, 
  RISATask, 
  RISAEvent, 
  RISAEventType, 
  RISAScriptContext
} from '../../shared/risa/types';
// import { ServiceRegistry } from './ServiceRegistry';
import { logger } from './Logger';
import { entropyMonitorScript } from './risa/system-scripts/entropy-monitor';
import { coherenceTrackerScript } from './risa/system-scripts/coherence-tracker';

const SCRIPTS_FILE = 'risa-scripts.json';

export class RISAService extends EventEmitter {
  private scripts: Map<string, RISAScript> = new Map();
  private tasks: Map<string, RISATask> = new Map();
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  // private eventSubscriptions: Map<string, Set<string>> = new Map(); // eventType -> Set<taskId>
  private log = logger.child({ category: 'RISAService' });
  private storagePath: string | null = null;

  constructor() {
    super();
  }

  async initialize() {
    this.log.info('Initializing RISA Service...');
    
    // Initialize storage path
    this.storagePath = path.join(app.getPath('userData'), SCRIPTS_FILE);
    
    // Load persisted scripts
    await this.loadScripts();

    // Install system scripts (ensure they exist and are up to date)
    await this.installSystemScript(entropyMonitorScript);
    await this.installSystemScript(coherenceTrackerScript);

    // Start auto-start scripts
    this.startAutoScripts();

    this.emit('system.initialized', { timestamp: new Date().toISOString() });
  }

  private async getStoragePath(): Promise<string> {
    if (!this.storagePath) {
        // Fallback if initialize wasn't called (shouldn't happen in normal flow)
        this.storagePath = path.join(app.getPath('userData'), SCRIPTS_FILE);
    }
    return this.storagePath;
  }

  private async loadScripts() {
    try {
      const filePath = await this.getStoragePath();
      const data = await fs.readFile(filePath, 'utf-8');
      const scripts = JSON.parse(data) as RISAScript[];
      
      for (const script of scripts) {
        this.scripts.set(script.id, script);
        if (script.isActive) {
            this.setupTriggers(script);
        }
      }
      this.log.info(`Loaded ${scripts.length} scripts from storage.`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.log.error('Failed to load scripts:', error);
      } else {
        this.log.info('No existing scripts found.');
      }
    }
  }

  private async saveScripts() {
    try {
      const filePath = await this.getStoragePath();
      const scripts = Array.from(this.scripts.values());
      // Don't persist system scripts? Or do we?
      // Let's persist all for simplicity, but maybe filter out system ones if we want them to be immutable/updated by code.
      // Actually, persisting system scripts allows us to track their state (isActive).
      // However, if we update the code in the repo, we want that to take precedence.
      // For now, let's persist everything.
      await fs.writeFile(filePath, JSON.stringify(scripts, null, 2), 'utf-8');
    } catch (error: any) {
      this.log.error('Failed to save scripts:', error.message || String(error));
    }
  }

  private async installSystemScript(scriptDef: Omit<RISAScript, 'id' | 'installedAt' | 'updatedAt'>) {
    // Check if already installed (by name and source)
    const existing = Array.from(this.scripts.values()).find(s => s.name === scriptDef.name && s.installationSource === 'system');
    
    if (!existing) {
      await this.installScript(scriptDef);
    } else {
      // Update code/definition if changed (system scripts should reflect codebase)
      // But preserve ID and runtime state
      const updatedScript = {
        ...existing,
        ...scriptDef, // Overwrite with new definition
        updatedAt: new Date().toISOString()
      };
      this.scripts.set(existing.id, updatedScript);
      
      // Refresh triggers
      this.cleanupTriggers(existing.id);
      if (updatedScript.isActive) {
        this.setupTriggers(updatedScript);
      }
      
      await this.saveScripts();
    }
  }

  private startAutoScripts() {
    for (const script of this.scripts.values()) {
        if (script.isActive) {
            // Check if it has an interval trigger, setupTriggers handles that.
            // If it has a 'startup' trigger (not yet implemented in types, but could be useful)
            // For now, setupTriggers is enough for intervals.
        }
    }
  }

  // --- Script Management ---

  async installScript(script: Omit<RISAScript, 'id' | 'installedAt' | 'updatedAt'>): Promise<RISAScript> {
    const newScript: RISAScript = {
      ...script,
      id: uuidv4(),
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    this.scripts.set(newScript.id, newScript);
    this.log.info(`Installed script: ${newScript.name} (${newScript.id})`);
    
    // Setup triggers
    this.setupTriggers(newScript);
    
    await this.saveScripts();

    return newScript;
  }

  async updateScript(id: string, updates: Partial<RISAScript>): Promise<RISAScript> {
    const script = this.scripts.get(id);
    if (!script) {
      throw new Error(`Script not found: ${id}`);
    }

    const updatedScript = {
      ...script,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.scripts.set(id, updatedScript);
    
    // Refresh triggers if needed
    this.cleanupTriggers(id);
    if (updatedScript.isActive) {
      this.setupTriggers(updatedScript);
    }
    
    await this.saveScripts();

    return updatedScript;
  }

  async uninstallScript(id: string): Promise<void> {
    this.cleanupTriggers(id);
    this.stopTask(id); // Stop any running task for this script
    this.scripts.delete(id);
    this.log.info(`Uninstalled script: ${id}`);
    await this.saveScripts();
  }

  getScripts(): RISAScript[] {
    return Array.from(this.scripts.values());
  }

  getScript(id: string): RISAScript | undefined {
    return this.scripts.get(id);
  }

  // --- Task Management ---

  async startTask(scriptId: string, triggerEvent?: RISAEvent): Promise<string> {
    const script = this.scripts.get(scriptId);
    if (!script) {
      throw new Error(`Script not found: ${scriptId}`);
    }

    const taskId = uuidv4();
    const task: RISATask = {
      id: taskId,
      scriptId: script.id,
      scriptName: script.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      executionCount: 0, // This is per-task instance, so 0 at start
      totalExecutionTimeMs: 0,
      errorCount: 0,
      activeSubscriptions: [],
      eventsProcessed: 0,
      installedBy: script.installationSource
    };

    this.tasks.set(taskId, task);
    this.emit('lifecycle.task.created', { taskId, scriptId });

    // Execute the script
    this.executeScript(task, script, triggerEvent).catch(err => {
      this.log.error(`Error executing task ${taskId}:`, err);
    });

    return taskId;
  }

  async stopTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'stopped';
      // Clean up subscriptions
      task.activeSubscriptions.forEach(subId => this.unsubscribe(subId));
      task.activeSubscriptions = [];
      this.tasks.set(taskId, task);
      this.emit('lifecycle.task.completed', { taskId, status: 'stopped' });
    }
  }

  getTasks(): RISATask[] {
    return Array.from(this.tasks.values());
  }

  // --- Execution Engine ---

  private async executeScript(task: RISATask, script: RISAScript, triggerEvent?: RISAEvent) {
    const context = this.createContext(task, script);
    const startTime = Date.now();

    try {
      // Create a VM context
      const sandbox = {
        context,
        event: triggerEvent,
        console: {
          log: (msg: string) => context.log.info(msg),
          error: (msg: string) => context.log.error(msg),
          warn: (msg: string) => context.log.warn(msg)
        },
        // Add other globals as needed
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval
      };

      vm.createContext(sandbox);

      // Wrap entry function
      // We wrap in an IIFE async function to allow top-level await if needed inside the entry function
      const code = `
        (async () => {
          try {
            ${script.entryFunction}
            if (typeof main === 'function') {
               return await main(context, event);
            }
          } catch (e) {
            throw e;
          }
        })()
      `;

      const result = await vm.runInContext(code, sandbox, {
        timeout: 300000, // 5 min timeout — agent is trusted
        displayErrors: true
      });

      task.lastOutput = result;
      task.status = 'completed';
    } catch (error: any) {
      task.status = 'error';
      task.lastError = error.message;
      task.errorCount++;
      this.log.error(`Script execution failed (${script.name}):`, error);
    } finally {
      const duration = Date.now() - startTime;
      task.totalExecutionTimeMs += duration;
      task.executionCount++; // Update stats
      
      this.emit('lifecycle.task.completed', { 
        taskId: task.id, 
        scriptId: script.id,
        status: task.status,
        duration 
      });
    }
  }

  private createContext(task: RISATask, script: RISAScript): RISAScriptContext {
    return {
      memory: {
        read: async (fieldId, key) => {
          // TODO: Connect to actual MemoryService
          this.log.info(`[Script ${script.name}] Reading memory ${fieldId}:${key}`);
          return null;
        },
        contribute: async (fieldId, key, value, primes) => {
          this.log.info(`[Script ${script.name}] Contributing to ${fieldId}`);
          this.emitEvent('memory.contribution.added', { fieldId, key, value, primes });
        },
        reinforce: async (_fieldId, contributionId) => {
           this.log.info(`[Script ${script.name}] Reinforcing ${contributionId}`);
        },
        query: async (_fieldId, _query) => {
          return [];
        }
      },
      invoke: async (targetId, method, _args) => {
        // Find target script
        const target = this.scripts.get(targetId);
        if (!target) throw new Error(`Target script ${targetId} not found`);
        // This is tricky - we'd need to spawn a new task or run in same context?
        // For now, let's just log it
        this.log.info(`[Script ${script.name}] Invoking ${targetId}.${method}`);
        return null;
      },
      invokeAsync: async (_targetId, _method, _args, _timeout) => {
         return null;
      },
      emit: (type, payload) => {
        this.emitEvent(type, payload, script.id);
      },
      subscribe: (_type, _callback) => {
        // Subscription handling in VM is complex.
        // For now, we return a mock ID.
        return 'sub-id-placeholder';
      },
      unsubscribe: (id) => this.unsubscribe(id),
      log: {
        info: (msg) => this.log.info(`[Script ${script.name}] ${msg}`),
        warn: (msg) => this.log.warn(`[Script ${script.name}] ${msg}`),
        error: (msg) => this.log.error(`[Script ${script.name}] ${msg}`),
        debug: (msg) => this.log.debug(`[Script ${script.name}] ${msg}`)
      },
      scriptId: script.id,
      taskId: task.id
    };
  }

  // --- Event System ---
  
  unsubscribe(_id: string) {
    // Implement unsubscribe logic if we track subscriptions
  }

  emitEvent(type: RISAEventType, payload: any, source?: string) {
    const event: RISAEvent = {
      id: uuidv4(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      source
    };

    // Notify internal listeners (other parts of the app)
    this.emit(type, event);

    // Check for script triggers
    this.checkEventTriggers(event);
  }

  private checkEventTriggers(event: RISAEvent) {
    for (const script of this.scripts.values()) {
      if (!script.isActive) continue;

      for (const trigger of script.triggers) {
        if (trigger.type === 'event' && trigger.eventType === event.type) {
          // Check filter if needed
          // if (this.matchesFilter(event, trigger.filter)) ...
          
          this.startTask(script.id, event);
        }
      }
    }
  }

  // --- Internal Helpers ---

  private setupTriggers(script: RISAScript) {
    script.triggers.forEach(trigger => {
      if (trigger.type === 'interval' && trigger.intervalMs) {
        const interval = setInterval(() => {
          this.startTask(script.id);
        }, trigger.intervalMs);
        this.activeIntervals.set(`${script.id}-interval`, interval);
      }
      // Cron and Event triggers are handled elsewhere
    });
  }

  private cleanupTriggers(scriptId: string) {
    // Clear intervals
    const intervalKey = `${scriptId}-interval`;
    if (this.activeIntervals.has(intervalKey)) {
      clearInterval(this.activeIntervals.get(intervalKey)!);
      this.activeIntervals.delete(intervalKey);
    }
  }
}
