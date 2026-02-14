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
import { logger } from './services/Logger';
import { configManager } from './services/ConfigManager';

export { logger, configManager };
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
import { AgentToolRegistry } from './services/AgentToolRegistry';
import { ResonantAgentService } from './services/ResonantAgentService';
import { WhisperService } from './services/WhisperService';
import { MomentaryContextService } from './services/MomentaryContextService';
import { workspaceService } from './services/WorkspaceService';
import { SoftwareFactoryService } from './services/SoftwareFactoryService';

export { workspaceService };

// --- Renderer communication helper ---
// Stored reference to the window factory; set during initializeServices.
let _getMainWindow: (() => Electron.BrowserWindow | null) | null = null;

/**
 * Send a message to the renderer process if the window is available.
 * Silently skips if the window is unavailable — this is expected during startup/shutdown.
 */
function sendToRenderer(channel: string, ...args: unknown[]): void {
    const w = _getMainWindow?.();
    if (w && !w.isDestroyed()) {
        w.webContents.send(channel, ...args);
    }
}

/**
 * Log via the Logger singleton AND forward to the renderer as a log-entry event
 * (replaces the dual Logger + LogManager pattern).
 */
function logToRenderer(
    level: 'info' | 'warn' | 'error' | 'debug',
    category: string,
    title: string,
    message: string,
): void {
    logger[level](category, title, message);
    sendToRenderer('log-entry', {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        level,
        category,
        title,
        message,
    });
}

// Instantiate core services
export const aiManager = new AIProviderManager();
export const personalityManager = new PersonalityManager(aiManager);
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

// Agent Tool Registry (centralized tool definitions)
export const agentToolRegistry = new AgentToolRegistry();
agentToolRegistry.registerCoreTools();

// Software Factory — core prompt chain integration (loads chain, compiles tools, registers in registry)
export const softwareFactoryService = new SoftwareFactoryService(agentToolRegistry, aiManager);

// Agent Task Runner
export const agentTaskRunner = new AgentTaskRunner(
    aiManager,
    personalityManager,
    conversationManager,
    alephNetClient,
    agentToolRegistry
);

// Inject AgentTaskRunner into DSNNode
dsnNode.setAgentTaskRunner(agentTaskRunner);

// Resonant Agents (consolidated agent system)
export const resonantAgentService = new ResonantAgentService(agentTaskRunner, agentToolRegistry);

// Whisper Speech-to-Text
export const whisperService = new WhisperService();

// Momentary Context Service — generates compressed situational summaries
export const momentaryContextService = new MomentaryContextService(aiManager);

// Wire up Personality Manager
personalityManager.setAlephNetClient(alephNetClient);
personalityManager.setConversationManager(conversationManager);
personalityManager.setSessionManager(sessionManager);
personalityManager.setDesktopLearner(desktopLearner);
personalityManager.setMomentaryContextService(momentaryContextService);

// Wire Momentary Context into DSNNode
dsnNode.setMomentaryContextService(momentaryContextService);

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
    // Store the window factory for the sendToRenderer helper
    _getMainWindow = getMainWindow;

    // Initialize production logger first
    if (logger) {
        await logger.initialize();
        logger.info('System', 'Starting', 'Initializing core services...');
    } else {
        console.error('CRITICAL: Logger is undefined during initialization');
    }

    // Initialize Workspace Service (loads persisted workspace path)
    logToRenderer('info', 'Workspace', 'Initializing', 'Loading workspace configuration...');
    await workspaceService.initialize();
    const wsPath = workspaceService.workspacePath;
    if (wsPath) {
        logToRenderer('info', 'Workspace', 'Ready', `Workspace: ${wsPath}`);
    } else {
        logToRenderer('info', 'Workspace', 'No Workspace', 'No workspace folder configured.');
    }

    // Forward workspace changes to renderer
    workspaceService.on('workspace:changed', ({ path: newPath }) => {
        sendToRenderer('workspace:changed', { path: newPath });
        logToRenderer('info', 'Workspace', 'Changed', `Workspace changed to: ${newPath || '(none)'}`);
    });

    // Initialize Secrets Manager
    logToRenderer('info', 'Security', 'Secrets Vault Initializing', 'Loading encrypted vault...');
    await secretsManager.initialize();
    
    // Forward audit events to logger + renderer
    secretsManager.on('secret-event', (event) => {
        const level = event.type.includes('error') ? 'warn' : 'debug';
        logToRenderer(level, 'Security', event.type, event.details || `${event.namespace || ''}/${event.key || ''}`);
    });
    logToRenderer('info', 'Security', 'Secrets Vault Ready', 'Encrypted secrets vault initialized.');

    // Initialize AI Manager
    logToRenderer('info', 'AI', 'AI Manager Initializing', 'Loading AI settings and providers...');
    await aiManager.initialize();
    logToRenderer('info', 'AI', 'AI Manager Ready', 'AI providers loaded successfully.');
    
    // Initialize Session Manager
    sessionManager.initialize();

    // Bind DSNNode events to IPC
    dsnNode.on('status', (status) => {
        sendToRenderer('network-update', { status });
        logToRenderer('info', 'Network', 'Status Changed', `DSN Node status: ${status}`);
    });
    dsnNode.on('heartbeat', (timestamp) => {
        sendToRenderer('network-update', { lastHeartbeat: timestamp });
    });
    
    // Forward agent responses to renderer
    dsnNode.on('agent-response', (message) => {
        sendToRenderer('message', message);
    });

    // Forward agent suggestion chips (arrives after the response, non-blocking)
    dsnNode.on('agent-suggestions', (data) => {
        sendToRenderer('agent-suggestions', data);
    });

    // Forward local inference requests
    dsnNode.on('request-local-inference', (data) => {
        sendToRenderer('request-local-inference', data);
    });
    
    // Agent Task Runner Events
    agentTaskRunner.on('taskUpdate', (event) => {
        sendToRenderer('agent:taskUpdate', event);
    });

    agentTaskRunner.on('taskMessage', (event) => {
        sendToRenderer('agent:taskMessage', event);
    });

    // Start DSN Node
    logToRenderer('info', 'Network', 'DSN Node Starting', 'Connecting to mesh network...');
    await dsnNode.start();
    logToRenderer('info', 'Network', 'DSN Node Online', 'Successfully connected to mesh network.');

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
        
        logToRenderer('info', 'Services', 'ServiceRegistry', 'Initialized with Wallet support.');
    } else {
        logToRenderer('error', 'Services', 'Initialization Failed', 'No identity found. Cannot initialize ServiceRegistry/Wallet.');
    }
    
    // Initialize Plugin Manager
    if (services.pluginManager) {
        logToRenderer('info', 'Plugins', 'Plugin Manager Initializing', 'Scanning for plugins...');
        await services.pluginManager.initialize();
        logToRenderer('info', 'Plugins', 'Plugin Manager Ready', `Loaded ${services.pluginManager.getPlugins().length} plugins.`);
    }

    // Inject Gun.js bridge
    memorySecurityService.setBridge(dsnNode.getBridge());
    signedEnvelopeService.setBridge(dsnNode.getBridge());

    // Authenticate Gun User
    if (gunIdentity && gunIdentity.sea) {
        try {
            logToRenderer('info', 'System', 'GunDB Auth', 'Authenticating with local graph...');
            await dsnNode.getBridge().authenticate(gunIdentity.sea);
            logToRenderer('info', 'System', 'GunDB Auth', 'Authenticated with local graph.');
        } catch (err: any) {
            logToRenderer('error', 'System', 'GunDB Auth Failed', err.message || String(err));
        }
    } else {
        logToRenderer('warn', 'System', 'GunDB Auth', 'No SEA keys found. Conversations will not be encrypted/persisted correctly.');
    }

    // Register AlephNet IPC handlers
    logToRenderer('info', 'AlephNet', 'Registering IPC', 'Wiring AlephNet IPC channels...');
    registerAlephNetIPC(alephNetClient, getMainWindow);

    // Forward AlephNet connection status events to renderer
    alephNetClient.on('aleph:connectionStatus', (statusData: any) => {
        sendToRenderer('alephnet-status', statusData);
        logToRenderer('info', 'AlephNet', 'Connection Status', `AlephNet status: ${statusData.status}${statusData.error ? ` - ${statusData.error}` : ''}`);
    });

    // Connect to AlephNet and push full status to renderer
    const connectResult = await alephNetClient.connect();
    if (connectResult.connected) {
        const fullStatus = await alephNetClient.getStatus();
        sendToRenderer('network-update', {
            status: fullStatus.status,
            nodeId: fullStatus.id,
            peers: fullStatus.peers,
            alephnetConnected: true,
            tier: fullStatus.tier,
            version: fullStatus.version,
            connectedAt: fullStatus.connectedAt,
            uptime: fullStatus.uptime,
        });
        logToRenderer('info', 'AlephNet', 'Connected', `Connected as ${fullStatus.id}, tier: ${fullStatus.tier}`);
    } else {
        sendToRenderer('network-update', {
            status: 'ERROR',
            alephnetConnected: false,
            error: connectResult.error || 'Unknown connection error',
        });
        logToRenderer('error', 'AlephNet', 'Connection Failed', connectResult.error || 'Unknown error');
    }
    logToRenderer('info', 'AlephNet', 'IPC Ready', 'All AlephNet IPC channels registered.');

    // Initialize Desktop Learner (after AlephNet is connected)
    logToRenderer('info', 'DesktopLearner', 'Initializing', 'Starting accessibility learner...');
    await desktopLearner.initialize();

    // Initialize Task Scheduler
    logToRenderer('info', 'TaskScheduler', 'Initializing', 'Loading scheduled tasks...');
    await taskScheduler.initialize();
    
    taskScheduler.on('task:executed', (result) => {
        sendToRenderer('aleph:taskExecution', result);
    });
    taskScheduler.on('task:updated', (task) => {
        sendToRenderer('aleph:taskStatusChange', { taskId: task.id, status: task.status });
    });
    logToRenderer('info', 'TaskScheduler', 'Ready', 'Task scheduler initialized.');

    // Initialize Whisper speech-to-text
    logToRenderer('info', 'Whisper', 'Initializing', 'Setting up local speech-to-text...');
    await whisperService.init();
    if (whisperService.isReady()) {
        logToRenderer('info', 'Whisper', 'Ready', 'Local speech-to-text available.');
    } else {
        logToRenderer('warn', 'Whisper', 'Not Available', 'Whisper binary or model not found. Speech-to-text disabled.');
    }

    // Initialize Software Factory (loads chain + compiles tools into registry)
    logToRenderer('info', 'SoftwareFactory', 'Initializing', 'Loading prompt chain and compiling tools...');
    await softwareFactoryService.initialize();
    if (softwareFactoryService.isReady()) {
        logToRenderer('info', 'SoftwareFactory', 'Ready', `Loaded ${softwareFactoryService.getPromptNames().length} prompts, tools registered in AgentToolRegistry.`);
    } else {
        logToRenderer('warn', 'SoftwareFactory', 'Not Available', 'Software Factory chain not loaded. Agent will use basic mode.');
    }

    // Initialize Resonant Agent Service
    logToRenderer('info', 'ResonantAgents', 'Initializing', 'Loading agent definitions...');
    await resonantAgentService.initialize();
    logToRenderer('info', 'ResonantAgents', 'Ready', `Loaded ${(await resonantAgentService.listAgents()).length} agents.`);

    // Forward ResonantAgentService events to renderer
    resonantAgentService.on('agentCreated', (agent) => {
        sendToRenderer('resonant:agentChanged', { type: 'created', agent });
    });
    resonantAgentService.on('agentUpdated', (agent) => {
        sendToRenderer('resonant:agentChanged', { type: 'updated', agent });
    });
    resonantAgentService.on('agentDeleted', (agentId) => {
        sendToRenderer('resonant:agentChanged', { type: 'deleted', agentId });
    });
    resonantAgentService.on('agentSummoned', (agent) => {
        sendToRenderer('resonant:agentChanged', { type: 'summoned', agent });
    });
    resonantAgentService.on('agentDismissed', (agentId) => {
        sendToRenderer('resonant:agentChanged', { type: 'dismissed', agentId });
    });
    resonantAgentService.on('agentBusy', (agent) => {
        sendToRenderer('resonant:agentChanged', { type: 'busy', agent });
    });
    resonantAgentService.on('agentTaskCompleted', (data) => {
        sendToRenderer('resonant:agentChanged', { type: 'taskCompleted', ...data });
    });
}
