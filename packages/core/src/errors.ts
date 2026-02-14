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

// Internal errors
export class InternalError extends AlephError {
  readonly category = 'INTERNAL';
  constructor(
    readonly code: string,
    message: string,
    readonly operationName?: string,
    readonly originalError?: any,
    readonly recoverable = false,
    readonly retryable = false
  ) {
    super(message);
  }
}

// AI provider errors
export class AIProviderError extends AlephError {
  readonly category = 'SERVICE' as const;
  readonly recoverable = true;
  readonly retryable = true;
  constructor(
    message: string,
    readonly code: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

// Plugin system errors
export class PluginError extends AlephError {
  readonly category = 'INTERNAL' as const;
  readonly recoverable = false;
  readonly retryable = false;
  constructor(
    message: string,
    readonly code: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
