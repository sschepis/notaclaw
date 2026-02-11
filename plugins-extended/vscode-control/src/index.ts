import { PluginContext } from '../../../src/shared/plugin-types';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string;
    method: string;
    params?: any;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

interface JsonRpcNotification {
    jsonrpc: '2.0';
    method: string;
    params?: any;
}

// ============================================================================
// Pairing token persistence
// ============================================================================

interface PairedTokenData {
    token: string;
    deviceId: string;
    pairedAt: string;
    host: string;
    port: number;
}

class PairingTokenStore {
    private filePath: string;

    constructor(dataDir: string) {
        this.filePath = path.join(dataDir, 'vscode-pairing.json');
    }

    /**
     * Load stored pairing tokens keyed by host:port
     */
    load(): Map<string, PairedTokenData> {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
                return new Map(Object.entries(data));
            }
        } catch (e) {
            console.error('Failed to load pairing tokens:', e);
        }
        return new Map();
    }

    /**
     * Save pairing token for a host:port
     */
    save(key: string, data: PairedTokenData): void {
        const tokens = this.load();
        tokens.set(key, data);
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(tokens), null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to save pairing token:', e);
        }
    }

    /**
     * Remove pairing token for a host:port
     */
    remove(key: string): void {
        const tokens = this.load();
        tokens.delete(key);
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(tokens), null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to remove pairing token:', e);
        }
    }

    /**
     * Get pairing token for a host:port
     */
    get(key: string): PairedTokenData | undefined {
        return this.load().get(key);
    }
}

// ============================================================================
// ECDH crypto helpers (client side)
// ============================================================================

function generateClientECDHKeyPair(): { publicKey: string; privateKey: string } {
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.generateKeys();
    return {
        publicKey: ecdh.getPublicKey('base64'),
        privateKey: ecdh.getPrivateKey('base64'),
    };
}

function deriveClientSharedSecret(ourPrivateKeyBase64: string, theirPublicKeyBase64: string): Buffer {
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(ourPrivateKeyBase64, 'base64'));
    const shared = ecdh.computeSecret(Buffer.from(theirPublicKeyBase64, 'base64'));
    return crypto.createHash('sha256').update(shared).digest();
}

function decryptWithSharedSecret(encryptedData: string, sharedSecret: Buffer): string {
    const combined = Buffer.from(encryptedData, 'base64');
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function generateClientFingerprint(): string {
    const hostInfo = `${process.env.USER || 'unknown'}-${process.pid}-${Date.now()}`;
    return crypto.createHash('sha256').update(hostInfo).digest('hex').substring(0, 16);
}

// ============================================================================
// WebSocket Client with auth gate, exponential backoff, and notifications
// ============================================================================

class VSCodeClient {
    private ws: WebSocket | null = null;
    private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
    private config: { host: string; port: number; token: string; useTls?: boolean };
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private isConnected = false;
    private isAuthenticated = false;
    private authPromise: Promise<void> | null = null;
    private authResolve: (() => void) | null = null;
    private authReject: ((err: Error) => void) | null = null;
    private disposed = false;

    // Pairing support
    private tokenStore: PairingTokenStore | null = null;
    private pairedToken: string | null = null;
    private clientFingerprint: string;

    // Notification handlers
    private notificationHandlers = new Map<string, Array<(params: any) => void>>();
    
    // Log handler
    public onLog?: (entry: any) => void;

    constructor(config: { host: string; port: number; token: string; useTls?: boolean }, dataDir?: string) {
        this.config = config;
        this.clientFingerprint = generateClientFingerprint();

        // Initialize pairing token store
        if (dataDir) {
            this.tokenStore = new PairingTokenStore(dataDir);
            // Load existing paired token for this host:port
            const key = `${config.host}:${config.port}`;
            const stored = this.tokenStore.get(key);
            if (stored) {
                this.pairedToken = stored.token;
                this.log('connection', `Loaded paired token for ${key} (device: ${stored.deviceId})`);
            }
        }
    }

    private log(type: string, message: string, details?: any) {
        const entry = {
            id: uuidv4(),
            timestamp: Date.now(),
            type,
            message,
            details
        };
        // Console log for debugging
        console.log(`[${type}] ${message}`, details || '');
        
        // Emit to UI
        if (this.onLog) {
            this.onLog(entry);
        }
    }

    connect() {
        if (this.ws || this.disposed) return;

        // WSS support (3.2.1)
        const protocol = this.config.useTls ? 'wss' : 'ws';
        const url = `${protocol}://${this.config.host}:${this.config.port}`;
        this.log('connection', `Connecting to VS Code at ${url}...`);

        // Create auth gate promise (with catch to prevent unhandled rejection)
        this.authPromise = new Promise<void>((resolve, reject) => {
            this.authResolve = resolve;
            this.authReject = reject;
        });
        this.authPromise.catch(() => {
            // Handled: auth failure is logged in handleMessage; this prevents UnhandledPromiseRejectionWarning
        });

        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
            this.log('connection', 'Connected to VS Code WebSocket');
            this.isConnected = true;
            this.reconnectAttempts = 0; // Reset backoff on successful connection
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            } catch (e) {
                this.log('error', 'Failed to parse message from VS Code', e);
            }
        });

        this.ws.on('close', () => {
            this.log('connection', 'Disconnected from VS Code');
            this.cleanup();
            if (!this.disposed) {
                this.scheduleReconnect();
            }
        });

        this.ws.on('error', (err) => {
            this.log('error', `VS Code WebSocket error: ${err.message}`);
            this.cleanup();
            if (!this.disposed) {
                this.scheduleReconnect();
            }
        });
    }

    private cleanup() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.ws = null;

        // Reject auth promise if pending
        if (this.authReject) {
            this.authReject(new Error('Connection lost'));
            this.authResolve = null;
            this.authReject = null;
        }
        this.authPromise = null;

        // Reject all pending requests
        for (const { reject, timeout } of this.pendingRequests.values()) {
            clearTimeout(timeout);
            reject(new Error('Connection lost'));
        }
        this.pendingRequests.clear();
    }

    /**
     * Exponential backoff reconnect with jitter.
     * Delays: 1s, 2s, 4s, 8s, 16s, 32s, max 60s
     */
    private scheduleReconnect() {
        if (this.reconnectTimer || this.disposed) return;

        const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        this.reconnectAttempts++;

        this.log('connection', `Reconnecting to VS Code in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    private async handleMessage(message: any) {
        // Handle Auth Challenge (notification from server, no id)
        if (message.method === 'auth.challenge' && !message.id) {
            // Determine which token to use: paired token > config token > env token
            const authToken = this.pairedToken || this.config.token;

            if (!authToken) {
                this.log('auth', 'VS Code auth challenge received but no token available. Skipping authentication.');
                // Resolve auth anyway so tools can attempt to work (server may allow unauthenticated access)
                this.isAuthenticated = true;
                this.authResolve?.();
                return;
            }
            if (!message.params?.nonce) {
                this.log('auth', 'VS Code auth challenge missing nonce. Skipping authentication.');
                this.isAuthenticated = true;
                this.authResolve?.();
                return;
            }
            try {
                const result = await this.sendRaw('auth.authenticate', {
                    token: authToken,
                    nonce: message.params.nonce
                });
                if (result.authenticated) {
                    const method = this.pairedToken ? 'paired token' : 'config token';
                    this.log('auth', `Authenticated with VS Code via ${method}`);
                    this.isAuthenticated = true;
                    this.authResolve?.();
                } else {
                    // If paired token failed, try config token as fallback
                    if (this.pairedToken && this.config.token && this.pairedToken !== this.config.token) {
                        this.log('auth', 'Paired token rejected, falling back to config token...');
                        const fallback = await this.sendRaw('auth.authenticate', {
                            token: this.config.token,
                            nonce: message.params.nonce
                        });
                        if (fallback.authenticated) {
                            this.log('auth', 'Authenticated with VS Code via fallback config token');
                            this.isAuthenticated = true;
                            // Clear invalid paired token
                            this.pairedToken = null;
                            if (this.tokenStore) {
                                this.tokenStore.remove(`${this.config.host}:${this.config.port}`);
                            }
                            this.authResolve?.();
                        } else {
                            this.log('auth', 'Authentication failed (both paired and config tokens)', fallback.error);
                            this.authReject?.(new Error(fallback.error || 'Authentication failed'));
                        }
                    } else {
                        this.log('auth', 'Authentication failed', result.error);
                        this.authReject?.(new Error(result.error || 'Authentication failed'));
                    }
                }
            } catch (e) {
                this.log('error', 'Error during authentication', e);
                this.authReject?.(e instanceof Error ? e : new Error(String(e)));
            }
            return;
        }

        // Handle server notifications (no id field)
        if (message.method && !message.id) {
            this.dispatchNotification(message.method, message.params);
            return;
        }

        // Handle Response (has id)
        if (message.id && this.pendingRequests.has(message.id)) {
            const { resolve, reject, timeout } = this.pendingRequests.get(message.id)!;
            clearTimeout(timeout);
            this.pendingRequests.delete(message.id);

            if (message.error) {
                reject(new Error(message.error.message));
            } else {
                resolve(message.result);
            }
        }
    }

    /**
     * Register a handler for server notifications
     */
    onNotification(method: string, handler: (params: any) => void): void {
        if (!this.notificationHandlers.has(method)) {
            this.notificationHandlers.set(method, []);
        }
        this.notificationHandlers.get(method)!.push(handler);
    }

    private dispatchNotification(method: string, params: any): void {
        // Log notifications
        if (method !== 'terminal.output') { // Too noisy
            this.log('notification', `Received ${method}`, params);
        }

        const handlers = this.notificationHandlers.get(method);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(params);
                } catch (e) {
                    console.error(`Error in notification handler for ${method}:`, e);
                }
            }
        }
    }

    /**
     * Send a request WITHOUT waiting for auth (used for auth itself)
     */
    private async sendRaw(method: string, params?: any, timeoutMs = 30000): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected to VS Code');
        }

        return new Promise((resolve, reject) => {
            const id = uuidv4();
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timed out'));
                }
            }, timeoutMs);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            const request: JsonRpcRequest = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };

            this.ws!.send(JSON.stringify(request), (err) => {
                if (err) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(id);
                    reject(err);
                }
            });
        });
    }

    /**
     * Send a request, waiting for authentication to complete first
     */
    async send(method: string, params?: any, timeoutMs = 30000): Promise<any> {
        // Wait for auth to complete
        if (!this.isAuthenticated) {
            if (!this.authPromise) {
                throw new Error('Not connected to VS Code');
            }
            await this.authPromise;
        }

        this.log('tool-call', method, params);
        try {
            const result = await this.sendRaw(method, params, timeoutMs);
            // Don't log large results
            const resultPreview = JSON.stringify(result).length > 200 ? '(large result)' : result;
            this.log('tool-result', `${method} success`, resultPreview);
            return result;
        } catch (e) {
            this.log('error', `${method} failed`, e);
            throw e;
        }
    }

    /**
     * Check if connected and authenticated
     */
    get ready(): boolean {
        return this.isConnected && this.isAuthenticated;
    }

    /**
     * Public getters for UI
     */
    get isConnectedPublic(): boolean { return this.isConnected; }
    get isAuthenticatedPublic(): boolean { return this.isAuthenticated; }
    get configPublic(): { host: string; port: number } { return { host: this.config.host, port: this.config.port }; }

    getPairedTokenData(): PairedTokenData | undefined {
        if (!this.tokenStore) return undefined;
        return this.tokenStore.get(`${this.config.host}:${this.config.port}`);
    }

    updateConfig(host: string, port: number) {
        if (this.config.host === host && this.config.port === port) return;
        
        this.config.host = host;
        this.config.port = port;
        this.log('connection', `Configuration updated to ${host}:${port}. Reconnecting...`);
        
        // Disconnect and let reconnect logic handle it
        if (this.ws) {
            this.ws.close();
        } else {
            this.connect();
        }
    }

    unpair() {
        this.pairedToken = null;
        if (this.tokenStore) {
            this.tokenStore.remove(`${this.config.host}:${this.config.port}`);
            this.log('auth', 'Unpaired device');
        }
        // Reconnect to try without paired token
        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * Initiate pairing with VS Code using a 6-digit code.
     * The user must first run "Pair a Device" in VS Code to get the code.
     * 
     * @param code The 6-digit pairing code displayed in VS Code
     * @param clientName Friendly name for this client (optional)
     * @returns Pairing result
     */
    async pair(code: string, clientName?: string): Promise<{ success: boolean; message: string }> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Need an active connection to pair
            throw new Error('Not connected to VS Code. Connect first, then pair.');
        }

        // Generate ECDH key pair
        const keyPair = generateClientECDHKeyPair();

        const name = clientName || `AlephNet-${process.env.USER || 'client'}-${process.pid}`;

        this.log('auth', `Initiating pairing with code ${code}...`);

        try {
            // Send pair.initiate (unauthenticated — code is the credential)
            const result = await this.sendRaw('pair.initiate', {
                code,
                clientPublicKey: keyPair.publicKey,
                clientName: name,
                clientFingerprint: this.clientFingerprint,
            }, 120000); // 2 minute timeout (user needs to approve)

            if (result.paired === false) {
                return { success: false, message: result.reason || 'Pairing rejected' };
            }

            // Successfully paired — decrypt the token using ECDH shared secret
            const sharedSecret = deriveClientSharedSecret(keyPair.privateKey, result.serverPublicKey);
            const token = decryptWithSharedSecret(result.encryptedToken, sharedSecret);

            // Store the token for future connections
            this.pairedToken = token;
            if (this.tokenStore) {
                this.tokenStore.save(`${this.config.host}:${this.config.port}`, {
                    token,
                    deviceId: result.deviceId,
                    pairedAt: new Date().toISOString(),
                    host: this.config.host,
                    port: this.config.port,
                });
            }

            this.log('auth', `Paired successfully! Device ID: ${result.deviceId}`);

            // Now authenticate with the new token
            // We need to wait for the next auth challenge (reconnect)
            // Or if already challenged, authenticate immediately
            if (!this.isAuthenticated && this.authResolve) {
                // We're still in the initial connection, auth challenge already received
                // We'll re-authenticate on next reconnect with the paired token
                this.log('auth', 'Paired token stored. Reconnecting to authenticate...');
                this.ws?.close();
            }

            return {
                success: true,
                message: `Paired with VS Code as "${name}" (device: ${result.deviceId}). Token stored for future connections.`,
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.log('error', 'Pairing failed', msg);
            return { success: false, message: `Pairing failed: ${msg}` };
        }
    }

    /**
     * Check if this client has a paired token stored
     */
    get isPaired(): boolean {
        return this.pairedToken !== null;
    }

    /**
     * Dispose: close connection and stop reconnecting
     */
    dispose() {
        this.disposed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.cleanup();
    }
}

// ============================================================================
// Plugin activation — registers all available tools
// ============================================================================

let client: VSCodeClient | null = null;

export const activate = async (context: PluginContext) => {
    console.log('VS Code Control Plugin activating...');

    const config = context.manifest.alephConfig?.configuration || {};
    const host = config.host || '127.0.0.1';
    const port = config.port || 19876;
    // Token from config or environment (3.2.2)
    const token = config.token || process.env.VSCODE_CONTROL_TOKEN || '';
    const useTls = config.useTls ?? (process.env.VSCODE_CONTROL_TLS === 'true');

    // Determine data directory for persisting pairing tokens
    const dataDir = config.dataDir || path.join(process.env.HOME || '/tmp', '.aleph', 'plugins', 'vscode-control');

    client = new VSCodeClient({ host, port, token, useTls }, dataDir);
    
    // Wire up logging
    client.onLog = (entry) => {
        // Emit log event to renderer
        // Use a custom event name or mechanism if context.ipc.send isn't available for arbitrary events
        // Assuming context.ipc has a way to send events to renderer, or we use a specific channel
        // Since PluginContext definition shows `ipc.send(channel, data)`, we use that.
        try {
            context.ipc.send('vscode-control:log', entry);
        } catch (e) {
            console.error('Failed to send log to renderer:', e);
        }
    };

    client.connect();

    // ─── IPC Handlers ──────────────────────────────────────────────────
    
    context.ipc.handle('vscode-control:status', async () => {
        if (!client) return { connected: false, authenticated: false, paired: false, host: '127.0.0.1', port: 19876 };
        
        const stored = client.getPairedTokenData();
        
        return {
            connected: client.isConnectedPublic,
            authenticated: client.isAuthenticatedPublic,
            paired: client.isPaired,
            host: client.configPublic.host,
            port: client.configPublic.port,
            deviceId: stored?.deviceId,
            pairedAt: stored?.pairedAt
        };
    });

    context.ipc.handle('vscode-control:pair', async (args: any) => {
        if (!client) throw new Error('Client not initialized');
        return await client.pair(args.code, args.clientName);
    });

    context.ipc.handle('vscode-control:unpair', async () => {
        if (!client) throw new Error('Client not initialized');
        client.unpair();
        return { success: true };
    });

    context.ipc.handle('vscode-control:config', async (args: any) => {
        if (!client) throw new Error('Client not initialized');
        
        if (args && (args.host || args.port)) {
            client.updateConfig(args.host || client.configPublic.host, args.port || client.configPublic.port);
        }
        
        return client.configPublic;
    });

    // ─── Notification handlers ─────────────────────────────────────────
    client.onNotification('terminal.output', (params) => {
        console.log(`[VS Code Terminal ${params.terminalId}] ${params.data}`);
    });

    client.onNotification('terminal.closed', (params) => {
        console.log(`[VS Code Terminal ${params.terminalId}] Closed`);
    });

    client.onNotification('file.changed', (params) => {
        console.log(`[VS Code File ${params.type}] ${params.path}`);
    });

    client.onNotification('server.shutdown', (params) => {
        console.log(`[VS Code Server] Shutting down: ${params?.reason}`);
    });

    // ─── Helper to register a tool ────────────────────────────────────
    const registerTool = (
        name: string,
        description: string,
        parameters: Record<string, any>,
        required: string[],
        handler: (args: any) => Promise<any>
    ) => {
        context.dsn.registerTool({
            name,
            description,
            executionLocation: 'SERVER',
            semanticDomain: 'cognitive',
            requiredTier: 'Neophyte',
            version: '1.0.0',
            parameters: {
                type: 'object',
                properties: parameters,
                required
            },
            primeDomain: [2, 3],
            smfAxes: []
        }, handler);
    };

    // ═══════════════════════════════════════════════════════════════════
    // Editor tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_open_file',
        'Open a file in VS Code',
        { path: { type: 'string', description: 'Path to the file to open' } },
        ['path'],
        async (args) => client!.send('editor.openFile', { path: args.path })
    );

    registerTool(
        'vscode_close_file',
        'Close a file tab in VS Code',
        { path: { type: 'string', description: 'Path to the file to close' } },
        ['path'],
        async (args) => client!.send('editor.closeFile', { path: args.path })
    );

    registerTool(
        'vscode_get_content',
        'Get the content and language of a file open in VS Code',
        { path: { type: 'string', description: 'Path to the file' } },
        ['path'],
        async (args) => client!.send('editor.getContent', { path: args.path })
    );

    registerTool(
        'vscode_edit_file',
        'Replace the entire content of a file in VS Code',
        {
            path: { type: 'string', description: 'Path to the file to edit' },
            content: { type: 'string', description: 'New content for the file' }
        },
        ['path', 'content'],
        async (args) => client!.send('editor.setContent', { path: args.path, content: args.content })
    );

    registerTool(
        'vscode_insert_text',
        'Insert text at a specific position in a file',
        {
            path: { type: 'string', description: 'Path to the file' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' },
            text: { type: 'string', description: 'Text to insert' }
        },
        ['path', 'line', 'character', 'text'],
        async (args) => client!.send('editor.insertText', {
            path: args.path,
            position: { line: args.line, character: args.character },
            text: args.text
        })
    );

    registerTool(
        'vscode_replace_range',
        'Replace text in a specific range within a file',
        {
            path: { type: 'string', description: 'Path to the file' },
            startLine: { type: 'number', description: 'Start line (0-indexed)' },
            startCharacter: { type: 'number', description: 'Start character (0-indexed)' },
            endLine: { type: 'number', description: 'End line (0-indexed)' },
            endCharacter: { type: 'number', description: 'End character (0-indexed)' },
            text: { type: 'string', description: 'Replacement text' }
        },
        ['path', 'startLine', 'startCharacter', 'endLine', 'endCharacter', 'text'],
        async (args) => client!.send('editor.replaceRange', {
            path: args.path,
            range: {
                start: { line: args.startLine, character: args.startCharacter },
                end: { line: args.endLine, character: args.endCharacter }
            },
            text: args.text
        })
    );

    registerTool(
        'vscode_apply_edits',
        'Apply multiple edits to a file atomically',
        {
            path: { type: 'string', description: 'Path to the file' },
            edits: {
                type: 'array',
                description: 'Array of edits, each with range {start: {line, character}, end: {line, character}} and text',
                items: { type: 'object' }
            }
        },
        ['path', 'edits'],
        async (args) => client!.send('editor.applyEdits', { path: args.path, edits: args.edits })
    );

    registerTool(
        'vscode_save_file',
        'Save a specific file or the active file in VS Code',
        { path: { type: 'string', description: 'Path to the file (optional, saves active file if omitted)' } },
        [],
        async (args) => client!.send('editor.save', { path: args.path })
    );

    registerTool(
        'vscode_save_all',
        'Save all open files in VS Code',
        {},
        [],
        async () => client!.send('editor.saveAll')
    );

    registerTool(
        'vscode_get_active_file',
        'Get the currently active file path and language',
        {},
        [],
        async () => client!.send('editor.getActiveFile')
    );

    registerTool(
        'vscode_get_open_files',
        'Get a list of all open file paths in VS Code',
        {},
        [],
        async () => client!.send('editor.getOpenFiles')
    );

    registerTool(
        'vscode_format_document',
        'Format a document using the configured formatter',
        { path: { type: 'string', description: 'Path to the file (optional, formats active file if omitted)' } },
        [],
        async (args) => client!.send('editor.formatDocument', { path: args.path })
    );

    // ═══════════════════════════════════════════════════════════════════
    // File system tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_read_file',
        'Read the content of a file',
        { path: { type: 'string', description: 'Path to the file to read' } },
        ['path'],
        async (args) => client!.send('fs.readFile', { path: args.path })
    );

    registerTool(
        'vscode_write_file',
        'Write content to a file (creates if not exists)',
        {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write' }
        },
        ['path', 'content'],
        async (args) => client!.send('fs.writeFile', { path: args.path, content: args.content })
    );

    registerTool(
        'vscode_delete_file',
        'Delete a file',
        { path: { type: 'string', description: 'Path to the file to delete' } },
        ['path'],
        async (args) => client!.send('fs.deleteFile', { path: args.path })
    );

    registerTool(
        'vscode_list_files',
        'List files in a directory',
        {
            path: { type: 'string', description: 'Directory path' },
            recursive: { type: 'boolean', description: 'List recursively (default: false)' }
        },
        ['path'],
        async (args) => client!.send('fs.listDirectory', { path: args.path, recursive: args.recursive })
    );

    registerTool(
        'vscode_rename',
        'Rename or move a file',
        {
            oldPath: { type: 'string', description: 'Current path' },
            newPath: { type: 'string', description: 'New path' }
        },
        ['oldPath', 'newPath'],
        async (args) => client!.send('fs.rename', { oldPath: args.oldPath, newPath: args.newPath })
    );

    registerTool(
        'vscode_file_exists',
        'Check if a file or directory exists',
        { path: { type: 'string', description: 'Path to check' } },
        ['path'],
        async (args) => client!.send('fs.exists', { path: args.path })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Terminal tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_run_terminal_command',
        'Run a command in the VS Code integrated terminal',
        {
            command: { type: 'string', description: 'Shell command to execute' },
            cwd: { type: 'string', description: 'Working directory (optional)' }
        },
        ['command'],
        async (args) => {
            const term = await client!.send('terminal.create', { cwd: args.cwd });
            await client!.send('terminal.sendText', { terminalId: term.terminalId, text: args.command });
            await client!.send('terminal.show', { terminalId: term.terminalId });
            return { success: true, terminalId: term.terminalId };
        }
    );

    registerTool(
        'vscode_list_terminals',
        'List all terminals in VS Code',
        {},
        [],
        async () => client!.send('terminal.list')
    );

    // ═══════════════════════════════════════════════════════════════════
    // Search tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_search',
        'Search for text across files in the workspace',
        {
            query: { type: 'string', description: 'Search query' },
            include: { type: 'string', description: 'Glob pattern for files to include (optional)' },
            exclude: { type: 'string', description: 'Glob pattern for files to exclude (optional)' },
            maxResults: { type: 'number', description: 'Maximum number of results (optional)' },
            useRegex: { type: 'boolean', description: 'Treat query as regex (optional)' },
            caseSensitive: { type: 'boolean', description: 'Case-sensitive search (optional)' }
        },
        ['query'],
        async (args) => client!.send('search.findInFiles', {
            query: args.query,
            options: {
                include: args.include,
                exclude: args.exclude,
                maxResults: args.maxResults,
                useRegex: args.useRegex,
                caseSensitive: args.caseSensitive,
            }
        })
    );

    registerTool(
        'vscode_find_and_replace',
        'Find and replace text across files in the workspace',
        {
            query: { type: 'string', description: 'Search query' },
            replacement: { type: 'string', description: 'Replacement text' },
            include: { type: 'string', description: 'Glob pattern for files to include (optional)' },
            useRegex: { type: 'boolean', description: 'Treat query as regex (optional)' }
        },
        ['query', 'replacement'],
        async (args) => client!.send('search.findAndReplace', {
            query: args.query,
            replacement: args.replacement,
            options: {
                include: args.include,
                useRegex: args.useRegex,
            }
        })
    );

    // ═══════════════════════════════════════════════════════════════════
    // State / Intelligence tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_get_diagnostics',
        'Get diagnostics (errors/warnings) for a file or the entire workspace',
        { path: { type: 'string', description: 'File path (optional, all diagnostics if omitted)' } },
        [],
        async (args) => client!.send('state.getDiagnostics', { path: args.path })
    );

    registerTool(
        'vscode_get_symbols',
        'Get document symbols (functions, classes, variables) for a file',
        { path: { type: 'string', description: 'File path' } },
        ['path'],
        async (args) => client!.send('state.getSymbols', { path: args.path })
    );

    registerTool(
        'vscode_find_references',
        'Find all references to a symbol at a specific position',
        {
            path: { type: 'string', description: 'File path' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' }
        },
        ['path', 'line', 'character'],
        async (args) => client!.send('state.findReferences', {
            path: args.path,
            position: { line: args.line, character: args.character }
        })
    );

    registerTool(
        'vscode_go_to_definition',
        'Go to the definition of a symbol at a specific position',
        {
            path: { type: 'string', description: 'File path' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' }
        },
        ['path', 'line', 'character'],
        async (args) => client!.send('state.goToDefinition', {
            path: args.path,
            position: { line: args.line, character: args.character }
        })
    );

    registerTool(
        'vscode_get_hover',
        'Get hover information (type info, documentation) at a specific position',
        {
            path: { type: 'string', description: 'File path' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' }
        },
        ['path', 'line', 'character'],
        async (args) => client!.send('state.getHover', {
            path: args.path,
            position: { line: args.line, character: args.character }
        })
    );

    registerTool(
        'vscode_get_workspace',
        'Get workspace information (folders, name)',
        {},
        [],
        async () => client!.send('state.getWorkspace')
    );

    registerTool(
        'vscode_get_code_actions',
        'Get available code actions (quick fixes, refactorings) for a range',
        {
            path: { type: 'string', description: 'File path' },
            startLine: { type: 'number', description: 'Start line (0-indexed)' },
            startCharacter: { type: 'number', description: 'Start character (0-indexed)' },
            endLine: { type: 'number', description: 'End line (0-indexed)' },
            endCharacter: { type: 'number', description: 'End character (0-indexed)' }
        },
        ['path', 'startLine', 'startCharacter', 'endLine', 'endCharacter'],
        async (args) => client!.send('state.getCodeActions', {
            path: args.path,
            range: {
                start: { line: args.startLine, character: args.startCharacter },
                end: { line: args.endLine, character: args.endCharacter }
            }
        })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Document info & completions (3.1.1, 3.1.2)
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_get_document_info',
        'Get detailed document information (language, line count, file size, encoding)',
        { path: { type: 'string', description: 'File path' } },
        ['path'],
        async (args) => client!.send('editor.getDocumentInfo', { path: args.path })
    );

    registerTool(
        'vscode_get_completions',
        'Get code completion suggestions at a specific position',
        {
            path: { type: 'string', description: 'File path' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' }
        },
        ['path', 'line', 'character'],
        async (args) => client!.send('editor.getCompletions', {
            path: args.path,
            position: { line: args.line, character: args.character }
        })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Terminal output (3.1.3)
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_get_terminal_output',
        'Get buffered output from a terminal',
        {
            terminalId: { type: 'number', description: 'Terminal ID' },
            lines: { type: 'number', description: 'Number of recent lines to return (default: 50)' }
        },
        ['terminalId'],
        async (args) => client!.send('terminal.getOutput', {
            terminalId: args.terminalId,
            lines: args.lines || 50
        })
    );

    registerTool(
        'vscode_close_terminal',
        'Close a terminal by ID',
        { terminalId: { type: 'number', description: 'Terminal ID to close' } },
        ['terminalId'],
        async (args) => client!.send('terminal.close', { terminalId: args.terminalId })
    );

    // ═══════════════════════════════════════════════════════════════════
    // File watching (3.1.4)
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_watch_files',
        'Start watching file patterns for changes (creates, changes, deletes)',
        {
            pattern: { type: 'string', description: 'Glob pattern to watch (e.g. "**/*.ts")' },
            watchId: { type: 'string', description: 'Unique ID for this watcher (for later removal)' }
        },
        ['pattern', 'watchId'],
        async (args) => client!.send('fs.watchFiles', { pattern: args.pattern, watchId: args.watchId })
    );

    registerTool(
        'vscode_unwatch_files',
        'Stop watching a previously registered file pattern',
        { watchId: { type: 'string', description: 'Watcher ID to remove' } },
        ['watchId'],
        async (args) => client!.send('fs.unwatchFiles', { watchId: args.watchId })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Debug tools (3.1.5-3.1.10)
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_debug_start',
        'Start a debug session with a named launch configuration',
        {
            name: { type: 'string', description: 'Launch configuration name (from launch.json)' },
            folder: { type: 'string', description: 'Workspace folder name (optional)' }
        },
        ['name'],
        async (args) => client!.send('debug.start', { name: args.name, folder: args.folder })
    );

    registerTool(
        'vscode_debug_stop',
        'Stop the active debug session',
        { sessionId: { type: 'string', description: 'Debug session ID (optional, stops active if omitted)' } },
        [],
        async (args) => client!.send('debug.stop', { sessionId: args.sessionId })
    );

    registerTool(
        'vscode_debug_pause',
        'Pause the active debug session',
        {},
        [],
        async () => client!.send('debug.pause')
    );

    registerTool(
        'vscode_debug_continue',
        'Continue execution in the active debug session',
        {},
        [],
        async () => client!.send('debug.continue')
    );

    registerTool(
        'vscode_debug_step_over',
        'Step over the current line',
        {},
        [],
        async () => client!.send('debug.stepOver')
    );

    registerTool(
        'vscode_debug_step_into',
        'Step into the current function call',
        {},
        [],
        async () => client!.send('debug.stepInto')
    );

    registerTool(
        'vscode_debug_step_out',
        'Step out of the current function',
        {},
        [],
        async () => client!.send('debug.stepOut')
    );

    registerTool(
        'vscode_debug_set_breakpoint',
        'Set a breakpoint at a specific location',
        {
            path: { type: 'string', description: 'File path' },
            line: { type: 'number', description: 'Line number (1-indexed)' },
            condition: { type: 'string', description: 'Conditional expression (optional)' }
        },
        ['path', 'line'],
        async (args) => client!.send('debug.setBreakpoint', {
            path: args.path,
            line: args.line,
            condition: args.condition
        })
    );

    registerTool(
        'vscode_debug_remove_breakpoint',
        'Remove a breakpoint at a specific location',
        {
            path: { type: 'string', description: 'File path' },
            line: { type: 'number', description: 'Line number (1-indexed)' }
        },
        ['path', 'line'],
        async (args) => client!.send('debug.removeBreakpoint', {
            path: args.path,
            line: args.line
        })
    );

    registerTool(
        'vscode_debug_list_breakpoints',
        'List all breakpoints in the workspace',
        {},
        [],
        async () => client!.send('debug.listBreakpoints')
    );

    registerTool(
        'vscode_debug_evaluate',
        'Evaluate an expression in the debug console',
        {
            expression: { type: 'string', description: 'Expression to evaluate' },
            frameId: { type: 'number', description: 'Stack frame ID (optional)' }
        },
        ['expression'],
        async (args) => client!.send('debug.evaluate', {
            expression: args.expression,
            frameId: args.frameId
        })
    );

    registerTool(
        'vscode_debug_get_sessions',
        'Get all active debug sessions',
        {},
        [],
        async () => client!.send('debug.getSessions')
    );

    // ═══════════════════════════════════════════════════════════════════
    // Git tools (3.1.11-3.1.21)
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_git_status',
        'Get the current git status (modified, staged, untracked files)',
        {},
        [],
        async () => client!.send('git.status')
    );

    registerTool(
        'vscode_git_diff',
        'Get the diff for a file or the entire repository',
        {
            path: { type: 'string', description: 'File path (optional, all changes if omitted)' },
            staged: { type: 'boolean', description: 'Show staged diff (default: false)' }
        },
        [],
        async (args) => client!.send('git.diff', { path: args.path, staged: args.staged })
    );

    registerTool(
        'vscode_git_log',
        'Get the git log (recent commits)',
        {
            maxCount: { type: 'number', description: 'Maximum number of commits (default: 20)' },
            path: { type: 'string', description: 'Filter by file path (optional)' }
        },
        [],
        async (args) => client!.send('git.log', { maxCount: args.maxCount || 20, path: args.path })
    );

    registerTool(
        'vscode_git_stage',
        'Stage files for commit',
        {
            paths: {
                type: 'array',
                description: 'File paths to stage',
                items: { type: 'string' }
            }
        },
        ['paths'],
        async (args) => client!.send('git.stage', { paths: args.paths })
    );

    registerTool(
        'vscode_git_unstage',
        'Unstage files',
        {
            paths: {
                type: 'array',
                description: 'File paths to unstage',
                items: { type: 'string' }
            }
        },
        ['paths'],
        async (args) => client!.send('git.unstage', { paths: args.paths })
    );

    registerTool(
        'vscode_git_commit',
        'Commit staged changes',
        { message: { type: 'string', description: 'Commit message' } },
        ['message'],
        async (args) => client!.send('git.commit', { message: args.message })
    );

    registerTool(
        'vscode_git_branch',
        'Get current branch info or list branches',
        { listAll: { type: 'boolean', description: 'List all branches including remote (default: false)' } },
        [],
        async (args) => client!.send('git.branch', { listAll: args.listAll })
    );

    registerTool(
        'vscode_git_checkout',
        'Switch to a different branch or create a new one',
        {
            branch: { type: 'string', description: 'Branch name to switch to' },
            create: { type: 'boolean', description: 'Create the branch if it does not exist (default: false)' }
        },
        ['branch'],
        async (args) => client!.send('git.checkout', { branch: args.branch, create: args.create })
    );

    registerTool(
        'vscode_git_show',
        'Show the content of a file at a specific commit',
        {
            path: { type: 'string', description: 'File path' },
            ref: { type: 'string', description: 'Git ref (commit hash, branch, tag). Default: HEAD' }
        },
        ['path'],
        async (args) => client!.send('git.show', { path: args.path, ref: args.ref || 'HEAD' })
    );

    registerTool(
        'vscode_git_stash',
        'Stash or apply stashed changes',
        {
            action: { type: 'string', description: 'Action: "save", "pop", "apply", "list", "drop"' },
            message: { type: 'string', description: 'Stash message (for "save" action)' },
            index: { type: 'number', description: 'Stash index (for "pop", "apply", "drop")' }
        },
        ['action'],
        async (args) => client!.send('git.stash', {
            action: args.action,
            message: args.message,
            index: args.index
        })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Command tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_execute_command',
        'Execute a VS Code command by name',
        {
            command: { type: 'string', description: 'VS Code command ID (e.g. "editor.action.formatDocument")' },
            args: { type: 'array', description: 'Command arguments (optional)' }
        },
        ['command'],
        async (args) => client!.send('command.execute', { command: args.command, args: args.args })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Batch request tool (3.2.3)
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_batch',
        'Execute multiple VS Code operations in a single batch for efficiency',
        {
            requests: {
                type: 'array',
                description: 'Array of {method, params} objects to execute',
                items: { type: 'object' }
            }
        },
        ['requests'],
        async (args) => client!.send('batch', { requests: args.requests })
    );

    // ═══════════════════════════════════════════════════════════════════
    // Pairing tools
    // ═══════════════════════════════════════════════════════════════════

    registerTool(
        'vscode_pair',
        'Pair this client with a VS Code instance using a 6-digit code. First run "Pair a Device" in VS Code (Ctrl+Shift+P > "Aleph Agent Control: Pair a Device") to get the code, then use this tool with that code.',
        {
            code: { type: 'string', description: 'The 6-digit pairing code displayed in VS Code' },
            clientName: { type: 'string', description: 'Friendly name for this client (optional)' }
        },
        ['code'],
        async (args) => {
            if (!client) {
                return { success: false, message: 'VS Code client not initialized' };
            }
            return client.pair(args.code, args.clientName);
        }
    );

    registerTool(
        'vscode_pairing_status',
        'Check whether this client is paired with VS Code',
        {},
        [],
        async () => {
            if (!client) {
                return { paired: false, connected: false, authenticated: false };
            }
            return {
                paired: client.isPaired,
                connected: client.ready,
                authenticated: client.ready,
            };
        }
    );

    registerTool(
        'vscode_pairing_setup',
        'Show an interactive inline pairing form in the conversation so the user can pair with VS Code. Call this when the user asks to set up, pair, or connect VS Code. Returns a custom code fence that renders a pairing UI widget.',
        {
            host: { type: 'string', description: 'Default host for the connection (optional, defaults to 127.0.0.1)' },
            port: { type: 'number', description: 'Default port for the connection (optional, defaults to 19876)' },
            title: { type: 'string', description: 'Custom title for the pairing widget (optional)' }
        },
        [],
        async (args: any) => {
            const cfg: Record<string, any> = {};
            if (args.host) cfg.host = args.host;
            if (args.port) cfg.port = args.port;
            if (args.title) cfg.title = args.title;

            const configJson = Object.keys(cfg).length > 0 ? JSON.stringify(cfg) : '';

            // Return the custom fence block that will be rendered inline
            const fenceBlock = [
                '```vscode-pairing',
                configJson,
                '```',
            ].join('\n');

            // Also include current status for context
            let statusInfo = '';
            if (client) {
                const isPaired = client.isPaired;
                const isConnected = client.ready;
                statusInfo = isPaired && isConnected
                    ? '\n\n✅ You are already paired and connected to VS Code.'
                    : isPaired
                        ? '\n\n🔗 You have a saved pairing but are not currently connected.'
                        : '\n\n🔌 Not yet paired. Use the form above to connect.';
            }

            return {
                content: fenceBlock + statusInfo,
                display: 'inline',
            };
        }
    );

    console.log('VS Code Control Plugin activated.');
};

/**
 * Deactivate the plugin — close WebSocket connection and stop reconnecting
 */
export const deactivate = () => {
    console.log('VS Code Control Plugin deactivating...');
    if (client) {
        client.dispose();
        client = null;
    }
};
