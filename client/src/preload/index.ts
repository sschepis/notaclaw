import { contextBridge, ipcRenderer } from 'electron';
import { alephNetBridge } from './alephnet';

contextBridge.exposeInMainWorld('electronAPI', {
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
});
