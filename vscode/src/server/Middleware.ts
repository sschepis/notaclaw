/**
 * Request middleware pipeline for composable request processing.
 *
 * Middleware functions are executed in order. Each middleware can:
 * - Short-circuit by returning a response without calling next()
 * - Transform the request before passing to next()
 * - Post-process the response returned by next()
 */

import { JsonRpcRequest, JsonRpcSuccessResponse, JsonRpcErrorResponse } from '../protocol/types';

/** A JSON-RPC response — either success or error. */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * Represents a connected client for middleware context.
 */
export interface MiddlewareClient {
  id: string;
  authenticated: boolean;
  origin: string;
}

/**
 * Context passed through the middleware chain.
 */
export interface MiddlewareContext {
  request: JsonRpcRequest;
  client: MiddlewareClient;
  /** Arbitrary key-value store for inter-middleware communication */
  state: Map<string, any>;
  /** Timestamp when the request entered the pipeline */
  startTime: number;
}

/**
 * A middleware function. Receives context and a next() function.
 * Must return a JsonRpcResponse (or null for notifications).
 */
export type MiddlewareFn = (
  ctx: MiddlewareContext,
  next: () => Promise<JsonRpcResponse | null>
) => Promise<JsonRpcResponse | null>;

/**
 * Named middleware for introspection and selective removal.
 */
export interface NamedMiddleware {
  name: string;
  fn: MiddlewareFn;
}

/**
 * Composable middleware pipeline.
 *
 * Usage:
 *   const pipeline = new MiddlewarePipeline();
 *   pipeline.use('auth', authMiddleware);
 *   pipeline.use('rateLimit', rateLimitMiddleware);
 *   pipeline.use('logging', loggingMiddleware);
 *   pipeline.use('handler', routeHandler);
 *
 *   const response = await pipeline.execute(request, client);
 */
export class MiddlewarePipeline {
  private middlewares: NamedMiddleware[] = [];

  /**
   * Add a middleware to the end of the pipeline.
   */
  use(name: string, fn: MiddlewareFn): this {
    this.middlewares.push({ name, fn });
    return this;
  }

  /**
   * Insert a middleware before another named middleware.
   */
  useBefore(beforeName: string, name: string, fn: MiddlewareFn): this {
    const idx = this.middlewares.findIndex(m => m.name === beforeName);
    if (idx === -1) {
      // If target not found, append
      this.middlewares.push({ name, fn });
    } else {
      this.middlewares.splice(idx, 0, { name, fn });
    }
    return this;
  }

  /**
   * Insert a middleware after another named middleware.
   */
  useAfter(afterName: string, name: string, fn: MiddlewareFn): this {
    const idx = this.middlewares.findIndex(m => m.name === afterName);
    if (idx === -1) {
      this.middlewares.push({ name, fn });
    } else {
      this.middlewares.splice(idx + 1, 0, { name, fn });
    }
    return this;
  }

  /**
   * Remove a middleware by name.
   */
  remove(name: string): boolean {
    const idx = this.middlewares.findIndex(m => m.name === name);
    if (idx === -1) {
      return false;
    }
    this.middlewares.splice(idx, 1);
    return true;
  }

  /**
   * Check if a middleware is registered.
   */
  has(name: string): boolean {
    return this.middlewares.some(m => m.name === name);
  }

  /**
   * Get all middleware names in execution order.
   */
  getNames(): string[] {
    return this.middlewares.map(m => m.name);
  }

  /**
   * Execute the middleware pipeline for a request.
   */
  async execute(
    request: JsonRpcRequest,
    client: MiddlewareClient
  ): Promise<JsonRpcResponse | null> {
    const ctx: MiddlewareContext = {
      request,
      client,
      state: new Map(),
      startTime: Date.now(),
    };

    let index = 0;

    const next = async (): Promise<JsonRpcResponse | null> => {
      if (index >= this.middlewares.length) {
        // End of pipeline reached with no response — should not happen
        // if a terminal handler middleware is registered
        return null;
      }

      const middleware = this.middlewares[index++];
      return middleware.fn(ctx, next);
    };

    return next();
  }

  /**
   * Clear all middlewares.
   */
  clear(): void {
    this.middlewares = [];
  }
}

// ─── Built-in Middleware Factories ─────────────────────────────────────────

/**
 * Creates a logging middleware that logs request/response timing.
 */
export function createLoggingMiddleware(
  log: (message: string) => void
): MiddlewareFn {
  return async (ctx, next) => {
    const { method, id } = ctx.request;
    log(`→ ${method} (id=${id ?? 'notification'}) from client=${ctx.client.id}`);

    const response = await next();

    const elapsed = Date.now() - ctx.startTime;
    if (response && 'error' in response) {
      log(`← ${method} ERROR ${response.error.code} (${elapsed}ms)`);
    } else {
      log(`← ${method} OK (${elapsed}ms)`);
    }

    return response;
  };
}

/**
 * Creates an authentication gate middleware.
 * Requests to non-auth methods from unauthenticated clients are rejected.
 */
export function createAuthMiddleware(
  authExemptMethods: Set<string>
): MiddlewareFn {
  return async (ctx, next) => {
    if (!ctx.client.authenticated && !authExemptMethods.has(ctx.request.method)) {
      return {
        jsonrpc: '2.0' as const,
        id: ctx.request.id ?? null,
        error: {
          code: -32600,
          message: 'Not authenticated',
          data: { timestamp: new Date().toISOString(), errorType: 'AuthenticationError' },
        },
      };
    }
    return next();
  };
}

/**
 * Creates a method category permission middleware.
 */
export function createPermissionMiddleware(
  getCategoryForMethod: (method: string) => string | undefined,
  isAllowed: (category: string) => boolean
): MiddlewareFn {
  return async (ctx, next) => {
    const category = getCategoryForMethod(ctx.request.method);
    if (category && !isAllowed(category)) {
      return {
        jsonrpc: '2.0' as const,
        id: ctx.request.id ?? null,
        error: {
          code: -32600,
          message: `Method category '${category}' is not allowed`,
          data: { timestamp: new Date().toISOString(), errorType: 'PermissionError' },
        },
      };
    }
    return next();
  };
}
