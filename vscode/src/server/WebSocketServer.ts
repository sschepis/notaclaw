/**
 * WebSocket Server for Agent Control
 * Handles client connections and message routing
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcMessage,
  AuthRequest,
  ErrorCode,
} from '../protocol/types';
import {
  ProtocolError,
  parseError,
  invalidRequest,
  invalidParams,
  methodNotFound,
  unauthorized,
  rateLimited,
  toErrorResponse,
  createErrorResponse,
} from '../protocol/errors';
import { AuthService } from '../services/AuthService';
import { PairingService, PairInitiateParams, PairCompleteResult, PairRejectedResult } from '../services/PairingService';
import { EditorService } from '../services/EditorService';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalService } from '../services/TerminalService';
import { CommandService } from '../services/CommandService';
import { StateService } from '../services/StateService';
import { DebugService } from '../services/DebugService';
import { GitService } from '../services/GitService';
import { logger } from '../utils/logger';
import { getConfig, isMethodCategoryAllowed } from '../utils/config';

interface Client {
  id: string;
  ws: WebSocket;
  authenticated: boolean;
  origin: string;
}

const PING_INTERVAL_MS = 30000;

export class AgentControlServer {
  private server: WSServer | null;
  private httpsServer: https.Server | null = null;
  private clients: Map<string, Client>;
  private disposables: vscode.Disposable[];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Services
  private authService: AuthService;
  private pairingService: PairingService | null = null;
  private editorService: EditorService;
  private fileSystemService: FileSystemService;
  private terminalService: TerminalService;
  private commandService: CommandService;
  private stateService: StateService;
  private debugService: DebugService;
  private gitService: GitService;

  constructor() {
    this.server = null;
    this.clients = new Map();
    this.disposables = [];

    this.authService = new AuthService();
    this.editorService = new EditorService();
    this.fileSystemService = new FileSystemService();
    this.terminalService = new TerminalService();
    this.commandService = new CommandService();
    this.stateService = new StateService();
    this.debugService = new DebugService();
    this.gitService = new GitService();
    
    // Set up terminal callbacks — buffer output and broadcast notification
    this.terminalService.setCallbacks(
      (terminalId, data) => {
        this.terminalService.bufferOutput(terminalId, data);
        this.broadcastNotification('terminal.output', { terminalId, data });
      },
      (terminalId) => this.broadcastNotification('terminal.closed', { terminalId })
    );

    // Set up file system change callback
    this.fileSystemService.setFileChangeCallback((filePath, type) => {
      this.broadcastNotification('file.changed', { path: filePath, type });
    });
  }

  /**
   * Inject the PairingService (set from extension.ts after construction).
   * Also wires the pairing service into the auth service for token validation.
   */
  setPairingService(pairingService: PairingService): void {
    this.pairingService = pairingService;
    this.authService.setPairingService(pairingService);
  }

  /**
   * Get the auth service (used by extension.ts to wire dependencies).
   */
  getAuthService(): AuthService {
    return this.authService;
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    const config = getConfig();
    
    if (this.server) {
      logger.warn('Server already running');
      return;
    }

    // Initialize auth service
    await this.authService.initialize();

    return new Promise((resolve, reject) => {
      try {
        // TLS/WSS support: if tls is enabled, create an HTTPS server and pass it to WSServer
        if (config.tls.enabled && config.tls.certPath && config.tls.keyPath) {
          const tlsOptions: https.ServerOptions = {
            cert: fs.readFileSync(config.tls.certPath),
            key: fs.readFileSync(config.tls.keyPath),
          };
          if (config.tls.caPath) {
            tlsOptions.ca = fs.readFileSync(config.tls.caPath);
          }

          this.httpsServer = https.createServer(tlsOptions);
          this.server = new WSServer({ server: this.httpsServer });

          this.httpsServer.listen(config.port, config.host, () => {
            const protocol = 'wss';
            logger.info(`Agent Control server started on ${protocol}://${config.host}:${config.port}`);
            vscode.window.showInformationMessage(
              `Agent Control server running on ${protocol}://port ${config.port}`
            );
            this.startPingInterval();
            resolve();
          });

          this.httpsServer.on('error', (error) => {
            logger.error('HTTPS server error', error);
            reject(error);
          });
        } else {
          // Plain WebSocket (ws://)
          this.server = new WSServer({
            host: config.host,
            port: config.port,
          });

          this.server.on('listening', () => {
            logger.info(`Agent Control server started on ws://${config.host}:${config.port}`);
            vscode.window.showInformationMessage(
              `Agent Control server running on port ${config.port}`
            );
            this.startPingInterval();
            resolve();
          });

          this.server.on('error', (error) => {
            logger.error('WebSocket server error', error);
            reject(error);
          });
        }

        this.server.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });
      } catch (error) {
        logger.error('Failed to start server', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    // Stop ping interval
    this.stopPingInterval();

    return new Promise((resolve) => {
      // Notify clients before closing
      for (const client of this.clients.values()) {
        this.sendNotification(client.ws, 'server.shutdown', { reason: 'Server shutting down' });
        client.ws.close(1000, 'Server shutting down');
      }
      this.clients.clear();

      this.server!.close(() => {
        logger.info('Agent Control server stopped');
        this.server = null;
        if (this.httpsServer) {
          this.httpsServer.close();
          this.httpsServer = null;
        }
        resolve();
      });
    });
  }

  /**
   * Start WebSocket ping/pong interval for connection health monitoring
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        } else {
          // Remove dead connections
          logger.info(`Removing stale client: ${clientId}`);
          this.authService.removeSession(clientId);
          this.clients.delete(clientId);
        }
      }
    }, PING_INTERVAL_MS);
  }

  /**
   * Stop the ping/pong interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Check if an origin is allowed by config
   */
  private isOriginAllowed(origin: string): boolean {
    const config = getConfig();
    const allowed = config.allowedOrigins;
    if (allowed.includes('*')) {
      return true;
    }
    return allowed.includes(origin);
  }

  /**
   * Handle a new client connection
   */
  private handleConnection(ws: WebSocket, req: import('http').IncomingMessage): void {
    const origin = req.headers.origin || 'unknown';

    // Enforce allowed origins
    if (origin !== 'unknown' && !this.isOriginAllowed(origin)) {
      logger.warn(`Rejected connection from disallowed origin: ${origin}`);
      ws.close(1008, 'Origin not allowed');
      return;
    }

    const clientId = uuidv4();
    const client: Client = {
      id: clientId,
      ws,
      authenticated: false,
      origin,
    };
    
    this.clients.set(clientId, client);
    
    logger.info(`Client connected: ${clientId} from ${origin}`);

    // Handle pong responses (for ping/pong health check)
    ws.on('pong', () => {
      logger.debug(`Pong received from client ${clientId}`);
    });

    // Send authentication challenge
    const challenge = this.authService.createChallenge(clientId);
    this.sendNotification(ws, 'auth.challenge', challenge);

    // Set up message handler
    ws.on('message', async (data) => {
      await this.handleMessage(client, data.toString());
    });

    // Handle close
    ws.on('close', (code, reason) => {
      logger.info(`Client disconnected: ${clientId} (${code}: ${reason})`);
      this.authService.removeSession(clientId);
      this.clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`Client error: ${clientId}`, error);
    });
  }

  /**
   * Handle an incoming message — supports both single requests and JSON-RPC 2.0 batch arrays
   */
  private async handleMessage(client: Client, data: string): Promise<void> {
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(data);
    } catch {
      this.send(client.ws, parseError());
      return;
    }

    // JSON-RPC 2.0 batch support: if the parsed value is an array, process each element
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        this.send(client.ws, invalidRequest(null, 'Empty batch request'));
        return;
      }
      const responses: (JsonRpcSuccessResponse | JsonRpcErrorResponse)[] = [];
      for (const item of parsed) {
        const response = await this.handleSingleMessage(client, item);
        if (response) {
          responses.push(response);
        }
      }
      // Send batch response
      if (responses.length > 0 && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(responses));
      }
      return;
    }

    // Single request
    const response = await this.handleSingleMessage(client, parsed);
    if (response) {
      this.send(client.ws, response);
    }
  }

  /**
   * Handle a single JSON-RPC message and return the response (or null for notifications)
   */
  private async handleSingleMessage(client: Client, message: unknown): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse | null> {
    // Validate basic structure
    if (!this.isValidRequest(message)) {
      return invalidRequest(null, 'Invalid JSON-RPC request');
    }

    const request = message as JsonRpcRequest;
    
    // Handle authentication
    if (request.method === 'auth.authenticate') {
      return this.handleAuthentication(client, request);
    }

    // Handle pairing initiation (does NOT require authentication)
    if (request.method === 'pair.initiate') {
      return this.handlePairInitiate(client, request);
    }

    // Check authentication for all other methods
    if (!this.authService.isAuthenticated(client.id)) {
      return unauthorized(request.id);
    }

    // Check rate limiting
    if (!this.authService.checkRateLimit(client.id)) {
      return rateLimited(request.id);
    }

    // Update activity
    this.authService.updateActivity(client.id);

    // Route the request
    return this.routeRequest(client, request);
  }

  /**
   * Handle authentication request
   */
  private async handleAuthentication(client: Client, request: JsonRpcRequest): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
    const params = request.params as unknown as AuthRequest | undefined;
    
    if (!params || !params.token || !params.nonce) {
      return invalidRequest(request.id, 'Missing token or nonce');
    }

    const result = this.authService.authenticate(client.id, params, {
      origin: client.origin,
    });

    if (result.authenticated) {
      client.authenticated = true;
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      result,
    };
  }

  /**
   * Handle pairing initiation (unauthenticated — code-verified instead)
   */
  private async handlePairInitiate(_client: Client, request: JsonRpcRequest): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
    if (!this.pairingService) {
      return createErrorResponse(request.id, ErrorCode.FeatureDisabled, 'Pairing is not available');
    }

    const params = request.params as unknown as PairInitiateParams | undefined;

    if (!params || !params.code || !params.clientPublicKey || !params.clientName || !params.clientFingerprint) {
      return invalidParams(request.id, 'Missing required pairing parameters (code, clientPublicKey, clientName, clientFingerprint)');
    }

    const result = await this.pairingService.handlePairInitiateSafe(params);

    // Check if it's a rejection
    if ('reason' in result) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { paired: false, reason: (result as PairRejectedResult).reason },
      };
    }

    // Success
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { paired: true, ...(result as PairCompleteResult) },
    };
  }

  /**
   * Route a request to the appropriate handler
   */
  private async routeRequest(client: Client, request: JsonRpcRequest): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
    const [category, method] = request.method.split('.');
    
    logger.logRequest(client.id, request.method, request.params);

    // Check per-method-category permissions
    if (!isMethodCategoryAllowed(category)) {
      return createErrorResponse(
        request.id,
        ErrorCode.FeatureDisabled,
        `Method category '${category}' is not allowed by configuration`,
        { category, method: request.method }
      );
    }

    try {
      let result: unknown;

      switch (category) {
        case 'pair':
          result = await this.handlePairMethod(method, request);
          break;
        case 'editor':
          result = await this.handleEditorMethod(method, request);
          break;
        case 'fs':
          result = await this.handleFileSystemMethod(method, request);
          break;
        case 'terminal':
          result = await this.handleTerminalMethod(method, request);
          break;
        case 'command':
          result = await this.handleCommandMethod(method, request);
          break;
        case 'state':
          result = await this.handleStateMethod(method, request);
          break;
        case 'search':
          result = await this.handleSearchMethod(method, request);
          break;
        case 'debug':
          result = await this.handleDebugMethod(method, request);
          break;
        case 'git':
          result = await this.handleGitMethod(method, request);
          break;
        default:
          return methodNotFound(request.id, request.method);
      }

      logger.logResponse(client.id, request.method, result);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      logger.logError(client.id, request.method, error);
      return toErrorResponse(request.id, error);
    }
  }

  // =========================================================================
  // Parameter validation helpers
  // =========================================================================

  private requireString(params: Record<string, unknown> | undefined, field: string, requestId: string | number): string {
    if (!params || typeof params[field] !== 'string') {
      throw Object.assign(new Error(`Missing required string parameter: ${field}`), { __invalidParams: true, requestId });
    }
    return params[field] as string;
  }

  private requireParams(request: JsonRpcRequest): Record<string, unknown> {
    if (!request.params || typeof request.params !== 'object') {
      throw Object.assign(new Error('Missing required params'), { __invalidParams: true, requestId: request.id });
    }
    return request.params as Record<string, unknown>;
  }

  /**
   * Confirm a destructive operation with the user if requireApproval is enabled.
   * Throws OperationCancelled if the user declines.
   */
  private async confirmDestructiveOperation(operation: string, target: string): Promise<void> {
    const config = getConfig();
    // Check if approval is required (defaults to false)
    const requireApproval = config.security.requireApproval;
    if (!requireApproval) {
      return; // No approval required
    }

    const choice = await vscode.window.showWarningMessage(
      `Agent requests: ${operation} — ${target}`,
      { modal: true },
      'Allow',
      'Deny'
    );

    if (choice !== 'Allow') {
      throw new ProtocolError(
        ErrorCode.OperationCancelled,
        `User denied destructive operation: ${operation} on ${target}`
      );
    }
  }

  // =========================================================================
  // Method handlers with parameter validation
  // =========================================================================

  /**
   * Handle pair methods (authenticated — pair.initiate is handled separately before auth check)
   */
  private async handlePairMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    if (!this.pairingService) {
      throw new ProtocolError(ErrorCode.FeatureDisabled, 'Pairing is not available');
    }

    switch (method) {
      case 'list': {
        const devices = this.pairingService.getPairedDevices();
        return {
          devices: devices.map(d => ({
            id: d.id,
            name: d.name,
            fingerprint: d.fingerprint,
            pairedAt: d.pairedAt,
            lastSeen: d.lastSeen,
          })),
        };
      }
      case 'revoke': {
        const params = this.requireParams(request);
        this.requireString(params, 'deviceId', request.id);
        const revoked = await this.pairingService.removePairedDevice(params.deviceId as string);
        return { revoked };
      }
      default:
        throw new Error(`Unknown pair method: ${method}`);
    }
  }

  /**
   * Handle editor methods
   */
  private async handleEditorMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;
    
    switch (method) {
      case 'openFile': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.editorService.openFile(params as any);
      }
      case 'closeFile': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.editorService.closeFile(params as any);
      }
      case 'getContent': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.editorService.getContent(params as any);
      }
      case 'setContent': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        this.requireString(params, 'content', request.id);
        return this.editorService.setContent(params as any);
      }
      case 'insertText': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        this.requireString(params, 'text', request.id);
        if (!params.position || typeof params.position !== 'object') {
          throw Object.assign(new Error('Missing required parameter: position'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.insertText(params as any);
      }
      case 'replaceRange': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        this.requireString(params, 'text', request.id);
        if (!params.range || typeof params.range !== 'object') {
          throw Object.assign(new Error('Missing required parameter: range'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.replaceRange(params as any);
      }
      case 'deleteRange': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.range || typeof params.range !== 'object') {
          throw Object.assign(new Error('Missing required parameter: range'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.deleteRange(params as any);
      }
      case 'setSelection': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.range || typeof params.range !== 'object') {
          throw Object.assign(new Error('Missing required parameter: range'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.setSelection(params as any);
      }
      case 'revealLine': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (typeof params.line !== 'number') {
          throw Object.assign(new Error('Missing required number parameter: line'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.revealLine(params as any);
      }
      case 'getSelection':
        return this.editorService.getSelection();
      case 'getActiveFile':
        return this.editorService.getActiveFile();
      case 'getOpenFiles':
        return this.editorService.getOpenFiles();
      case 'getDocumentInfo': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.editorService.getDocumentInfo(params as any);
      }
      case 'applyEdits': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!Array.isArray(params.edits)) {
          throw Object.assign(new Error('Missing required array parameter: edits'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.applyEdits(params as any);
      }
      case 'save':
        return this.editorService.save((p || {}) as any);
      case 'saveAll':
        return this.editorService.saveAll();
      case 'formatDocument':
        return this.editorService.formatDocument(p?.path as string | undefined);
      case 'getCompletions': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.position || typeof params.position !== 'object') {
          throw Object.assign(new Error('Missing required parameter: position'), { __invalidParams: true, requestId: request.id });
        }
        return this.editorService.getCompletions(params as any);
      }
      default:
        throw new Error(`Unknown editor method: ${method}`);
    }
  }

  /**
   * Handle file system methods
   */
  private async handleFileSystemMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;
    
    switch (method) {
      case 'readFile': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.fileSystemService.readFile(params as any);
      }
      case 'writeFile': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        this.requireString(params, 'content', request.id);
        return this.fileSystemService.writeFile(params as any);
      }
      case 'appendFile': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        this.requireString(params, 'content', request.id);
        return this.fileSystemService.appendFile(params as any);
      }
      case 'deleteFile': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        await this.confirmDestructiveOperation('Delete file', params.path as string);
        return this.fileSystemService.deleteFile(params as any);
      }
      case 'rename': {
        const params = this.requireParams(request);
        this.requireString(params, 'oldPath', request.id);
        this.requireString(params, 'newPath', request.id);
        return this.fileSystemService.rename(params as any);
      }
      case 'copy': {
        const params = this.requireParams(request);
        this.requireString(params, 'source', request.id);
        this.requireString(params, 'destination', request.id);
        return this.fileSystemService.copy(params as any);
      }
      case 'createDirectory': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.fileSystemService.createDirectory(params as any);
      }
      case 'deleteDirectory': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        await this.confirmDestructiveOperation('Delete directory', params.path as string);
        return this.fileSystemService.deleteDirectory(params as any);
      }
      case 'listDirectory': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.fileSystemService.listDirectory(params as any);
      }
      case 'exists': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.fileSystemService.exists(params as any);
      }
      case 'stat': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.fileSystemService.stat(params as any);
      }
      case 'watchFiles': {
        const params = this.requireParams(request);
        this.requireString(params, 'pattern', request.id);
        return this.fileSystemService.watchFiles(params as any);
      }
      case 'unwatchFiles': {
        const params = this.requireParams(request);
        this.requireString(params, 'watcherId', request.id);
        return this.fileSystemService.unwatchFiles(params as any);
      }
      default:
        throw new Error(`Unknown file system method: ${method}`);
    }
  }

  /**
   * Handle terminal methods
   */
  private async handleTerminalMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;
    
    switch (method) {
      case 'create':
        return this.terminalService.create((p || {}) as any);
      case 'dispose': {
        const params = this.requireParams(request);
        this.requireString(params, 'terminalId', request.id);
        return this.terminalService.dispose(params as any);
      }
      case 'sendText': {
        const params = this.requireParams(request);
        this.requireString(params, 'terminalId', request.id);
        this.requireString(params, 'text', request.id);
        return this.terminalService.sendText(params as any);
      }
      case 'show': {
        const params = this.requireParams(request);
        this.requireString(params, 'terminalId', request.id);
        return this.terminalService.show(params as any);
      }
      case 'list':
        return this.terminalService.list();
      case 'getActive':
        return this.terminalService.getActive();
      case 'getOutput': {
        const params = this.requireParams(request);
        this.requireString(params, 'terminalId', request.id);
        return this.terminalService.getOutput(params as any);
      }
      default:
        throw new Error(`Unknown terminal method: ${method}`);
    }
  }

  /**
   * Handle command methods
   */
  private async handleCommandMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;
    
    switch (method) {
      case 'execute': {
        const params = this.requireParams(request);
        this.requireString(params, 'command', request.id);
        return this.commandService.execute(params as any);
      }
      case 'list':
        return this.commandService.list((p || {}) as any);
      default:
        throw new Error(`Unknown command method: ${method}`);
    }
  }

  /**
   * Handle state methods
   */
  private async handleStateMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;
    
    switch (method) {
      case 'getWorkspace':
        return this.stateService.getWorkspace();
      case 'getDiagnostics':
        return this.stateService.getDiagnostics((p || {}) as any);
      case 'getSymbols': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        return this.stateService.getSymbols(params as any);
      }
      case 'findReferences': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.position || typeof params.position !== 'object') {
          throw Object.assign(new Error('Missing required parameter: position'), { __invalidParams: true, requestId: request.id });
        }
        return this.stateService.findReferences(params as any);
      }
      case 'goToDefinition': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.position || typeof params.position !== 'object') {
          throw Object.assign(new Error('Missing required parameter: position'), { __invalidParams: true, requestId: request.id });
        }
        return this.stateService.goToDefinition(params as any);
      }
      case 'getHover': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.position || typeof params.position !== 'object') {
          throw Object.assign(new Error('Missing required parameter: position'), { __invalidParams: true, requestId: request.id });
        }
        return this.stateService.getHover(params as any);
      }
      case 'getCodeActions': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!params.range || typeof params.range !== 'object') {
          throw Object.assign(new Error('Missing required parameter: range'), { __invalidParams: true, requestId: request.id });
        }
        return this.stateService.getCodeActions(params as any);
      }
      case 'getOpenDocuments':
        return this.stateService.getOpenDocuments();
      case 'getVisibleEditors':
        return this.stateService.getVisibleEditors();
      default:
        throw new Error(`Unknown state method: ${method}`);
    }
  }

  /**
   * Handle search methods
   */
  private async handleSearchMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;
    
    switch (method) {
      case 'findInFiles': {
        const params = this.requireParams(request);
        this.requireString(params, 'query', request.id);
        return this.stateService.findInFiles(params as any);
      }
      case 'findAndReplace': {
        const params = this.requireParams(request);
        this.requireString(params, 'query', request.id);
        this.requireString(params, 'replacement', request.id);
        return this.stateService.findAndReplace(params as any);
      }
      default:
        throw new Error(`Unknown search method: ${method}`);
    }
  }

  /**
   * Handle debug methods
   */
  private async handleDebugMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;

    switch (method) {
      case 'startSession': {
        const params = this.requireParams(request);
        this.requireString(params, 'type', request.id);
        this.requireString(params, 'request', request.id);
        return this.debugService.startSession(params as any);
      }
      case 'stopSession':
        return this.debugService.stopSession((p || {}) as any);
      case 'setBreakpoints': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!Array.isArray(params.breakpoints)) {
          throw Object.assign(new Error('Missing required array parameter: breakpoints'), { __invalidParams: true, requestId: request.id });
        }
        return this.debugService.setBreakpoints(params as any);
      }
      case 'removeBreakpoints': {
        const params = this.requireParams(request);
        this.requireString(params, 'path', request.id);
        if (!Array.isArray(params.lines)) {
          throw Object.assign(new Error('Missing required array parameter: lines'), { __invalidParams: true, requestId: request.id });
        }
        return this.debugService.removeBreakpoints(params as any);
      }
      case 'getBreakpoints':
        return this.debugService.getBreakpoints((p || {}) as any);
      case 'listSessions':
        return this.debugService.listSessions();
      default:
        throw new Error(`Unknown debug method: ${method}`);
    }
  }

  /**
   * Handle git methods
   */
  private async handleGitMethod(method: string, request: JsonRpcRequest): Promise<unknown> {
    const p = request.params as Record<string, unknown> | undefined;

    switch (method) {
      case 'status':
        return this.gitService.status();
      case 'diff':
        return this.gitService.diff((p || {}) as any);
      case 'log':
        return this.gitService.log((p || {}) as any);
      case 'stage': {
        const params = this.requireParams(request);
        if (!Array.isArray(params.paths)) {
          throw Object.assign(new Error('Missing required array parameter: paths'), { __invalidParams: true, requestId: request.id });
        }
        return this.gitService.stage(params as any);
      }
      case 'unstage': {
        const params = this.requireParams(request);
        if (!Array.isArray(params.paths)) {
          throw Object.assign(new Error('Missing required array parameter: paths'), { __invalidParams: true, requestId: request.id });
        }
        return this.gitService.unstage(params as any);
      }
      case 'commit': {
        const params = this.requireParams(request);
        this.requireString(params, 'message', request.id);
        return this.gitService.commit(params as any);
      }
      case 'checkout': {
        const params = this.requireParams(request);
        this.requireString(params, 'branch', request.id);
        return this.gitService.checkout(params as any);
      }
      case 'branches':
        return this.gitService.branches();
      default:
        throw new Error(`Unknown git method: ${method}`);
    }
  }

  /**
   * Validate a JSON-RPC request
   */
  private isValidRequest(message: unknown): boolean {
    if (typeof message !== 'object' || message === null) {
      return false;
    }
    
    const msg = message as Record<string, unknown>;
    
    return (
      msg.jsonrpc === '2.0' &&
      typeof msg.method === 'string' &&
      (msg.id === undefined || typeof msg.id === 'string' || typeof msg.id === 'number')
    );
  }

  /**
   * Send a message to a client
   */
  private send(ws: WebSocket, message: JsonRpcSuccessResponse | JsonRpcErrorResponse): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send a notification to a client
   */
  private sendNotification(ws: WebSocket, method: string, params?: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      const notification: JsonRpcNotification = {
        jsonrpc: '2.0',
        method,
        params: params as Record<string, unknown>,
      };
      ws.send(JSON.stringify(notification));
    }
  }

  /**
   * Broadcast a notification to all authenticated clients
   */
  broadcastNotification(method: string, params?: unknown): void {
    for (const client of this.clients.values()) {
      if (client.authenticated) {
        this.sendNotification(client.ws, method, params);
      }
    }
  }

  /**
   * Get server status
   */
  getStatus(): { running: boolean; port?: number; clients: number } {
    const config = getConfig();
    
    return {
      running: this.server !== null,
      port: this.server ? config.port : undefined,
      clients: this.clients.size,
    };
  }

  /**
   * Get connected clients info
   */
  getConnectedClients(): Array<{ id: string; authenticated: boolean; origin: string }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      authenticated: client.authenticated,
      origin: client.origin,
    }));
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopPingInterval();
    this.stop();
    this.authService.dispose();
    this.pairingService?.dispose();
    this.terminalService.disposeAll();
    this.fileSystemService.disposeWatchers();
    this.debugService.dispose();
    
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
