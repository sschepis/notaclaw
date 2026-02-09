import { AlephGunBridge } from '@sschepis/alephnet-node';
import { ServiceDefinition, ServiceInstance } from '../../shared/service-types';

export class ServiceRegistry {
    private bridge: AlephGunBridge;
    private toolHandlers: Map<string, Function> = new Map();

    constructor(bridge: AlephGunBridge) {
        this.bridge = bridge;
    }

    registerToolHandler(name: string, handler: Function) {
        this.toolHandlers.set(name, handler);
        console.log(`Registered handler for tool: ${name}`);
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

    // A real search would require a proper search engine or a graph traversal strategy
    // This is a stub for the interface
    async search(_query: { text?: string; tags?: string[] }): Promise<ServiceDefinition[]> {
        console.warn('Search not fully implemented in Gun bridge yet.');
        return [];
    }
}
