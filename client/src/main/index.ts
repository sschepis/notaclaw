import { app, BrowserWindow, protocol } from 'electron';
import { webcrypto } from 'node:crypto';
import { initializeServices, memorySecurityService, taskScheduler, secretsManager, dsnNode } from './services-setup';
import { registerIPC } from './ipc-setup';
import { createWindow } from './window-setup';

// Register dweb scheme as privileged
protocol.registerSchemesAsPrivileged([
    { scheme: 'dweb', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

// Polyfill crypto.getRandomValues for libraries like uuid
if (!global.crypto) {
    // @ts-ignore
    global.crypto = webcrypto;
} else if (!global.crypto.getRandomValues) {
    // @ts-ignore
    global.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let ipcReady = false;

const getMainWindow = () => mainWindow;

app.on('ready', async () => {
    // Initialize services
    await initializeServices(getMainWindow);
    
    // Register IPC handlers before creating any window
    registerIPC(getMainWindow);
    ipcReady = true;

    // Register dweb:// protocol handler
    protocol.handle('dweb', async (request) => {
        const url = request.url.replace('dweb://', '');
        // url is like "domain/path/to/file"
        const parts = url.split('/');
        let domain = parts[0];
        const pathStr = parts.slice(1).join('/') || 'index.html';
        
        // Remove query params/hash if any
        const cleanPath = pathStr.split(/[?#]/)[0];

        // Ensure domain has @ prefix if it's a handle
        // Logic: if it doesn't look like a key (hex), assume it's a handle.
        // For simplicity, we'll assume handles start with @ or we prepend it if missing.
        // But users might type 'my-app' meaning '@my-app'.
        // Let's try to resolve as is, if fail, try with @.
        
        // Actually, DecentralizedWebManager expects a handle.
        if (!domain.startsWith('@') && !domain.match(/^[0-9a-fA-F]{64}$/)) { // Not a hash
             domain = '@' + domain;
        }

        try {
            const result = await dsnNode.getDecentralizedWebManager().fetchFile(domain, cleanPath);
            
            if (result) {
                return new Response(result.content as any, {
                    headers: { 'content-type': result.mimeType }
                });
            } else {
                return new Response('Not Found', { status: 404 });
            }
        } catch (err) {
            console.error('DWeb Protocol error:', err);
            return new Response('Internal Server Error', { status: 500 });
        }
    });
    
    // Create the browser window
    mainWindow = createWindow();
});

// Gracefully shut down services before quitting
app.on('before-quit', async () => {
    memorySecurityService.destroy(); // Cleanup nonce expiry interval
    taskScheduler.shutdown();
    await secretsManager.shutdown();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Only create a window if IPC handlers are registered;
  // on macOS 'activate' can fire while initializeServices() is still running
  if (BrowserWindow.getAllWindows().length === 0 && ipcReady) {
    mainWindow = createWindow();
  }
});
