import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { DSNNode } from './services/DSNNode';
import { AIProviderManager } from './services/AIProviderManager';
import { PersonalityManager } from './services/PersonalityManager';
import { IdentityManager } from './services/IdentityManager';
import { PluginManager } from './services/PluginManager';
import { SessionManager } from './services/SessionManager';
import { ServiceRegistry } from './services/ServiceRegistry';
import { ServiceClient } from './services/ServiceClient';
import { SecretsManager } from './services/SecretsManager';
import { logManager } from './services/LogManager';
import { logger } from './services/Logger';
import { configManager } from './services/ConfigManager';
import { AlephNetClient } from './services/AlephNetClient';
import { registerAlephNetIPC } from './services/AlephNetIPC';
import { ConversationManager } from './services/ConversationManager';
import { TaskScheduler } from './services/TaskScheduler';
import { RISAService } from './services/RISAService';

import { AlephNetTrustAdapter } from './services/AlephNetTrustAdapter';
import { SignedEnvelopeService } from './services/SignedEnvelopeService';
import { TrustEvaluator } from './services/TrustEvaluator';
import { TrustGate } from './services/TrustGate';
import { MemorySecurityService } from './services/MemorySecurityService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Initialize Services
const aiManager = new AIProviderManager();
const personalityManager = new PersonalityManager(aiManager);
const dsnNode = new DSNNode(aiManager, personalityManager);
const identityManager = new IdentityManager(); // Shared access to identity file
const alephNetClient = new AlephNetClient(dsnNode.getBridge(), aiManager, identityManager, dsnNode.getDomainManager());

// Trust & Provenance Services
const alephNetTrustAdapter = new AlephNetTrustAdapter(alephNetClient);
const signedEnvelopeService = new SignedEnvelopeService(identityManager);
const trustEvaluator = new TrustEvaluator(
    signedEnvelopeService,
    identityManager,
    alephNetTrustAdapter,
    alephNetTrustAdapter,
    dsnNode.getDomainManager()
);
const trustGate = new TrustGate(trustEvaluator);

// Memory Security Service (requires identity, envelope service, trust evaluator, and gate)
const memorySecurityService = new MemorySecurityService(
    identityManager,
    signedEnvelopeService,
    trustEvaluator,
    trustGate
);

// Inject MemorySecurityService into AlephNetClient for signed fragment operations
alephNetClient.setMemorySecurityService(memorySecurityService);

// Inject TrustGate and TrustEvaluator for Phase 3 capability checking
alephNetClient.setTrustGate(trustGate);
alephNetClient.setTrustEvaluator(trustEvaluator);

// NOTE: MemorySecurityService.setBridge() is deferred to app.on('ready') after dsnNode.start()
// because the bridge is not initialized until Gun.js is connected.

// Service Layer (Initialized after DSNNode creation)
const serviceRegistry = new ServiceRegistry(dsnNode.getBridge());
const serviceClient = new ServiceClient(serviceRegistry, identityManager, dsnNode.getBridge());

const pluginManager = new PluginManager(dsnNode, aiManager, signedEnvelopeService, trustEvaluator, trustGate, serviceRegistry);
const sessionManager = new SessionManager();
const secretsManager = new SecretsManager();
const conversationManager = new ConversationManager(dsnNode.getBridge(), identityManager);
const taskScheduler = new TaskScheduler(dsnNode.getBridge(), identityManager, aiManager, conversationManager, alephNetClient);
const risaService = new RISAService();

// Wire up Personality Manager dependencies
personalityManager.setAlephNetClient(alephNetClient);
personalityManager.setConversationManager(conversationManager);

// Wire up memory field creation for conversations
// This allows each new conversation to automatically get a memory field
conversationManager.setMemoryFieldCreator(async (options) => {
    return alephNetClient.memoryCreate({
        name: options.name,
        scope: options.scope,
        description: options.description,
        visibility: options.visibility
    });
});

// Log startup
logManager.info('System', 'Application Starting', 'Initializing core services...');

// AlephNet Client — wraps all AlephNet Node functionality
// (Already initialized above)

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }
};

app.on('ready', async () => {
    // Initialize production logger first
    await logger.initialize();
    logger.info('System', 'Starting', 'Initializing core services...');
    
    // Initialize Secrets Manager (must be early — other services may depend on it)
    logManager.info('Security', 'Secrets Vault Initializing', 'Loading encrypted vault...');
    logger.info('Security', 'Secrets Vault', 'Loading encrypted vault...');
    await secretsManager.initialize();
    // Forward audit events to log manager
    secretsManager.on('secret-event', (event) => {
        const level = event.type.includes('error') ? 'warn' : 'debug';
        logManager.log(level, 'Security', event.type, event.details || `${event.namespace || ''}/${event.key || ''}`);
    });
    logManager.info('Security', 'Secrets Vault Ready', 'Encrypted secrets vault initialized.');

    // Initialize AI Manager
    logManager.info('AI', 'AI Manager Initializing', 'Loading AI settings and providers...');
    await aiManager.initialize();
    logManager.info('AI', 'AI Manager Ready', 'AI providers loaded successfully.');
    
    // Initialize Plugin Manager
    logManager.info('Plugins', 'Plugin Manager Initializing', 'Scanning for plugins...');
    await pluginManager.initialize();
    logManager.info('Plugins', 'Plugin Manager Ready', `Loaded ${pluginManager.getPlugins().length} plugins.`);

    // Wire plugin secrets to the vault
    pluginManager.setSecretsProvider(secretsManager);

    // Initialize Session Manager (Registers global shortcuts)
    sessionManager.initialize();
    
    // Bind DSNNode events to IPC
    dsnNode.on('status', (status) => {
        mainWindow?.webContents.send('network-update', { status });
        logManager.info('Network', 'Status Changed', `DSN Node status: ${status}`);
    });
    dsnNode.on('heartbeat', (timestamp) => {
        mainWindow?.webContents.send('network-update', { lastHeartbeat: timestamp });
    });
    
    // Forward agent responses to renderer
    dsnNode.on('agent-response', (message) => {
        mainWindow?.webContents.send('message', message);
    });

    // Forward local inference requests to renderer (WebLLM)
    dsnNode.on('request-local-inference', (data) => {
        mainWindow?.webContents.send('request-local-inference', data);
    });
    
    // Start DSN Node (connects to mesh)
    logManager.info('Network', 'DSN Node Starting', 'Connecting to mesh network...');
    await dsnNode.start();
    logManager.info('Network', 'DSN Node Online', 'Successfully connected to mesh network.');
    
    // Inject Gun.js bridge into MemorySecurityService for persistent nonce/epoch tracking (Phase 4)
    // Must happen AFTER dsnNode.start() so the bridge has a live Gun.js instance
    memorySecurityService.setBridge(dsnNode.getBridge());
    
    // Inject Gun.js bridge into SignedEnvelopeService for SEA verification
    signedEnvelopeService.setBridge(dsnNode.getBridge());

    // Authenticate Gun User (Must be done AFTER DSNNode initializes the bridge with Gun instance)
    const identity = await identityManager.getIdentity();
    if (identity && identity.sea) {
        try {
            logManager.info('System', 'GunDB Auth', 'Authenticating with local graph...');
            await dsnNode.getBridge().authenticate(identity.sea);
            logManager.info('System', 'GunDB Auth', 'Authenticated with local graph.');
        } catch (err: any) {
            logManager.error('System', 'GunDB Auth Failed', err.message || String(err));
        }
    } else {
        logManager.warn('System', 'GunDB Auth', 'No SEA keys found. Conversations will not be encrypted/persisted correctly.');
    }

    // Register AlephNet IPC handlers (all ~84 channels)
    logManager.info('AlephNet', 'Registering IPC', 'Wiring AlephNet IPC channels...');
    registerAlephNetIPC(alephNetClient, () => mainWindow);
    await alephNetClient.connect();
    logManager.info('AlephNet', 'IPC Ready', 'All AlephNet IPC channels registered.');

    // Initialize Task Scheduler
    logManager.info('TaskScheduler', 'Initializing', 'Loading scheduled tasks...');
    await taskScheduler.initialize();
    
    // Forward task events to renderer
    taskScheduler.on('task:executed', (result) => {
        mainWindow?.webContents.send('aleph:taskExecution', result);
    });
    taskScheduler.on('task:updated', (task) => {
        mainWindow?.webContents.send('aleph:taskStatusChange', { taskId: task.id, status: task.status });
    });
    logManager.info('TaskScheduler', 'Ready', 'Task scheduler initialized.');
    
    // Initialize RISA Service
    logManager.info('RISA', 'Initializing', 'Starting Resonant Instruction Set Architecture...');
    await risaService.initialize();
    
    // Forward RISA events
    risaService.on('lifecycle.task.created', (data) => mainWindow?.webContents.send('risa:event', { type: 'lifecycle.task.created', payload: data }));
    risaService.on('lifecycle.task.completed', (data) => mainWindow?.webContents.send('risa:event', { type: 'lifecycle.task.completed', payload: data }));
    // Forward all RISA events? Or specific ones? For now, let's just forward specific ones to avoid noise
    // Actually, let's forward all events that are emitted via emitEvent
    // But RISAService emits specific events on its EventEmitter
    
    logManager.info('RISA', 'Ready', 'RISA Service initialized.');

    createWindow();
    
    // Send initial AlephNet status to renderer once window is ready
    mainWindow?.webContents.once('did-finish-load', async () => {
        try {
            const status = await alephNetClient.getStatus();
            mainWindow?.webContents.send('network-update', {
                nodeId: status.id,
                status: status.status,
                peers: status.peers,
                latency: 0
            });
            logManager.info('AlephNet', 'Status Sent', `Node ${status.id.substring(0, 16)} is ${status.status} with ${status.peers} peers`);
        } catch (err) {
            console.error('Failed to send initial AlephNet status:', err);
        }
    });
    logManager.info('System', 'Application Ready', 'Main window created. System fully initialized.');
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// AI & Tools
ipcMain.handle('approveTool', async (_event, toolId) => {
    console.log(`Tool approval requested for: ${toolId}`);
    return true; 
});

ipcMain.handle('summonAgent', async (_event, agentId) => {
    console.log(`Agent summoned: ${agentId}`);
});

ipcMain.handle('stakeTokens', async (_event, _amount) => {
    // TODO: Implement staking in DSNNode
    // return await dsnNode.stakeTokens(amount);
    return true;
});

ipcMain.handle('getAISettings', async () => aiManager.getSettings());
ipcMain.handle('saveAISettings', async (_, settings) => aiManager.saveSettings(settings));
ipcMain.handle('testAIProvider', async (_, config) => aiManager.testProvider(config));
ipcMain.handle('fetchProviderModels', async (_, config, forceRefresh) => aiManager.fetchProviderModels(config, forceRefresh));
ipcMain.handle('submitLocalAIResponse', async (_, content) => {
    dsnNode.handleLocalResponse(content);
});

// Identity IPC
ipcMain.handle('checkIdentity', async () => identityManager.checkIdentity());
ipcMain.handle('createIdentity', async () => identityManager.createIdentity());
ipcMain.handle('importIdentity', async (_, json) => identityManager.importIdentity(json));

ipcMain.on('message', (_event, payload) => {
    dsnNode.processMessage(payload.content, payload);
});

// Session IPC
ipcMain.handle('session:start', async () => sessionManager.startSession());
ipcMain.handle('session:stop', async () => sessionManager.stopSession());
ipcMain.handle('session:snapshot', async () => sessionManager.getSnapshot());
ipcMain.handle('session:act', async (_, action) => sessionManager.executeAction(action));
ipcMain.handle('session:state', async () => sessionManager.getState());

// Service IPC
ipcMain.handle('service:register', async (_, def) => serviceRegistry.register(def));
ipcMain.handle('service:search', async (_, query) => serviceRegistry.search(query));
ipcMain.handle('service:call', async (_, { serviceId, endpoint, params }) => serviceClient.call(serviceId, endpoint, params));

// RISA IPC
ipcMain.handle('risa:installScript', async (_, script) => risaService.installScript(script));
ipcMain.handle('risa:updateScript', async (_, { id, updates }) => risaService.updateScript(id, updates));
ipcMain.handle('risa:uninstallScript', async (_, id) => risaService.uninstallScript(id));
ipcMain.handle('risa:getScripts', async () => risaService.getScripts());
ipcMain.handle('risa:startTask', async (_, { scriptId, triggerEvent }) => risaService.startTask(scriptId, triggerEvent));
ipcMain.handle('risa:stopTask', async (_, taskId) => risaService.stopTask(taskId));
ipcMain.handle('risa:getTasks', async () => risaService.getTasks());

// Logging IPC
ipcMain.handle('logs:get', async (_, limit) => logManager.getLogs(limit));
ipcMain.handle('logs:getByCategory', async (_, { category, limit }) => logManager.getLogsByCategory(category, limit));
ipcMain.handle('logs:clear', async () => logManager.clear());

// Secrets IPC
ipcMain.handle('secrets:set', async (_, options) => secretsManager.setSecret(options));
ipcMain.handle('secrets:get', async (_, options) => secretsManager.getSecret(options));
ipcMain.handle('secrets:delete', async (_, options) => secretsManager.deleteSecret(options));
ipcMain.handle('secrets:has', async (_, options) => secretsManager.hasSecret(options));
ipcMain.handle('secrets:list', async (_, options) => secretsManager.listSecrets(options));
ipcMain.handle('secrets:clearNamespace', async (_, namespace) => secretsManager.clearNamespace(namespace));
ipcMain.handle('secrets:status', async () => secretsManager.getStatus());
ipcMain.handle('secrets:lock', async () => secretsManager.lock());
ipcMain.handle('secrets:unlock', async () => secretsManager.unlock());

// Plugin Storage IPC (forwarded to PluginManager)
ipcMain.handle('plugin:storage:get', async (_, { pluginId, key }) => {
    const plugin = pluginManager.getPlugins().find(p => p.manifest.id === pluginId);
    return plugin?.context.storage.get(key);
});
ipcMain.handle('plugin:storage:set', async (_, { pluginId, key, value }) => {
    const plugin = pluginManager.getPlugins().find(p => p.manifest.id === pluginId);
    return plugin?.context.storage.set(key, value);
});
ipcMain.handle('plugin:storage:delete', async (_, { pluginId, key }) => {
    const plugin = pluginManager.getPlugins().find(p => p.manifest.id === pluginId);
    return plugin?.context.storage.delete(key);
});

// Trust & Provenance IPC
ipcMain.handle('trust:evaluate', async (_, { envelope }) => trustEvaluator.evaluate(envelope));
ipcMain.handle('trust:check-capability', async (_, { envelope, capability }) => trustGate.checkCapability(envelope, capability));
ipcMain.handle('trust:get-overrides', async () => trustEvaluator.getOverrides());
ipcMain.handle('trust:set-override', async (_, override) => trustEvaluator.setOverride(override));

// AI Conversation IPC
ipcMain.handle('ai:conversation:create', (_, { title }) => conversationManager.createConversation(title));
ipcMain.handle('ai:conversation:list', () => conversationManager.listConversations());
ipcMain.handle('ai:conversation:get', (_, { id }) => conversationManager.getConversation(id));
ipcMain.handle('ai:conversation:delete', (_, { id }) => conversationManager.deleteConversation(id));
ipcMain.handle('ai:conversation:addMessage', (_, { conversationId, message }) => conversationManager.addMessage(conversationId, message));
ipcMain.handle('ai:conversation:updateMessage', (_, { conversationId, messageId, content }) => conversationManager.updateMessage(conversationId, messageId, content));
ipcMain.handle('ai:conversation:deleteMessage', (_, { conversationId, messageId }) => conversationManager.deleteMessage(conversationId, messageId));
ipcMain.handle('ai:conversation:updateTitle', (_, { id, title }) => conversationManager.updateTitle(id, title));

// Personality IPC
ipcMain.handle('personality:set-core', async (_, trait) => personalityManager.addCoreTrait(trait));
ipcMain.handle('personality:set-lock', async (_, locked) => personalityManager.setCorePersonalityLock(locked));

// Scheduled Tasks IPC
ipcMain.handle('task:create', (_, options) => taskScheduler.createTask(options));
ipcMain.handle('task:list', (_, options) => taskScheduler.listTasks(options));
ipcMain.handle('task:get', (_, { taskId }) => taskScheduler.getTask(taskId));
ipcMain.handle('task:update', (_, { taskId, updates }) => taskScheduler.updateTask(taskId, updates));
ipcMain.handle('task:delete', (_, { taskId }) => taskScheduler.deleteTask(taskId));
ipcMain.handle('task:pause', (_, { taskId }) => taskScheduler.pauseTask(taskId));
ipcMain.handle('task:resume', (_, { taskId }) => taskScheduler.resumeTask(taskId));
ipcMain.handle('task:execute', (_, { taskId, inputValues }) => taskScheduler.executeTask(taskId, inputValues));
ipcMain.handle('task:getHistory', (_, { taskId, limit }) => taskScheduler.getTaskHistory(taskId, limit));
ipcMain.handle('task:parse', (_, request) => taskScheduler.parseTaskRequest(request));

// ClawHub Skills IPC
const CLAWHUB_API_URL = 'https://clawhub.ai/api/v1/skills';

ipcMain.handle('getOpenClawSkills', async () => {
    try {
        // Fetch real skills from ClawHub API
        const response = await fetch(CLAWHUB_API_URL);
        if (!response.ok) {
            throw new Error(`ClawHub API error: ${response.status}`);
        }
        
        const data = await response.json() as { items: Array<{
            slug: string;
            displayName: string;
            summary: string;
            tags: { latest?: string };
            stats: { downloads: number; stars: number };
            latestVersion?: { version: string };
        }> };
        
        // Transform ClawHub response to our SkillManifest format
        return data.items.map((item) => ({
            id: item.slug,
            version: item.latestVersion?.version || item.tags?.latest || '1.0.0',
            name: item.displayName,
            description: item.summary || '',
            author: 'ClawHub',
            downloadUrl: `https://clawhub.ai/${item.slug}`,
            semanticDomain: 'general',
            downloads: item.stats?.downloads || 0,
            stars: item.stats?.stars || 0
        }));
    } catch (error) {
        console.error('Failed to fetch ClawHub skills:', error);
        // Return empty array on error
        return [];
    }
});

// File Dialog IPC (used by Vertex AI auth JSON selection)
ipcMain.handle('dialog:openFile', async (_, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
        title: options?.title || 'Select File',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

// Config IPC
ipcMain.handle('config:get', async () => configManager.getConfig());
ipcMain.handle('config:getNetwork', async () => configManager.getNetworkConfig());
ipcMain.handle('config:updateNetwork', async (_, updates) => configManager.updateNetworkConfig(updates));
ipcMain.handle('config:addPeer', async (_, peerUrl) => configManager.addPeer(peerUrl));
ipcMain.handle('config:removePeer', async (_, peerUrl) => configManager.removePeer(peerUrl));
ipcMain.handle('config:getLogging', async () => configManager.getLoggingConfig());
ipcMain.handle('config:updateLogging', async (_, updates) => configManager.updateLoggingConfig(updates));

// Production Logger IPC
ipcMain.handle('logger:get', async (_, limit) => logger.getLogs(limit));
ipcMain.handle('logger:getByCategory', async (_, { category, limit }) => logger.getLogsByCategory(category, limit));
ipcMain.handle('logger:clear', async () => logger.clear());
