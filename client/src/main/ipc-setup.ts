import { ipcMain, dialog, BrowserWindow } from 'electron';
import { 
    aiManager, 
    dsnNode, 
    identityManager, 
    sessionManager, 
    services, 
    risaService, 
    logManager, 
    secretsManager, 
    trustEvaluator, 
    trustGate, 
    conversationManager,
    memoryPromotionService,
    personalityManager,
    taskScheduler,
    configManager,
    logger,
    marketplaceService,
    openClawGateway,
    agentTaskRunner,
    teamManager,
    resonantAgentService,
    agentToolRegistry
} from './services-setup';

export function registerIPC(getMainWindow: () => BrowserWindow | null) {
    // Helper for renderer invocation
    const invokeRenderer = (channel: string, data?: any): Promise<any> => {
        const mainWindow = getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return Promise.reject(new Error("Window not ready or destroyed"));
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            const responseChannel = `app:response:${requestId}`;
            
            const timeout = setTimeout(() => {
                ipcMain.removeAllListeners(responseChannel);
                reject(new Error(`Timeout invoking renderer: ${channel}`));
            }, 5000);

            ipcMain.once(responseChannel, (_, response) => {
                clearTimeout(timeout);
                if (response.error) reject(new Error(response.error));
                else resolve(response.result);
            });

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('app:invoke', { requestId, channel, data });
            } else {
                clearTimeout(timeout);
                ipcMain.removeAllListeners(responseChannel);
                reject(new Error("Window destroyed during invocation"));
            }
        });
    };

    personalityManager.setCommandInterface({
        list: () => invokeRenderer('commands:list'),
        execute: (id) => invokeRenderer('commands:execute', { id }),
        help: (id) => invokeRenderer('commands:help', { id }),
        openFile: (path) => invokeRenderer('file:open', { path })
    });

    // Provide the renderer bridge to AgentTaskRunner for UI context awareness
    agentTaskRunner.setInvokeRenderer(invokeRenderer);

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
    ipcMain.handle('service:register', async (_, def) => services.serviceRegistry?.register(def));
    ipcMain.handle('service:search', async (_, query) => services.serviceRegistry?.search(query));
    ipcMain.handle('service:call', async (_, { serviceId, endpoint, params }) => services.serviceClient?.call(serviceId, endpoint, params));

    // Service Marketplace
    ipcMain.handle('marketplace:publishService', async (_, { definition }) => marketplaceService.publishService(definition));
    ipcMain.handle('marketplace:listServices', async (_, filter) => marketplaceService.listServices(filter));
    ipcMain.handle('marketplace:getService', async (_, { serviceId }) => marketplaceService.getService(serviceId));
    ipcMain.handle('marketplace:subscribe', async (_, { serviceId, tierName }) => marketplaceService.subscribe(serviceId, tierName));

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
        const plugin = services.pluginManager?.getPlugins().find(p => p.manifest.id === pluginId);
        return plugin?.context.storage.get(key);
    });
    ipcMain.handle('plugin:storage:set', async (_, { pluginId, key, value }) => {
        const plugin = services.pluginManager?.getPlugins().find(p => p.manifest.id === pluginId);
        return plugin?.context.storage.set(key, value);
    });
    ipcMain.handle('plugin:storage:delete', async (_, { pluginId, key }) => {
        const plugin = services.pluginManager?.getPlugins().find(p => p.manifest.id === pluginId);
        return plugin?.context.storage.delete(key);
    });

    // Trust & Provenance IPC
    ipcMain.handle('trust:evaluate', async (_, { envelope }) => trustEvaluator.evaluate(envelope));
    ipcMain.handle('trust:check-capability', async (_, { envelope, capability }) => trustGate.checkCapability(envelope, capability));
    ipcMain.handle('trust:get-overrides', async () => trustEvaluator.getOverrides());
    ipcMain.handle('trust:set-override', async (_, override) => trustEvaluator.setOverride(override));

    // AI Conversation IPC
    ipcMain.handle('ai:conversation:create', (_, { title, domainId }) => conversationManager.createConversation(title, domainId));
    ipcMain.handle('ai:conversation:list', () => conversationManager.listConversations());
    ipcMain.handle('ai:conversation:get', (_, { id }) => conversationManager.getConversation(id));
    ipcMain.handle('ai:conversation:delete', (_, { id }) => conversationManager.deleteConversation(id));
    ipcMain.handle('ai:conversation:addMessage', (_, { conversationId, message }) => conversationManager.addMessage(conversationId, message));
    ipcMain.handle('ai:conversation:updateMessage', (_, { conversationId, messageId, content }) => conversationManager.updateMessage(conversationId, messageId, content));
    ipcMain.handle('ai:conversation:deleteMessage', (_, { conversationId, messageId }) => conversationManager.deleteMessage(conversationId, messageId));
    ipcMain.handle('ai:conversation:updateTitle', (_, { id, title }) => conversationManager.updateTitle(id, title));

    // Conversation Session State IPC (persistence across app restarts)
    ipcMain.handle('ai:conversation:saveSessionState', (_, state) => conversationManager.saveSessionState(state));
    ipcMain.handle('ai:conversation:loadSessionState', () => conversationManager.loadSessionState());
    ipcMain.handle('ai:conversation:clearSessionState', () => conversationManager.clearSessionState());

    // Conversation Sync Subscription (cross-device sync via GunDB)
    ipcMain.handle('ai:conversation:subscribe', () => {
        conversationManager.subscribeToChanges();
        conversationManager.on('conversationChanged', (event: any) => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai:conversation:changed', event);
            }
        });
    });

    // Memory Promotion IPC
    ipcMain.handle('memory:promote', (_, request) => memoryPromotionService.promoteToUserMemory(request));
    ipcMain.handle('memory:processForPromotion', (_, { content, role, conversationId }) =>
        memoryPromotionService.processMessageForPromotion(content, role, conversationId));
    ipcMain.handle('memory:saveSkillConfig', (_, { skillId, key, value }) =>
        memoryPromotionService.saveSkillConfig(skillId, key, value));
    ipcMain.handle('memory:loadSkillConfig', (_, { skillId, key }) =>
        memoryPromotionService.loadSkillConfig(skillId, key));
    ipcMain.handle('memory:loadAllSkillConfigs', (_, { skillId }) =>
        memoryPromotionService.loadAllSkillConfigs(skillId));
    ipcMain.handle('memory:foldConversation', (_, { conversationFieldId, options }) =>
        memoryPromotionService.foldConversationToUserMemory(conversationFieldId, options));
    ipcMain.handle('memory:queryUserMemory', (_, { query, limit }) =>
        memoryPromotionService.queryUserMemory(query, limit));
    ipcMain.handle('memory:getUserMemoriesByCategory', (_, { category, limit }) =>
        memoryPromotionService.getUserMemoriesByCategory(category, limit));

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

    // Agent Task Runner IPC
    ipcMain.handle('agent:startTask', async (_, { conversationId, message, metadata }) => 
        agentTaskRunner.startTask(conversationId, message, metadata));
    ipcMain.handle('agent:stopTask', async (_, { taskId }) => agentTaskRunner.stopTask(taskId));
    ipcMain.handle('agent:userResponse', async (_, { taskId, response }) => agentTaskRunner.resolveUserResponse(taskId, response));
    ipcMain.handle('agent:getTask', async (_, { taskId }) => agentTaskRunner.getTask(taskId));
    ipcMain.handle('agent:getActiveTask', async (_, { conversationId }) => agentTaskRunner.getActiveTaskForConversation(conversationId));

    // Team IPC
    ipcMain.handle('team:create', async (_, { name, agentIds }) => teamManager.createTeam(name, agentIds));
    ipcMain.handle('team:list', async () => teamManager.getTeams());
    ipcMain.handle('team:get', async (_, { teamId }) => teamManager.getTeam(teamId));
    ipcMain.handle('team:update', async (_, { teamId, updates }) => teamManager.updateTeam(teamId, updates));
    ipcMain.handle('team:addAgent', async (_, { teamId, agentId }) => {
        const team = await teamManager.getTeam(teamId);
        if (!team) throw new Error("Team not found");
        if (!team.agentIds.includes(agentId)) {
            return teamManager.updateTeam(teamId, { agentIds: [...team.agentIds, agentId] });
        }
        return team;
    });
    ipcMain.handle('team:removeAgent', async (_, { teamId, agentId }) => {
        const team = await teamManager.getTeam(teamId);
        if (!team) throw new Error("Team not found");
        return teamManager.updateTeam(teamId, { agentIds: team.agentIds.filter(id => id !== agentId) });
    });
    ipcMain.handle('team:delete', async (_, { teamId }) => teamManager.deleteTeam(teamId));
    ipcMain.handle('team:summon', async (_, { teamId }) => {
        // Placeholder for summoning logic
        console.log(`Team summoned: ${teamId}`);
        return true;
    });
    ipcMain.handle('team:step', async (_, { teamId, observation }) => {
        // Placeholder for team stepping logic
        console.log(`Team step: ${teamId}`, observation);
        return { agentResults: [] };
    });
    ipcMain.handle('team:dismiss', async (_, { teamId }) => {
        console.log(`Team dismissed: ${teamId}`);
        return true;
    });

    // OpenClaw Gateway IPC
    ipcMain.handle('openclaw:connect', async (_, { url }) => {
        try {
            await openClawGateway.connect(url);
            return { success: true, status: openClawGateway.getStatus() };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });
    ipcMain.handle('openclaw:disconnect', async () => {
        await openClawGateway.disconnect();
        return { success: true };
    });
    ipcMain.handle('openclaw:status', async () => {
        return openClawGateway.getStatus();
    });
    ipcMain.handle('openclaw:listNodes', async () => {
        return openClawGateway.listNodes();
    });
    ipcMain.handle('openclaw:submitTask', async (_, { description, requirements }) => {
        return openClawGateway.submitTask({ description, requirements });
    });
    ipcMain.handle('openclaw:getTaskStatus', async (_, { taskId }) => {
        return openClawGateway.getTaskStatus(taskId);
    });
    ipcMain.handle('openclaw:cancelTask', async (_, { taskId }) => {
        return openClawGateway.cancelTask(taskId);
    });

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
        const mainWindow = getMainWindow();
        if (!mainWindow) return null;
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
            title: options?.title || 'Select File',
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    // Default Prompt Chain IPC
    ipcMain.handle('agent:getDefaultChain', async () => configManager.getDefaultPromptChain());
    ipcMain.handle('agent:setDefaultChain', async (_, { chainName }) => {
        await configManager.setDefaultPromptChain(chainName);
        return { success: true, defaultChain: chainName };
    });

    // Config IPC
    ipcMain.handle('config:get', async () => configManager.getConfig());
    ipcMain.handle('config:getNetwork', async () => configManager.getNetworkConfig());
    ipcMain.handle('config:updateNetwork', async (_, updates) => configManager.updateNetworkConfig(updates));
    ipcMain.handle('config:addPeer', async (_, peerUrl) => configManager.addPeer(peerUrl));
    ipcMain.handle('config:removePeer', async (_, peerUrl) => configManager.removePeer(peerUrl));
    ipcMain.handle('config:getLogging', async () => configManager.getLoggingConfig());
    ipcMain.handle('config:updateLogging', async (_, updates) => configManager.updateLoggingConfig(updates));

    // Workspace IPC
    ipcMain.handle('config:getWorkspace', async () => configManager.getWorkspacePath());
    ipcMain.handle('config:setWorkspace', async (_, path) => configManager.setWorkspacePath(path));
    ipcMain.handle('dialog:selectWorkspace', async () => {
        const mainWindow = getMainWindow();
        if (!mainWindow) return null;
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Workspace Folder',
            buttonLabel: 'Select Workspace'
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    // Production Logger IPC
    ipcMain.handle('logger:get', async (_, limit) => logger.getLogs(limit));
    ipcMain.handle('logger:getByCategory', async (_, { category, limit }) => logger.getLogsByCategory(category, limit));
    ipcMain.handle('logger:clear', async () => logger.clear());

    // ═══════════════════════════════════════════════════════════════════════
    // Resonant Agents — Unified Agent IPC
    // ═══════════════════════════════════════════════════════════════════════

    // Agent CRUD
    ipcMain.handle('resonant:agent:list', async (_, params) => resonantAgentService.listAgents(params?.filter));
    ipcMain.handle('resonant:agent:get', async (_, { id }) => resonantAgentService.getAgent(id));
    ipcMain.handle('resonant:agent:create', async (_, options) => resonantAgentService.createAgent(options));
    ipcMain.handle('resonant:agent:update', async (_, { id, updates }) => resonantAgentService.updateAgent(id, updates));
    ipcMain.handle('resonant:agent:delete', async (_, { id }) => resonantAgentService.deleteAgent(id));
    ipcMain.handle('resonant:agent:duplicate', async (_, { id, newName }) => resonantAgentService.duplicateAgent(id, newName));
    ipcMain.handle('resonant:agent:export', async (_, { id }) => resonantAgentService.exportAgent(id));
    ipcMain.handle('resonant:agent:import', async (_, { json }) => resonantAgentService.importAgent(json));

    // Agent Lifecycle
    ipcMain.handle('resonant:agent:summon', async (_, { id, context }) => resonantAgentService.summon(id, context));
    ipcMain.handle('resonant:agent:dismiss', async (_, { id }) => resonantAgentService.dismiss(id));

    // Agent Task Execution
    ipcMain.handle('resonant:agent:startTask', async (_, params) => resonantAgentService.startTask(params));
    ipcMain.handle('resonant:agent:stopTask', async (_, { taskId }) => resonantAgentService.stopTask(taskId));
    ipcMain.handle('resonant:agent:respondToTask', async (_, { taskId, response }) => resonantAgentService.respondToTask(taskId, response));

    // Templates
    ipcMain.handle('resonant:templates:list', async () => resonantAgentService.getTemplates());

    // Teams
    ipcMain.handle('resonant:team:list', async () => resonantAgentService.listTeams());
    ipcMain.handle('resonant:team:create', async (_, { name, agentIds, description }) => resonantAgentService.createTeam(name, agentIds, description));
    ipcMain.handle('resonant:team:update', async (_, { id, updates }) => resonantAgentService.updateTeam(id, updates));
    ipcMain.handle('resonant:team:delete', async (_, { id }) => resonantAgentService.deleteTeam(id));
    ipcMain.handle('resonant:team:orchestrate', async (_, params) => resonantAgentService.orchestrateTeam(params));

    // Tool Registry
    ipcMain.handle('resonant:tool:list', async () => agentToolRegistry.listAll());
}
