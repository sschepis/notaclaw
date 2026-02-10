import { PluginContext } from '../../../src/shared/plugin-types';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

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

class VSCodeClient {
    private ws: WebSocket | null = null;
    private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
    private config: { host: string; port: number; token: string };
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnected = false;

    constructor(config: { host: string; port: number; token: string }) {
        this.config = config;
    }

    connect() {
        if (this.ws) return;

        const url = `ws://${this.config.host}:${this.config.port}`;
        console.log(`Connecting to VS Code at ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
            console.log('Connected to VS Code WebSocket');
            this.isConnected = true;
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            } catch (e) {
                console.error('Failed to parse message from VS Code:', e);
            }
        });

        this.ws.on('close', () => {
            console.log('Disconnected from VS Code');
            this.cleanup();
            this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
            console.error('VS Code WebSocket error:', err);
            this.cleanup();
            this.scheduleReconnect();
        });
    }

    private cleanup() {
        this.isConnected = false;
        this.ws = null;
        // Reject all pending requests
        for (const { reject } of this.pendingRequests.values()) {
            reject(new Error('Connection lost'));
        }
        this.pendingRequests.clear();
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 5000);
    }

    private async handleMessage(message: any) {
        // Handle Auth Challenge
        if (message.method === 'auth.challenge') {
            try {
                const result = await this.send('auth.authenticate', {
                    token: this.config.token,
                    nonce: message.params.nonce
                });
                if (result.authenticated) {
                    console.log('Authenticated with VS Code');
                } else {
                    console.error('Authentication failed:', result.error);
                }
            } catch (e) {
                console.error('Error during authentication:', e);
            }
            return;
        }

        // Handle Response
        if (message.id && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id)!;
            this.pendingRequests.delete(message.id);

            if (message.error) {
                reject(new Error(message.error.message));
            } else {
                resolve(message.result);
            }
        }
    }

    async send(method: string, params?: any): Promise<any> {
        if (!this.isConnected && method !== 'auth.authenticate') { // Allow auth even if not fully "ready" logic might differ
             // Actually, ws is open here if we are sending. 
             // But we might need to wait for auth? 
             // For simplicity, we assume if ws is open we can send.
             // If auth fails, the server closes connection.
        }
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
             throw new Error('Not connected to VS Code');
        }

        return new Promise((resolve, reject) => {
            const id = uuidv4();
            this.pendingRequests.set(id, { resolve, reject });

            const request: JsonRpcRequest = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };

            this.ws!.send(JSON.stringify(request), (err) => {
                if (err) {
                    this.pendingRequests.delete(id);
                    reject(err);
                }
            });
            
            // Timeout
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timed out'));
                }
            }, 30000);
        });
    }
}

export const activate = async (context: PluginContext) => {
    console.log('VS Code Control Plugin activating...');

    const config = context.manifest.alephConfig?.configuration || {};
    const host = config.host || '127.0.0.1';
    const port = config.port || 19876;
    const token = config.token || '';

    const client = new VSCodeClient({ host, port, token });
    client.connect();

    // Register Tools

    context.dsn.registerTool({
        name: 'vscode_open_file',
        description: 'Open a file in VS Code',
        executionLocation: 'SERVER',
        semanticDomain: 'cognitive',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file to open' }
            },
            required: ['path']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        return await client.send('editor.openFile', { path: args.path });
    });

    context.dsn.registerTool({
        name: 'vscode_read_file',
        description: 'Read the content of a file in VS Code',
        executionLocation: 'SERVER',
        semanticDomain: 'cognitive',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file to read' }
            },
            required: ['path']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        return await client.send('fs.readFile', { path: args.path });
    });

    context.dsn.registerTool({
        name: 'vscode_edit_file',
        description: 'Replace the content of a file in VS Code',
        executionLocation: 'SERVER',
        semanticDomain: 'cognitive',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file to edit' },
                content: { type: 'string', description: 'New content for the file' }
            },
            required: ['path', 'content']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        return await client.send('editor.setContent', { path: args.path, content: args.content });
    });

    context.dsn.registerTool({
        name: 'vscode_run_terminal_command',
        description: 'Run a command in the VS Code integrated terminal',
        executionLocation: 'SERVER',
        semanticDomain: 'cognitive',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'Shell command to execute' },
                cwd: { type: 'string', description: 'Working directory (optional)' }
            },
            required: ['command']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        // Create a terminal and run the command
        const term = await client.send('terminal.create', { cwd: args.cwd });
        await client.send('terminal.sendText', { terminalId: term.terminalId, text: args.command });
        await client.send('terminal.show', { terminalId: term.terminalId });
        return { success: true, terminalId: term.terminalId };
    });

    context.dsn.registerTool({
        name: 'vscode_list_files',
        description: 'List files in a directory',
        executionLocation: 'SERVER',
        semanticDomain: 'cognitive',
        requiredTier: 'Neophyte',
        version: '1.0.0',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path' }
            },
            required: ['path']
        },
        primeDomain: [2, 3],
        smfAxes: []
    }, async (args: any) => {
        return await client.send('fs.listDirectory', { path: args.path });
    });

    console.log('VS Code Control Plugin activated.');
};
