/**
 * WebSocket Server for Agent Control
 * Handles client connections and message routing
 */

import * as vscode from 'vscode';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcMessage,
  AuthRequest,
} from '../protocol/types';
import {
  parseError,
  invalidRequest,
  methodNotFound,
  unauthorized,
  rateLimited,
  toErrorResponse,
} from '../protocol/errors';
import { AuthService } from '../services/AuthService';
import { EditorService } from '../services/EditorService';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalService } from '../services/TerminalService';
import { CommandService } from '../services/CommandService';
import { StateService } from '../services/StateService';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';

interface Client {
  id: string;
  ws: WebSocket;
  authenticated: boolean;
}

export class AgentControlServer {
  private server: WSServer | null = null;
  private clients: Map<string, Client> = new Map();
  private disposables: vscode.Disposable[] = [];
  
  // Services
  private authService: AuthService;
  private editorService: EditorService;
  private fileSystemService: FileSystemService;
  private terminalService: TerminalService;
  private commandService: CommandService;
  private stateService: StateService;

  constructor() {
    this.authService = new AuthService();
    this.editorService = new EditorService();
    this.fileSystemService = new FileSystemService();
    this.terminalService = new TerminalService();
    this.commandService = new CommandService();
    this.stateService = new StateService();
    
    // Set up terminal callbacks
    this.terminalService.setCallbacks(
      (terminalId, data) => this.broadcastNotification('terminal.output', { terminalId, data }),
      (terminalId) => this.broadcastNotification('terminal.closed', { terminalId })
    );
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
        this.server = new WSServer({
          host: config.host,
          port: config.port,
        });

        this.server.on('listening', () => {
          logger.info(`Agent Control server started on ${config.host}:${config.port}`);
          vscode.window.showInformationMessage(
            `Agent Control server running on port ${config.port}`
          );
          resolve();
        });

        this.server.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.server.on('error', (error) => {
          logger.error('WebSocket server error', error);
          reject(error);
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

    return new Promise((resolve) => {
      // Close all client connections
      for (const client of this.clients.values()) {
        client.ws.close(1000, 'Server shutting down');
      }
      this.clients.clear();

      this.server!.close(() => {
        logger.info('Agent Control server stopped');
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Handle a new client connection
   */
  private handleConnection(ws: WebSocket, req: import('http').IncomingMessage): void {
    const clientId = uuidv4();
    const client: Client = {
      id: clientId,
      ws,
      authenticated: false,
    };
    
    this.clients.set(clientId, client);
    
    const origin = req.headers.origin || 'unknown';
    logger.info(`Client connected: ${clientId} from ${origin}`);

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
   * Handle an incoming message
   */
  private async handleMessage(client: Client, data: string): Promise<void> {
    let message: JsonRpcMessage;
    
    try {
      message = JSON.parse(data);
    } catch {
      this.send(client.ws, parseError());
      return;
    }

    // Validate basic structure
    if (!this.isValidRequest(message)) {
      this.send(client.ws, invalidRequest(null, 'Invalid JSON-RPC request'));
      return;
    }

    const request = message as JsonRpcRequest;
    
    // Handle authentication
    if (request.method === 'auth.authenticate') {
      await this.handleAuthentication(client, request);
      return;
    }

    // Check authentication for all other methods
    if (!this.authService.isAuthenticated(client.id)) {
      this.send(client.ws, unauthorized(request.id));
      return;
    }

    // Check rate limiting
    if (!this.authService.checkRateLimit(client.id)) {
      this.send(client.ws, rateLimited(request.id));
      return;
    }

    // Update activity
    this.authService.updateActivity(client.id);

    // Route the request
    await this.routeRequest(client, request);
  }

  /**
   * Handle authentication request
   */
  private async handleAuthentication(client: Client, request: JsonRpcRequest): Promise<void> {
    const params = request.params as unknown as AuthRequest | undefined;
    
    if (!params || !params.token || !params.nonce) {
      this.send(client.ws, invalidRequest(request.id, 'Missing token or nonce'));
      return;
    }

    const result = this.authService.authenticate(client.id, params, {
      origin: 'unknown', // Would need to track this from connection
    });

    if (result.authenticated) {
      client.authenticated = true;
    }

    this.sendResponse(client.ws, request.id, result);
  }

  /**
   * Route a request to the appropriate handler
   */
  private async routeRequest(client: Client, request: JsonRpcRequest): Promise<void> {
    const [category, method] = request.method.split('.');
    
    logger.logRequest(client.id, request.method, request.params);

    try {
      let result: unknown;

      switch (category) {
        case 'editor':
          result = await this.handleEditorMethod(method, request.params);
          break;
        case 'fs':
          result = await this.handleFileSystemMethod(method, request.params);
          break;
        case 'terminal':
          result = await this.handleTerminalMethod(method, request.params);
          break;
        case 'command':
          result = await this.handleCommandMethod(method, request.params);
          break;
        case 'state':
          result = await this.handleStateMethod(method, request.params);
          break;
        case 'search':
          result = await this.handleSearchMethod(method, request.params);
          break;
        default:
          this.send(client.ws, methodNotFound(request.id, request.method));
          return;
      }

      logger.logResponse(client.id, request.method, result);
      this.sendResponse(client.ws, request.id, result);
    } catch (error) {
      logger.logError(client.id, request.method, error);
      this.send(client.ws, toErrorResponse(request.id, error));
    }
  }

  /**
   * Handle editor methods
   */
  private async handleEditorMethod(method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;
    
    switch (method) {
      case 'openFile':
        return this.editorService.openFile(p as any);
      case 'closeFile':
        return this.editorService.closeFile(p as any);
      case 'getContent':
        return this.editorService.getContent(p as any);
      case 'setContent':
        return this.editorService.setContent(p as any);
      case 'insertText':
        return this.editorService.insertText(p as any);
      case 'replaceRange':
        return this.editorService.replaceRange(p as any);
      case 'deleteRange':
        return this.editorService.deleteRange(p as any);
      case 'setSelection':
        return this.editorService.setSelection(p as any);
      case 'revealLine':
        return this.editorService.revealLine(p as any);
      case 'getSelection':
        return this.editorService.getSelection();
      case 'getActiveFile':
        return this.editorService.getActiveFile();
      case 'getOpenFiles':
        return this.editorService.getOpenFiles();
      case 'save':
        return this.editorService.save(p as any);
      case 'saveAll':
        return this.editorService.saveAll();
      default:
        throw new Error(`Unknown editor method: ${method}`);
    }
  }

  /**
   * Handle file system methods
   */
  private async handleFileSystemMethod(method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;
    
    switch (method) {
      case 'readFile':
        return this.fileSystemService.readFile(p as any);
      case 'writeFile':
        return this.fileSystemService.writeFile(p as any);
      case 'appendFile':
        return this.fileSystemService.appendFile(p as any);
      case 'deleteFile':
        return this.fileSystemService.deleteFile(p as any);
      case 'rename':
        return this.fileSystemService.rename(p as any);
      case 'copy':
        return this.fileSystemService.copy(p as any);
      case 'createDirectory':
        return this.fileSystemService.createDirectory(p as any);
      case 'deleteDirectory':
        return this.fileSystemService.deleteDirectory(p as any);
      case 'listDirectory':
        return this.fileSystemService.listDirectory(p as any);
      case 'exists':
        return this.fileSystemService.exists(p as any);
      case 'stat':
        return this.fileSystemService.stat(p as any);
      default:
        throw new Error(`Unknown file system method: ${method}`);
    }
  }

  /**
   * Handle terminal methods
   */
  private async handleTerminalMethod(method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;
    
    switch (method) {
      case 'create':
        return this.terminalService.create(p as any);
      case 'dispose':
        return this.terminalService.dispose(p as any);
      case 'sendText':
        return this.terminalService.sendText(p as any);
      case 'show':
        return this.terminalService.show(p as any);
      case 'list':
        return this.terminalService.list();
      case 'getActive':
        return this.terminalService.getActive();
      default:
        throw new Error(`Unknown terminal method: ${method}`);
    }
  }

  /**
   * Handle command methods
   */
  private async handleCommandMethod(method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;
    
    switch (method) {
      case 'execute':
        return this.commandService.execute(p as any);
      case 'list':
        return this.commandService.list(p as any);
      default:
        throw new Error(`Unknown command method: ${method}`);
    }
  }

  /**
   * Handle state methods
   */
  private async handleStateMethod(method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;
    
    switch (method) {
      case 'getWorkspace':
        return this.stateService.getWorkspace();
      case 'getDiagnostics':
        return this.stateService.getDiagnostics(p as any);
      case 'getSymbols':
        return this.stateService.getSymbols(p as any);
      case 'findReferences':
        return this.stateService.findReferences(p as any);
      case 'goToDefinition':
        return this.stateService.goToDefinition(p as any);
      case 'getHover':
        return this.stateService.getHover(p as any);
      default:
        throw new Error(`Unknown state method: ${method}`);
    }
  }

  /**
   * Handle search methods
   */
  private async handleSearchMethod(method: string, params: unknown): Promise<unknown> {
    const p = params as Record<string, unknown>;
    
    switch (method) {
      case 'findInFiles':
        return this.stateService.findInFiles(p as any);
      case 'findAndReplace':
        return this.stateService.findAndReplace(p as any);
      default:
        throw new Error(`Unknown search method: ${method}`);
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
   * Send a success response
   */
  private sendResponse(ws: WebSocket, id: string | number, result: unknown): void {
    this.send(ws, {
      jsonrpc: '2.0',
      id,
      result,
    });
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
  private broadcastNotification(method: string, params?: unknown): void {
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
  getConnectedClients(): Array<{ id: string; authenticated: boolean }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      authenticated: client.authenticated,
    }));
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop();
    this.authService.dispose();
    this.terminalService.disposeAll();
    
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
