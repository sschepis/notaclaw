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

import { AgentTaskRunner } from './agent-runner';

export class DSNNode extends EventEmitter {
  private bridge: AlephGunBridge;
  private libNode: LibDSNNode | null = null;
  private identityManager: IdentityManager;
  // private aiManager: AIProviderManager;
  private personalityManager: PersonalityManager;
  private agentTaskRunner: AgentTaskRunner | null = null;
  private domainManager: DomainManager;
  private envelopeService: SignedEnvelopeService;
  private config: DSNNodeConfig | null = null;
  private gunInstance: any = null;

  // Error recovery & reconnection
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectBaseDelayMs = 2000;
  private isRestarting = false;

  constructor(_aiManager: AIProviderManager, personalityManager: PersonalityManager) {
    super();
    this.bridge = new AlephGunBridge();
    this.identityManager = new IdentityManager();
    // this.aiManager = aiManager;
    this.personalityManager = personalityManager;
    this.envelopeService = new SignedEnvelopeService(this.identityManager);
    this.domainManager = new DomainManager(this.bridge, this.identityManager, this.envelopeService);
  }

  public setAgentTaskRunner(runner: AgentTaskRunner) {
    this.agentTaskRunner = runner;
  }

  async start() {
    console.log('Starting DSN Node...');
    
    try {
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

      // Reset reconnection state on successful start
      this.reconnectAttempts = 0;
      this.isRestarting = false;

      console.log('DSN Node started:', this.config.nodeId);
      this.emit('status', 'ONLINE');
    } catch (error) {
      console.error('[DSNNode] Failed to start:', error);
      this.emit('status', 'ERROR');
      this.emit('error', error);
      
      // Trigger automatic reconnection
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return; // Already scheduled
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[DSNNode] Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.emit('status', 'DISCONNECTED');
      return;
    }

    const delay = this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000;
    this.reconnectAttempts++;
    
    console.log(`[DSNNode] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
    this.emit('status', 'RECONNECTING');

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isRestarting) return;
      this.isRestarting = true;

      try {
        // Clean up old connection
        if (this.libNode) {
          try { await this.libNode.stop(); } catch { /* ignore */ }
          this.libNode = null;
        }
        this.gunInstance = null;
        // Reuse existing bridge instance to preserve references in AlephNetClient
        // this.bridge = new AlephGunBridge(); 

        // Attempt fresh start
        await this.start();
      } catch (error) {
        console.error(`[DSNNode] Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        this.isRestarting = false;
        // start() will call scheduleReconnect() again on failure
      }
    }, delay);
  }

  /**
   * Manually trigger a reconnection (e.g. after detecting connectivity loss).
   */
  async reconnect(): Promise<void> {
    console.log('[DSNNode] Manual reconnect requested');
    this.reconnectAttempts = 0; // Reset counter for manual reconnect
    await this.stop();
    await this.start();
  }

  async stop() {
    console.log('Stopping DSN Node...');
    
    // Cancel any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isRestarting = false;

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
        // Check if this is an Agentic Task
        if (metadata.mode === 'Task' && this.agentTaskRunner) {
            console.log('[DSNNode] Routing to AgentTaskRunner');
            // We don't await this, as the task runs asynchronously and emits its own events
            this.agentTaskRunner.startTask(metadata.conversationId, content, metadata)
                .catch(err => console.error('[DSNNode] Failed to start agent task:', err));
            return;
        }

        // Delegate to PersonalityManager for standard chat
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
