import { AlephError, NetworkError } from '../errors';

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
    'E_RATE_LIMIT',
    'E_INTERNAL_UNKNOWN' // Sometimes unknown errors are transient
  ]
};

/** Retry config tuned for agentic AI calls — more attempts, longer backoff */
export const AGENT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  retryableErrors: [
    'E_NETWORK_TIMEOUT',
    'E_NETWORK_UNREACHABLE',
    'E_CONSENSUS_TIMEOUT',
    'E_SRIA_TIMEOUT',
    'E_SERVICE_UNAVAILABLE',
    'E_RATE_LIMIT',
    'E_INTERNAL_UNKNOWN',
  ],
};

/** Default timeout values by content type (ms) */
export const TIMEOUT_DEFAULTS: Record<string, number> = {
  chat: 60_000,
  agent: 180_000,
  code: 120_000,
  embedding: 30_000,
  summary: 60_000,
  analysis: 60_000,
  token: 15_000,      // OAuth token fetch
  tool: 60_000,       // Tool execution
  planning: 30_000,   // Planning phase
};

// ─── Timeout Detection Helpers ────────────────────────────────────────────────

/** Check if an error is a timeout/abort error that should be retried */
export function isTimeoutError(err: Error): boolean {
  return err.name === 'AbortError'
    || err.message?.includes('timed out')
    || err.message?.includes('ETIMEDOUT')
    || err.message?.includes('ECONNRESET')
    || err.message?.includes('ECONNABORTED')
    || err.message?.includes('network timeout');
}

/** Check if an error indicates a rate limit that should be retried with backoff */
export function isRateLimitError(err: Error): boolean {
  return err.message?.includes('429')
    || err.message?.toLowerCase().includes('rate limit')
    || err.message?.toLowerCase().includes('quota')
    || err.message?.toLowerCase().includes('too many requests');
}

// ─── fetchWithTimeout ─────────────────────────────────────────────────────────

/**
 * Wrapper around fetch() that enforces a timeout via AbortSignal.
 * If the request exceeds timeoutMs, throws a retryable NetworkError with code E_NETWORK_TIMEOUT.
 * Composes with an optional external AbortSignal (e.g., task cancellation).
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 120_000, ...fetchOptions } = options;
  const controller = new AbortController();

  // If the caller passed an existing signal (e.g., task cancellation), propagate it
  const externalSignal = fetchOptions.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      const onExternalAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      // Clean up when our controller is done
      controller.signal.addEventListener('abort', () => {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    // If it was aborted by our timeout (not by external signal), wrap as NetworkError
    if (err.name === 'AbortError') {
      // Check if external signal triggered it (task cancellation) vs our timeout
      if (externalSignal?.aborted) {
        throw err; // Re-throw as-is — task was cancelled
      }
      throw new NetworkError(
        'E_NETWORK_TIMEOUT',
        `Request timed out after ${timeoutMs}ms: ${url.substring(0, 100)}`,
        undefined,
        true,  // recoverable
        true   // retryable
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Promise Timeout Utility ──────────────────────────────────────────────────

/**
 * Race a promise against a timeout. If the timeout fires first, rejects with a
 * retryable NetworkError.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = 'Operation'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new NetworkError(
          'E_NETWORK_TIMEOUT',
          `${operationName} timed out after ${timeoutMs}ms`,
          undefined,
          true,  // recoverable
          true   // retryable
        )
      );
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

// ─── Retry with Exponential Backoff ───────────────────────────────────────────

/**
 * Retry with exponential backoff.
 * Handles AlephError (checks retryable flag + code), native timeout/abort errors,
 * rate-limit errors, and generic errors.
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
      
      // ── Determine retryability ──
      let shouldRetry = false;

      if (error instanceof AlephError) {
        // AlephError: use its retryable flag + check code
        if (!error.retryable) {
          throw error;
        }
        if (config.retryableErrors.includes(error.code)) {
          shouldRetry = true;
        }
      } else if (isTimeoutError(lastError)) {
        // Native timeout/abort errors are always retryable
        shouldRetry = true;
      } else if (isRateLimitError(lastError)) {
        // Rate limit errors are always retryable (with longer backoff)
        shouldRetry = true;
      } else {
        // Generic/unknown errors — retry cautiously (preserves original behavior)
        shouldRetry = true;
      }

      if (!shouldRetry) {
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
