// client/src/shared/risa/types.ts

export type RISAEventType = 
  | 'memory.contribution.added'
  | 'memory.contribution.reinforced'
  | 'memory.field.created'
  | 'memory.field.locked'
  | 'memory.field.consensus.reached'
  | 'memory.field.queried'
  | 'resonance.prime.activated'
  | 'resonance.prime.deactivated'
  | 'resonance.entropy.increased'
  | 'resonance.entropy.decreased'
  | 'resonance.entropy.spike'
  | 'resonance.coherence.shift'
  | 'resonance.field.updated'
  | 'lifecycle.script.started'
  | 'lifecycle.script.stopped'
  | 'lifecycle.script.error'
  | 'lifecycle.task.created'
  | 'lifecycle.task.completed'
  | 'system.initialized'
  | 'system.alert'
  | 'system.health.check'
  | 'mesh.node.joined'
  | 'mesh.entanglement.created'
  | string; // Allow custom events

export interface RISAEvent {
  id: string;
  type: RISAEventType;
  payload: any;
  timestamp: string;
  source?: string;
}

export interface RISATrigger {
  type: 'event' | 'interval' | 'cron' | 'manual';
  eventType?: RISAEventType;
  filter?: any; // RISAEventFilter
  intervalMs?: number;
  cronExpression?: string;
}

export type ScriptCapability = 
  | 'memory.read'
  | 'memory.contribute'
  | 'memory.reinforce'
  | 'memory.query'
  | 'memory.lock'
  | 'script.invoke'
  | 'script.invoke.system'
  | 'script.install'
  | 'event.emit'
  | 'event.emit.system'
  | 'mesh.read'
  | 'mesh.write'
  | 'system.config';

export type InstallationSource = 'user' | 'aleph' | 'system';

export interface RISAScript {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  triggers: RISATrigger[];
  capabilities: ScriptCapability[];
  memoryFieldAccess?: {
    read: string[];
    write: string[];
  };
  installationSource: InstallationSource;
  primeSignature?: number[];
  entryFunction: string; // The JS/TS code content
  
  // Runtime state
  isActive?: boolean;
  installedAt?: string;
  updatedAt?: string;
}

export interface RISATask {
  id: string;
  scriptId: string;
  scriptName: string;
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'error' | 'completed';
  startedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  executionCount: number;
  totalExecutionTimeMs: number;
  errorCount: number;
  lastOutput?: any;
  lastError?: string;
  activeSubscriptions: string[];
  eventsProcessed: number;
  installedBy?: InstallationSource;
}

export interface RISAScriptContext {
  memory: {
    read(fieldId: string, key?: string): Promise<any>;
    contribute(fieldId: string, key: string, value: string, primeFactors: number[]): Promise<void>;
    reinforce(fieldId: string, contributionId: string): Promise<void>;
    query(fieldId: string, queryText: string): Promise<any[]>;
  };
  invoke(targetScriptId: string, method: string, args?: any): Promise<any>;
  invokeAsync(targetScriptId: string, method: string, args?: any, timeout?: number): Promise<any>;
  emit(eventType: RISAEventType, payload: any): void;
  subscribe(eventType: RISAEventType, callback: (event: RISAEvent) => void): string;
  unsubscribe(subscriptionId: string): void;
  log: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
  };
  scriptId: string;
  taskId: string;
}
