const http = require('http');
const crypto = require('crypto');

/**
 * Production-Grade Webhook Gateway
 * - Implements DoS protection (body size limits)
 * - Request validation
 * - Standardized error handling
 * - Graceful shutdown
 * - CORS & Security headers
 */
class WebhookGateway {
  constructor(context, port = 3000) {
    this.context = context;
    this.port = port;
    this.id = 'webhook-gateway';
    this.sourceName = 'webhook';
    this.server = null;
    this.handlers = new Set();
    this.isClosing = false;
    
    // Configuration
    this.maxBodySize = 1024 * 1024; // 1MB limit
    this.requestTimeout = 5000; // 5s timeout
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      
      this.server.timeout = this.requestTimeout;
      this.server.keepAliveTimeout = 5000;

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[API Gateway] Port ${this.port} in use, retrying with ${this.port + 1}...`);
          this.port++;
          this.server.close();
          this.connect().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`[API Gateway] Webhook server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async handleRequest(req, res) {
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
      } catch (error) {
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

  readBody(req) {
    return new Promise((resolve, reject) => {
      // Validate Content-Type
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        const err = new Error('Unsupported Media Type. Expected application/json');
        err.statusCode = 415;
        return reject(err);
      }

      let data = '';
      let size = 0;

      req.on('data', chunk => {
        size += chunk.length;
        if (size > this.maxBodySize) {
          const err = new Error('Payload Too Large');
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
          const err = new Error('Invalid JSON');
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
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('[API Gateway] Server stopped');
          resolve();
        });
        // Force close active connections
        this.server.closeAllConnections();
      });
    }
  }

  onMessage(handler) {
    this.handlers.add(handler);
  }

  dispatch(msg) {
    for (const handler of this.handlers) {
      try {
        handler(msg);
      } catch (err) {
        console.error('[API Gateway] Dispatch handler error:', err);
      }
    }
  }

  normalize(payload) {
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
}

module.exports = {
  activate: async (context) => {
    console.log('[API Gateway] Activating...');
    
    // 1. Initialize the Gateway
    const gateway = new WebhookGateway(context, 3000);
    
    try {
      await gateway.connect();
      
      // 2. Register with Host Services
      if (context.services && context.services.gateways) {
        context.services.gateways.register(gateway);
        console.log('[API Gateway] Registered as "webhook" gateway');
      } else {
        console.warn('[API Gateway] Host does not support gateway registration. Running standalone.');
      }

      // 3. Listen for normalized messages and bridge to AlephNet
      gateway.onMessage((msg) => {
        // Log sensitive data only in debug mode (omitted for prod logic)
        console.log(`[API Gateway] Received from ${msg.source} (${msg.author.name})`);
        
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
