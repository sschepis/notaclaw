import { PluginContext } from '../../../../client/src/shared/plugin-types';
import { WebSearchService } from '../services/WebSearchService';
import { BrowserService } from '../services/BrowserService';

export function registerWebTools(context: PluginContext, searchService: WebSearchService, browserService: BrowserService) {
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
    }, async ({ query }: { query: string }) => {
        return searchService.search(query);
    });

    context.dsn.registerTool({
        name: 'web_browse',
        description: 'Browse a web page and extract content',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to browse' }
            },
            required: ['url']
        },
        semanticDomain: 'perceptual',
        primeDomain: [5, 7],
        smfAxes: [0.8, 0.2],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ url }: { url: string }) => {
        const content = await browserService.browsePage(url);
        return { content };
    });

    context.dsn.registerTool({
        name: 'web_screenshot',
        description: 'Take a screenshot of a web page',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to screenshot' }
            },
            required: ['url']
        },
        semanticDomain: 'perceptual',
        primeDomain: [5, 7],
        smfAxes: [0.8, 0.2],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ url }: { url: string }) => {
        const screenshot = await browserService.screenshotPage(url);
        return { screenshot, format: 'base64' };
    });

    context.dsn.registerTool({
        name: 'web_extract',
        description: 'Extract data from a web page using a CSS selector',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to extract from' },
                selector: { type: 'string', description: 'CSS selector' }
            },
            required: ['url', 'selector']
        },
        semanticDomain: 'cognitive',
        primeDomain: [5, 7],
        smfAxes: [0.8, 0.2],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ url, selector }: { url: string, selector: string }) => {
        const data = await browserService.extractData(url, selector);
        return { data };
    });
}
