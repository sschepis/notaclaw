/**
 * Error handling utilities for JSON-RPC protocol
 */

import { ErrorCode, ERROR_MESSAGES, JsonRpcError, JsonRpcErrorResponse } from './types';

/**
 * Custom error class for protocol errors
 */
export class ProtocolError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly data?: unknown
  ) {
    super(message ?? ERROR_MESSAGES[code] ?? 'Unknown error');
    this.name = 'ProtocolError';
  }

  toJsonRpcError(): JsonRpcError {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

/**
 * Create a JSON-RPC error response
 */
export function createErrorResponse(
  id: string | number | null,
  code: ErrorCode,
  message?: string,
  data?: unknown
): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message: message ?? ERROR_MESSAGES[code] ?? 'Unknown error',
      data,
    },
  };
}

/**
 * Create a parse error response
 */
export function parseError(id: string | number | null = null): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.ParseError);
}

/**
 * Create an invalid request error response
 */
export function invalidRequest(id: string | number | null, message?: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.InvalidRequest, message);
}

/**
 * Create a method not found error response
 */
export function methodNotFound(id: string | number, method: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.MethodNotFound, `Method '${method}' not found`);
}

/**
 * Create an invalid params error response
 */
export function invalidParams(id: string | number, message?: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.InvalidParams, message ?? 'Invalid parameters');
}

/**
 * Create an internal error response
 */
export function internalError(id: string | number, message?: string, data?: unknown): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.InternalError, message ?? 'Internal error', data);
}

/**
 * Create an unauthorized error response
 */
export function unauthorized(id: string | number, message?: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.Unauthorized, message ?? 'Authentication required');
}

/**
 * Create a file not found error response
 */
export function fileNotFound(id: string | number, path: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.FileNotFound, `File not found: ${path}`, { path });
}

/**
 * Create a file access denied error response
 */
export function fileAccessDenied(id: string | number, path: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.FileAccessDenied, `Access denied: ${path}`, { path });
}

/**
 * Create a terminal not found error response
 */
export function terminalNotFound(id: string | number, terminalId: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.TerminalNotFound, `Terminal not found: ${terminalId}`, { terminalId });
}

/**
 * Create an editor not active error response
 */
export function editorNotActive(id: string | number): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.EditorNotActive, 'No active text editor');
}

/**
 * Create an operation cancelled error response
 */
export function operationCancelled(id: string | number): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.OperationCancelled, 'Operation was cancelled');
}

/**
 * Create a rate limited error response
 */
export function rateLimited(id: string | number): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.RateLimited, 'Too many requests, please slow down');
}

/**
 * Create a session expired error response
 */
export function sessionExpired(id: string | number): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.SessionExpired, 'Session has expired, please re-authenticate');
}

/**
 * Create a feature disabled error response
 */
export function featureDisabled(id: string | number, feature: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.FeatureDisabled, `Feature is disabled: ${feature}`, { feature });
}

/**
 * Create a path restricted error response
 */
export function pathRestricted(id: string | number, path: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.PathRestricted, `Path access is restricted: ${path}`, { path });
}

/**
 * Create a command restricted error response
 */
export function commandRestricted(id: string | number, command: string): JsonRpcErrorResponse {
  return createErrorResponse(id, ErrorCode.CommandRestricted, `Command execution is restricted: ${command}`, { command });
}

/**
 * Build structured error data payload with timestamp, type classification,
 * and optional stack trace (only included when agentControl.logLevel is 'debug').
 */
function enrichErrorData(base: Record<string, unknown> | undefined, error: unknown): Record<string, unknown> {
  const data: Record<string, unknown> = { ...(base ?? {}) };
  data.timestamp = new Date().toISOString();

  if (error instanceof ProtocolError) {
    data.errorType = 'protocol';
  } else if (error instanceof Error) {
    data.errorType = error.name ?? 'Error';
    // Only include stack in debug mode to avoid leaking internals in production
    try {
      // Dynamically import to avoid circular dependency — safe because this is synchronous config read
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vscode = require('vscode');
      const level = vscode.workspace.getConfiguration('agentControl').get('logLevel', 'info') as string;
      if (level === 'debug') {
        data.stack = error.stack;
      }
    } catch {
      // Running outside VS Code (tests) — include stack by default
      data.stack = (error as Error).stack;
    }
  } else {
    data.errorType = 'unknown';
  }

  return data;
}

/**
 * Convert any error to a JSON-RPC error response.
 * All error responses include structured data with timestamp and error type.
 * Stack traces are only included when logLevel is 'debug'.
 */
export function toErrorResponse(id: string | number, error: unknown): JsonRpcErrorResponse {
  // Handle parameter validation errors from WebSocketServer helpers
  if (error instanceof Error && (error as any).__invalidParams) {
    return invalidParams((error as any).requestId ?? id, error.message);
  }

  if (error instanceof ProtocolError) {
    const enriched = enrichErrorData(
      typeof error.data === 'object' && error.data !== null ? error.data as Record<string, unknown> : undefined,
      error,
    );
    return createErrorResponse(id, error.code, error.message, enriched);
  }
  
  if (error instanceof Error) {
    const enriched = enrichErrorData({ name: error.name }, error);
    return internalError(id, error.message, enriched);
  }
  
  const enriched = enrichErrorData(undefined, error);
  return internalError(id, String(error), enriched);
}
