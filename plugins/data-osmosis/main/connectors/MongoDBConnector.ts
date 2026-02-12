import { BaseConnector } from './BaseConnector';
import { DataSourceConfig } from '../types';
// @ts-ignore
import { MongoClient, Db } from 'mongodb';

export class MongoDBConnector extends BaseConnector {
    private client: any | null = null;
    private db: any | null = null;

    constructor(config: DataSourceConfig) {
        super(config);
    }

    async connect(): Promise<boolean> {
        try {
            this.client = new MongoClient(this.config.connectionString);
            await this.client.connect();
            
            // Extract DB name from connection string or config
            const dbName = this.config.databaseName;
            this.db = this.client.db(dbName);
            
            this.config.status = 'connected';
            return true;
        } catch (error: any) {
            console.error(`[MongoDBConnector] Connection failed: ${error.message}`);
            this.config.status = 'error';
            this.config.errorMessage = error.message;
            return false;
        }
    }

    async disconnect(): Promise<boolean> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.config.status = 'disconnected';
            return true;
        }
        return false;
    }

    async testConnection(): Promise<boolean> {
        try {
            const tempClient = new MongoClient(this.config.connectionString);
            await tempClient.connect();
            await tempClient.db(this.config.databaseName).command({ ping: 1 });
            await tempClient.close();
            return true;
        } catch (error) {
            return false;
        }
    }

    async fetch(lastSyncTimestamp?: number): Promise<any[]> {
        if (!this.db) {
            throw new Error('Not connected');
        }

        try {
            const collectionName = this.config.collection;
            if (!collectionName) {
                // If no collection specified, maybe list collections? 
                // But fetch is supposed to return data records.
                // Let's assume we return a list of collection names as "records" if no collection is specified.
                const collections = await this.db.listCollections().toArray();
                return collections.map((c: any) => ({ name: c.name, type: 'collection' }));
            }

            const collection = this.db.collection(collectionName);
            let query: any = {};
            
            if (lastSyncTimestamp && this.config.timestampField) {
                query[this.config.timestampField] = { $gt: new Date(lastSyncTimestamp) };
            }

            const results = await collection.find(query).toArray();
            return results;
        } catch (error: any) {
            console.error(`[MongoDBConnector] Fetch failed: ${error.message}`);
            throw error;
        }
    }

    async getSchema(): Promise<any> {
        if (!this.db) throw new Error('Not connected');

        const collections = await this.db.listCollections().toArray();
        const schema: any = {};

        for (const col of collections) {
            // Sample one document to infer schema
            const sample = await this.db.collection(col.name).findOne({});
            if (sample) {
                schema[col.name] = Object.keys(sample).map(key => ({
                    name: key,
                    type: typeof sample[key]
                }));
            } else {
                schema[col.name] = [];
            }
        }

        return schema;
    }
}
