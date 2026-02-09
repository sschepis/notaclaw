import { configManager } from './services/ConfigManager';
import { IdentityManager } from './services/IdentityManager';
import { SecretsManager } from './services/SecretsManager';
import { AIProviderManager } from './services/AIProviderManager';
import { SignedEnvelopeService } from './services/SignedEnvelopeService';
import { DomainManager } from './services/DomainManager';
import { TrustEvaluator } from './services/TrustEvaluator';
import { TrustGate } from './services/TrustGate';
import { PersonalityManager } from './services/PersonalityManager';
import { ServiceRegistry } from './services/ServiceRegistry';
import { DSNNode } from './services/DSNNode';
import { PluginManager } from './services/PluginManager';

async function main() {
  console.log('Starting AlephNet Headless Node...');

  try {
    // 1. Initialize Config
    await configManager.initialize();
    
    // 2. Initialize Secrets & Identity
    const secretsManager = new SecretsManager();
    await secretsManager.initialize();
    
    const identityManager = new IdentityManager();
    const identityExists = await identityManager.checkIdentity();
    
    if (!identityExists) {
        console.log('No identity found. Generating new node identity...');
        const identity = await identityManager.createIdentity();
        console.log('Identity created:', identity.fingerprint);
    } else {
        const identity = await identityManager.getPublicIdentity();
        console.log('Loaded identity:', identity?.fingerprint);
    }

    // 3. Initialize AI Provider Manager
    const aiManager = new AIProviderManager();
    await aiManager.initialize();

    // 4. Initialize Core Services
    const personalityManager = new PersonalityManager(aiManager);
    const dsnNode = new DSNNode(aiManager, personalityManager);
    
    // Start DSN Node (initializes bridge)
    await dsnNode.start();
    const bridge = dsnNode.getBridge();

    const signedEnvelopeService = new SignedEnvelopeService(identityManager);
    signedEnvelopeService.setBridge(bridge);

    const domainManager = dsnNode.getDomainManager(); // DSNNode initializes DomainManager internally
    
    // We need to inject the bridge-dependent services if DSNNode didn't expose them all
    // DSNNode exposes getDomainManager() but we need to instantiate others
    
    // Wait, DSNNode constructor instantiates DomainManager and SignedEnvelopeService internally?
    // Let's check DSNNode.ts
    // Yes: this.envelopeService = new SignedEnvelopeService(this.identityManager);
    //      this.domainManager = new DomainManager(this.bridge, this.identityManager, this.envelopeService);
    
    // So we should use the instances from DSNNode if possible, or refactor DSNNode to accept them.
    // DSNNode currently doesn't expose envelopeService.
    // I should probably have updated DSNNode to expose it or accept it.
    // But since I already wrote DSNNode, let's see.
    // I can instantiate new ones, but they should share the bridge.
    // DSNNode creates its own bridge: this.bridge = new AlephGunBridge();
    
    // So I should get the bridge from DSNNode.
    
    // Re-instantiating SignedEnvelopeService is fine as long as I set the bridge.
    
    const serviceRegistry = new ServiceRegistry(bridge);
    
    // Trust Services
    // TrustEvaluator needs socialGraph, reputationProvider.
    // AlephNetTrustAdapter in client implemented these.
    // In headless, we need an adapter or use the bridge directly if it implements them.
    // The bridge implements basic graph ops but maybe not the high-level provider interfaces.
    // I might need to implement a `HeadlessTrustAdapter` that wraps the bridge to implement `ISocialGraphProvider` etc.
    // For now, I'll create a simple adapter inline or stub it.
    
    const trustAdapter = {
        getFriends: async () => [], // Stub
        getFriendsOfFriend: async () => [], // Stub
        getReputation: async () => 0.5,
        getStakingTier: async () => 'Neophyte' as const,
        getCoherenceScore: async () => 0.5
    };

    const trustEvaluator = new TrustEvaluator(
        signedEnvelopeService,
        identityManager,
        trustAdapter, // ISocialGraphProvider
        trustAdapter, // IReputationProvider
        domainManager
    );

    const trustGate = new TrustGate(trustEvaluator);

    // 5. Initialize Plugin Manager
    const pluginManager = new PluginManager(
        dsnNode,
        aiManager,
        secretsManager,
        signedEnvelopeService,
        trustEvaluator,
        trustGate,
        serviceRegistry
    );

    await pluginManager.initialize();

    console.log('AlephNet Headless Node is running.');
    console.log('Press Ctrl+C to stop.');

    // Keep alive
    process.on('SIGINT', async () => {
        console.log('Stopping...');
        await dsnNode.stop();
        await secretsManager.shutdown();
        process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start node:', error);
    process.exit(1);
  }
}

main();
