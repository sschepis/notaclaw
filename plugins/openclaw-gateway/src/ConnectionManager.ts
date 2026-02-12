import { EventEmitter } from 'events';

export interface NodeConfig {
    name: string;
    url: string;
    apiKey?: string;
    priority?: number;
}

export interface NodeStatus {
    connected: boolean;
    latency: number;
    version: string;
    capabilities: string[];
    lastSeen: number;
}

export class ConnectionManager extends EventEmitter {
    private nodes: Map<string, NodeConfig>;
    private statuses: Map<string, NodeStatus>;
    private activeNode: string | null = null;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(configs: NodeConfig[]) {
        super();
        this.nodes = new Map(configs.map(c => [c.name, c]));
        this.statuses = new Map();
        configs.forEach(c => {
            this.statuses.set(c.name, {
                connected: false,
                latency: -1,
                version: 'unknown',
                capabilities: [],
                lastSeen: 0
            });
        });
    }

    async connect(): Promise<void> {
        console.log(`Connecting to ${this.nodes.size} OpenClaw endpoints...`);
        
        // Initial connection attempt
        for (const [name, config] of this.nodes) {
            await this.checkNode(name);
        }

        this.selectBestNode();

        // Start heartbeat loop
        if (!this.checkInterval) {
            this.checkInterval = setInterval(() => this.heartbeat(), 30000);
        }
    }

    async disconnect(): Promise<void> {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.activeNode = null;
        this.emit('disconnected');
    }

    private async checkNode(name: string): Promise<boolean> {
        const config = this.nodes.get(name);
        if (!config) return false;

        const status = this.statuses.get(name)!;
        const start = Date.now();

        try {
            const headers: Record<string, string> = {};
            if (config.apiKey) {
                headers['Authorization'] = `Bearer ${config.apiKey}`;
            }

            const response = await fetch(`${config.url}/health`, { headers });
            
            if (response.ok) {
                const data = await response.json();
                status.connected = true;
                status.latency = Date.now() - start;
                status.lastSeen = Date.now();
                status.version = data.version || '1.0.0';
                status.capabilities = data.capabilities || [];
                
                this.emit('node-status', name, status);
                return true;
            } else {
                status.connected = false;
                console.warn(`Node ${name} health check failed: ${response.statusText}`);
            }
        } catch (e) {
            status.connected = false;
            console.warn(`Node ${name} unreachable:`, e);
        }
        
        this.statuses.set(name, status);
        return false;
    }

    private selectBestNode(): void {
        let bestNode: string | null = null;
        let minLatency = Infinity;

        for (const [name, status] of this.statuses) {
            if (status.connected && status.latency < minLatency) {
                minLatency = status.latency;
                bestNode = name;
            }
        }

        if (bestNode !== this.activeNode) {
            this.activeNode = bestNode;
            if (bestNode) {
                console.log(`Switched to active node: ${bestNode}`);
                this.emit('connected', bestNode);
            } else {
                console.warn('No active nodes available');
                this.emit('disconnected');
            }
        }
    }

    private async heartbeat(): Promise<void> {
        for (const name of this.nodes.keys()) {
            await this.checkNode(name);
        }
        this.selectBestNode();
    }

    async request(path: string, options: RequestInit = {}): Promise<any> {
        if (!this.activeNode) {
            throw new Error("No active OpenClaw connection");
        }

        const config = this.nodes.get(this.activeNode)!;
        const url = `${config.url}${path.startsWith('/') ? path : '/' + path}`;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {})
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (!response.ok) {
                throw new Error(`OpenClaw request failed: ${response.statusText}`);
            }

            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (e) {
            // If request fails, trigger a health check immediately
            await this.checkNode(this.activeNode);
            this.selectBestNode();
            throw e;
        }
    }

    getActiveNode(): string | null {
        return this.activeNode;
    }

    getCapabilities(): string[] {
        if (!this.activeNode) return [];
        return this.statuses.get(this.activeNode)?.capabilities || [];
    }
}
