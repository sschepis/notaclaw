# Tasks: Recurring & Triggered Processes

A **Task** is a logical entity representing a recurring or triggered process that can be executed by agents in the AlephNet mesh. Tasks enable scheduled automation, user-triggered workflows, and service composition.

## Task Entity Definition

```typescript
/**
 * Task - A recurring or triggered process definition
 */
export interface TaskDefinition {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  
  /** Unique task identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description of what this task does */
  description: string;
  
  /** Version string (semver) */
  version: string;
  
  /** Owner's node ID or user ID */
  ownerId: string;
  
  // ═══════════════════════════════════════════════════════════════
  // SCHEDULING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Execution schedule configuration
   */
  schedule: {
    /** Trigger type */
    type: 'CRON' | 'INTERVAL' | 'EVENT' | 'MANUAL';
    
    /** Cron expression (for CRON type) */
    cron?: string;
    
    /** Interval in milliseconds (for INTERVAL type) */
    intervalMs?: number;
    
    /** Event patterns to listen for (for EVENT type) */
    eventPatterns?: string[];
    
    /** Timezone for schedule evaluation */
    timezone?: string;
    
    /** Whether the task is currently active */
    enabled: boolean;
    
    /** Maximum concurrent executions */
    maxConcurrent: number;
    
    /** Retry configuration */
    retry: {
      maxAttempts: number;
      backoffMs: number;
      backoffMultiplier: number;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INPUT SPECIFICATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Required input data and types
   */
  inputs: {
    /** JSON Schema for input validation */
    schema: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        required?: boolean;
        default?: any;
        enum?: any[];
      }>;
      required: string[];
    };
    
    /** Example input for documentation */
    example?: Record<string, any>;
    
    /** Semantic signature of expected input */
    smfSignature?: number[];
  };
  
  // ═══════════════════════════════════════════════════════════════
  // OUTPUT SPECIFICATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Output format specification
   */
  output: {
    /** JSON Schema for output */
    schema: {
      type: 'object';
      properties: Record<string, any>;
    };
    
    /** Output format type */
    format: 'JSON' | 'TEXT' | 'MARKDOWN' | 'HTML' | 'BINARY';
    
    /** Where to store output */
    storage: {
      /** Store in conversation */
      toConversation?: boolean;
      /** Store in GMF */
      toGMF?: boolean;
      /** Store in content store */
      toContentStore?: boolean;
      /** Webhook URL for output */
      webhookUrl?: string;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // EXECUTION CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Preferred model for execution
   */
  preferredModel: {
    provider: 'openai' | 'anthropic' | 'local-llama' | 'vertex-ai' | 'any';
    modelName?: string;
    minContextWindow?: number;
    temperature?: number;
    maxTokens?: number;
  };
  
  /**
   * Required services for execution
   */
  requiredServices: Array<{
    serviceId: string;
    required: boolean;
    config?: Record<string, any>;
  }>;
  
  /**
   * Required skills for execution
   */
  requiredSkills: string[];
  
  /**
   * Semantic domain preference for routing
   */
  semanticDomain: SemanticDomain;
  
  /**
   * Minimum staking tier required
   */
  requiredTier: 'Neophyte' | 'Adept' | 'Magus' | 'Archon';
  
  // ═══════════════════════════════════════════════════════════════
  // EXECUTION LOGIC
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * The prompt that describes the task execution logic
   */
  prompt: {
    /** System prompt for the agent */
    system: string;
    
    /** Template for user prompt (with {{variable}} placeholders) */
    userTemplate: string;
    
    /** Chain-of-thought instructions */
    chainOfThought?: string;
    
    /** Examples for few-shot learning */
    examples?: Array<{
      input: Record<string, any>;
      output: any;
    }>;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // VALIDATION RULES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Validation rules to ensure task runs correctly
   */
  validation: {
    /** Pre-execution validation */
    preExecution: Array<{
      type: 'INPUT_SCHEMA' | 'SERVICE_AVAILABLE' | 'TIER_CHECK' | 'BALANCE_CHECK' | 'CUSTOM';
      config?: Record<string, any>;
      errorMessage: string;
    }>;
    
    /** Post-execution validation */
    postExecution: Array<{
      type: 'OUTPUT_SCHEMA' | 'COHERENCE_CHECK' | 'SMF_THRESHOLD' | 'CUSTOM';
      config?: Record<string, any>;
      errorMessage: string;
      action: 'FAIL' | 'WARN' | 'RETRY';
    }>;
    
    /** Coherence threshold for output */
    minCoherence: number;
    
    /** Maximum execution time in milliseconds */
    timeoutMs: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // ECONOMICS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Cost and payment configuration
   */
  economics: {
    /** Estimated gas cost per execution */
    estimatedGasCost: number;
    
    /** Fixed fee for task execution */
    fixedFee: number;
    
    /** Whether task is free for certain tiers */
    freeForTiers: Array<'Neophyte' | 'Adept' | 'Magus' | 'Archon'>;
    
    /** Revenue share for task owner */
    ownerRevenueShare: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  
  /** Tags for discovery */
  tags: string[];
  
  /** Category */
  category: string;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last updated timestamp */
  updatedAt: number;
  
  /** SMF signature of the task definition */
  smfSignature: number[];
}
```

## Task Execution State

```typescript
/**
 * State of a task execution
 */
export interface TaskExecution {
  /** Unique execution ID */
  executionId: string;
  
  /** Task definition ID */
  taskId: string;
  
  /** Triggering conversation (if applicable) */
  conversationId?: string;
  
  /** User who triggered the task */
  triggeredBy: string;
  
  /** Input provided for this execution */
  input: Record<string, any>;
  
  /** Current status */
  status: 'PENDING' | 'VALIDATING' | 'RUNNING' | 'AWAITING_SERVICE' | 
          'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  
  /** Node executing this task */
  executorNodeId: string;
  
  /** SRIA session ID (if using SRIA) */
  sriaSessionId?: string;
  
  /** Execution timeline */
  timeline: {
    scheduledAt: number;
    startedAt?: number;
    completedAt?: number;
  };
  
  /** Attempt tracking */
  attempts: {
    current: number;
    max: number;
    history: Array<{
      attemptNumber: number;
      startedAt: number;
      endedAt: number;
      status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
      error?: string;
    }>;
  };
  
  /** Output (when completed) */
  output?: {
    data: any;
    format: string;
    smfSignature: number[];
    coherence: number;
  };
  
  /** Error information (when failed) */
  error?: {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
  };
  
  /** Services used during execution */
  servicesUsed: Array<{
    serviceId: string;
    callCount: number;
    totalCost: number;
  }>;
  
  /** Gas consumed */
  gasConsumed: number;
}
```

## Graph Schema for Tasks

```javascript
// gun.get('tasks').get(taskId)
{
  definition: TaskDefinition,
  
  // Execution history (last N executions)
  executions: {
    'exec_id_1': TaskExecution,
    'exec_id_2': TaskExecution
  },
  
  // Scheduled runs
  schedule: {
    nextRun: 1707238800000,
    lastRun: 1707235200000,
    runCount: 42
  },
  
  // Statistics
  stats: {
    totalExecutions: 1234,
    successRate: 0.95,
    averageExecutionMs: 3500,
    averageCoherence: 0.87
  }
}
```

## Task Execution Workflow

```typescript
// Task Runner implementation
class TaskRunner {
  async executeTask(taskId: string, input: Record<string, any>, context: {
    triggeredBy: string;
    conversationId?: string;
  }): Promise<TaskExecution> {
    const task = await this.getTask(taskId);
    const execution = this.createExecution(task, input, context);
    
    try {
      // 1. Pre-execution validation
      await this.validatePreExecution(task, input, context);
      
      // 2. Check service availability
      await this.checkServices(task.requiredServices);
      
      // 3. Route to appropriate node
      const targetNode = await this.routeTask(task, input);
      
      // 4. Execute with SRIA
      const sria = await this.summonSRIA(targetNode, task);
      const result = await sria.fullStep(
        this.buildPrompt(task, input),
        await this.getAvailableActions(task)
      );
      
      // 5. Post-execution validation
      await this.validatePostExecution(task, result);
      
      // 6. Store output
      execution.output = {
        data: result.decision.action.content,
        format: task.output.format,
        smfSignature: result.smf,
        coherence: 1 - sria.session.freeEnergy
      };
      execution.status = 'COMPLETED';
      
      // 7. Handle output storage
      await this.storeOutput(task, execution);
      
    } catch (error) {
      execution.status = 'FAILED';
      execution.error = this.formatError(error);
      
      // Retry if configured and recoverable
      if (execution.error.recoverable && 
          execution.attempts.current < execution.attempts.max) {
        await this.scheduleRetry(execution);
      }
    }
    
    return execution;
  }
  
  private buildPrompt(task: TaskDefinition, input: Record<string, any>): string {
    let prompt = task.prompt.userTemplate;
    
    // Replace placeholders
    for (const [key, value] of Object.entries(input)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    return prompt;
  }
}
```

## Example Task Definitions

### Daily Report Task

```javascript
{
  id: 'task_daily_report',
  name: 'Daily Activity Report',
  description: 'Generates a daily summary of user activity and insights',
  version: '1.0.0',
  
  schedule: {
    type: 'CRON',
    cron: '0 9 * * *',  // Every day at 9 AM
    timezone: 'America/Los_Angeles',
    enabled: true,
    maxConcurrent: 1,
    retry: { maxAttempts: 3, backoffMs: 5000, backoffMultiplier: 2 }
  },
  
  inputs: {
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to generate report for' },
        dateRange: { type: 'string', description: 'Date range', default: 'last24h' }
      },
      required: ['userId']
    }
  },
  
  output: {
    schema: { type: 'object', properties: { summary: {}, insights: {}, metrics: {} } },
    format: 'MARKDOWN',
    storage: { toConversation: true, toContentStore: true }
  },
  
  preferredModel: {
    provider: 'anthropic',
    modelName: 'claude-3-opus',
    temperature: 0.7
  },
  
  requiredServices: [
    { serviceId: 'svc_analytics', required: true }
  ],
  
  semanticDomain: 'cognitive',
  requiredTier: 'Adept',
  
  prompt: {
    system: 'You are an analytics agent that creates insightful daily reports.',
    userTemplate: 'Generate a daily report for user {{userId}} for {{dateRange}}. Include: 1) Activity summary, 2) Key insights, 3) Recommendations.'
  },
  
  validation: {
    preExecution: [
      { type: 'INPUT_SCHEMA', errorMessage: 'Invalid input format' },
      { type: 'SERVICE_AVAILABLE', config: { serviceId: 'svc_analytics' }, errorMessage: 'Analytics service unavailable' }
    ],
    postExecution: [
      { type: 'OUTPUT_SCHEMA', errorMessage: 'Invalid output format', action: 'RETRY' },
      { type: 'COHERENCE_CHECK', config: { minCoherence: 0.7 }, errorMessage: 'Low coherence output', action: 'RETRY' }
    ],
    minCoherence: 0.7,
    timeoutMs: 60000
  },
  
  economics: {
    estimatedGasCost: 50,
    fixedFee: 10,
    freeForTiers: ['Magus', 'Archon'],
    ownerRevenueShare: 0.1
  },
  
  tags: ['report', 'analytics', 'daily'],
  category: 'analytics'
}
```
