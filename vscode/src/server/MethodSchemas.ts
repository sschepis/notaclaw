/**
 * Method parameter schemas for auto-validation.
 *
 * Each schema describes the expected params for a JSON-RPC method.
 * The validation middleware checks incoming requests against these schemas
 * before they reach the handler.
 */

export interface ParamSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  /** For string params: minimum length */
  minLength?: number;
  /** For arrays: item type (shallow check) */
  itemType?: 'string' | 'number' | 'boolean' | 'object';
  /** For numbers: inclusive minimum */
  min?: number;
  /** For numbers: inclusive maximum */
  max?: number;
  /** Human-readable description */
  description?: string;
}

export interface MethodSchema {
  params: Record<string, ParamSchema>;
  /** If true, no params are required (e.g. state.getOpenDocuments) */
  noParams?: boolean;
  description?: string;
}

/**
 * Registry of method schemas.
 */
export const METHOD_SCHEMAS: Record<string, MethodSchema> = {
  // ── Auth ────────────────────────────────────────────────────────────
  'auth.authenticate': {
    description: 'Authenticate with the server',
    params: {
      token: { type: 'string', required: true, minLength: 1, description: 'Authentication token' },
    },
  },

  // ── Editor ──────────────────────────────────────────────────────────
  'editor.openFile': {
    description: 'Open a file in the editor',
    params: {
      filePath: { type: 'string', required: true, minLength: 1, description: 'Path to the file' },
    },
  },
  'editor.getContent': {
    description: 'Get the content of the active editor',
    params: {},
    noParams: true,
  },
  'editor.setContent': {
    description: 'Replace the content of a file',
    params: {
      filePath: { type: 'string', required: true, description: 'Path to the file' },
      content: { type: 'string', required: true, description: 'New file content' },
    },
  },
  'editor.insertText': {
    description: 'Insert text at a position',
    params: {
      text: { type: 'string', required: true, description: 'Text to insert' },
      line: { type: 'number', required: true, min: 0, description: 'Line number' },
      character: { type: 'number', required: true, min: 0, description: 'Character position' },
    },
  },
  'editor.replaceText': {
    description: 'Replace text in a range',
    params: {
      text: { type: 'string', required: true, description: 'Replacement text' },
      startLine: { type: 'number', required: true, min: 0 },
      startCharacter: { type: 'number', required: true, min: 0 },
      endLine: { type: 'number', required: true, min: 0 },
      endCharacter: { type: 'number', required: true, min: 0 },
    },
  },
  'editor.save': {
    description: 'Save the active document',
    params: {},
    noParams: true,
  },
  'editor.close': {
    description: 'Close the active editor',
    params: {},
    noParams: true,
  },
  'editor.formatDocument': {
    description: 'Format the active document',
    params: {},
    noParams: true,
  },
  'editor.getDocumentInfo': {
    description: 'Get information about a document',
    params: {
      filePath: { type: 'string', required: true, description: 'Path to the file' },
    },
  },
  'editor.applyEdits': {
    description: 'Apply multiple edits atomically',
    params: {
      edits: { type: 'array', required: true, itemType: 'object', description: 'Array of edit operations' },
    },
  },
  'editor.getCompletions': {
    description: 'Get completion suggestions',
    params: {
      filePath: { type: 'string', required: true },
      line: { type: 'number', required: true, min: 0 },
      character: { type: 'number', required: true, min: 0 },
    },
  },

  // ── File System ─────────────────────────────────────────────────────
  'fs.readFile': {
    description: 'Read a file',
    params: {
      filePath: { type: 'string', required: true, minLength: 1 },
    },
  },
  'fs.writeFile': {
    description: 'Write content to a file',
    params: {
      filePath: { type: 'string', required: true, minLength: 1 },
      content: { type: 'string', required: true },
    },
  },
  'fs.deleteFile': {
    description: 'Delete a file',
    params: {
      filePath: { type: 'string', required: true, minLength: 1 },
    },
  },
  'fs.listDirectory': {
    description: 'List directory contents',
    params: {
      dirPath: { type: 'string', required: true, minLength: 1 },
    },
  },
  'fs.createDirectory': {
    description: 'Create a directory',
    params: {
      dirPath: { type: 'string', required: true, minLength: 1 },
    },
  },
  'fs.watchFiles': {
    description: 'Watch files matching a glob pattern',
    params: {
      globPattern: { type: 'string', required: true, minLength: 1 },
    },
  },
  'fs.unwatchFiles': {
    description: 'Stop watching a glob pattern',
    params: {
      globPattern: { type: 'string', required: true, minLength: 1 },
    },
  },

  // ── Terminal ────────────────────────────────────────────────────────
  'terminal.execute': {
    description: 'Execute a command in a terminal',
    params: {
      command: { type: 'string', required: true, minLength: 1 },
    },
  },
  'terminal.getOutput': {
    description: 'Get buffered terminal output',
    params: {
      terminalId: { type: 'number', required: true, min: 0 },
    },
  },

  // ── Command ─────────────────────────────────────────────────────────
  'command.execute': {
    description: 'Execute a VS Code command',
    params: {
      command: { type: 'string', required: true, minLength: 1 },
    },
  },

  // ── State ───────────────────────────────────────────────────────────
  'state.getOpenDocuments': {
    description: 'Get list of open documents',
    params: {},
    noParams: true,
  },
  'state.getVisibleEditors': {
    description: 'Get list of visible editors',
    params: {},
    noParams: true,
  },
  'state.getDiagnostics': {
    description: 'Get diagnostics for a file',
    params: {
      filePath: { type: 'string', required: true },
    },
  },
  'state.getSymbols': {
    description: 'Get symbols for a file',
    params: {
      filePath: { type: 'string', required: true },
    },
  },
  'state.getHover': {
    description: 'Get hover info at a position',
    params: {
      filePath: { type: 'string', required: true },
      line: { type: 'number', required: true, min: 0 },
      character: { type: 'number', required: true, min: 0 },
    },
  },
  'state.getReferences': {
    description: 'Get references for a symbol',
    params: {
      filePath: { type: 'string', required: true },
      line: { type: 'number', required: true, min: 0 },
      character: { type: 'number', required: true, min: 0 },
    },
  },
  'state.getDefinition': {
    description: 'Get definition of a symbol',
    params: {
      filePath: { type: 'string', required: true },
      line: { type: 'number', required: true, min: 0 },
      character: { type: 'number', required: true, min: 0 },
    },
  },
  'state.getCodeActions': {
    description: 'Get available code actions',
    params: {
      filePath: { type: 'string', required: true },
      startLine: { type: 'number', required: true, min: 0 },
      startCharacter: { type: 'number', required: true, min: 0 },
      endLine: { type: 'number', required: true, min: 0 },
      endCharacter: { type: 'number', required: true, min: 0 },
    },
  },

  // ── Debug ───────────────────────────────────────────────────────────
  'debug.startSession': {
    description: 'Start a debug session',
    params: {
      name: { type: 'string', required: true },
      type: { type: 'string', required: true },
      request: { type: 'string', required: true },
    },
  },
  'debug.stopSession': {
    description: 'Stop the active debug session',
    params: {},
    noParams: true,
  },
  'debug.setBreakpoints': {
    description: 'Set breakpoints in a file',
    params: {
      filePath: { type: 'string', required: true },
      lines: { type: 'array', required: true, itemType: 'number' },
    },
  },
  'debug.removeBreakpoints': {
    description: 'Remove breakpoints from a file',
    params: {
      filePath: { type: 'string', required: true },
    },
  },
  'debug.getBreakpoints': {
    description: 'Get all breakpoints',
    params: {},
    noParams: true,
  },
  'debug.listSessions': {
    description: 'List active debug sessions',
    params: {},
    noParams: true,
  },

  // ── Git ─────────────────────────────────────────────────────────────
  'git.status': {
    description: 'Get git status',
    params: {},
    noParams: true,
  },
  'git.diff': {
    description: 'Get git diff',
    params: {},
    noParams: true,
  },
  'git.log': {
    description: 'Get git log',
    params: {},
    noParams: true,
  },
  'git.stage': {
    description: 'Stage files',
    params: {
      files: { type: 'array', required: true, itemType: 'string' },
    },
  },
  'git.unstage': {
    description: 'Unstage files',
    params: {
      files: { type: 'array', required: true, itemType: 'string' },
    },
  },
  'git.commit': {
    description: 'Commit staged changes',
    params: {
      message: { type: 'string', required: true, minLength: 1 },
    },
  },
  'git.checkout': {
    description: 'Checkout a branch',
    params: {
      branch: { type: 'string', required: true, minLength: 1 },
    },
  },
  'git.branches': {
    description: 'List branches',
    params: {},
    noParams: true,
  },
};

/**
 * Validate params against a method schema.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateParams(
  method: string,
  params: Record<string, any> | undefined
): string | null {
  const schema = METHOD_SCHEMAS[method];
  if (!schema) {
    // No schema defined — skip validation
    return null;
  }

  if (schema.noParams) {
    return null;
  }

  if (!params || typeof params !== 'object') {
    const requiredFields = Object.entries(schema.params)
      .filter(([, s]) => s.required)
      .map(([k]) => k);
    if (requiredFields.length > 0) {
      return `Missing required parameters: ${requiredFields.join(', ')}`;
    }
    return null;
  }

  for (const [name, spec] of Object.entries(schema.params)) {
    const value = params[name];

    // Required check
    if (spec.required && (value === undefined || value === null)) {
      return `Missing required parameter: '${name}'`;
    }

    // Skip further checks if value not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (spec.type === 'array') {
      if (!Array.isArray(value)) {
        return `Parameter '${name}' must be an array`;
      }
      if (spec.itemType) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== spec.itemType) {
            return `Parameter '${name}[${i}]' must be of type '${spec.itemType}'`;
          }
        }
      }
    } else if (typeof value !== spec.type) {
      return `Parameter '${name}' must be of type '${spec.type}', got '${typeof value}'`;
    }

    // String constraints
    if (spec.type === 'string' && typeof value === 'string') {
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        return `Parameter '${name}' must be at least ${spec.minLength} character(s) long`;
      }
    }

    // Number constraints
    if (spec.type === 'number' && typeof value === 'number') {
      if (spec.min !== undefined && value < spec.min) {
        return `Parameter '${name}' must be >= ${spec.min}`;
      }
      if (spec.max !== undefined && value > spec.max) {
        return `Parameter '${name}' must be <= ${spec.max}`;
      }
    }
  }

  return null;
}

/**
 * Middleware factory that validates request params against registered schemas.
 */
export function createValidationMiddleware(): import('./Middleware').MiddlewareFn {
  return async (ctx, next) => {
    const error = validateParams(ctx.request.method, ctx.request.params as Record<string, any>);
    if (error) {
      return {
        jsonrpc: '2.0' as const,
        id: ctx.request.id ?? null,
        error: {
          code: -32602,
          message: error,
          data: {
            timestamp: new Date().toISOString(),
            errorType: 'ValidationError',
            method: ctx.request.method,
          },
        },
      };
    }
    return next();
  };
}
