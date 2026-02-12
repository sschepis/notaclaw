export interface DataSourceConfig {
    id: string;
    type: string;
    name: string;
    connectionString?: string;
    mapping?: Record<string, string>;
    syncIntervalMinutes?: number;
    lastSync?: number;
    status: 'connected' | 'disconnected' | 'syncing' | 'error';
    errorMessage?: string;
    recordCount: number;
    [key: string]: any;
}

export interface DataConnector {
    id: string;
    config: DataSourceConfig;

    connect(): Promise<boolean>;
    disconnect(): Promise<boolean>;
    testConnection(): Promise<boolean>;
    fetch(lastSyncTimestamp?: number): Promise<any[]>;
    getSchema(): Promise<any>;
}

export interface TransformationStep {
    name: string;
    process(data: any[]): Promise<any[]>;
}

export interface SyncResult {
    recordsIngested: number;
    recordsUpdated: number;
    recordsFailed: number;
    errors: string[];
}
