/**
 * JSON-RPC 2.0 Protocol Types for VS Code Agent Control
 */

// ============================================================================
// Core JSON-RPC Types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcSuccessResponse | JsonRpcErrorResponse;

// ============================================================================
// Error Codes
// ============================================================================

export enum ErrorCode {
  // Standard JSON-RPC 2.0 errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // Custom extension errors (-32000 to -32099 reserved for implementation)
  Unauthorized = -32001,
  FileNotFound = -32002,
  FileAccessDenied = -32003,
  TerminalNotFound = -32004,
  EditorNotActive = -32005,
  OperationCancelled = -32006,
  RateLimited = -32007,
  SessionExpired = -32008,
  FeatureDisabled = -32009,
  PathRestricted = -32010,
  CommandRestricted = -32011,
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.ParseError]: 'Parse error',
  [ErrorCode.InvalidRequest]: 'Invalid request',
  [ErrorCode.MethodNotFound]: 'Method not found',
  [ErrorCode.InvalidParams]: 'Invalid params',
  [ErrorCode.InternalError]: 'Internal error',
  [ErrorCode.Unauthorized]: 'Unauthorized',
  [ErrorCode.FileNotFound]: 'File not found',
  [ErrorCode.FileAccessDenied]: 'File access denied',
  [ErrorCode.TerminalNotFound]: 'Terminal not found',
  [ErrorCode.EditorNotActive]: 'No active editor',
  [ErrorCode.OperationCancelled]: 'Operation cancelled',
  [ErrorCode.RateLimited]: 'Rate limit exceeded',
  [ErrorCode.SessionExpired]: 'Session expired',
  [ErrorCode.FeatureDisabled]: 'Feature disabled',
  [ErrorCode.PathRestricted]: 'Path access restricted',
  [ErrorCode.CommandRestricted]: 'Command execution restricted',
};

// ============================================================================
// Position and Range Types
// ============================================================================

export interface Position {
  line: number;      // 0-indexed
  character: number; // 0-indexed
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

// ============================================================================
// File System Types
// ============================================================================

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  mtime?: number;
}

export interface FileStat {
  type: 'file' | 'directory' | 'symlink';
  size: number;
  ctime: number;
  mtime: number;
}

// ============================================================================
// Terminal Types
// ============================================================================

export interface TerminalInfo {
  id: string;
  name: string;
  processId?: number;
}

// ============================================================================
// Editor Types
// ============================================================================

export interface DocumentInfo {
  uri: string;
  languageId: string;
  version: number;
  lineCount: number;
  isDirty: boolean;
}

export interface SelectionInfo {
  range: Range;
  text: string;
  isReversed: boolean;
}

// ============================================================================
// Diagnostics Types
// ============================================================================

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  source?: string;
  code?: string | number;
}

// ============================================================================
// Symbol Types
// ============================================================================

export type SymbolKind = 
  | 'file' | 'module' | 'namespace' | 'package' | 'class' | 'method'
  | 'property' | 'field' | 'constructor' | 'enum' | 'interface'
  | 'function' | 'variable' | 'constant' | 'string' | 'number'
  | 'boolean' | 'array' | 'object' | 'key' | 'null' | 'enumMember'
  | 'struct' | 'event' | 'operator' | 'typeParameter';

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchOptions {
  include?: string;       // Glob pattern for files to include
  exclude?: string;       // Glob pattern for files to exclude
  maxResults?: number;    // Maximum number of results
  useRegex?: boolean;     // Treat query as regex
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface SearchMatch {
  range: Range;
  preview: string;
}

export interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthChallenge {
  nonce: string;
}

export interface AuthRequest {
  token: string;
  nonce: string;
}

export interface AuthResult {
  authenticated: boolean;
  sessionId?: string;
  error?: string;
}

// ============================================================================
// Session Types
// ============================================================================

export interface ClientSession {
  id: string;
  authenticated: boolean;
  connectedAt: number;
  lastActivity: number;
  requestCount: number;
  clientInfo?: {
    userAgent?: string;
    origin?: string;
  };
}

// ============================================================================
// Method Parameter Types
// ============================================================================

// Editor methods
export interface OpenFileParams {
  path: string;
  preview?: boolean;
  viewColumn?: number;
}

export interface CloseFileParams {
  path: string;
}

export interface GetContentParams {
  path: string;
}

export interface SetContentParams {
  path: string;
  content: string;
}

export interface InsertTextParams {
  path: string;
  position: Position;
  text: string;
}

export interface ReplaceRangeParams {
  path: string;
  range: Range;
  text: string;
}

export interface DeleteRangeParams {
  path: string;
  range: Range;
}

export interface SetSelectionParams {
  path: string;
  range: Range;
}

export interface RevealLineParams {
  path: string;
  line: number;
  at?: 'top' | 'center' | 'bottom';
}

export interface SaveParams {
  path?: string;
}

// File system methods
export interface ReadFileParams {
  path: string;
  encoding?: string;
}

export interface WriteFileParams {
  path: string;
  content: string;
}

export interface AppendFileParams {
  path: string;
  content: string;
}

export interface DeleteFileParams {
  path: string;
}

export interface RenameParams {
  oldPath: string;
  newPath: string;
}

export interface CopyParams {
  source: string;
  destination: string;
}

export interface CreateDirectoryParams {
  path: string;
}

export interface DeleteDirectoryParams {
  path: string;
  recursive?: boolean;
}

export interface ListDirectoryParams {
  path: string;
  recursive?: boolean;
}

export interface ExistsParams {
  path: string;
}

export interface StatParams {
  path: string;
}

// Terminal methods
export interface CreateTerminalParams {
  name?: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface DisposeTerminalParams {
  terminalId: string;
}

export interface SendTextParams {
  terminalId: string;
  text: string;
  addNewLine?: boolean;
}

export interface ShowTerminalParams {
  terminalId: string;
  preserveFocus?: boolean;
}

// Command methods
export interface ExecuteCommandParams {
  command: string;
  args?: unknown[];
}

export interface ListCommandsParams {
  filter?: string;
}

// State methods
export interface GetDiagnosticsParams {
  path?: string;
}

export interface GetSymbolsParams {
  path: string;
}

export interface FindReferencesParams {
  path: string;
  position: Position;
}

export interface GoToDefinitionParams {
  path: string;
  position: Position;
}

export interface GetHoverParams {
  path: string;
  position: Position;
}

// Search methods
export interface FindInFilesParams {
  query: string;
  options?: SearchOptions;
}

export interface FindAndReplaceParams {
  query: string;
  replacement: string;
  options?: SearchOptions;
}

// ============================================================================
// Method Result Types
// ============================================================================

export interface OpenFileResult {
  documentUri: string;
}

export interface GetContentResult {
  content: string;
  languageId: string;
}

export interface GetActiveFileResult {
  path: string;
  languageId: string;
}

export interface GetOpenFilesResult {
  files: string[];
}

export interface GetSelectionResult {
  range: Range;
  text: string;
}

export interface ReadFileResult {
  content: string;
}

export interface ListDirectoryResult {
  entries: FileEntry[];
}

export interface ExistsResult {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
}

export interface StatResult {
  size: number;
  ctime: number;
  mtime: number;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
}

export interface CreateTerminalResult {
  terminalId: string;
}

export interface ListTerminalsResult {
  terminals: TerminalInfo[];
}

export interface GetActiveTerminalResult {
  terminalId: string;
  name: string;
}

export interface ExecuteCommandResult {
  result: unknown;
}

export interface ListCommandsResult {
  commands: string[];
}

export interface GetWorkspaceResult {
  folders: string[];
  name: string;
}

export interface GetDiagnosticsResult {
  diagnostics: Array<Diagnostic & { uri: string }>;
}

export interface GetSymbolsResult {
  symbols: DocumentSymbol[];
}

export interface FindReferencesResult {
  locations: Location[];
}

export interface GetHoverResult {
  content: string;
}

export interface FindInFilesResult {
  results: SearchResult[];
}

export interface FindAndReplaceResult {
  count: number;
}

export interface SuccessResult {
  success: boolean;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface TerminalOutputNotification {
  terminalId: string;
  data: string;
}

export interface TerminalClosedNotification {
  terminalId: string;
}

export interface FileChangedNotification {
  path: string;
  type: 'created' | 'changed' | 'deleted';
}

export interface EditorChangedNotification {
  documentUri: string;
  changes: Array<{
    range: Range;
    text: string;
  }>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AgentControlConfig {
  enabled: boolean;
  port: number;
  host: string;
  token: string;
  allowedOrigins: string[];
  tls: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
    caPath: string;
  };
  rateLimit: {
    enabled: boolean;
    requestsPerSecond: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logToFile: boolean;
  };
  security: {
    allowFileSystemAccess: boolean;
    allowTerminalAccess: boolean;
    allowCommandExecution: boolean;
    restrictedPaths: string[];
    restrictedCommands: string[];
    /** If non-empty, only these commands are allowed (allow-list mode). Takes precedence over restrictedCommands. */
    allowedCommands: string[];
    /** If true, destructive file operations require user approval via modal dialog */
    requireApproval: boolean;
    /** 
     * If non-empty, only these method categories are allowed for the client.
     * Categories: 'editor', 'fs', 'terminal', 'command', 'state', 'search', 'debug', 'git'
     * An empty array means all categories are allowed.
     */
    allowedMethodCategories: string[];
  };
}

// ============================================================================
// Method Registry
// ============================================================================

export const METHOD_CATEGORIES = {
  auth: ['auth.authenticate'],
  editor: [
    'editor.openFile',
    'editor.closeFile',
    'editor.getContent',
    'editor.setContent',
    'editor.insertText',
    'editor.replaceRange',
    'editor.deleteRange',
    'editor.setSelection',
    'editor.revealLine',
    'editor.getSelection',
    'editor.getActiveFile',
    'editor.getOpenFiles',
    'editor.getDocumentInfo',
    'editor.applyEdits',
    'editor.save',
    'editor.saveAll',
    'editor.formatDocument',
    'editor.getCompletions',
  ],
  fs: [
    'fs.readFile',
    'fs.writeFile',
    'fs.appendFile',
    'fs.deleteFile',
    'fs.rename',
    'fs.copy',
    'fs.createDirectory',
    'fs.deleteDirectory',
    'fs.listDirectory',
    'fs.exists',
    'fs.stat',
    'fs.watchFiles',
    'fs.unwatchFiles',
  ],
  terminal: [
    'terminal.create',
    'terminal.dispose',
    'terminal.sendText',
    'terminal.show',
    'terminal.list',
    'terminal.getActive',
    'terminal.getOutput',
  ],
  command: [
    'command.execute',
    'command.list',
  ],
  state: [
    'state.getWorkspace',
    'state.getDiagnostics',
    'state.getSymbols',
    'state.findReferences',
    'state.goToDefinition',
    'state.getHover',
    'state.getCodeActions',
    'state.getOpenDocuments',
    'state.getVisibleEditors',
  ],
  search: [
    'search.findInFiles',
    'search.findAndReplace',
  ],
  debug: [
    'debug.startSession',
    'debug.stopSession',
    'debug.setBreakpoints',
    'debug.removeBreakpoints',
    'debug.getBreakpoints',
    'debug.listSessions',
  ],
  git: [
    'git.status',
    'git.diff',
    'git.log',
    'git.stage',
    'git.unstage',
    'git.commit',
    'git.checkout',
    'git.branches',
  ],
} as const;

export type MethodName = 
  | typeof METHOD_CATEGORIES.auth[number]
  | typeof METHOD_CATEGORIES.editor[number]
  | typeof METHOD_CATEGORIES.fs[number]
  | typeof METHOD_CATEGORIES.terminal[number]
  | typeof METHOD_CATEGORIES.command[number]
  | typeof METHOD_CATEGORIES.state[number]
  | typeof METHOD_CATEGORIES.search[number]
  | typeof METHOD_CATEGORIES.debug[number]
  | typeof METHOD_CATEGORIES.git[number];
