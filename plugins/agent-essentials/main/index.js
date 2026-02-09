
const https = require('https');
const { URL } = require('url');

module.exports = {
  activate: (context) => {
    console.log('[Agent Essentials] Main process activated');

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
      primeDomain: [2, 3],
      smfAxes: [0.5, 0.5],
      requiredTier: 'Neophyte',
      version: '1.0.0'
    }, async ({ query }) => {
      console.log(`[Agent Essentials] Searching for: ${query}`);
      
      // Check for API key in secrets
      const apiKey = await context.secrets.get('search_api_key');
      if (apiKey) {
          // Implement real search if key exists (e.g. Google Custom Search)
          // For now, we assume Google format if key is present
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
                                  results: json.items?.map(item => ({
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
      primeDomain: [5, 7],
      smfAxes: [0.8, 0.2],
      requiredTier: 'Neophyte',
      version: '1.0.0'
    }, async ({ url }) => {
      console.log(`[Agent Essentials] Reading URL: ${url}`);
      return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return reject(new Error('Only HTTP/HTTPS protocols are supported'));
            }
            
            const req = https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve({ content: data.substring(0, 5000) })); // Limit size
            });
            
            req.on('error', (err) => reject(err));
            req.end();
            
        } catch (e) {
            reject(new Error(`Invalid URL: ${e.message}`));
        }
      });
    });

    // NOTE: 'execute_code' removed from here. Use 'code-interpreter' plugin instead.

    context.on('ready', () => {
      console.log('[Agent Essentials] Ready');
    });
  },
  
  deactivate: () => {
    console.log('[Agent Essentials] Deactivated');
  }
};
