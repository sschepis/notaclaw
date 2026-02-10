import { ServiceManager as LibServiceManager, AlephWallet } from '@sschepis/alephnet-node';
import { ServiceDefinition, GatewayDefinition } from '../../shared/service-types';

export class ServiceRegistry extends LibServiceManager {
    private toolHandlers: Map<string, Function> = new Map();
    private toolDefinitions: Map<string, any> = new Map();
    private gateways: Map<string, GatewayDefinition> = new Map();

    constructor(
        gun: any,
        wallet: AlephWallet,
        localNodeId: string
    ) {
        super(gun, wallet, localNodeId);
    }

    registerToolHandler(name: string, handler: Function, definition?: any) {
        this.toolHandlers.set(name, handler);
        if (definition) {
            this.toolDefinitions.set(name, definition);
        }
        console.log(`Registered handler for tool: ${name}`);
    }

    getToolDefinition(name: string): any | undefined {
        return this.toolDefinitions.get(name);
    }

    getAllToolDefinitions(): any[] {
        return Array.from(this.toolDefinitions.values());
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
        // Adapt to LibServiceManager
        await this.registerService(service as any);
    }

    getRegisteredTools(): string[] {
        return Array.from(this.toolHandlers.keys());
    }
}
