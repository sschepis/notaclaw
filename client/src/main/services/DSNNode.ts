import { EventEmitter } from 'events';
import { AlephGunBridge, DSNNode as LibDSNNode } from '@sschepis/alephnet-node';
import { IdentityManager } from './IdentityManager';
import { DSNNodeConfig } from '../../shared/types';
import { AIProviderManager } from './AIProviderManager';
import { PersonalityManager } from './PersonalityManager';
import { DomainManager } from './DomainManager';
import { SignedEnvelopeService } from './SignedEnvelopeService';
import { configManager } from './ConfigManager';
import Gun from 'gun';
import 'gun/sea';

export class DSNNode extends EventEmitter {
  private bridge: AlephGunBridge;
  private libNode: LibDSNNode | null = null;
  private identityManager: IdentityManager;
  // private aiManager: AIProviderManager;
  private personalityManager: PersonalityManager;
  private domainManager: DomainManager;
  private envelopeService: SignedEnvelopeService;
  private config: DSNNodeConfig | null = null;
  private gunInstance: any = null;

  constructor(_aiManager: AIProviderManager, personalityManager: PersonalityManager) {
    super();
    this.bridge = new AlephGunBridge();
    this.identityManager = new IdentityManager();
    // this.aiManager = aiManager;
    this.personalityManager = personalityManager;
    this.envelopeService = new SignedEnvelopeService(this.identityManager);
    this.domainManager = new DomainManager(this.bridge, this.identityManager, this.envelopeService);
  }

  async start() {
    console.log('Starting DSN Node...');
    
    // 0. Initialize config manager
    await configManager.initialize();
    const networkConfig = configManager.getNetworkConfig();
    
    // 1. Load existing identity
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) {
        console.log('No identity found. Deferring to onboarding flow.');
        this.emit('status', 'OFFLINE');
        return;
    }

    // 2. Instantiate Library DSNNode
    const keyTriplet = {
        pub: identity.pub,
        priv: identity.priv,
        resonance: (identity.resonance || new Array(16).fill(0)) as any,
        fingerprint: identity.fingerprint,
        bodyPrimes: identity.bodyPrimes || []
    };

    // Instantiate Gun with configurable peers
    console.log(`Connecting to peers: ${networkConfig.peers.join(', ')}`);
    this.gunInstance = Gun({ peers: networkConfig.peers });

    this.libNode = new LibDSNNode({
        nodeId: identity.fingerprint,
        semanticDomain: 'cognitive', // Default
        existingKeyTriplet: keyTriplet,
        gunInstance: this.gunInstance,
        bootstrapUrl: networkConfig.bootstrapUrl
    });

    // 3. Initialize Bridge with real Gun instance
    await this.bridge.initialize(this.gunInstance, this.libNode, null);

    // 4. Start Library Node
    await this.libNode.start(this.gunInstance);
    this.config = this.libNode.config as unknown as DSNNodeConfig;

    console.log('DSN Node started:', this.config.nodeId);
    this.emit('status', 'ONLINE');
  }

  async stop() {
    console.log('Stopping DSN Node...');
    if (this.libNode) {
        await this.libNode.stop();
    }
    // Note: Gun doesn't have a clean 'close' method in typical usage,
    // but clearing references helps.
    this.gunInstance = null;
    this.emit('status', 'OFFLINE');
  }

  async processMessage(content: string, metadata: any) {
    console.log('[DSNNode] Processing message:', { content, metadata });
    
    let providerId = metadata.providerId;
    let model = metadata.model;
    
    if (model && model.includes(':')) {
        const [parsedProviderId, ...modelParts] = model.split(':');
        providerId = parsedProviderId;
        model = modelParts.join(':');
    }
    
    /*
    const options: AIRequestOptions = {
        contentType: metadata.mode === 'Code' ? 'code' : (metadata.mode === 'Agent' ? 'agent' : 'chat'),
        providerId,
        model,
        temperature: metadata.resonance ? metadata.resonance / 100 : 0.7,
        maxTokens: 2048
    };
    */

    try {
        // Delegate to PersonalityManager
        const response = await this.personalityManager.handleInteraction(content, {
            ...metadata,
            providerId, // Use parsed providerId
            model       // Use parsed model
        });

        if (response.providerId === 'webllm') {
            this.emit('request-local-inference', {
                content,
                model: response.model
            });
            return;
        }

        const message = {
            id: Date.now().toString(),
            content: response.content,
            type: 'cognitive',
            sender: 'agent',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        this.emit('agent-response', message);
        
    } catch (error) {
        console.error('[DSNNode] Message processing failed:', error);
        this.emit('agent-response', {
            id: Date.now().toString(),
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            type: 'system',
            sender: 'system',
            timestamp: new Date().toLocaleTimeString()
        });
    }
  }

  async handleLocalResponse(content: string) {
      const message = {
          id: Date.now().toString(),
          content: content,
          type: 'cognitive',
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      this.emit('agent-response', message);
  }

  // API for Plugins
  public getBridge() {
      return this.bridge;
  }

  public getConfig() {
      return this.config;
  }

  public getDomainManager() {
      return this.domainManager;
  }
}
