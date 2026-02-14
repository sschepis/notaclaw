import { configManager } from './services/ConfigManager';
import { IdentityManager } from './services/IdentityManager';
import { SecretsManager } from './services/SecretsManager';
import { AIProviderManager } from './services/AIProviderManager';
import { SignedEnvelopeService } from './services/SignedEnvelopeService';
import { TrustEvaluator } from './services/TrustEvaluator';
import { TrustGate } from './services/TrustGate';
import { PersonalityManager } from './services/PersonalityManager';
import { ServiceRegistry } from './services/ServiceRegistry';
import { DSNNode } from './services/DSNNode';
import { PluginManager } from './services/PluginManager';
import { HeadlessTrustAdapter } from './services/HeadlessTrustAdapter';

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

    // 4. Create shared services (single instances)
    const signedEnvelopeService = new SignedEnvelopeService(identityManager);
    const personalityManager = new PersonalityManager(aiManager);

    // 5. Initialize DSN Node with dependency injection (no duplicate services)
    const dsnNode = new DSNNode({
        identityManager,
        aiManager,
        personalityManager,
        signedEnvelopeService,
        // domainManager is created internally by DSNNode using the injected services
    });
    
    // Start DSN Node (initializes bridge, Gun, DomainManager)
    await dsnNode.start();
    const bridge = dsnNode.getBridge();

    // Set bridge on the shared envelope service
    signedEnvelopeService.setBridge(bridge);

    const domainManager = dsnNode.getDomainManager();
    const serviceRegistry = new ServiceRegistry(bridge);
    
    // 6. Trust Services — use HeadlessTrustAdapter backed by Gun bridge
    const trustAdapter = new HeadlessTrustAdapter(bridge, identityManager);

    const trustEvaluator = new TrustEvaluator(
        signedEnvelopeService,
        identityManager,
        trustAdapter, // ISocialGraphProvider
        trustAdapter, // IReputationProvider
        domainManager
    );

    const trustGate = new TrustGate(trustEvaluator);

    // 7. Initialize Plugin Manager
    const pluginManager = new PluginManager(
        dsnNode,
        aiManager,
        secretsManager,
        signedEnvelopeService,
        trustEvaluator,
        trustGate,
        serviceRegistry,
        personalityManager
    );

    await pluginManager.initialize();

    console.log('AlephNet Headless Node is running.');
    console.log('Press Ctrl+C to stop.');

    // Keep alive — graceful shutdown including plugins
    process.on('SIGINT', async () => {
        console.log('Stopping...');
        await pluginManager.shutdown();
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
