const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  activate: (context) => {
    console.log('[Service Marketplace] Main process activated');
    
    // Mock Registry Data
    const registry = [
        {
            id: 'weather-skill',
            name: 'Weather Skill',
            description: 'Provides weather forecasts and conditions.',
            version: '1.0.0',
            author: 'AlephNet',
            downloadUrl: 'https://example.com/plugins/weather-skill.zip' // Mock
        },
        {
            id: 'finance-tracker',
            name: 'Finance Tracker',
            description: 'Track stock prices and crypto assets.',
            version: '0.5.0',
            author: 'Community',
            downloadUrl: 'https://example.com/plugins/finance-tracker.zip'
        }
    ];

    context.ipc.handle('marketplace:list', async () => {
        // In reality, fetch from https://registry.aleph.network
        return registry;
    });

    context.ipc.handle('marketplace:install', async ({ pluginId }) => {
        console.log(`[Marketplace] Request to install ${pluginId}`);
        // 1. Download (Mocked)
        // 2. Unzip (Mocked)
        // 3. Call PluginManager.installPlugin
        
        // Since we can't actually download from example.com, we'll just simulate success
        // or fail gracefully.
        
        // If we had a real URL, we would:
        // const tempPath = path.join(os.tmpdir(), pluginId);
        // await download(url, tempPath);
        // await context.ipc.invoke('plugin:install', tempPath);
        
        return { success: false, message: "Installation simulation only (no real registry)" };
    });

    context.on('ready', () => {
      console.log('[Service Marketplace] Ready');
    });
  },
  
  deactivate: () => {
    console.log('[Service Marketplace] Deactivated');
  }
};
