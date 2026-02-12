import { BaseConnector } from './BaseConnector';
import { DataSourceConfig } from '../types';
// @ts-ignore
import { Client } from 'pg';

export class PostgresConnector extends BaseConnector {
    private client: any | null = null;

    constructor(config: DataSourceConfig) {
        super(config);
    }

    async connect(): Promise<boolean> {
        try {
            this.client = new Client({
                connectionString: this.config.connectionString,
            });
            await this.client.connect();
            this.config.status = 'connected';
            return true;
        } catch (error: any) {
            console.error(`[PostgresConnector] Connection failed: ${error.message}`);
            this.config.status = 'error';
            this.config.errorMessage = error.message;
            return false;
        }
    }

    async disconnect(): Promise<boolean> {
        if (this.client) {
            await this.client.end();
            this.client = null;
            this.config.status = 'disconnected';
            return true;
        }
        return false;
    }

    async testConnection(): Promise<boolean> {
        try {
            const tempClient = new Client({
                connectionString: this.config.connectionString,
            });
            await tempClient.connect();
            await tempClient.query('SELECT 1');
            await tempClient.end();
            return true;
        } catch (error) {
            return false;
        }
    }

    async fetch(lastSyncTimestamp?: number): Promise<any[]> {
        if (!this.client) {
            throw new Error('Not connected');
        }

        try {
            let query = '';
            if (this.config.query) {
                query = this.config.query;
            } else if (this.config.table) {
                query = `SELECT * FROM ${this.config.table}`;
                if (lastSyncTimestamp && this.config.timestampColumn) {
                    query += ` WHERE ${this.config.timestampColumn} > to_timestamp(${lastSyncTimestamp / 1000})`;
                }
            } else {
                query = `
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                `;
            }

            const res = await this.client.query(query);
            return res.rows;
        } catch (error: any) {
            console.error(`[PostgresConnector] Fetch failed: ${error.message}`);
            throw error;
        }
    }

    async getSchema(): Promise<any> {
        if (!this.client) throw new Error('Not connected');
        
        const res = await this.client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
        `);
        
        const schema: any = {};
        res.rows.forEach((row: any) => {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push({
                name: row.column_name,
                type: row.data_type
            });
        });
        
        return schema;
    }
}
