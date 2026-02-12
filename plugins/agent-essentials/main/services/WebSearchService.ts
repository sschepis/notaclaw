import * as https from 'https';
import { URL } from 'url';
import { RateLimiter } from '../utils/RateLimiter';

interface Storage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
}

export class WebSearchService {
    private rateLimiter: RateLimiter;
    private apiKey: string | null = null;
    private storage: Storage | null = null;

    constructor(apiKey?: string, storage?: Storage) {
        this.apiKey = apiKey || null;
        this.storage = storage || null;
        // 10 requests per minute
        this.rateLimiter = new RateLimiter(10, 10 / 60);
    }

    public setApiKey(key: string) {
        this.apiKey = key;
    }

    public setStorage(storage: Storage) {
        this.storage = storage;
    }

    public async search(query: string): Promise<any> {
        if (!this.rateLimiter.tryConsume()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        console.log(`[WebSearchService] Searching for: ${query}`);

        let result;
        if (this.apiKey) {
            result = await this.performGoogleSearch(query);
        } else {
            result = this.getMockResults(query);
        }

        await this.saveHistory(query, result);
        return result;
    }

    private async saveHistory(query: string, result: any) {
        if (!this.storage) return;
        try {
            const history = (await this.storage.get('search_history')) || [];
            history.unshift({
                query,
                timestamp: Date.now(),
                resultCount: result.results?.length || 0
            });
            // Keep last 100
            if (history.length > 100) history.length = 100;
            await this.storage.set('search_history', history);
        } catch (e) {
            console.error('Failed to save search history', e);
        }
    }
// ...

    private async performGoogleSearch(query: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&q=${encodeURIComponent(query)}`;
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({
                            results: json.items?.map((item: any) => ({
                                title: item.title,
                                snippet: item.snippet,
                                url: item.link
                            })) || [],
                            metadata: { source: "google" }
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
    }

    private getMockResults(query: string): any {
        return {
            results: [
                {
                    title: `Simulated Result: ${query}`,
                    snippet: `This is a placeholder result for "${query}". To enable real web search, configure a search provider in Agent Essentials settings.`,
                    url: 'https://aleph.network/docs/plugins/agent-essentials'
                },
                {
                    title: 'AlephNet Documentation',
                    snippet: 'Official documentation for AlephNet Distributed Sentience Network.',
                    url: 'https://aleph.network/docs'
                }
            ],
            metadata: {
                source: "simulation",
                note: "Real web search requires API configuration"
            }
        };
    }

    public async readUrl(url: string): Promise<any> {
        console.log(`[WebSearchService] Reading URL: ${url}`);
        return new Promise((resolve, reject) => {
            try {
                const parsedUrl = new URL(url);
                if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                    return reject(new Error('Only HTTP/HTTPS protocols are supported'));
                }

                const req = https.get(url, (res) => {
                    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        const newUrl = new URL(res.headers.location, url).toString();
                        console.log(`[WebSearchService] Redirecting to ${newUrl}`);
                        this.readUrl(newUrl).then(resolve).catch(reject);
                        return;
                    }

                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve({ content: data.substring(0, 5000) }));
                });

                req.on('error', (err) => reject(err));
                req.end();

            } catch (e: any) {
                reject(new Error(`Invalid URL: ${e.message}`));
            }
        });
    }
}
