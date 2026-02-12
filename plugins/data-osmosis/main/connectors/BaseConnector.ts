import { DataConnector, DataSourceConfig } from '../types';

export abstract class BaseConnector implements DataConnector {
    id: string;
    config: DataSourceConfig;

    constructor(config: DataSourceConfig) {
        this.id = config.id;
        this.config = config;
    }

    abstract connect(): Promise<boolean>;
    abstract disconnect(): Promise<boolean>;
    abstract testConnection(): Promise<boolean>;
    abstract fetch(lastSyncTimestamp?: number): Promise<any[]>;
    abstract getSchema(): Promise<any>;
}
