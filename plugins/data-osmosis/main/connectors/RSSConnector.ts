import { BaseConnector } from './BaseConnector';
import { DataSourceConfig } from '../types';
// @ts-ignore
import axios from 'axios';

export class RSSConnector extends BaseConnector {
    constructor(config: DataSourceConfig) {
        super(config);
    }

    async connect(): Promise<boolean> {
        this.config.status = 'connected';
        return true;
    }

    async disconnect(): Promise<boolean> {
        this.config.status = 'disconnected';
        return true;
    }

    async testConnection(): Promise<boolean> {
        try {
            await axios.get(this.config.url);
            return true;
        } catch (error) {
            return false;
        }
    }

    async fetch(lastSyncTimestamp?: number): Promise<any[]> {
        try {
            const response = await axios.get(this.config.url);
            const xml = response.data;
            
            // Basic XML parsing for RSS/Atom
            // Extract items/entries
            const items: any[] = [];
            
            // Regex for <item>...</item> (RSS) or <entry>...</entry> (Atom)
            const itemRegex = /<(item|entry)>([\s\S]*?)<\/\1>/g;
            let match;
            
            while ((match = itemRegex.exec(xml)) !== null) {
                const content = match[2];
                
                // Extract common fields
                const title = (content.match(/<title[^>]*>(.*?)<\/title>/) || [])[1];
                const link = (content.match(/<link[^>]*href="([^"]*)"/) || content.match(/<link>(.*?)<\/link>/) || [])[1];
                const description = (content.match(/<description>(.*?)<\/description>/) || content.match(/<summary>(.*?)<\/summary>/) || [])[1];
                const pubDate = (content.match(/<pubDate>(.*?)<\/pubDate>/) || content.match(/<updated>(.*?)<\/updated>/) || [])[1];
                const guid = (content.match(/<guid[^>]*>(.*?)<\/guid>/) || content.match(/<id>(.*?)<\/id>/) || [])[1];

                const itemTimestamp = pubDate ? new Date(pubDate).getTime() : Date.now();

                if (!lastSyncTimestamp || itemTimestamp > lastSyncTimestamp) {
                    items.push({
                        title: this.decodeHtml(title),
                        link,
                        description: this.decodeHtml(description),
                        pubDate,
                        guid,
                        timestamp: itemTimestamp
                    });
                }
            }
            
            return items;
        } catch (error: any) {
            console.error(`[RSSConnector] Fetch failed: ${error.message}`);
            throw error;
        }
    }

    async getSchema(): Promise<any> {
        return {
            item: [
                { name: 'title', type: 'string' },
                { name: 'link', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'pubDate', type: 'string' },
                { name: 'guid', type: 'string' }
            ]
        };
    }

    private decodeHtml(html: string | undefined): string {
        if (!html) return '';
        return html
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
    }
}
