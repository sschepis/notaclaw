// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { app as _app } from 'electron';
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

export { logManager, logger, configManager };
import { AlephNetClient } from './services/AlephNetClient';
import { registerAlephNetIPC } from './services/AlephNetIPC';
import { ConversationManager } from './services/ConversationManager';
import { MemoryPromotionService } from './services/MemoryPromotionService';
import { TaskScheduler } from './services/TaskScheduler';
import { RISAService } from './services/RISAService';
import { AlephNetTrustAdapter } from './services/AlephNetTrustAdapter';
import { SignedEnvelopeService } from './services/SignedEnvelopeService';
import { TrustEvaluator } from './services/TrustEvaluator';
import { TrustGate } from './services/TrustGate';
import { MemorySecurityService } from './services/MemorySecurityService';
import { AlephWallet } from '@sschepis/alephnet-node';
import { MarketplaceService } from './services/MarketplaceService';
import { getOpenClawGateway } from './services/OpenClawGatewayService';
import { DesktopAccessibilityLearner } from './services/desktop-learner';
import { AgentTaskRunner } from './services/agent-runner';
import { TeamManager } from './services/TeamManager';
import { AgentToolRegistry } from './services/AgentToolRegistry';
import { ResonantAgentService } from './services/ResonantAgentService';

// Instantiate core services
export const aiManager = new AIProviderManager();
export const personalityManager = new PersonalityManager(aiManager);
export const teamManager = new TeamManager();
export const dsnNode = new DSNNode(aiManager, personalityManager);
export const identityManager = new IdentityManager();
export const alephNetClient = new AlephNetClient(dsnNode.getBridge(), aiManager, identityManager, dsnNode.getDomainManager());

// Marketplace
export const marketplaceService = new MarketplaceService(dsnNode);

// OpenClaw Gateway
export const openClawGateway = getOpenClawGateway();

// Trust & Provenance
export const alephNetTrustAdapter = new AlephNetTrustAdapter(alephNetClient);
export const signedEnvelopeService = new SignedEnvelopeService(identityManager);
export const trustEvaluator = new TrustEvaluator(
    signedEnvelopeService,
    identityManager,
    alephNetTrustAdapter,
    alephNetTrustAdapter,
    dsnNode.getDomainManager()
);
export const trustGate = new TrustGate(trustEvaluator);

// Memory Security
export const memorySecurityService = new MemorySecurityService(
    identityManager,
    signedEnvelopeService,
    trustEvaluator,
    trustGate
);

// Inject dependencies
alephNetClient.setMemorySecurityService(memorySecurityService);
alephNetClient.setTrustGate(trustGate);
alephNetClient.setTrustEvaluator(trustEvaluator);

// Other services
export const sessionManager = new SessionManager();
export const secretsManager = new SecretsManager();
export const conversationManager = new ConversationManager(dsnNode.getBridge(), identityManager);
export const memoryPromotionService = new MemoryPromotionService(alephNetClient);
export const taskScheduler = new TaskScheduler(dsnNode.getBridge(), identityManager, aiManager, conversationManager, alephNetClient);
export const risaService = new RISAService();
export const desktopLearner = new DesktopAccessibilityLearner(alephNetClient, aiManager, sessionManager);

// Agent Task Runner
export const agentTaskRunner = new AgentTaskRunner(
    aiManager,
    personalityManager,
    conversationManager,
    alephNetClient
);

// Inject AgentTaskRunner into DSNNode
dsnNode.setAgentTaskRunner(agentTaskRunner);

// Resonant Agents (consolidated agent system)
export const agentToolRegistry = new AgentToolRegistry();
agentToolRegistry.registerCoreTools();
agentTaskRunner.setToolRegistry(agentToolRegistry);
export const resonantAgentService = new ResonantAgentService(agentTaskRunner, agentToolRegistry);

// Wire up Personality Manager
personalityManager.setAlephNetClient(alephNetClient);
personalityManager.setConversationManager(conversationManager);
personalityManager.setSessionManager(sessionManager);
personalityManager.setDesktopLearner(desktopLearner);

conversationManager.setMemoryFieldCreator(async (options) => {
    return alephNetClient.memoryCreate({
        name: options.name,
        scope: options.scope,
        description: options.description,
        visibility: options.visibility
    });
});

conversationManager.setMessageSaver(async (conversationId, memoryFieldId, message) => {
    await alephNetClient.memoryStore({
        fieldId: memoryFieldId,
        content: message.content,
        metadata: {
            role: message.role,
            messageId: message.id,
            sequence: message.sequence,
            timestamp: message.timestamp,
            conversationId: conversationId,
            type: 'conversation_message'
        }
    });
});

// Mutable services container
export const services = {
    serviceRegistry: undefined as ServiceRegistry | undefined,
    serviceClient: undefined as ServiceClient | undefined,
    pluginManager: undefined as PluginManager | undefined
};

export async function initializeServices(getMainWindow: () => Electron.BrowserWindow | null) {
    // Initialize production logger first
    if (logger) {
        await logger.initialize();
        logger.info('System', 'Starting', 'Initializing core services...');
    } else {
        console.error('CRITICAL: Logger is undefined during initialization');
    }
    
    // Initialize Secrets Manager
    logManager.info('Security', 'Secrets Vault Initializing', 'Loading encrypted vault...');
    if (logger) logger.info('Security', 'Secrets Vault', 'Loading encrypted vault...');
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
    
    // Initialize Session Manager
    sessionManager.initialize();

    // Bind DSNNode events to IPC
    dsnNode.on('status', (status) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('network-update', { status });
        }
        logManager.info('Network', 'Status Changed', `DSN Node status: ${status}`);
    });
    dsnNode.on('heartbeat', (timestamp) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('network-update', { lastHeartbeat: timestamp });
        }
    });
    
    // Forward agent responses to renderer
    dsnNode.on('agent-response', (message) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('message', message);
        }
    });

    // Forward local inference requests
    dsnNode.on('request-local-inference', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('request-local-inference', data);
        }
    });
    
    // Agent Task Runner Events
    agentTaskRunner.on('taskUpdate', (event) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('agent:taskUpdate', event);
        }
    });

    agentTaskRunner.on('taskMessage', (event) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('agent:taskMessage', event);
        }
    });

    // Start DSN Node
    logManager.info('Network', 'DSN Node Starting', 'Connecting to mesh network...');
    await dsnNode.start();
    logManager.info('Network', 'DSN Node Online', 'Successfully connected to mesh network.');

    // Initialize Wallet & Service Registry
    const gunIdentity = await identityManager.getIdentity();
    if (gunIdentity) {
        // @ts-ignore
        const wallet = new AlephWallet(gunIdentity as any, dsnNode.getBridge().getGun());
        // @ts-ignore
        const nodeId = (dsnNode.getConfig() as any)?.nodeId || gunIdentity.fingerprint;
        
        services.serviceRegistry = new ServiceRegistry(dsnNode.getBridge().getGun(), wallet, nodeId);
        services.serviceClient = new ServiceClient(services.serviceRegistry, identityManager, dsnNode.getBridge());
        
        personalityManager.setServiceRegistry(services.serviceRegistry);

        services.pluginManager = new PluginManager(dsnNode, aiManager, signedEnvelopeService, trustEvaluator, trustGate, services.serviceRegistry, personalityManager);
        services.pluginManager.setSecretsProvider(secretsManager);
        
        logManager.info('Services', 'ServiceRegistry', 'Initialized with Wallet support.');
    } else {
        logManager.error('Services', 'Initialization Failed', 'No identity found. Cannot initialize ServiceRegistry/Wallet.');
    }
    
    // Initialize Plugin Manager
    if (services.pluginManager) {
        logManager.info('Plugins', 'Plugin Manager Initializing', 'Scanning for plugins...');
        await services.pluginManager.initialize();
        logManager.info('Plugins', 'Plugin Manager Ready', `Loaded ${services.pluginManager.getPlugins().length} plugins.`);
    }

    // Inject Gun.js bridge
    memorySecurityService.setBridge(dsnNode.getBridge());
    signedEnvelopeService.setBridge(dsnNode.getBridge());

    // Authenticate Gun User
    if (gunIdentity && gunIdentity.sea) {
        try {
            logManager.info('System', 'GunDB Auth', 'Authenticating with local graph...');
            await dsnNode.getBridge().authenticate(gunIdentity.sea);
            logManager.info('System', 'GunDB Auth', 'Authenticated with local graph.');
        } catch (err: any) {
            logManager.error('System', 'GunDB Auth Failed', err.message || String(err));
        }
    } else {
        logManager.warn('System', 'GunDB Auth', 'No SEA keys found. Conversations will not be encrypted/persisted correctly.');
    }

    // Register AlephNet IPC handlers
    logManager.info('AlephNet', 'Registering IPC', 'Wiring AlephNet IPC channels...');
    registerAlephNetIPC(alephNetClient, getMainWindow);

    // Forward AlephNet connection status events to renderer
    alephNetClient.on('aleph:connectionStatus', (statusData: any) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('alephnet-status', statusData);
        }
        logManager.info('AlephNet', 'Connection Status', `AlephNet status: ${statusData.status}${statusData.error ? ` - ${statusData.error}` : ''}`);
    });

    // Connect to AlephNet and push full status to renderer
    const connectResult = await alephNetClient.connect();
    if (connectResult.connected) {
        const fullStatus = await alephNetClient.getStatus();
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('network-update', {
                status: fullStatus.status,
                nodeId: fullStatus.id,
                peers: fullStatus.peers,
                alephnetConnected: true,
                tier: fullStatus.tier,
                version: fullStatus.version,
                connectedAt: fullStatus.connectedAt,
                uptime: fullStatus.uptime,
            });
        }
        logManager.info('AlephNet', 'Connected', `Connected as ${fullStatus.id}, tier: ${fullStatus.tier}`);
    } else {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('network-update', {
                status: 'ERROR',
                alephnetConnected: false,
                error: connectResult.error || 'Unknown connection error',
            });
        }
        logManager.error('AlephNet', 'Connection Failed', connectResult.error || 'Unknown error');
    }
    if (logger) logger.info('AlephNet', 'IPC Ready', 'All AlephNet IPC channels registered.');
    logManager.info('AlephNet', 'IPC Ready', 'All AlephNet IPC channels registered.');

    // Initialize Desktop Learner (after AlephNet is connected)
    logManager.info('DesktopLearner', 'Initializing', 'Starting accessibility learner...');
    await desktopLearner.initialize();

    // Initialize Task Scheduler
    logManager.info('TaskScheduler', 'Initializing', 'Loading scheduled tasks...');
    await taskScheduler.initialize();
    
    taskScheduler.on('task:executed', (result) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('aleph:taskExecution', result);
        }
    });
    taskScheduler.on('task:updated', (task) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('aleph:taskStatusChange', { taskId: task.id, status: task.status });
        }
    });
    logManager.info('TaskScheduler', 'Ready', 'Task scheduler initialized.');

    // Initialize Resonant Agent Service
    logManager.info('ResonantAgents', 'Initializing', 'Loading agent definitions...');
    await resonantAgentService.initialize();
    logManager.info('ResonantAgents', 'Ready', `Loaded ${(await resonantAgentService.listAgents()).length} agents.`);

    // Forward ResonantAgentService events to renderer
    resonantAgentService.on('agentCreated', (agent) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'created', agent });
        }
    });
    resonantAgentService.on('agentUpdated', (agent) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'updated', agent });
        }
    });
    resonantAgentService.on('agentDeleted', (agentId) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'deleted', agentId });
        }
    });
    resonantAgentService.on('agentSummoned', (agent) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'summoned', agent });
        }
    });
    resonantAgentService.on('agentDismissed', (agentId) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'dismissed', agentId });
        }
    });
    resonantAgentService.on('agentBusy', (agent) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'busy', agent });
        }
    });
    resonantAgentService.on('agentTaskCompleted', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('resonant:agentChanged', { type: 'taskCompleted', ...data });
        }
    });
}
