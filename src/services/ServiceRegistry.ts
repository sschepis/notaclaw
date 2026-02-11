import { AlephGunBridge } from '@sschepis/alephnet-node';
import { ServiceDefinition, ServiceInstance, GatewayDefinition } from '../shared/service-types';

export interface ToolMetadata {
    description?: string;
    parameters?: any;
    pluginId?: string;
}

export interface ToolInfo {
    name: string;
    description: string;
    parameters: any;
    pluginId?: string;
}

export class ServiceRegistry {
    private bridge: AlephGunBridge;
    private toolHandlers: Map<string, (args: any) => Promise<any>> = new Map();
    private toolMetadata: Map<string, ToolMetadata> = new Map();
    private gateways: Map<string, GatewayDefinition> = new Map();

    constructor(bridge: AlephGunBridge) {
        this.bridge = bridge;
    }

    registerToolHandler(name: string, handler: Function, metadata?: ToolMetadata) {
        this.toolHandlers.set(name, handler as (args: any) => Promise<any>);
        if (metadata) {
            this.toolMetadata.set(name, metadata);
        }
        console.log(`Registered handler for tool: ${name}`);
    }

    /**
     * List all registered tools with their metadata for AI agent discovery.
     */
    listTools(): ToolInfo[] {
        const tools: ToolInfo[] = [];
        for (const [name] of this.toolHandlers) {
            const meta = this.toolMetadata.get(name);
            tools.push({
                name,
                description: meta?.description || '',
                parameters: meta?.parameters || {},
                pluginId: meta?.pluginId,
            });
        }
        return tools;
    }

    /**
     * Check if a tool is registered.
     */
    hasTool(name: string): boolean {
        return this.toolHandlers.has(name);
    }

    async registerGateway(gateway: GatewayDefinition) {
        this.gateways.set(gateway.id, gateway);
        console.log(`Registered gateway: ${gateway.id} (${gateway.type})`);
        
        try {
            await gateway.connect();
            gateway.status = 'connected';
        } catch (error) {
            console.error(`Failed to connect gateway ${gateway.id}:`, error);
            gateway.status = 'error';
        }
    }

    getGateway(id: string): GatewayDefinition | undefined {
        return this.gateways.get(id);
    }

    getGateways(): GatewayDefinition[] {
        return Array.from(this.gateways.values());
    }

    async invokeTool(name: string, args: any): Promise<any> {
        const handler = this.toolHandlers.get(name);
        if (!handler) {
            throw new Error(`Tool ${name} not found locally.`);
        }
        try {
            return await handler(args);
        } catch (error) {
            console.error(`Error invoking tool ${name}:`, error);
            throw error;
        }
    }

    async register(service: ServiceDefinition): Promise<void> {
        console.log('Registering service:', service.id);
        
        // 1. Store the full definition
        await this.bridge.put(`services/${service.id}/definition`, service);
        
        // 2. Add to category index
        await this.bridge.put(`indexes/services/categories/${service.category}/${service.id}`, true);
        
        // 3. Add to tag indices
        for (const tag of service.tags) {
            await this.bridge.put(`indexes/services/tags/${tag}/${service.id}`, true);
        }

        console.log(`Service ${service.id} registered successfully.`);
    }

    async getService(serviceId: string): Promise<ServiceDefinition | null> {
        return await this.bridge.get(`services/${serviceId}/definition`);
    }

    async updateHealth(serviceId: string, instance: ServiceInstance): Promise<void> {
        await this.bridge.put(`services/${serviceId}/instances/${instance.nodeId}`, instance);
    }

    /**
     * Search services by text and/or tags using Gun bridge indices.
     */
    async search(query: { text?: string; tags?: string[]; category?: string }): Promise<ServiceDefinition[]> {
        const results: ServiceDefinition[] = [];
        const seen = new Set<string>();

        try {
            // Search by category
            if (query.category) {
                const categoryIndex = await this.bridge.get(`indexes/services/categories/${query.category}`);
                if (categoryIndex && typeof categoryIndex === 'object') {
                    for (const serviceId of Object.keys(categoryIndex)) {
                        if (serviceId === '_' || seen.has(serviceId)) continue;
                        const service = await this.getService(serviceId);
                        if (service) {
                            results.push(service);
                            seen.add(serviceId);
                        }
                    }
                }
            }

            // Search by tags
            if (query.tags && query.tags.length > 0) {
                for (const tag of query.tags) {
                    const tagIndex = await this.bridge.get(`indexes/services/tags/${tag}`);
                    if (tagIndex && typeof tagIndex === 'object') {
                        for (const serviceId of Object.keys(tagIndex)) {
                            if (serviceId === '_' || seen.has(serviceId)) continue;
                            const service = await this.getService(serviceId);
                            if (service) {
                                results.push(service);
                                seen.add(serviceId);
                            }
                        }
                    }
                }
            }

            // Text search (basic substring match against cached results or all services)
            if (query.text && results.length === 0) {
                // If no category/tag filter, we can't enumerate all services from Gun easily
                // but we can log a warning
                console.warn('[ServiceRegistry] Full-text search without category/tag filter is limited in Gun. Use tags or categories for better results.');
            } else if (query.text) {
                const lowerText = query.text.toLowerCase();
                return results.filter(s =>
                    s.name.toLowerCase().includes(lowerText) ||
                    s.description.toLowerCase().includes(lowerText)
                );
            }
        } catch (error) {
            console.error('[ServiceRegistry] Search error:', error);
        }

        return results;
    }
}
