import { contextBridge, ipcRenderer } from 'electron';
import { alephNetBridge } from './alephnet';

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  configGet: () => ipcRenderer.invoke('config:get'),
  configGetNetwork: () => ipcRenderer.invoke('config:getNetwork'),
  configUpdateNetwork: (updates: any) => ipcRenderer.invoke('config:updateNetwork', updates),
  configAddPeer: (peerUrl: string) => ipcRenderer.invoke('config:addPeer', peerUrl),
  configRemovePeer: (peerUrl: string) => ipcRenderer.invoke('config:removePeer', peerUrl),
  configGetLogging: () => ipcRenderer.invoke('config:getLogging'),
  configUpdateLogging: (updates: any) => ipcRenderer.invoke('config:updateLogging', updates),

  // Agent Sandbox
  configIsSandboxed: () => ipcRenderer.invoke('config:isSandboxed'),
  configSetSandboxed: (sandboxed: boolean) => ipcRenderer.invoke('config:setSandboxed', sandboxed),
  
  // Workspace
  configGetWorkspace: () => ipcRenderer.invoke('config:getWorkspace'),
  configSetWorkspace: (path: string) => ipcRenderer.invoke('config:setWorkspace', path),
  selectWorkspace: () => ipcRenderer.invoke('dialog:selectWorkspace'),
  workspaceOpenFolder: () => ipcRenderer.invoke('workspace:openFolder'),
  workspaceClose: () => ipcRenderer.invoke('workspace:close'),
  workspaceGetInfo: () => ipcRenderer.invoke('workspace:getInfo'),
  onWorkspaceChanged: (callback: (event: any, data: { path: string | null }) => void) => {
    ipcRenderer.on('workspace:changed', callback);
    return () => { ipcRenderer.removeListener('workspace:changed', callback); };
  },

  // ─── AlephNet APIs (all tiers) ────────────────────────────────
  ...alephNetBridge,

  // ─── Legacy / Core APIs ────────────────────────────────────────
  sendMessage: (payload: any) => ipcRenderer.send('message', payload),
  onMessage: (callback: (event: any, message: any) => void) => {
    ipcRenderer.on('message', callback);
    return () => { ipcRenderer.removeListener('message', callback); };
  },
    
  approveTool: (toolId: string) => ipcRenderer.invoke('approveTool', toolId),
  summonAgent: (agentId: string) => ipcRenderer.invoke('summonAgent', agentId),
  stakeTokens: (amount: number) => ipcRenderer.invoke('stakeTokens', amount),
  
  onWalletUpdate: (callback: (event: any, wallet: any) => void) => {
    ipcRenderer.on('wallet-update', callback);
    return () => { ipcRenderer.removeListener('wallet-update', callback); };
  },
  onAgentStateUpdate: (callback: (event: any, state: any) => void) => {
    ipcRenderer.on('agent-state-update', callback);
    return () => { ipcRenderer.removeListener('agent-state-update', callback); };
  },
  onSMFUpdate: (callback: (event: any, smf: any) => void) => {
    ipcRenderer.on('smf-update', callback);
    return () => { ipcRenderer.removeListener('smf-update', callback); };
  },
  onNetworkUpdate: (callback: (event: any, network: any) => void) => {
    ipcRenderer.on('network-update', callback);
    return () => { ipcRenderer.removeListener('network-update', callback); };
  },
  onAlephNetStatus: (callback: (event: any, status: any) => void) => {
    ipcRenderer.on('alephnet-status', callback);
    return () => { ipcRenderer.removeListener('alephnet-status', callback); };
  },

  // AI Provider Management
  getAISettings: () => ipcRenderer.invoke('getAISettings'),
  saveAISettings: (settings: any) => ipcRenderer.invoke('saveAISettings', settings),
  testAIProvider: (config: any) => ipcRenderer.invoke('testAIProvider', config),
  fetchProviderModels: (config: any, forceRefresh?: boolean) => ipcRenderer.invoke('fetchProviderModels', config, forceRefresh),
  aiComplete: (request: any) => ipcRenderer.invoke('ai:complete', request),
  selectFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  
  // WebLLM Delegate
  onRequestLocalInference: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('request-local-inference', callback);
    return () => { ipcRenderer.removeListener('request-local-inference', callback); };
  },
  submitLocalAIResponse: (content: string) => ipcRenderer.invoke('submitLocalAIResponse', content),

  // Identity Management
  checkIdentity: () => ipcRenderer.invoke('checkIdentity'),
  createIdentity: () => ipcRenderer.invoke('createIdentity'),
  importIdentity: (json: string) => ipcRenderer.invoke('importIdentity', json),

  // Plugin Management
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  getOpenClawSkills: () => ipcRenderer.invoke('getOpenClawSkills'),
  readPluginFile: (path: string) => ipcRenderer.invoke('read-plugin-file', path),
  pluginDisable: (id: string) => ipcRenderer.invoke('plugin:disable', id),
  pluginEnable: (id: string) => ipcRenderer.invoke('plugin:enable', id),
  pluginUninstall: (id: string) => ipcRenderer.invoke('plugin:uninstall', id),
  sendPluginMessage: (pluginId: string, channel: string, data: any) => 
    ipcRenderer.send(`plugin:${pluginId}:${channel}`, data),
  onPluginMessage: (pluginId: string, channel: string, callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(`plugin:${pluginId}:${channel}`, handler);
    return () => { ipcRenderer.removeListener(`plugin:${pluginId}:${channel}`, handler); };
  },
  
  // Plugin Storage
  pluginStorageGet: (pluginId: string, key: string) =>
    ipcRenderer.invoke('plugin:storage:get', { pluginId, key }),
  pluginStorageSet: (pluginId: string, key: string, value: any) =>
    ipcRenderer.invoke('plugin:storage:set', { pluginId, key, value }),
  pluginStorageDelete: (pluginId: string, key: string) =>
    ipcRenderer.invoke('plugin:storage:delete', { pluginId, key }),
  
  // Plugin Tooling
  pluginRegisterTool: (pluginId: string, toolName: string) => 
    ipcRenderer.send('plugin:register-tool', { pluginId, toolName }),
  
  pluginInvokeTool: (toolName: string, args: any) =>
    ipcRenderer.invoke('plugin:invoke-tool', { toolName, args }),

  pluginInvokeRenderer: (pluginId: string, channel: string, data: any) =>
    ipcRenderer.invoke('plugin:ipc:invoke', { pluginId, channel, data }),

  // Session Management
  sessionStart: () => ipcRenderer.invoke('session:start'),
  sessionStop: () => ipcRenderer.invoke('session:stop'),
  sessionSnapshot: () => ipcRenderer.invoke('session:snapshot'),
  sessionAct: (action: any) => ipcRenderer.invoke('session:act', action),
  sessionGetState: () => ipcRenderer.invoke('session:state'),

  // Logging
  getLogs: (limit?: number) => ipcRenderer.invoke('logs:get', limit),
  getLogsByCategory: (category: string, limit?: number) => 
    ipcRenderer.invoke('logs:getByCategory', { category, limit }),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  onLogEntry: (callback: (event: any, entry: any) => void) => {
    ipcRenderer.on('log-entry', callback);
    return () => { ipcRenderer.removeListener('log-entry', callback); };
  },

  // Secrets
  secretsSet: (options: any) => ipcRenderer.invoke('secrets:set', options),
  secretsGet: (options: any) => ipcRenderer.invoke('secrets:get', options),
  secretsDelete: (options: any) => ipcRenderer.invoke('secrets:delete', options),
  secretsHas: (options: any) => ipcRenderer.invoke('secrets:has', options),
  secretsList: (options?: any) => ipcRenderer.invoke('secrets:list', options),
  secretsClearNamespace: (namespace: string) => ipcRenderer.invoke('secrets:clearNamespace', namespace),
  secretsStatus: () => ipcRenderer.invoke('secrets:status'),
  secretsLock: () => ipcRenderer.invoke('secrets:lock'),
  secretsUnlock: () => ipcRenderer.invoke('secrets:unlock'),

  // App-level Command Invocation (Main -> Renderer)
  onAppInvoke: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('app:invoke', callback);
    return () => { ipcRenderer.removeListener('app:invoke', callback); };
  },
  sendAppResponse: (requestId: string, response: any) => 
    ipcRenderer.send(`app:response:${requestId}`, response),

  // ─── Agent Task Runner ──────────────────────────────────────────
  agentStartTask: (params: { conversationId: string; message: string; metadata: any }) =>
    ipcRenderer.invoke('agent:startTask', params),
  agentStopTask: (params: { taskId: string }) =>
    ipcRenderer.invoke('agent:stopTask', params),
  agentUserResponse: (params: { taskId: string; response: string }) =>
    ipcRenderer.invoke('agent:userResponse', params),
  agentGetTask: (params: { taskId: string }) =>
    ipcRenderer.invoke('agent:getTask', params),
  agentGetActiveTask: (params: { conversationId: string }) =>
    ipcRenderer.invoke('agent:getActiveTask', params),
  agentGetDefaultChain: () =>
    ipcRenderer.invoke('agent:getDefaultChain'),
  agentSetDefaultChain: (params: { chainName: string | null }) =>
    ipcRenderer.invoke('agent:setDefaultChain', params),
  onAgentTaskUpdate: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('agent:taskUpdate', callback);
    return () => { ipcRenderer.removeListener('agent:taskUpdate', callback); };
  },
  onAgentTaskMessage: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('agent:taskMessage', callback);
    return () => { ipcRenderer.removeListener('agent:taskMessage', callback); };
  },
  onAgentStreamChunk: (callback: (event: any, data: { messageId: string; chunk: string; done?: boolean }) => void) => {
    ipcRenderer.on('agent:streamChunk', callback);
    return () => { ipcRenderer.removeListener('agent:streamChunk', callback); };
  },
  onAgentSuggestions: (callback: (event: any, data: { messageId: string; conversationId: string; suggestedNextSteps: string[] }) => void) => {
    ipcRenderer.on('agent-suggestions', callback);
    return () => { ipcRenderer.removeListener('agent-suggestions', callback); };
  },

  // OpenClaw Gateway
  openclawConnect: (options: { url?: string }) => 
    ipcRenderer.invoke('openclaw:connect', options),
  openclawDisconnect: () => 
    ipcRenderer.invoke('openclaw:disconnect'),
  openclawStatus: () => 
    ipcRenderer.invoke('openclaw:status'),
  openclawListNodes: () => 
    ipcRenderer.invoke('openclaw:listNodes'),
  openclawSubmitTask: (options: { description: string; requirements?: Record<string, unknown> }) =>
    ipcRenderer.invoke('openclaw:submitTask', options),
  openclawGetTaskStatus: (options: { taskId: string }) =>
    ipcRenderer.invoke('openclaw:getTaskStatus', options),
  openclawCancelTask: (options: { taskId: string }) =>
    ipcRenderer.invoke('openclaw:cancelTask', options),

  // ─── Resonant Agents ─────────────────────────────────────────────
  resonantAgentList: (params?: any) => ipcRenderer.invoke('resonant:agent:list', params),
  resonantAgentGet: (params: { id: string }) => ipcRenderer.invoke('resonant:agent:get', params),
  resonantAgentCreate: (options: any) => ipcRenderer.invoke('resonant:agent:create', options),
  resonantAgentUpdate: (params: { id: string; updates: any }) => ipcRenderer.invoke('resonant:agent:update', params),
  resonantAgentDelete: (params: { id: string }) => ipcRenderer.invoke('resonant:agent:delete', params),
  resonantAgentDuplicate: (params: { id: string; newName: string }) => ipcRenderer.invoke('resonant:agent:duplicate', params),
  resonantAgentExport: (params: { id: string }) => ipcRenderer.invoke('resonant:agent:export', params),
  resonantAgentImport: (params: { json: string }) => ipcRenderer.invoke('resonant:agent:import', params),
  resonantAgentSummon: (params: { id: string; context?: any }) => ipcRenderer.invoke('resonant:agent:summon', params),
  resonantAgentDismiss: (params: { id: string }) => ipcRenderer.invoke('resonant:agent:dismiss', params),
  resonantAgentStartTask: (params: any) => ipcRenderer.invoke('resonant:agent:startTask', params),
  resonantAgentStopTask: (params: { taskId: string }) => ipcRenderer.invoke('resonant:agent:stopTask', params),
  resonantAgentRespondToTask: (params: { taskId: string; response: string }) => ipcRenderer.invoke('resonant:agent:respondToTask', params),
  resonantTemplatesList: () => ipcRenderer.invoke('resonant:templates:list'),
  resonantTeamList: () => ipcRenderer.invoke('resonant:team:list'),
  resonantTeamCreate: (params: { name: string; agentIds: string[]; description?: string }) => ipcRenderer.invoke('resonant:team:create', params),
  resonantTeamUpdate: (params: { id: string; updates: any }) => ipcRenderer.invoke('resonant:team:update', params),
  resonantTeamDelete: (params: { id: string }) => ipcRenderer.invoke('resonant:team:delete', params),
  resonantTeamOrchestrate: (params: any) => ipcRenderer.invoke('resonant:team:orchestrate', params),
  resonantToolList: () => ipcRenderer.invoke('resonant:tool:list'),
  onResonantAgentChanged: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('resonant:agentChanged', callback);
    return () => { ipcRenderer.removeListener('resonant:agentChanged', callback); };
  },

  // ─── Whisper Speech-to-Text ────────────────────────────────────────
  whisperIsReady: () => ipcRenderer.invoke('whisper:isReady'),
  whisperTranscribe: (wavBase64: string) => ipcRenderer.invoke('whisper:transcribe', { wavBase64 }),
  whisperRefine: (rawText: string, previousRefinedText?: string) => ipcRenderer.invoke('whisper:refine', { rawText, previousRefinedText }),
});
