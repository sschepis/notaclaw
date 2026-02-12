import * as http from 'http';

export class MockOpenClawNode {
    private server: http.Server;
    private port: number;
    private tasks: Map<string, any> = new Map();

    constructor(port: number) {
        this.port = port;
        this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
            this.handleRequest(req, res);
        });
    }

    start(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(`Mock OpenClaw Node running on port ${this.port}`);
                resolve();
            });
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const url = new URL(req.url || '', `http://localhost:${this.port}`);
        
        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'ok',
                version: '1.2.0',
                capabilities: ['compute', 'storage', 'inference']
            }));
            return;
        }

        if (url.pathname === '/tasks' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => body += chunk);
            req.on('end', () => {
                const task = JSON.parse(body);
                const id = `task-${Date.now()}`;
                this.tasks.set(id, { ...task, id, status: 'queued' });
                
                res.writeHead(200);
                res.end(JSON.stringify({ id, status: 'queued' }));
            });
            return;
        }


        if (url.pathname.startsWith('/tasks/') && req.method === 'GET') {
            const id = url.pathname.split('/')[2];
            const task = this.tasks.get(id);
            
            if (task) {
                res.writeHead(200);
                res.end(JSON.stringify(task));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Task not found' }));
            }
            return;
        }

        if (url.pathname.startsWith('/tasks/') && url.pathname.endsWith('/cancel') && req.method === 'POST') {
            const id = url.pathname.split('/')[2];
            const task = this.tasks.get(id);
            
            if (task) {
                task.status = 'cancelled';
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Task not found' }));
            }
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
}
