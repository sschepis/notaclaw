import { app, BrowserWindow } from 'electron';
import { webcrypto } from 'node:crypto';
import { initializeServices, memorySecurityService, taskScheduler, secretsManager } from './services-setup';
import { registerIPC } from './ipc-setup';
import { createWindow } from './window-setup';

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
