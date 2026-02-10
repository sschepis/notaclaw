/**
 * OpenClaw Gateway Service
 * 
 * Manages connections to OpenClaw nodes and provides an interface
 * for submitting tasks and receiving results.
 */

export interface OpenClawNode {
    url: string;
    name: string;
    status: 'online' | 'offline' | 'unknown';
    version?: string;
    capabilities?: string[];
    latency?: number;
}

export interface OpenClawConnectionStatus {
    connected: boolean;
    currentNode: OpenClawNode | null;
    lastConnected: number | null;
    error?: string;
}

export interface OpenClawTask {
    id: string;
    description: string;
    requirements?: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    result?: unknown;
    submittedAt: number;
    completedAt?: number;
}

export interface GatewayDefinition {
    id: string;
    networkName: string;
    connect(url?: string): Promise<void>;
    disconnect(): Promise<void>;
    getStatus(): OpenClawConnectionStatus;
    listNodes(): Promise<OpenClawNode[]>;
    submitTask(task: { description: string; requirements?: Record<string, unknown> }): Promise<string>;
    getTaskStatus(taskId: string): Promise<OpenClawTask>;
    cancelTask(taskId: string): Promise<boolean>;
}

const DEFAULT_ENDPOINTS = [
    { url: 'http://localhost:8080', name: 'Local OpenClaw' },
    { url: 'https://api.openclaw.io', name: 'Public OpenClaw' }
];

export class OpenClawGatewayService implements GatewayDefinition {
    id = 'openclaw.gateway';
    networkName = 'OpenClaw';
    
    private currentNode: OpenClawNode | null = null;
    private lastConnected: number | null = null;
    private connectionError: string | undefined;
    private knownNodes: OpenClawNode[] = [];
    private tasks: Map<string, OpenClawTask> = new Map();

    constructor() {
        // Initialize with default endpoints as known nodes
        this.knownNodes = DEFAULT_ENDPOINTS.map(e => ({
            url: e.url,
            name: e.name,
            status: 'unknown' as const
        }));
    }

    async connect(url?: string): Promise<void> {
        const targetUrl = url || DEFAULT_ENDPOINTS[0].url;
        
        // Find or create node entry
        let node = this.knownNodes.find(n => n.url === targetUrl);
        if (!node) {
            node = {
                url: targetUrl,
                name: new URL(targetUrl).hostname,
                status: 'unknown'
            };
            this.knownNodes.push(node);
        }

        try {
            // Attempt to connect via HTTP GET to health/status endpoint
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const startTime = Date.now();
            const response = await fetch(`${targetUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);
            
            const latency = Date.now() - startTime;
            
            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                node.status = 'online';
                node.latency = latency;
                node.version = data.version;
                node.capabilities = data.capabilities;
                
                this.currentNode = node;
                this.lastConnected = Date.now();
                this.connectionError = undefined;
                
                console.log(`[OpenClawGateway] Connected to ${targetUrl} (${latency}ms)`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (err: any) {
            node.status = 'offline';
            this.connectionError = err.message || 'Connection failed';
            
            // For development, allow simulated connection if the server isn't running
            if (err.name === 'AbortError' || err.message?.includes('fetch')) {
                console.warn(`[OpenClawGateway] Could not reach ${targetUrl}, simulating connection for development`);
                node.status = 'online';
                node.latency = 0;
                this.currentNode = node;
                this.lastConnected = Date.now();
                this.connectionError = undefined;
                return;
            }
            
            throw new Error(`Failed to connect to OpenClaw node at ${targetUrl}: ${this.connectionError}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.currentNode) {
            console.log(`[OpenClawGateway] Disconnecting from ${this.currentNode.url}`);
            this.currentNode = null;
        }
    }

    getStatus(): OpenClawConnectionStatus {
        return {
            connected: this.currentNode !== null,
            currentNode: this.currentNode,
            lastConnected: this.lastConnected,
            error: this.connectionError
        };
    }

    async listNodes(): Promise<OpenClawNode[]> {
        // Ping all known nodes to update their status
        const pingPromises = this.knownNodes.map(async (node) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const startTime = Date.now();
                const response = await fetch(`${node.url}/health`, {
                    method: 'GET',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    node.status = 'online';
                    node.latency = Date.now() - startTime;
                } else {
                    node.status = 'offline';
                }
            } catch {
                // For development, mark localhost as online
                if (node.url.includes('localhost')) {
                    node.status = 'online';
                    node.latency = 0;
                } else {
                    node.status = 'offline';
                }
            }
            return node;
        });

        await Promise.allSettled(pingPromises);
        return this.knownNodes;
    }

    async submitTask(task: { description: string; requirements?: Record<string, unknown> }): Promise<string> {
        if (!this.currentNode) {
            throw new Error('Not connected to any OpenClaw node');
        }

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newTask: OpenClawTask = {
            id: taskId,
            description: task.description,
            requirements: task.requirements,
            status: 'pending',
            submittedAt: Date.now()
        };

        try {
            const response = await fetch(`${this.currentNode.url}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(task)
            });

            if (response.ok) {
                const data = await response.json();
                newTask.id = data.id || taskId;
                newTask.status = 'running';
            }
        } catch {
            // For development, simulate task submission
            console.warn('[OpenClawGateway] Simulating task submission');
            newTask.status = 'running';
        }

        this.tasks.set(newTask.id, newTask);
        return newTask.id;
    }

    async getTaskStatus(taskId: string): Promise<OpenClawTask> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (this.currentNode && task.status === 'running') {
            try {
                const response = await fetch(`${this.currentNode.url}/tasks/${taskId}`);
                if (response.ok) {
                    const data = await response.json();
                    task.status = data.status;
                    task.result = data.result;
                    if (data.completedAt) {
                        task.completedAt = data.completedAt;
                    }
                }
            } catch {
                // Ignore fetch errors, return cached task
            }
        }

        return task;
    }

    async cancelTask(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (task.status !== 'running' && task.status !== 'pending') {
            return false;
        }

        try {
            if (this.currentNode) {
                await fetch(`${this.currentNode.url}/tasks/${taskId}/cancel`, {
                    method: 'POST'
                });
            }
        } catch {
            // Ignore fetch errors
        }

        task.status = 'cancelled';
        return true;
    }

    /**
     * Add a custom node to the known nodes list
     */
    addNode(url: string, name?: string): void {
        if (!this.knownNodes.find(n => n.url === url)) {
            this.knownNodes.push({
                url,
                name: name || new URL(url).hostname,
                status: 'unknown'
            });
        }
    }

    /**
     * Remove a node from the known nodes list
     */
    removeNode(url: string): boolean {
        const index = this.knownNodes.findIndex(n => n.url === url);
        if (index !== -1) {
            // Don't allow removing if currently connected
            if (this.currentNode?.url === url) {
                return false;
            }
            this.knownNodes.splice(index, 1);
            return true;
        }
        return false;
    }
}

// Singleton instance
let gatewayInstance: OpenClawGatewayService | null = null;

export function getOpenClawGateway(): OpenClawGatewayService {
    if (!gatewayInstance) {
        gatewayInstance = new OpenClawGatewayService();
    }
    return gatewayInstance;
}
