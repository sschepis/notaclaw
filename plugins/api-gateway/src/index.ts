import * as http from 'http';
import * as crypto from 'crypto';

// Mock PluginContext for standalone plugin definition
export interface PluginContext {
  dsn?: {
    publishObservation: (text: string, embedding: number[]) => void;
  };
  ipc?: {
    send: (channel: string, data: any) => void;
    handle: (channel: string, handler: (data: any) => any) => void;
  };
  services?: {
    gateways?: {
      register: (gateway: any) => void;
    };
  };
  on: (event: string, callback: () => void) => void;
}

interface NormalizedMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  channelId: string;
  source: string;
  timestamp: number;
  raw?: any;
}

/**
 * Production-Grade Webhook Gateway
 * - Implements DoS protection (body size limits)
 * - Request validation
 * - Standardized error handling
 * - Graceful shutdown
 * - CORS & Security headers
 */
class WebhookGateway {
  context: PluginContext;
  port: number;
  id: string;
  name: string; // Added
  type: string; // Added
  networkName: string; // Added
  status: 'connected' | 'disconnected' | 'error'; // Added
  sourceName: string;
  server: http.Server | null;
  handlers: Set<(msg: NormalizedMessage) => void>;
  isClosing: boolean;
  maxBodySize: number;
  requestTimeout: number;

  constructor(context: PluginContext, port = 3000) {
    this.context = context;
    this.port = port;
    this.id = 'webhook-gateway';
    this.name = 'Local Webhook Gateway'; // Added
    this.type = 'webhook'; // Added
    this.networkName = 'localhost'; // Added
    this.status = 'disconnected'; // Added
    this.sourceName = 'webhook';
    this.server = null;
    this.handlers = new Set();
    this.isClosing = false;
    
    // Configuration
    this.maxBodySize = 1024 * 1024; // 1MB limit
    this.requestTimeout = 5000; // 5s timeout
  }

  async connect() {
    return new Promise<void>((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      
      this.server.timeout = this.requestTimeout;
      this.server.keepAliveTimeout = 5000;

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[API Gateway] Port ${this.port} in use, retrying with ${this.port + 1}...`);
          this.port++;
          this.server?.close();
          this.connect().then(resolve).catch(reject);
        } else {
          this.status = 'error';
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`[API Gateway] Webhook server listening on port ${this.port}`);
        this.status = 'connected';
        resolve();
      });
    });
  }

  // ... (handleRequest and readBody remain mostly the same, just keeping context)

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    if (req.method === 'POST' && req.url === '/messages') {
      try {
        const body = await this.readBody(req);
        const normalized = this.normalize(body);
        this.dispatch(normalized);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', id: normalized.id }));
      } catch (error: any) {
        console.error('[API Gateway] Request Error:', error.message);
        
        const statusCode = error.statusCode || 400;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      // Validate Content-Type
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        const err: any = new Error('Unsupported Media Type. Expected application/json');
        err.statusCode = 415;
        return reject(err);
      }

      let data = '';
      let size = 0;

      req.on('data', chunk => {
        size += chunk.length;
        if (size > this.maxBodySize) {
          const err: any = new Error('Payload Too Large');
          err.statusCode = 413;
          req.destroy(); // Close socket
          reject(err);
          return;
        }
        data += chunk;
      });

      req.on('end', () => {
        try {
          if (!data) return resolve({});
          resolve(JSON.parse(data));
        } catch (e) {
          const err: any = new Error('Invalid JSON');
          err.statusCode = 400;
          reject(err);
        }
      });

      req.on('error', (err) => reject(err));
    });
  }

  async disconnect() {
    if (this.server && !this.isClosing) {
      this.isClosing = true;
      return new Promise<void>((resolve) => {
        this.server?.close(() => {
          console.log('[API Gateway] Server stopped');
          this.status = 'disconnected';
          resolve();
        });
        // Force close active connections
        this.server?.closeAllConnections();
      });
    }
  }

  // Required by GatewayDefinition
  async submitTask(task: any): Promise<string> {
    throw new Error('Task submission not supported by Webhook Gateway');
  }

  // Required by GatewayDefinition
  async getTaskStatus(taskId: string): Promise<any> {
    throw new Error('Task status not supported by Webhook Gateway');
  }

  onMessage(handler: (msg: NormalizedMessage) => void) {
    this.handlers.add(handler);
  }

  dispatch(msg: NormalizedMessage) {
    for (const handler of this.handlers) {
      try {
        handler(msg);
      } catch (err) {
        console.error('[API Gateway] Dispatch handler error:', err);
      }
    }
  }

  normalize(payload: any): NormalizedMessage {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload format');
    }
    
    if (!payload.content || typeof payload.content !== 'string') {
      throw new Error('Payload missing "content" string');
    }
    
    if (!payload.sender || typeof payload.sender !== 'string') {
      throw new Error('Payload missing "sender" string');
    }

    // Sanitize content (basic example)
    const safeContent = payload.content.trim().slice(0, 10000); // 10k char limit

    return {
      id: `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      content: safeContent,
      author: {
        id: payload.sender,
        name: payload.sender,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.sender)}`
      },
      channelId: payload.channel || 'general',
      source: 'webhook',
      timestamp: Date.now(),
      raw: payload
    };
  }
  
  // Implement ChannelGateway interface methods if needed
  async sendMessage(channelId: string, content: string): Promise<void> {
      // Outbound webhooks could be implemented here
      console.log(`[API Gateway] Outbound message to ${channelId}: ${content}`);
  }
}

export default {
  activate: async (context: PluginContext) => {
    console.log('[API Gateway] Activating...');
    
    // 1. Initialize the Gateway
    const gateway = new WebhookGateway(context, 3000);
    const requestLogs: Array<{ type: string; message: string; timestamp: number }> = [];
    
    // 2. Register IPC handlers for the renderer UI
    if (context.ipc && context.ipc.handle) {
      context.ipc.handle('gateway:get-status', async () => {
        return {
          status: gateway.status === 'connected' ? 'running' : gateway.status,
          port: gateway.port,
          logs: requestLogs.slice(-100) // Last 100 entries
        };
      });

      context.ipc.handle('gateway:set-port', async (data: { port: number }) => {
        if (data && typeof data.port === 'number' && data.port > 0 && data.port < 65536) {
          await gateway.disconnect();
          gateway.port = data.port;
          await gateway.connect();
          return { success: true, port: gateway.port };
        }
        return { success: false, error: 'Invalid port' };
      });
    }

    // 3. Listen for normalized messages and bridge to AlephNet
    gateway.onMessage((msg) => {
      // Log sensitive data only in debug mode (omitted for prod logic)
      console.log(`[API Gateway] Received from ${msg.source} (${msg.author.name})`);
      
      // Track request log for UI
      requestLogs.push({
        type: 'info',
        message: `${msg.source} ${msg.author.name}: ${msg.content.substring(0, 100)}`,
        timestamp: Date.now()
      });
      if (requestLogs.length > 500) requestLogs.splice(0, requestLogs.length - 500);
      
      // Publish to AlephNet Graph
      if (context.dsn) {
        try {
          context.dsn.publishObservation(
            `Message from ${msg.author.name} in #${msg.channelId}: ${msg.content}`,
            [] // Host handles SMF projection
          );
        } catch (err) {
          console.error('[API Gateway] Failed to publish observation:', err);
        }
      }
      
      // Emit via IPC for UI
      if (context.ipc) {
          context.ipc.send('gateway:message', msg);
      }
    });

    try {
      await gateway.connect();
      
      // 4. Register with Host Services
      if (context.services && context.services.gateways) {
        context.services.gateways.register(gateway);
        console.log('[API Gateway] Registered as "webhook" gateway');
      } else {
        console.warn('[API Gateway] Host does not support gateway registration. Running standalone.');
      }

    } catch (err) {
      console.error('[API Gateway] Failed to start:', err);
    }

    // Ensure clean shutdown
    context.on('stop', async () => {
      await gateway.disconnect();
    });
  },
  
  deactivate: () => {
    console.log('[API Gateway] Deactivated');
  }
};
