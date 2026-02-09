# Error Handling & Recovery

Systematic error handling and recovery strategies for the AlephNet-integrated Durable Agent Mesh. This document covers error classification, handling patterns, recovery mechanisms, and fault tolerance.

## Error Classification

### Error Hierarchy

```typescript
/**
 * Base error class for AlephNet mesh
 */
export abstract class AlephError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  abstract readonly recoverable: boolean;
  abstract readonly retryable: boolean;
  
  readonly timestamp: number = Date.now();
  readonly nodeId?: string;
  readonly conversationId?: string;
  
  toJSON(): object {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      recoverable: this.recoverable,
      retryable: this.retryable,
      timestamp: this.timestamp,
      nodeId: this.nodeId,
      conversationId: this.conversationId,
      stack: this.stack
    };
  }
}

export type ErrorCategory =
  | 'NETWORK'      // Network connectivity issues
  | 'CONSENSUS'    // Coherence/consensus failures
  | 'SRIA'         // Agent lifecycle errors
  | 'SERVICE'      // Service execution errors
  | 'STORAGE'      // Gun.js/GMF storage errors
  | 'AUTH'         // Authentication/authorization
  | 'VALIDATION'   // Input/output validation
  | 'RESOURCE'     // Rate limits, quotas
  | 'INTERNAL';    // Unexpected internal errors
```

### Specific Error Types

```typescript
// Network errors
export class NetworkError extends AlephError {
  readonly category = 'NETWORK';
  constructor(
    readonly code: string,
    message: string,
    readonly targetNode?: string,
    readonly recoverable = true,
    readonly retryable = true
  ) {
    super(message);
  }
}

// Consensus errors
export class ConsensusError extends AlephError {
  readonly category = 'CONSENSUS';
  constructor(
    readonly code: string,
    message: string,
    readonly proposal?: any,
    readonly votes?: any[],
    readonly recoverable = true,
    readonly retryable = false
  ) {
    super(message);
  }
}

// SRIA agent errors
export class SRIAError extends AlephError {
  readonly category = 'SRIA';
  constructor(
    readonly code: string,
    message: string,
    readonly sessionId?: string,
    readonly lifecycleState?: string,
    readonly recoverable = true,
    readonly retryable = true
  ) {
    super(message);
  }
}

// Service errors
export class ServiceError extends AlephError {
  readonly category = 'SERVICE';
  constructor(
    readonly code: string,
    message: string,
    readonly serviceId?: string,
    readonly endpoint?: string,
    readonly recoverable = true,
    readonly retryable = true
  ) {
    super(message);
  }
}
```

### Error Codes Reference

| Code | Category | Description | Recoverable | Retryable |
|------|----------|-------------|-------------|-----------|
| `E_NETWORK_TIMEOUT` | NETWORK | Connection timed out | ✓ | ✓ |
| `E_NETWORK_UNREACHABLE` | NETWORK | Node unreachable | ✓ | ✓ |
| `E_NETWORK_SPLIT` | NETWORK | Network partition detected | ✓ | ✗ |
| `E_CONSENSUS_REJECTED` | CONSENSUS | Proposal rejected | ✓ | ✗ |
| `E_CONSENSUS_TIMEOUT` | CONSENSUS | Voting timed out | ✓ | ✓ |
| `E_COHERENCE_LOW` | CONSENSUS | Below coherence threshold | ✓ | ✓ |
| `E_SRIA_LOOP` | SRIA | Infinite loop detected | ✓ | ✗ |
| `E_SRIA_TIMEOUT` | SRIA | Agent step timed out | ✓ | ✓ |
| `E_SRIA_CRASH` | SRIA | Agent crashed unexpectedly | ✓ | ✓ |
| `E_SERVICE_UNAVAILABLE` | SERVICE | Service not available | ✓ | ✓ |
| `E_SERVICE_ERROR` | SERVICE | Service returned error | ✓ | depends |
| `E_AUTH_INVALID` | AUTH | Invalid credentials | ✗ | ✗ |
| `E_AUTH_EXPIRED` | AUTH | Session expired | ✓ | ✗ |
| `E_RATE_LIMIT` | RESOURCE | Rate limit exceeded | ✓ | ✓ |
| `E_QUOTA_EXCEEDED` | RESOURCE | Quota exceeded | ✓ | ✗ |

## Retry Strategies

```typescript
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableErrors: [
    'E_NETWORK_TIMEOUT',
    'E_NETWORK_UNREACHABLE',
    'E_CONSENSUS_TIMEOUT',
    'E_SRIA_TIMEOUT',
    'E_SERVICE_UNAVAILABLE',
    'E_RATE_LIMIT'
  ]
};

/**
 * Retry with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: { operationName?: string; onRetry?: (attempt: number, error: Error) => void }
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (error instanceof AlephError && !error.retryable) {
        throw error;
      }
      
      if (error instanceof AlephError && 
          !config.retryableErrors.includes(error.code)) {
        throw error;
      }
      
      if (attempt < config.maxAttempts) {
        const delay = calculateDelay(attempt, config);
        context?.onRetry?.(attempt, lastError);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.baseDelayMs * 
    Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * (Math.random() - 0.5);
  return cappedDelay + jitter;
}
```

## Circuit Breaker

```typescript
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenRequests: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailure: number = 0;
  private halfOpenSuccesses = 0;
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      halfOpenRequests: 3
    }
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
      } else {
        throw new ServiceError(
          'E_CIRCUIT_OPEN',
          `Circuit breaker ${this.name} is open`,
          undefined,
          undefined,
          true,
          false
        );
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState(): { state: CircuitState; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }
}
```

## Recovery Patterns

### SRIA Crash Recovery

```typescript
/**
 * Recover SRIA agent from crash
 */
export async function recoverSRIA(
  conversationId: string,
  agentManager: AgentManager,
  gun: any
): Promise<SRIAEngine | null> {
  // 1. Load persisted state from Gun
  const persistedState = await new Promise<DurableAgentState | null>((resolve) => {
    gun.get('conversations').get(conversationId).get('state').once(resolve);
  });
  
  if (!persistedState) {
    return null;
  }
  
  // 2. Check if recovery is possible
  if (!persistedState.sria) {
    // No SRIA state to recover
    return null;
  }
  
  // 3. Create new SRIA with recovered state
  const sria = agentManager.create({
    name: `recovered-${conversationId.slice(0, 8)}`,
    bodyPrimes: extractPrimesFromHash(persistedState.sria.bodyHash)
  });
  
  // 4. Restore session state
  sria.restoreSession({
    sessionId: persistedState.sria.sessionId,
    quaternionState: persistedState.sria.quaternionState,
    currentEpoch: persistedState.sria.currentEpoch,
    freeEnergy: persistedState.sria.freeEnergy,
    entropyTrajectory: persistedState.sria.entropyTrajectory,
    currentBeliefs: persistedState.sria.currentBeliefs,
    attention: persistedState.sria.attention
  });
  
  // 5. Handle incomplete actions
  if (persistedState.status === 'PROCESSING') {
    // Resume from last known state
    const lastMessage = getLastMessage(gun, conversationId);
    if (lastMessage?.status !== 'complete') {
      // Re-process the message
      await sria.summon({ initialContext: lastMessage.content });
    }
  } else if (persistedState.status === 'AWAITING_SERVER_TOOL') {
    // Check if tool results are available
    const pendingTool = Object.values(persistedState.pendingTools)[0];
    const result = await getToolResult(gun, conversationId, pendingTool.callId);
    if (result) {
      // Resume with tool result
      await sria.summon({ toolResult: result });
    }
  }
  
  return sria;
}
```

### Coherence Failure Recovery

```typescript
/**
 * Handle coherence verification failure
 */
export async function handleCoherenceFailure(
  proposal: any,
  error: ConsensusError,
  context: {
    sria: SRIAEngine;
    conversationId: string;
    gun: any;
    options: CoherenceRecoveryOptions;
  }
): Promise<RecoveryResult> {
  const { sria, conversationId, gun, options } = context;
  
  // Strategy 1: Lower coherence threshold and retry
  if (options.allowLowerThreshold) {
    const loweredThreshold = options.minCoherence * 0.8;
    const retryResult = await protocol.evaluate(
      proposal,
      { minCoherence: loweredThreshold }
    );
    
    if (retryResult.accepted) {
      // Log the lowered threshold
      await logRecoveryAction(conversationId, 'LOWERED_THRESHOLD', {
        original: options.minCoherence,
        used: loweredThreshold
      });
      return { success: true, action: 'LOWERED_THRESHOLD' };
    }
  }
  
  // Strategy 2: Regenerate with different approach
  if (options.allowRegenerate) {
    // Adjust SRIA's beliefs to avoid similar output
    sria.adjustBeliefs({
      avoidPatterns: [proposal.object.normalForm],
      increaseExploration: 0.2
    });
    
    // Retry generation
    const newResult = await sria.fullStep(
      getOriginalInput(gun, conversationId),
      await getAvailableActions()
    );
    
    return { success: true, action: 'REGENERATED', newResult };
  }
  
  // Strategy 3: Fall back to simpler response
  if (options.allowFallback) {
    const fallbackResponse = await generateFallbackResponse(
      sria,
      getOriginalInput(gun, conversationId)
    );
    
    return { 
      success: true, 
      action: 'FALLBACK',
      fallbackResponse 
    };
  }
  
  // Strategy 4: Request human review
  if (options.allowHumanReview) {
    await requestHumanReview(conversationId, proposal, error);
    return { success: true, action: 'HUMAN_REVIEW_REQUESTED' };
  }
  
  // No recovery possible
  return { 
    success: false, 
    action: 'FAILED',
    error: error.message 
  };
}

interface CoherenceRecoveryOptions {
  minCoherence: number;
  allowLowerThreshold: boolean;
  allowRegenerate: boolean;
  allowFallback: boolean;
  allowHumanReview: boolean;
}

interface RecoveryResult {
  success: boolean;
  action: string;
  newResult?: any;
  fallbackResponse?: string;
  error?: string;
}
```

### Network Partition Recovery

```typescript
/**
 * Handle network partition (split-brain) scenarios
 */
export async function handleNetworkPartition(
  context: {
    localNodeId: string;
    knownPeers: string[];
    gun: any;
    dsnNode: DSNNode;
  }
): Promise<void> {
  const { localNodeId, knownPeers, gun, dsnNode } = context;
  
  // 1. Detect partition
  const reachablePeers = await probeAllPeers(knownPeers);
  const partitionDetected = reachablePeers.length < knownPeers.length / 2;
  
  if (!partitionDetected) return;
  
  // 2. Enter partition mode
  await enterPartitionMode(dsnNode, {
    reachablePeers,
    unreachablePeers: knownPeers.filter(p => !reachablePeers.includes(p))
  });
  
  // 3. Continue with reduced quorum
  const reducedQuorum = Math.max(1, Math.floor(reachablePeers.length * 0.6));
  dsnNode.setConsensusQuorum(reducedQuorum);
  
  // 4. Queue writes for later reconciliation
  const writeQueue: QueuedWrite[] = [];
  gun.on('out', (msg: any) => {
    writeQueue.push({
      timestamp: Date.now(),
      data: msg,
      localOnly: true
    });
  });
  
  // 5. Periodically check for partition healing
  const healingInterval = setInterval(async () => {
    const nowReachable = await probeAllPeers(knownPeers);
    
    if (nowReachable.length >= knownPeers.length * 0.8) {
      // Partition healed
      clearInterval(healingInterval);
      await reconcileAfterPartition(writeQueue, gun, dsnNode);
    }
  }, 30000);
}

/**
 * Reconcile state after partition heals
 */
async function reconcileAfterPartition(
  writeQueue: QueuedWrite[],
  gun: any,
  dsnNode: DSNNode
): Promise<void> {
  // 1. Exit partition mode
  await exitPartitionMode(dsnNode);
  
  // 2. Sync Gun.js state
  await gun.sync();
  
  // 3. Resolve conflicts using CRDT semantics + coherence
  for (const write of writeQueue) {
    const currentValue = await gun.get(write.path).once();
    
    if (needsResolution(write.data, currentValue)) {
      // Use coherence scores to resolve
      const resolution = await resolveConflict(
        write.data,
        currentValue,
        dsnNode.protocol
      );
      
      await gun.get(write.path).put(resolution);
    }
  }
  
  // 4. Re-sync GMF
  await dsnNode.sync.gmf.fullSync();
}
```

### Service Failover

```typescript
/**
 * Service call with automatic failover
 */
export async function callWithFailover<T>(
  serviceId: string,
  endpoint: string,
  input: Record<string, any>,
  registry: ServiceRegistry,
  options?: {
    maxFailovers?: number;
    excludeNodes?: string[];
  }
): Promise<T> {
  const maxFailovers = options?.maxFailovers ?? 3;
  const excludeNodes = new Set(options?.excludeNodes ?? []);
  
  let lastError: Error | null = null;
  let attempts = 0;
  
  while (attempts < maxFailovers) {
    // Get healthy instances, excluding failed ones
    const health = await registry.getHealth(serviceId);
    const availableInstances = health.instances
      .filter(i => i.status === 'RUNNING' && !excludeNodes.has(i.nodeId))
      .sort((a, b) => 
        (b.health.healthy ? 1 : 0) - (a.health.healthy ? 1 : 0) ||
        a.metrics.averageResponseTimeMs - b.metrics.averageResponseTimeMs
      );
    
    if (availableInstances.length === 0) {
      throw new ServiceError(
        'E_SERVICE_NO_INSTANCES',
        `No healthy instances for service ${serviceId}`,
        serviceId,
        endpoint,
        false,
        false
      );
    }
    
    const targetInstance = availableInstances[0];
    
    try {
      return await executeServiceCall<T>(
        targetInstance.nodeId,
        serviceId,
        endpoint,
        input
      );
    } catch (error) {
      lastError = error as Error;
      excludeNodes.add(targetInstance.nodeId);
      attempts++;
      
      // Log failover
      console.warn(`Failover attempt ${attempts} for ${serviceId}:${endpoint}`, {
        failedNode: targetInstance.nodeId,
        error: lastError.message
      });
    }
  }
  
  throw new ServiceError(
    'E_SERVICE_ALL_FAILED',
    `All failover attempts failed for ${serviceId}:${endpoint}`,
    serviceId,
    endpoint,
    false,
    false
  );
}
```

## Error Propagation

```typescript
/**
 * Error boundary for agent operations
 */
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  context: {
    conversationId?: string;
    nodeId?: string;
    operationName: string;
  },
  handlers?: Partial<ErrorHandlers>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const alephError = normalizeError(error, context);
    
    // Log the error
    await logError(alephError);
    
    // Execute category-specific handler
    const handler = handlers?.[alephError.category];
    if (handler) {
      const result = await handler(alephError);
      if (result.handled) {
        return result.value as T;
      }
    }
    
    // Propagate the error
    throw alephError;
  }
}

interface ErrorHandlers {
  NETWORK: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  CONSENSUS: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  SRIA: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  SERVICE: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  STORAGE: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  AUTH: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  VALIDATION: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  RESOURCE: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
  INTERNAL: (error: AlephError) => Promise<{ handled: boolean; value?: any }>;
}

function normalizeError(
  error: any,
  context: { conversationId?: string; nodeId?: string; operationName: string }
): AlephError {
  if (error instanceof AlephError) {
    error.conversationId = context.conversationId;
    error.nodeId = context.nodeId;
    return error;
  }
  
  // Wrap unknown errors
  return new InternalError(
    'E_INTERNAL_UNKNOWN',
    error?.message || 'Unknown error',
    context.operationName,
    error
  );
}
```

## Dead Letter Queue

```typescript
/**
 * Dead letter queue for failed operations
 */
export interface DeadLetterQueue {
  /** Add failed operation to DLQ */
  enqueue(item: DeadLetterItem): Promise<void>;
  
  /** Get items for retry */
  dequeue(limit?: number): Promise<DeadLetterItem[]>;
  
  /** Mark item as processed */
  acknowledge(id: string): Promise<void>;
  
  /** Get DLQ stats */
  stats(): Promise<DLQStats>;
}

export interface DeadLetterItem {
  id: string;
  operationType: 'MESSAGE' | 'TOOL_CALL' | 'SERVICE_CALL' | 'TASK_EXECUTION' | 'GMF_PROPOSAL';
  payload: any;
  error: AlephError;
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  nextRetry?: number;
  metadata: Record<string, any>;
}

/**
 * DLQ processor for automatic retries
 */
export class DLQProcessor {
  constructor(
    private dlq: DeadLetterQueue,
    private handlers: Record<string, DLQHandler>
  ) {}
  
  async process(): Promise<void> {
    const items = await this.dlq.dequeue(10);
    
    for (const item of items) {
      // Skip if not ready for retry
      if (item.nextRetry && Date.now() < item.nextRetry) {
        continue;
      }
      
      const handler = this.handlers[item.operationType];
      if (!handler) {
        console.error(`No handler for DLQ item type: ${item.operationType}`);
        continue;
      }
      
      try {
        await handler.process(item);
        await this.dlq.acknowledge(item.id);
      } catch (error) {
        // Update retry schedule
        item.attempts++;
        item.lastAttempt = Date.now();
        item.nextRetry = Date.now() + calculateDelay(item.attempts, DEFAULT_RETRY_CONFIG);
        
        if (item.attempts >= 10) {
          // Max retries exceeded - alert operator
          await alertOperator(item);
        }
        
        await this.dlq.enqueue(item);
      }
    }
  }
}
```
