import { BaseConnector } from './BaseConnector';
import { DataSourceConfig } from '../types';
// @ts-ignore
import axios from 'axios';

export class WebScraperConnector extends BaseConnector {
    constructor(config: DataSourceConfig) {
        super(config);
    }

    async connect(): Promise<boolean> {
        // Web scraper doesn't maintain a persistent connection
        this.config.status = 'connected';
        return true;
    }

    async disconnect(): Promise<boolean> {
        this.config.status = 'disconnected';
        return true;
    }

    async testConnection(): Promise<boolean> {
        try {
            await axios.head(this.config.url);
            return true;
        } catch (error) {
            // Some sites block HEAD, try GET
            try {
                await axios.get(this.config.url);
                return true;
            } catch (e) {
                return false;
            }
        }
    }

    async fetch(lastSyncTimestamp?: number): Promise<any[]> {
        try {
            const response = await axios.get(this.config.url);
            const html = response.data;
            
            // Simple regex based scraping if selector is provided
            // In a real app, we'd use cheerio or similar
            const selector = this.config.selector;
            const data: any[] = [];

            if (selector) {
                // Very basic regex to find content inside tags.
                // This is obviously brittle and just a placeholder for real scraping logic.
                // Example selector: "h1" -> /<h1[^>]*>(.*?)<\/h1>/g
                const tag = selector.replace(/[^\w]/g, ''); // simplified
                const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'gi');
                let match;
                while ((match = regex.exec(html)) !== null) {
                    data.push({ content: match[1].replace(/<[^>]*>?/gm, '') }); // strip inner tags
                }
            } else {
                // If no selector, return page metadata
                data.push({
                    url: this.config.url,
                    title: (html.match(/<title>(.*?)<\/title>/) || [])[1],
                    length: html.length,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error: any) {
            console.error(`[WebScraperConnector] Fetch failed: ${error.message}`);
            throw error;
        }
    }

    async getSchema(): Promise<any> {
        return {
            page: [
                { name: 'content', type: 'string' },
                { name: 'url', type: 'string' },
                { name: 'title', type: 'string' }
            ]
        };
    }
}
