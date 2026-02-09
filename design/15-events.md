# Event System

The **Event System** enables decoupled communication between components, triggers for task execution, and real-time notifications across the AlephNet mesh.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT BUS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐  │
│  │   PRODUCERS   │────▶│    ROUTER     │────▶│  SUBSCRIBERS  │  │
│  │               │     │               │     │               │  │
│  │ • SRIA        │     │ • Topic match │     │ • Tasks       │  │
│  │ • Services    │     │ • SMF filter  │     │ • Webhooks    │  │
│  │ • Tasks       │     │ • ACL check   │     │ • SRIA        │  │
│  │ • System      │     │ • Priority    │     │ • Clients     │  │
│  └───────────────┘     └───────────────┘     └───────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    ┌───────────────┐                            │
│                    │   PERSISTENCE │                            │
│                    │               │                            │
│                    │ • Gun.js      │                            │
│                    │ • Event log   │                            │
│                    │ • Replay      │                            │
│                    └───────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Event Schema

```typescript
/**
 * Base event structure
 */
export interface AlephEvent {
  /** Unique event ID */
  id: string;
  
  /** Event type (namespaced) */
  type: string;
  
  /** Event source */
  source: {
    nodeId: string;
    component: EventSource;
    userId?: string;
  };
  
  /** Event payload */
  payload: Record<string, any>;
  
  /** Semantic metadata */
  semantic?: {
    smf: number[];
    domain: SemanticDomain;
    coherenceProof?: {
      tickNumber: number;
      coherence: number;
    };
  };
  
  /** Event metadata */
  metadata: {
    timestamp: number;
    version: string;
    correlationId?: string;
    causationId?: string;
    priority: EventPriority;
    ttlMs?: number;
    replayable: boolean;
  };
}

export type EventSource = 
  | 'SRIA'
  | 'SERVICE'
  | 'TASK'
  | 'SYSTEM'
  | 'USER'
  | 'CONSENSUS'
  | 'GMF';

export type EventPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
```

## Event Types

### System Events

```typescript
// Event type hierarchy
export namespace EventTypes {
  // System lifecycle
  export const NODE_STARTED = 'system.node.started';
  export const NODE_STOPPING = 'system.node.stopping';
  export const NODE_HEALTH_CHANGED = 'system.node.health_changed';
  
  // Conversation events
  export const CONVERSATION_CREATED = 'conversation.created';
  export const CONVERSATION_MESSAGE = 'conversation.message';
  export const CONVERSATION_TOOL_CALL = 'conversation.tool_call';
  export const CONVERSATION_TOOL_RESULT = 'conversation.tool_result';
  export const CONVERSATION_COMPLETED = 'conversation.completed';
  
  // SRIA events
  export const SRIA_SUMMONED = 'sria.summoned';
  export const SRIA_PERCEIVING = 'sria.perceiving';
  export const SRIA_DECIDING = 'sria.deciding';
  export const SRIA_ACTING = 'sria.acting';
  export const SRIA_LEARNING = 'sria.learning';
  export const SRIA_DISMISSED = 'sria.dismissed';
  
  // Task events
  export const TASK_SCHEDULED = 'task.scheduled';
  export const TASK_STARTED = 'task.started';
  export const TASK_COMPLETED = 'task.completed';
  export const TASK_FAILED = 'task.failed';
  
  // Service events
  export const SERVICE_REGISTERED = 'service.registered';
  export const SERVICE_CALLED = 'service.called';
  export const SERVICE_RESPONDED = 'service.responded';
  export const SERVICE_ERROR = 'service.error';
  
  // Consensus events
  export const PROPOSAL_SUBMITTED = 'consensus.proposal.submitted';
  export const PROPOSAL_VOTED = 'consensus.proposal.voted';
  export const PROPOSAL_ACCEPTED = 'consensus.proposal.accepted';
  export const PROPOSAL_REJECTED = 'consensus.proposal.rejected';
  
  // Content events
  export const CONTENT_CREATED = 'content.created';
  export const CONTENT_UPDATED = 'content.updated';
  export const CONTENT_INDEXED = 'content.indexed';
  
  // User events
  export const USER_REGISTERED = 'user.registered';
  export const USER_TIER_CHANGED = 'user.tier_changed';
  export const USER_BALANCE_CHANGED = 'user.balance_changed';
}
```

### Event Payload Examples

```typescript
// Message event
interface ConversationMessageEvent extends AlephEvent {
  type: 'conversation.message';
  payload: {
    conversationId: string;
    messageId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    smf: number[];
  };
}

// Task completed event
interface TaskCompletedEvent extends AlephEvent {
  type: 'task.completed';
  payload: {
    taskId: string;
    executionId: string;
    output: any;
    duration: number;
    gasConsumed: number;
  };
}

// Proposal accepted event
interface ProposalAcceptedEvent extends AlephEvent {
  type: 'consensus.proposal.accepted';
  payload: {
    proposalId: string;
    objectId: string;
    smf: number[];
    weight: number;
    votes: {
      support: number;
      contest: number;
    };
  };
}
```

## Event Bus Interface

```typescript
/**
 * Event bus for publishing and subscribing to events
 */
export interface EventBus {
  /** Publish an event */
  publish(event: AlephEvent): Promise<void>;
  
  /** Publish multiple events atomically */
  publishBatch(events: AlephEvent[]): Promise<void>;
  
  /** Subscribe to events by pattern */
  subscribe(
    pattern: EventPattern,
    handler: EventHandler,
    options?: SubscriptionOptions
  ): Subscription;
  
  /** Unsubscribe */
  unsubscribe(subscription: Subscription): void;
  
  /** Replay events from history */
  replay(
    pattern: EventPattern,
    options: ReplayOptions
  ): AsyncIterable<AlephEvent>;
  
  /** Get event by ID */
  getEvent(id: string): Promise<AlephEvent | null>;
  
  /** Get event history */
  getHistory(options: HistoryOptions): Promise<AlephEvent[]>;
}

export interface EventPattern {
  /** Event type pattern (glob-style) */
  type?: string;
  
  /** Source filter */
  source?: {
    nodeId?: string;
    component?: EventSource;
    userId?: string;
  };
  
  /** Semantic filter */
  semantic?: {
    domain?: SemanticDomain;
    minCoherence?: number;
    smfSimilarity?: {
      vector: number[];
      threshold: number;
    };
  };
  
  /** Metadata filter */
  metadata?: {
    minPriority?: EventPriority;
    correlationId?: string;
  };
}

export interface SubscriptionOptions {
  /** Start from position */
  startFrom?: 'BEGINNING' | 'NOW' | number;
  
  /** Group for competing consumers */
  consumerGroup?: string;
  
  /** Acknowledge mode */
  ackMode?: 'AUTO' | 'MANUAL';
  
  /** Max events in flight */
  maxInFlight?: number;
  
  /** Retry on error */
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

export type EventHandler = (event: AlephEvent) => Promise<void>;

export interface Subscription {
  id: string;
  pattern: EventPattern;
  pause(): void;
  resume(): void;
  unsubscribe(): void;
}
```

## Event Bus Implementation

```typescript
/**
 * Gun.js-backed event bus with semantic routing
 */
export class GunEventBus implements EventBus {
  private subscriptions = new Map<string, SubscriptionState>();
  
  constructor(
    private gun: any,
    private dsnNode: DSNNode,
    private embeddingService: EmbeddingService
  ) {}
  
  async publish(event: AlephEvent): Promise<void> {
    // 1. Validate event
    this.validateEvent(event);
    
    // 2. Generate semantic metadata if not present
    if (!event.semantic && event.payload) {
      const text = JSON.stringify(event.payload);
      const smf = await this.embeddingService.embedToSMF(text);
      event.semantic = {
        smf,
        domain: determineDomain(smf)
      };
    }
    
    // 3. Persist to Gun
    await this.persistEvent(event);
    
    // 4. Route to local subscribers
    await this.routeToSubscribers(event);
    
    // 5. Broadcast to mesh (for cross-node events)
    if (this.shouldBroadcast(event)) {
      await this.broadcastToMesh(event);
    }
  }
  
  subscribe(
    pattern: EventPattern,
    handler: EventHandler,
    options: SubscriptionOptions = {}
  ): Subscription {
    const subscriptionId = generateId();
    
    const state: SubscriptionState = {
      id: subscriptionId,
      pattern,
      handler,
      options,
      paused: false,
      inFlight: 0
    };
    
    this.subscriptions.set(subscriptionId, state);
    
    // Set up Gun listener
    const gunPath = this.patternToGunPath(pattern);
    this.gun.get('events').get(gunPath).map().on(async (data: any) => {
      if (state.paused) return;
      if (state.inFlight >= (options.maxInFlight || 100)) return;
      
      const event = this.deserializeEvent(data);
      if (!this.matchesPattern(event, pattern)) return;
      
      state.inFlight++;
      try {
        await this.executeHandler(event, state);
      } finally {
        state.inFlight--;
      }
    });
    
    return {
      id: subscriptionId,
      pattern,
      pause: () => { state.paused = true; },
      resume: () => { state.paused = false; },
      unsubscribe: () => { this.unsubscribe({ id: subscriptionId, pattern } as Subscription); }
    };
  }
  
  private matchesPattern(event: AlephEvent, pattern: EventPattern): boolean {
    // Type matching (glob-style)
    if (pattern.type && !matchGlob(event.type, pattern.type)) {
      return false;
    }
    
    // Source matching
    if (pattern.source) {
      if (pattern.source.nodeId && event.source.nodeId !== pattern.source.nodeId) {
        return false;
      }
      if (pattern.source.component && event.source.component !== pattern.source.component) {
        return false;
      }
      if (pattern.source.userId && event.source.userId !== pattern.source.userId) {
        return false;
      }
    }
    
    // Semantic matching
    if (pattern.semantic && event.semantic) {
      if (pattern.semantic.domain && event.semantic.domain !== pattern.semantic.domain) {
        return false;
      }
      if (pattern.semantic.smfSimilarity) {
        const similarity = this.embeddingService.smfSimilarity(
          event.semantic.smf as any,
          pattern.semantic.smfSimilarity.vector as any
        );
        if (similarity < pattern.semantic.smfSimilarity.threshold) {
          return false;
        }
      }
    }
    
    return true;
  }
}
```

## Task Event Triggers

```typescript
/**
 * Configure task to trigger on events
 */
interface EventTriggerConfig {
  /** Event patterns to match */
  patterns: EventPattern[];
  
  /** Debounce configuration */
  debounce?: {
    windowMs: number;
    maxEvents: number;
  };
  
  /** Filter function */
  filter?: (event: AlephEvent) => boolean;
  
  /** Input mapping */
  inputMapping: (events: AlephEvent[]) => Record<string, any>;
}

/**
 * Event-triggered task runner
 */
export class EventTriggeredTaskRunner {
  private eventBuffer = new Map<string, AlephEvent[]>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  constructor(
    private eventBus: EventBus,
    private taskRunner: TaskRunner
  ) {}
  
  registerTask(taskId: string, trigger: EventTriggerConfig): void {
    for (const pattern of trigger.patterns) {
      this.eventBus.subscribe(pattern, async (event) => {
        // Apply filter
        if (trigger.filter && !trigger.filter(event)) {
          return;
        }
        
        // Handle debouncing
        if (trigger.debounce) {
          this.bufferEvent(taskId, event, trigger);
        } else {
          // Immediate execution
          const input = trigger.inputMapping([event]);
          await this.taskRunner.executeTask(taskId, input, {
            triggeredBy: 'EVENT',
            eventId: event.id
          });
        }
      });
    }
  }
  
  private bufferEvent(
    taskId: string,
    event: AlephEvent,
    trigger: EventTriggerConfig
  ): void {
    const buffer = this.eventBuffer.get(taskId) || [];
    buffer.push(event);
    this.eventBuffer.set(taskId, buffer);
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Check if max events reached
    if (buffer.length >= trigger.debounce!.maxEvents) {
      this.flushBuffer(taskId, trigger);
      return;
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.flushBuffer(taskId, trigger);
    }, trigger.debounce!.windowMs);
    
    this.debounceTimers.set(taskId, timer);
  }
  
  private async flushBuffer(
    taskId: string,
    trigger: EventTriggerConfig
  ): Promise<void> {
    const buffer = this.eventBuffer.get(taskId) || [];
    this.eventBuffer.delete(taskId);
    this.debounceTimers.delete(taskId);
    
    if (buffer.length === 0) return;
    
    const input = trigger.inputMapping(buffer);
    await this.taskRunner.executeTask(taskId, input, {
      triggeredBy: 'EVENT',
      eventIds: buffer.map(e => e.id)
    });
  }
}

// Example: Trigger daily digest task
const dailyDigestTrigger: EventTriggerConfig = {
  patterns: [
    { type: 'conversation.message', source: { component: 'SRIA' } }
  ],
  debounce: {
    windowMs: 60000,  // 1 minute
    maxEvents: 100
  },
  inputMapping: (events) => ({
    messageCount: events.length,
    conversationIds: [...new Set(events.map(e => e.payload.conversationId))],
    since: Math.min(...events.map(e => e.metadata.timestamp))
  })
};
```

## Cross-Node Event Propagation

```typescript
/**
 * Propagate events across mesh nodes
 */
export class MeshEventPropagator {
  constructor(
    private dsnNode: DSNNode,
    private eventBus: EventBus
  ) {}
  
  async propagate(event: AlephEvent): Promise<void> {
    // Determine target nodes based on event semantics
    const targets = await this.findTargetNodes(event);
    
    // Broadcast via PRRC channel
    const prrcMessage = {
      type: 'EVENT',
      event: this.serializeEvent(event),
      targets: targets.map(t => t.nodeId)
    };
    
    await this.dsnNode.sync.channel.broadcast(prrcMessage);
  }
  
  private async findTargetNodes(event: AlephEvent): Promise<DSNNodeConfig[]> {
    const nodes: DSNNodeConfig[] = [];
    
    // Get all online nodes
    const allNodes = await this.getAllNodes();
    
    for (const node of allNodes) {
      // Skip self
      if (node.nodeId === this.dsnNode.nodeId) continue;
      
      // Check if node should receive this event
      if (this.nodeInterestedIn(node, event)) {
        nodes.push(node);
      }
    }
    
    return nodes;
  }
  
  private nodeInterestedIn(node: DSNNodeConfig, event: AlephEvent): boolean {
    // All nodes receive system events
    if (event.type.startsWith('system.')) {
      return true;
    }
    
    // Check semantic domain match
    if (event.semantic) {
      if (node.semanticDomain === event.semantic.domain) {
        return true;
      }
    }
    
    // Check if node has relevant subscriptions
    // (would require subscription registry)
    return false;
  }
}
```

## Event Persistence & Replay

```typescript
/**
 * Event store for persistence and replay
 */
export interface EventStore {
  /** Append event to log */
  append(event: AlephEvent): Promise<number>;  // Returns sequence number
  
  /** Read events from sequence */
  read(options: {
    fromSequence?: number;
    toSequence?: number;
    type?: string;
    limit?: number;
  }): AsyncIterable<StoredEvent>;
  
  /** Get current sequence number */
  getCurrentSequence(): Promise<number>;
  
  /** Compact old events */
  compact(beforeSequence: number): Promise<number>;
}

export interface StoredEvent {
  sequence: number;
  event: AlephEvent;
  storedAt: number;
}

/**
 * Gun.js-backed event store
 */
export class GunEventStore implements EventStore {
  private sequence = 0;
  
  constructor(private gun: any) {}
  
  async append(event: AlephEvent): Promise<number> {
    const seq = ++this.sequence;
    
    await this.gun.get('eventlog').get(seq.toString()).put({
      sequence: seq,
      event: JSON.stringify(event),
      storedAt: Date.now()
    });
    
    // Index by type for faster queries
    await this.gun.get('eventindex').get(event.type).set({
      sequence: seq,
      eventId: event.id
    });
    
    return seq;
  }
  
  async *read(options: {
    fromSequence?: number;
    toSequence?: number;
    type?: string;
    limit?: number;
  }): AsyncIterable<StoredEvent> {
    const from = options.fromSequence || 1;
    const to = options.toSequence || this.sequence;
    const limit = options.limit || Infinity;
    
    let count = 0;
    
    for (let seq = from; seq <= to && count < limit; seq++) {
      const data = await new Promise<any>((resolve) => {
        this.gun.get('eventlog').get(seq.toString()).once(resolve);
      });
      
      if (data && data.event) {
        // Filter by type if specified
        const event = JSON.parse(data.event);
        if (!options.type || event.type === options.type) {
          yield {
            sequence: data.sequence,
            event,
            storedAt: data.storedAt
          };
          count++;
        }
      }
    }
  }
}

/**
 * Replay events for a new subscriber
 */
async function replayEvents(
  store: EventStore,
  pattern: EventPattern,
  handler: EventHandler,
  options: {
    fromSequence?: number;
    batchSize?: number;
    delayMs?: number;
  } = {}
): Promise<void> {
  const batchSize = options.batchSize || 100;
  const delayMs = options.delayMs || 10;
  
  let batch: StoredEvent[] = [];
  
  for await (const stored of store.read({
    fromSequence: options.fromSequence,
    type: pattern.type
  })) {
    batch.push(stored);
    
    if (batch.length >= batchSize) {
      await processBatch(batch, handler);
      batch = [];
      await sleep(delayMs);
    }
  }
  
  // Process remaining
  if (batch.length > 0) {
    await processBatch(batch, handler);
  }
}

async function processBatch(
  batch: StoredEvent[],
  handler: EventHandler
): Promise<void> {
  for (const stored of batch) {
    await handler(stored.event);
  }
}
```
