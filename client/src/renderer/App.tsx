import { useEffect, useState } from 'react';
import { NavRail } from './components/layout/NavRail';
import { LayoutManager } from './components/layout/LayoutManager';
import { AppMenuBar } from './components/layout/AppMenuBar';
import { useAppStore } from './store/useAppStore';
import { useAlephStore } from './store/useAlephStore';
import { SettingsModal } from './components/settings/SettingsModal';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { PluginLoader } from './services/PluginLoader';
import { webLLMService } from './services/WebLLMService';
import { CommandMenu } from './components/ui/CommandMenu';
import { StatusBar } from './components/layout/StatusBar';
import { PluginOverlays } from './components/ui/PluginOverlays';
import { PanelRight } from 'lucide-react';
import { useSlotRegistry } from './services/SlotRegistry';

type OnboardingStep = 'welcome' | 'identity' | 'ai-setup';

function App() {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'chat' | 'canvas'>('chat');
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  
  const { addMessage, setWallet, setAgentState, setSMF, setNetwork, hasIdentity, setHasIdentity, setIsGenerating, setGenerationProgress, loadConversations, loadConversationMessages, loadSelectedModelFromSettings, restoreSessionState, handleTaskUpdate } = useAppStore();

  useEffect(() => {
    const checkSetupState = async () => {
      try {
        // Step 1: Check if identity/key exists
        const identityExists = await window.electronAPI.checkIdentity();
        
        if (!identityExists) {
          // No identity at all → start from welcome
          setNeedsOnboarding(true);
          setOnboardingStep('welcome');
          setHasIdentity(false);
          setLoading(false);
          return;
        }

        // Step 2: Identity exists, check if AI providers are configured
        const aiSettings = await window.electronAPI.getAISettings();
        const hasProviders = aiSettings.providers && aiSettings.providers.length > 0 
          && aiSettings.providers.some(p => p.enabled);
        
        if (!hasProviders) {
          // Identity exists but no AI configured → go straight to AI setup
          setNeedsOnboarding(true);
          setOnboardingStep('ai-setup');
          setHasIdentity(false); // keep false until full onboarding completes
          setLoading(false);
          return;
        }

        // Both exist → user is fully set up
        setHasIdentity(true);
        setNeedsOnboarding(false);
        setLoading(false);
        
        // Full startup sequence:
        // 1. Load conversation list (from local cache, fast)
        // 2. Restore session state (active conversation, open tabs)
        // 3. restoreSessionState internally loads messages for active conversation
        // 4. Subscribe to real-time sync for cross-device updates
        // 5. Load persisted model selection
        try {
            await loadConversations();
            await restoreSessionState();
            
            // Subscribe to conversation sync (cross-device via GunDB)
            window.electronAPI.aiConversationSubscribe?.();
        } catch (startupErr) {
            console.error('Conversation startup sequence error:', startupErr);
        }
        
        loadSelectedModelFromSettings(); // Load persisted model selection
      } catch (err) {
        console.error('Setup check failed:', err);
        // On error, assume needs full onboarding
        setNeedsOnboarding(true);
        setOnboardingStep('welcome');
        setHasIdentity(false);
        setLoading(false);
      }
    };

    checkSetupState();

    // Initialize Plugins
    PluginLoader.getInstance().initialize().catch(err => {
        console.error("Failed to initialize plugins:", err);
    });

    // Subscribe to IPC events
    let cleanupMessage: (() => void) | undefined;
    let cleanupWallet: (() => void) | undefined;
    let cleanupAgent: (() => void) | undefined;
    let cleanupSMF: (() => void) | undefined;
    let cleanupNetwork: (() => void) | undefined;
    let cleanupDM: (() => void) | undefined;
    let cleanupRoom: (() => void) | undefined;
    let cleanupFriend: (() => void) | undefined;
    let cleanupGroup: (() => void) | undefined;
    let cleanupAgentStep: (() => void) | undefined;
    let cleanupTx: (() => void) | undefined;
    let cleanupLocalInference: (() => void) | undefined;
    let cleanupAppInvoke: (() => void) | undefined;
    let cleanupAgentTaskUpdate: (() => void) | undefined;
    let cleanupAgentTaskMessage: (() => void) | undefined;
    let cleanupConversationChanged: (() => void) | undefined;

    try {
        cleanupMessage = window.electronAPI.onMessage((_event, msg) => {
          addMessage(msg);
          setIsGenerating(false);
          setGenerationProgress(null);
        });
        cleanupWallet = window.electronAPI.onWalletUpdate((_event, data) => setWallet(data));
        cleanupAgent = window.electronAPI.onAgentStateUpdate((_event, data) => setAgentState(data));
        cleanupSMF = window.electronAPI.onSMFUpdate((_event, data) => setSMF(data));
        cleanupNetwork = window.electronAPI.onNetworkUpdate((_event, data) => setNetwork(data));

        // Agent Task Events
        cleanupAgentTaskUpdate = window.electronAPI.onAgentTaskUpdate((_event, { task }) => {
          handleTaskUpdate(task);
        });

        cleanupAgentTaskMessage = window.electronAPI.onAgentTaskMessage((_event, { conversationId, message }) => {
          // Add message to conversation
          addMessage(message as any, conversationId);
          // Don't modify isGenerating here, as it's controlled by task status
        });

        // AlephNet Real-time Event Subscriptions
        const aleph = useAlephStore.getState();
        cleanupDM = window.electronAPI.onDirectMessage?.((_event, dm) => aleph.handleIncomingDM(dm));
        cleanupRoom = window.electronAPI.onRoomMessage?.((_event, msg) => aleph.handleIncomingRoomMessage(msg));
        cleanupFriend = window.electronAPI.onFriendRequest?.((_event, req) => aleph.handleIncomingFriendRequest(req));
        cleanupGroup = window.electronAPI.onGroupPost?.((_event, post) => aleph.handleIncomingGroupPost(post));
        cleanupAgentStep = window.electronAPI.onAgentStep?.((_event, result) => aleph.handleAgentStepEvent(result));
        cleanupTx = window.electronAPI.onWalletTransaction?.((_event, tx) => aleph.handleWalletTransaction(tx));

        // WebLLM Delegate Listener
        cleanupLocalInference = window.electronAPI.onRequestLocalInference(async (_event, data) => {
          try {
              console.log("Received local inference request", data);
              
              if (!webLLMService.isInitialized()) {
                  const modelId = data.model || 'Llama-3-8B-Instruct-q4f32_1-MLC';
                  await webLLMService.initialize(modelId);
              }

              const response: any = await webLLMService.chat([
                  { role: 'user', content: data.content }
              ]);

              const reply = response.choices[0].message.content || "";
              
              await window.electronAPI.submitLocalAIResponse(reply);
          } catch (error) {
              console.error("Local inference failed:", error);
              await window.electronAPI.submitLocalAIResponse(`[Error] Local inference failed: ${error}`);
          }
        });

        // App-level Command Invocation (Main -> Renderer)
        cleanupAppInvoke = window.electronAPI.onAppInvoke?.(async (_event, { requestId, channel, data }) => {
            try {
                let result;
                if (channel === 'commands:list') {
                    const commands = useSlotRegistry.getState().commands;
                    result = Object.values(commands).map(c => ({
                        id: c.id,
                        label: c.label,
                        category: c.category,
                        description: c.label,
                        shortcut: c.shortcut
                    }));
                } else if (channel === 'commands:execute') {
                    const commands = useSlotRegistry.getState().commands;
                    const cmd = commands[data.id];
                    if (cmd) {
                        cmd.action();
                        result = { success: true };
                    } else {
                        throw new Error(`Command ${data.id} not found`);
                    }
                } else if (channel === 'commands:help') {
                     const commands = useSlotRegistry.getState().commands;
                     const cmd = commands[data.id];
                     if (cmd) {
                         result = {
                            id: cmd.id,
                            label: cmd.label,
                            category: cmd.category,
                            shortcut: cmd.shortcut,
                            description: cmd.label
                         };
                     } else {
                         throw new Error(`Command ${data.id} not found`);
                     }
                } else if (channel === 'file:open') {
                    const filePath = data.path;
                    try {
                        const content = await window.electronAPI.fsRead({ path: filePath });
                        useAppStore.getState().openTab({
                            id: `file-${filePath}`,
                            type: 'file',
                            title: filePath.split('/').pop() || filePath,
                            data: { path: filePath, content }
                        });
                        result = { success: true };
                    } catch (err: any) {
                        throw new Error(`Failed to open file: ${err.message}`);
                    }
                } else {
                    throw new Error(`Unknown channel: ${channel}`);
                }
                
                window.electronAPI.sendAppResponse(requestId, { result });
            } catch (err: any) {
                window.electronAPI.sendAppResponse(requestId, { error: err.message });
            }
        });

        // Cross-device conversation sync listener
        cleanupConversationChanged = window.electronAPI.onAIConversationChanged?.((_event, changeEvent) => {
            const { type, conversationId, data } = changeEvent;
            console.log(`[App] Conversation sync event: ${type} for ${conversationId}`);
            
            if (type === 'conversation_updated' && data) {
                // Reload conversations to pick up remote changes
                loadConversations();
            } else if (type === 'message_added') {
                // If the conversation is currently active, reload its messages
                const activeId = useAppStore.getState().activeConversationId;
                if (activeId === conversationId) {
                    loadConversationMessages(conversationId);
                }
            }
        });
    } catch (e) {
        console.error('Failed to set up subscriptions:', e);
    }

    return () => {
      cleanupMessage?.();
      cleanupWallet?.();
      cleanupAgent?.();
      cleanupSMF?.();
      cleanupNetwork?.();
      cleanupDM?.();
      cleanupRoom?.();
      cleanupFriend?.();
      cleanupGroup?.();
      cleanupAgentStep?.();
      cleanupTx?.();
      cleanupLocalInference?.();
      cleanupAppInvoke?.();
      cleanupAgentTaskUpdate?.();
      cleanupAgentTaskMessage?.();
      cleanupConversationChanged?.();
    };

  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-mono tracking-wider">INITIALIZING</span>
        </div>
      </div>
    );
  }

  if (!hasIdentity) {
    return <OnboardingScreen initialStep={needsOnboarding ? onboardingStep : 'welcome'} />;
  }

  return (
    <div className="absolute inset-0 flex flex-col text-foreground overflow-hidden font-sans bg-background selection:bg-primary/30">
      {/* macOS title bar drag region with menu bar */}
      <div className="shrink-0 h-[38px] bg-card/80 backdrop-blur-xl border-b border-border flex items-center pr-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <AppMenuBar
          inspectorOpen={inspectorOpen}
          setInspectorOpen={setInspectorOpen}
          onOpenSettings={() => setShowSettings(true)}
          setMode={setMode}
        />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-mono tracking-widest select-none">ALEPH<span className="text-primary">NET</span></span>
        </div>

        <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
          className={`p-1.5 rounded-md transition-colors ${inspectorOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={inspectorOpen ? "Close Inspector" : "Open Inspector"}
        >
            <PanelRight size={14} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <NavRail currentMode={mode} setMode={setMode} onOpenSettings={() => setShowSettings(true)} />
        <LayoutManager mode={mode} inspectorOpen={inspectorOpen} setInspectorOpen={setInspectorOpen} />
      </div>
      
      <StatusBar />
      
      <CommandMenu />
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Plugin overlays (modals and toasts) */}
      <PluginOverlays />
    </div>
  );
}

export default App;
