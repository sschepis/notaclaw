import * as https from 'https';
import { URL } from 'url';
import { PluginContext } from '../../../client/src/shared/plugin-types';

export default {
  activate: (context: PluginContext) => {
    console.log('[Agent Essentials] Main process activated');

    // Register traits for AI to understand capabilities
    context.traits.register({
      id: '@alephnet/agent-essentials:web-search',
      name: 'Web Search Capability',
      description: 'Enables searching the web for current information and data',
      instruction: `You have access to a web search capability via the 'web_search' tool. Use this when:
- The user asks about current events, news, or time-sensitive information
- You need factual data that may have changed since your training
- Research or verification of claims is required
- The user explicitly asks to search for something

Call web_search with a 'query' parameter containing your search terms. Results include title, snippet, and URL.`,
      activationMode: 'dynamic',
      triggerKeywords: ['search', 'look up', 'find online', 'google', 'current', 'latest', 'news', 'today'],
      priority: 15,
      source: '@alephnet/agent-essentials'
    });

    context.traits.register({
      id: '@alephnet/agent-essentials:url-reader',
      name: 'URL Content Reader',
      description: 'Enables reading and extracting content from web pages',
      instruction: `You have access to a URL reading capability via the 'read_url' tool. Use this when:
- You need to fetch content from a specific URL
- The user shares a link and wants you to analyze its content
- You need to verify information from a web source
- Following up on search results to get full content

Call read_url with a 'url' parameter. Returns the text content of the page (limited to first 5000 chars).`,
      activationMode: 'dynamic',
      triggerKeywords: ['read url', 'fetch page', 'visit', 'open link', 'http', 'https', 'website content'],
      priority: 14,
      source: '@alephnet/agent-essentials'
    });

    // 1. Web Search Tool
    context.dsn.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      },
      semanticDomain: 'cognitive',
      primeDomain: [2, 3], // Information retrieval
      smfAxes: [0.5, 0.5],
      requiredTier: 'Neophyte',
      version: '1.0.0'
    }, async ({ query }: { query: string }) => {
      console.log(`[Agent Essentials] Searching for: ${query}`);
      
      // Check for API key in secrets
      const apiKey = await context.secrets.get('search_api_key');
      if (apiKey) {
          try {
              const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&q=${encodeURIComponent(query)}`;
              return new Promise((resolve, reject) => {
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
          } catch (e) {
              console.error("Search failed:", e);
          }
      }

      // Mock implementation fallback
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
    });

    // 2. Read URL Tool
    context.dsn.registerTool({
      name: 'read_url',
      description: 'Read and extract content from a URL',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to read' }
        },
        required: ['url']
      },
      semanticDomain: 'perceptual',
      primeDomain: [5, 7], // Data ingestion
      smfAxes: [0.8, 0.2],
      requiredTier: 'Neophyte',
      version: '1.0.0'
    }, async ({ url }: { url: string }) => {
      console.log(`[Agent Essentials] Reading URL: ${url}`);
      return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return reject(new Error('Only HTTP/HTTPS protocols are supported'));
            }
            
            const req = https.get(url, (res) => {
                // Handle redirects
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    // Simple redirect handling (could be improved to loop)
                    const newUrl = new URL(res.headers.location, url).toString();
                    console.log(`[Agent Essentials] Redirecting to ${newUrl}`);
                    
                    https.get(newUrl, (res2) => {
                         let data = '';
                        res2.on('data', (chunk) => data += chunk);
                        res2.on('end', () => resolve({ content: data.substring(0, 5000) })); 
                    }).on('error', reject);
                    return;
                }

                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve({ content: data.substring(0, 5000) })); // Limit size
            });
            
            req.on('error', (err) => reject(err));
            req.end();
            
        } catch (e: any) {
            reject(new Error(`Invalid URL: ${e.message}`));
        }
      });
    });

    context.on('ready', () => {
      console.log('[Agent Essentials] Ready');
    });
  },
  
  deactivate: () => {
    console.log('[Agent Essentials] Deactivated');
  }
};
