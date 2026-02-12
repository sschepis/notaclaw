import { DataConnector, DataSourceConfig } from './types';

type ConnectorFactory = (config: DataSourceConfig) => DataConnector;

export class ConnectorRegistry {
    private static instance: ConnectorRegistry;
    private factories: Map<string, ConnectorFactory>;

    private constructor() {
        this.factories = new Map();
    }

    static getInstance(): ConnectorRegistry {
        if (!ConnectorRegistry.instance) {
            ConnectorRegistry.instance = new ConnectorRegistry();
        }
        return ConnectorRegistry.instance;
    }

    register(type: string, factory: ConnectorFactory) {
        this.factories.set(type, factory);
    }

    create(config: DataSourceConfig): DataConnector {
        const factory = this.factories.get(config.type);
        if (!factory) {
            throw new Error(`Unknown connector type: ${config.type}`);
        }
        return factory(config);
    }

    getTypes(): string[] {
        return Array.from(this.factories.keys());
    }
}
