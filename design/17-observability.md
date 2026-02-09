# Observability

Comprehensive observability for the AlephNet-integrated Durable Agent Mesh: structured logging, metrics collection, distributed tracing, and alerting.

## Observability Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    LOGGING      │  │    METRICS      │  │    TRACING      │  │
│  │  ───────────    │  │  ───────────    │  │  ───────────    │  │
│  │  • Structured   │  │  • Prometheus   │  │  • OpenTelemetry│  │
│  │  • Levels       │  │  • Custom       │  │  • Span context │  │
│  │  • Context      │  │  • Histograms   │  │  • Propagation  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
│                    ┌───────────▼───────────┐                    │
│                    │    COLLECTION         │                    │
│                    │  ─────────────────    │                    │
│                    │  • OTLP export        │                    │
│                    │  • Gun.js persist     │                    │
│                    │  • Batching           │                    │
│                    └───────────┬───────────┘                    │
│                                │                                 │
│           ┌────────────────────┼────────────────────┐           │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   STORAGE       │  │   ANALYSIS      │  │   ALERTING      │  │
│  │  • Loki         │  │  • Grafana      │  │  • PagerDuty    │  │
│  │  • Tempo        │  │  • Custom       │  │  • Slack        │  │
│  │  • Prometheus   │  │  • AI-assisted  │  │  • Email        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Structured Logging

### Logger Interface

```typescript
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  fatal(message: string, error?: Error, context?: LogContext): void;
  
  /** Create child logger with additional context */
  child(context: LogContext): Logger;
  
  /** Add context to all subsequent logs */
  withContext(context: LogContext): Logger;
}

export interface LogContext {
  // Core identifiers
  nodeId?: string;
  conversationId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  
  // Operation context
  operation?: string;
  component?: string;
  
  // Semantic context
  semanticDomain?: SemanticDomain;
  smf?: number[];
  
  // Custom fields
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
```

### Logger Implementation

```typescript
export class AlephLogger implements Logger {
  private context: LogContext = {};
  
  constructor(
    private config: LoggerConfig,
    private transports: LogTransport[]
  ) {}
  
  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, undefined, context);
  }
  
  info(message: string, context?: LogContext): void {
    this.log('INFO', message, undefined, context);
  }
  
  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, undefined, context);
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('ERROR', message, error, context);
  }
  
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log('FATAL', message, error, context);
  }
  
  child(context: LogContext): Logger {
    const child = new AlephLogger(this.config, this.transports);
    child.context = { ...this.context, ...context };
    return child;
  }
  
  withContext(context: LogContext): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }
  
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      } : undefined
    };
    
    for (const transport of this.transports) {
      transport.write(entry);
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }
}

interface LoggerConfig {
  minLevel: LogLevel;
  format: 'json' | 'text';
  redactFields?: string[];
}
```

### Log Transports

```typescript
export interface LogTransport {
  write(entry: LogEntry): void;
  flush(): Promise<void>;
}

/**
 * Console transport (development)
 */
export class ConsoleTransport implements LogTransport {
  write(entry: LogEntry): void {
    const color = this.getColor(entry.level);
    const prefix = `[${entry.timestamp}] ${entry.level}`;
    const context = Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    
    console.log(`${color}${prefix}${color} ${entry.message}${context}`);
    
    if (entry.error?.stack) {
      console.error(entry.error.stack);
    }
  }
  
  async flush(): Promise<void> {}
  
  private getColor(level: LogLevel): string {
    const colors = {
      DEBUG: '\x1b[36m',  // Cyan
      INFO: '\x1b[32m',   // Green
      WARN: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m',  // Red
      FATAL: '\x1b[35m'   // Magenta
    };
    return colors[level];
  }
}

/**
 * OTLP transport (OpenTelemetry)
 */
export class OTLPLogTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;
  
  constructor(
    private endpoint: string,
    private batchSize = 100,
    private flushIntervalMs = 5000
  ) {
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }
  
  write(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }
  
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const batch = this.buffer.splice(0);
    
    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceLogs: [{
          resource: { attributes: [] },
          scopeLogs: [{
            scope: { name: 'alephnet' },
            logRecords: batch.map(this.toOTLP)
          }]
        }]
      })
    });
  }
  
  private toOTLP(entry: LogEntry): any {
    return {
      timeUnixNano: Date.parse(entry.timestamp) * 1e6,
      severityNumber: this.getSeverityNumber(entry.level),
      severityText: entry.level,
      body: { stringValue: entry.message },
      attributes: Object.entries(entry.context).map(([key, value]) => ({
        key,
        value: { stringValue: String(value) }
      }))
    };
  }
  
  private getSeverityNumber(level: LogLevel): number {
    const map = { DEBUG: 5, INFO: 9, WARN: 13, ERROR: 17, FATAL: 21 };
    return map[level];
  }
}

/**
 * Gun.js transport (distributed logging)
 */
export class GunLogTransport implements LogTransport {
  constructor(
    private gun: any,
    private nodeId: string,
    private retentionDays = 7
  ) {}
  
  write(entry: LogEntry): void {
    const key = `${entry.timestamp}_${Math.random().toString(36).slice(2)}`;
    
    this.gun.get('logs')
      .get(this.nodeId)
      .get(key)
      .put({
        ...entry,
        context: JSON.stringify(entry.context)
      });
  }
  
  async flush(): Promise<void> {}
}
```

## Metrics

### Metric Types

```typescript
export interface MetricsRegistry {
  /** Create/get counter */
  counter(name: string, help: string, labels?: string[]): Counter;
  
  /** Create/get gauge */
  gauge(name: string, help: string, labels?: string[]): Gauge;
  
  /** Create/get histogram */
  histogram(name: string, help: string, buckets: number[], labels?: string[]): Histogram;
  
  /** Create/get summary */
  summary(name: string, help: string, percentiles: number[], labels?: string[]): Summary;
  
  /** Export all metrics in Prometheus format */
  export(): Promise<string>;
}

export interface Counter {
  inc(value?: number, labels?: Record<string, string>): void;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(value?: number, labels?: Record<string, string>): void;
  dec(value?: number, labels?: Record<string, string>): void;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  startTimer(labels?: Record<string, string>): () => number;
}

export interface Summary {
  observe(value: number, labels?: Record<string, string>): void;
}
```

### Standard Metrics

```typescript
/**
 * Pre-defined metrics for the AlephNet mesh
 */
export function createStandardMetrics(registry: MetricsRegistry): StandardMetrics {
  return {
    // Request metrics
    requestsTotal: registry.counter(
      'aleph_requests_total',
      'Total number of requests',
      ['method', 'path', 'status']
    ),
    
    requestDuration: registry.histogram(
      'aleph_request_duration_seconds',
      'Request duration in seconds',
      [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      ['method', 'path']
    ),
    
    // SRIA metrics
    sriaSessionsActive: registry.gauge(
      'aleph_sria_sessions_active',
      'Number of active SRIA sessions',
      ['node_id']
    ),
    
    sriaStepDuration: registry.histogram(
      'aleph_sria_step_duration_seconds',
      'SRIA step duration',
      [0.1, 0.5, 1, 2, 5, 10],
      ['step_type']
    ),
    
    sriaFreeEnergy: registry.gauge(
      'aleph_sria_free_energy',
      'SRIA free energy (lower = more certain)',
      ['session_id']
    ),
    
    // Gun.js metrics
    gunSyncLag: registry.gauge(
      'aleph_gun_sync_lag_seconds',
      'Gun.js sync lag',
      ['peer']
    ),
    
    gunMessagesTotal: registry.counter(
      'aleph_gun_messages_total',
      'Total Gun.js messages',
      ['direction', 'type']
    ),
    
    // GMF metrics
    gmfObjectsTotal: registry.gauge(
      'aleph_gmf_objects_total',
      'Total objects in GMF',
      []
    ),
    
    gmfProposalsTotal: registry.counter(
      'aleph_gmf_proposals_total',
      'Total GMF proposals',
      ['status']
    ),
    
    gmfCoherence: registry.gauge(
      'aleph_gmf_coherence',
      'GMF coherence score',
      []
    ),
    
    // Service metrics
    serviceCallsTotal: registry.counter(
      'aleph_service_calls_total',
      'Total service calls',
      ['service_id', 'endpoint', 'status']
    ),
    
    serviceResponseTime: registry.histogram(
      'aleph_service_response_time_seconds',
      'Service response time',
      [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      ['service_id', 'endpoint']
    ),
    
    // Task metrics
    taskExecutionsTotal: registry.counter(
      'aleph_task_executions_total',
      'Total task executions',
      ['task_id', 'status']
    ),
    
    taskDuration: registry.histogram(
      'aleph_task_duration_seconds',
      'Task execution duration',
      [1, 5, 10, 30, 60, 300],
      ['task_id']
    ),
    
    // Embedding metrics
    embeddingCacheHits: registry.counter(
      'aleph_embedding_cache_hits_total',
      'Embedding cache hits',
      []
    ),
    
    embeddingCacheMisses: registry.counter(
      'aleph_embedding_cache_misses_total',
      'Embedding cache misses',
      []
    ),
    
    embeddingLatency: registry.histogram(
      'aleph_embedding_latency_seconds',
      'Embedding generation latency',
      [0.01, 0.05, 0.1, 0.5, 1],
      ['provider']
    ),
    
    // Wallet metrics
    alephBalanceTotal: registry.gauge(
      'aleph_balance_total',
      'Total Aleph balance across all users',
      []
    ),
    
    alephTransactionsTotal: registry.counter(
      'aleph_transactions_total',
      'Total Aleph transactions',
      ['type']
    )
  };
}

interface StandardMetrics {
  requestsTotal: Counter;
  requestDuration: Histogram;
  sriaSessionsActive: Gauge;
  sriaStepDuration: Histogram;
  sriaFreeEnergy: Gauge;
  gunSyncLag: Gauge;
  gunMessagesTotal: Counter;
  gmfObjectsTotal: Gauge;
  gmfProposalsTotal: Counter;
  gmfCoherence: Gauge;
  serviceCallsTotal: Counter;
  serviceResponseTime: Histogram;
  taskExecutionsTotal: Counter;
  taskDuration: Histogram;
  embeddingCacheHits: Counter;
  embeddingCacheMisses: Counter;
  embeddingLatency: Histogram;
  alephBalanceTotal: Gauge;
  alephTransactionsTotal: Counter;
}
```

## Distributed Tracing

### Trace Context

```typescript
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage: Record<string, string>;
}

export interface Span {
  readonly context: TraceContext;
  
  /** Set span name */
  setName(name: string): void;
  
  /** Add attribute */
  setAttribute(key: string, value: string | number | boolean): void;
  
  /** Add event */
  addEvent(name: string, attributes?: Record<string, any>): void;
  
  /** Set status */
  setStatus(status: SpanStatus): void;
  
  /** Record exception */
  recordException(error: Error): void;
  
  /** End span */
  end(): void;
}

export type SpanStatus = 'OK' | 'ERROR' | 'UNSET';

export interface Tracer {
  /** Start a new span */
  startSpan(name: string, options?: SpanOptions): Span;
  
  /** Start span as child of current */
  startActiveSpan<T>(name: string, fn: (span: Span) => T): T;
  
  /** Get current span */
  getCurrentSpan(): Span | undefined;
  
  /** Inject context for propagation */
  inject(context: TraceContext): Record<string, string>;
  
  /** Extract context from headers */
  extract(headers: Record<string, string>): TraceContext | undefined;
}

interface SpanOptions {
  kind?: 'CLIENT' | 'SERVER' | 'PRODUCER' | 'CONSUMER' | 'INTERNAL';
  attributes?: Record<string, string | number | boolean>;
  links?: TraceContext[];
}
```

### Cross-Node Tracing

```typescript
/**
 * Trace context propagation across nodes
 */
export class CrossNodeTracer {
  constructor(
    private tracer: Tracer,
    private nodeId: string
  ) {}
  
  /**
   * Wrap Gun.js message with trace context
   */
  wrapGunMessage(message: any, span: Span): any {
    const headers = this.tracer.inject(span.context);
    
    return {
      ...message,
      _trace: {
        ...headers,
        sourceNodeId: this.nodeId,
        timestamp: Date.now()
      }
    };
  }
  
  /**
   * Extract trace context from Gun.js message
   */
  extractFromGunMessage(message: any): TraceContext | undefined {
    if (!message._trace) return undefined;
    
    return this.tracer.extract(message._trace);
  }
  
  /**
   * Trace SRIA step
   */
  traceSRIAStep<T>(
    stepName: string,
    sessionId: string,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(`sria.${stepName}`, async (span) => {
      span.setAttribute('sria.session_id', sessionId);
      span.setAttribute('node.id', this.nodeId);
      
      try {
        const result = await fn(span);
        span.setStatus('OK');
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus('ERROR');
        throw error;
      } finally {
        span.end();
      }
    });
  }
  
  /**
   * Trace service call
   */
  traceServiceCall<T>(
    serviceId: string,
    endpoint: string,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(`service.call`, async (span) => {
      span.setAttribute('service.id', serviceId);
      span.setAttribute('service.endpoint', endpoint);
      span.setAttribute('span.kind', 'CLIENT');
      
      try {
        const result = await fn(span);
        span.setStatus('OK');
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus('ERROR');
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

## Alerting

### Alert Definitions

```typescript
export interface AlertRule {
  name: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  
  /** PromQL-style expression */
  expression: string;
  
  /** Duration before firing */
  forDuration: string;
  
  /** Labels to add */
  labels?: Record<string, string>;
  
  /** Annotations for alert message */
  annotations?: {
    summary?: string;
    description?: string;
    runbook?: string;
  };
}

export const STANDARD_ALERTS: AlertRule[] = [
  // Node health
  {
    name: 'NodeDown',
    description: 'Node is not responding',
    severity: 'CRITICAL',
    expression: 'up{job="alephnet"} == 0',
    forDuration: '1m',
    annotations: {
      summary: 'Node {{ $labels.node_id }} is down',
      runbook: 'https://docs.alephnet.io/runbooks/node-down'
    }
  },
  
  // SRIA issues
  {
    name: 'SRIAHighFreeEnergy',
    description: 'SRIA agent has high free energy (stuck)',
    severity: 'WARNING',
    expression: 'aleph_sria_free_energy > 0.9',
    forDuration: '5m',
    annotations: {
      summary: 'SRIA session {{ $labels.session_id }} appears stuck'
    }
  },
  
  // Consensus issues
  {
    name: 'LowCoherence',
    description: 'GMF coherence is low',
    severity: 'WARNING',
    expression: 'aleph_gmf_coherence < 0.5',
    forDuration: '5m',
    annotations: {
      summary: 'Network coherence has dropped below 0.5'
    }
  },
  
  // Performance issues
  {
    name: 'HighRequestLatency',
    description: 'Request latency is high',
    severity: 'WARNING',
    expression: 'histogram_quantile(0.95, rate(aleph_request_duration_seconds_bucket[5m])) > 5',
    forDuration: '5m',
    annotations: {
      summary: 'P95 latency exceeds 5 seconds'
    }
  },
  
  // Error rate
  {
    name: 'HighErrorRate',
    description: 'Error rate is high',
    severity: 'CRITICAL',
    expression: 'rate(aleph_requests_total{status=~"5.."}[5m]) / rate(aleph_requests_total[5m]) > 0.1',
    forDuration: '2m',
    annotations: {
      summary: 'Error rate exceeds 10%'
    }
  },
  
  // Service health
  {
    name: 'ServiceUnavailable',
    description: 'Service has no healthy instances',
    severity: 'CRITICAL',
    expression: 'aleph_service_healthy_instances == 0',
    forDuration: '1m',
    annotations: {
      summary: 'Service {{ $labels.service_id }} has no healthy instances'
    }
  }
];
```

### Alert Manager

```typescript
export interface AlertManager {
  /** Register alert rule */
  registerRule(rule: AlertRule): void;
  
  /** Fire alert manually */
  fire(alert: Alert): Promise<void>;
  
  /** Resolve alert */
  resolve(alertId: string): Promise<void>;
  
  /** Get active alerts */
  getActive(): Promise<Alert[]>;
  
  /** Configure notification channel */
  addChannel(channel: NotificationChannel): void;
}

export interface Alert {
  id: string;
  ruleName: string;
  severity: AlertRule['severity'];
  status: 'FIRING' | 'RESOLVED';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: number;
  endsAt?: number;
}

export interface NotificationChannel {
  name: string;
  type: 'SLACK' | 'EMAIL' | 'PAGERDUTY' | 'WEBHOOK';
  config: Record<string, any>;
  
  /** Filter which alerts to send */
  filter?: (alert: Alert) => boolean;
  
  /** Send notification */
  send(alert: Alert): Promise<void>;
}

/**
 * Slack notification channel
 */
export class SlackChannel implements NotificationChannel {
  name = 'slack';
  type: 'SLACK' = 'SLACK';
  
  constructor(public config: { webhookUrl: string; channel?: string }) {}
  
  async send(alert: Alert): Promise<void> {
    const color = {
      INFO: '#36a64f',
      WARNING: '#f2c744',
      CRITICAL: '#d63232'
    }[alert.severity];
    
    await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: this.config.channel,
        attachments: [{
          color,
          title: `[${alert.severity}] ${alert.ruleName}`,
          text: alert.annotations.summary || alert.annotations.description,
          fields: Object.entries(alert.labels).map(([key, value]) => ({
            title: key,
            value,
            short: true
          })),
          ts: Math.floor(alert.startsAt / 1000)
        }]
      })
    });
  }
}
```

## Dashboard Recommendations

### Key Dashboards

1. **Node Health Dashboard**
   - Node status (up/down)
   - CPU/Memory/Disk usage
   - Gun.js sync lag
   - Active connections

2. **SRIA Performance Dashboard**
   - Active sessions
   - Step durations by type
   - Free energy distribution
   - Belief updates per minute

3. **Service Mesh Dashboard**
   - Request rate by service
   - Latency percentiles (P50, P95, P99)
   - Error rates
   - Circuit breaker states

4. **Consensus Dashboard**
   - GMF object count
   - Proposal acceptance rate
   - Network coherence over time
   - Vote distribution

5. **Economics Dashboard**
   - Total Aleph in circulation
   - Transaction volume
   - Staking distribution by tier
   - Service revenue

### Grafana Panel Examples

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "sum(rate(aleph_requests_total[5m])) by (status)",
          "legendFormat": "{{status}}"
        }
      ]
    },
    {
      "title": "SRIA Free Energy",
      "type": "heatmap",
      "targets": [
        {
          "expr": "aleph_sria_free_energy",
          "legendFormat": "{{session_id}}"
        }
      ]
    },
    {
      "title": "Network Coherence",
      "type": "gauge",
      "targets": [
        {
          "expr": "aleph_gmf_coherence"
        }
      ],
      "thresholds": {
        "mode": "absolute",
        "steps": [
          { "color": "red", "value": 0 },
          { "color": "yellow", "value": 0.5 },
          { "color": "green", "value": 0.8 }
        ]
      }
    }
  ]
}
```
