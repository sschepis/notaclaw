import { PluginContext } from '../../../client/src/shared/plugin-types';
import { FilesystemService } from './services/FilesystemService';
import { WebSearchService } from './services/WebSearchService';
import { SystemInfoService } from './services/SystemInfoService';
import { BrowserService } from './services/BrowserService';
import { ClipboardService } from './services/ClipboardService';
import { registerFilesystemTools, registerWebTools, registerSystemTools } from './tools';

export default {
  activate: (context: PluginContext) => {
    console.log('[Agent Essentials] Main process activated');

    // Initialize Services
    const fsService = new FilesystemService();
    const searchService = new WebSearchService(undefined, context.storage);
    const systemService = new SystemInfoService();
    const browserService = new BrowserService();
    const clipboardService = new ClipboardService();

    // Register Traits
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
      id: '@alephnet/agent-essentials:filesystem',
      name: 'Filesystem Access',
      description: 'Enables unrestricted reading and writing files across the filesystem',
      instruction: `You have full filesystem access. Use 'fs_read_file', 'fs_write_file', 'fs_list_files' to manage files anywhere on disk. Paths can be absolute or relative.`,
      activationMode: 'dynamic',
      triggerKeywords: ['file', 'read', 'write', 'save', 'list files', 'directory'],
      priority: 10,
      source: '@alephnet/agent-essentials'
    });

    // Register Tools
    registerFilesystemTools(context, fsService);
    registerWebTools(context, searchService, browserService);
    registerSystemTools(context, systemService, clipboardService);

    // Register IPC Handlers for UI
    context.ipc.handle('fs:list', async ({ path }) => fsService.listFiles(path));
    context.ipc.handle('fs:read', async ({ path }) => fsService.readFile(path));
    context.ipc.handle('fs:write', async ({ path, content }) => fsService.writeFile(path, content));
    context.ipc.handle('fs:delete', async ({ path }) => fsService.deleteFile(path));
    context.ipc.handle('fs:mkdir', async ({ path }) => fsService.createDirectory(path));
    context.ipc.handle('sys:info', async () => systemService.getSystemInfo());

    // Initialize API Key for Search if available
    context.secrets.get('search_api_key').then(key => {
        if (key) {
            searchService.setApiKey(key);
        }
    });

    context.on('ready', () => {
      console.log('[Agent Essentials] Ready');
    });
  },
  
  deactivate: () => {
    console.log('[Agent Essentials] Deactivated');
  }
};
