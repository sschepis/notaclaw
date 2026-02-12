// ═══════════════════════════════════════════════════════════════════════════
// AlephNet Preload Bridge — Exposes all AlephNet IPC channels to renderer
// Imported and spread into contextBridge in preload/index.ts
// ═══════════════════════════════════════════════════════════════════════════

import { ipcRenderer } from 'electron';

/**
 * Helper: create a typed invoke wrapper for a channel.
 */
const invoke = <R = any>(channel: string) =>
  (params?: any): Promise<R> => ipcRenderer.invoke(channel, params);

/**
 * Helper: create a typed event listener wrapper for a channel.
 */
const on = (channel: string) =>
  (callback: (event: any, data: any) => void) => {
    ipcRenderer.on(channel, callback);
    return () => { ipcRenderer.removeListener(channel, callback); };
  };

/**
 * All AlephNet API methods exposed to the renderer process.
 */
export const alephNetBridge = {
  // ─── Semantic Computing ─────────────────────────────────────────
  alephThink: invoke('aleph:think'),
  alephCompare: invoke('aleph:compare'),
  alephRemember: invoke('aleph:remember'),
  alephRecall: invoke('aleph:recall'),
  alephIntrospect: invoke('aleph:introspect'),
  alephFocus: invoke('aleph:focus'),

  // ─── Memory Fields ─────────────────────────────────────────────
  memoryCreate: invoke('memory:create'),
  memoryList: invoke('memory:list'),
  memoryGet: invoke('memory:get'),
  memoryStore: invoke('memory:store'),
  memoryQuery: invoke('memory:query'),
  memoryQueryGlobal: invoke('memory:queryGlobal'),
  memoryContribute: invoke('memory:contribute'),
  memorySync: invoke('memory:sync'),
  memoryProject: invoke('memory:project'),
  memoryReconstruct: invoke('memory:reconstruct'),
  memorySimilarity: invoke('memory:similarity'),
  memoryEntropy: invoke('memory:entropy'),
  memoryCheckpoint: invoke('memory:checkpoint'),
  memoryRollback: invoke('memory:rollback'),
  memoryJoin: invoke('memory:join'),
  memoryDelete: invoke('memory:delete'),

  // ─── Social Graph ──────────────────────────────────────────────
  friendsList: invoke('friends:list'),
  friendsAdd: invoke('friends:add'),
  friendsRequests: invoke('friends:requests'),
  friendsAccept: invoke('friends:accept'),
  friendsReject: invoke('friends:reject'),
  friendsBlock: invoke('friends:block'),
  friendsUnblock: invoke('friends:unblock'),
  profileGet: invoke('profile:get'),
  profileUpdate: invoke('profile:update'),
  profileLinks: invoke('profile:links'),

  // ─── Messaging ─────────────────────────────────────────────────
  chatSend: invoke('chat:send'),
  chatInbox: invoke('chat:inbox'),
  chatHistory: invoke('chat:history'),
  chatRoomsCreate: invoke('chat:rooms:create'),
  chatRoomsInvite: invoke('chat:rooms:invite'),
  chatRoomsSend: invoke('chat:rooms:send'),
  chatRoomsList: invoke('chat:rooms:list'),

  // ─── Groups & Feed ─────────────────────────────────────────────
  groupsCreate: invoke('groups:create'),
  groupsJoin: invoke('groups:join'),
  groupsLeave: invoke('groups:leave'),
  groupsList: invoke('groups:list'),
  groupsPosts: invoke('groups:posts'),
  groupsPost: invoke('groups:post'),
  groupsReact: invoke('groups:react'),
  groupsComment: invoke('groups:comment'),
  groupsComments: invoke('groups:comments'),
  feedGet: invoke('feed:get'),
  feedMarkRead: invoke('feed:markRead'),

  // ─── Coherence Network ─────────────────────────────────────────
  coherenceSubmitClaim: invoke('coherence:submitClaim'),
  coherenceVerifyClaim: invoke('coherence:verifyClaim'),
  coherenceListTasks: invoke('coherence:listTasks'),
  coherenceClaimTask: invoke('coherence:claimTask'),
  coherenceCreateEdge: invoke('coherence:createEdge'),
  coherenceCreateSynthesis: invoke('coherence:createSynthesis'),
  coherenceSecurityReview: invoke('coherence:securityReview'),

  // ─── AI Conversations ──────────────────────────────────────────
  aiConversationCreate: invoke('ai:conversation:create'),
  aiConversationList: invoke('ai:conversation:list'),
  aiConversationGet: invoke('ai:conversation:get'),
  aiConversationDelete: invoke('ai:conversation:delete'),
  aiConversationAddMessage: invoke('ai:conversation:addMessage'),
  aiConversationUpdateMessage: invoke('ai:conversation:updateMessage'),
  aiConversationDeleteMessage: invoke('ai:conversation:deleteMessage'),
  aiConversationUpdateTitle: invoke('ai:conversation:updateTitle'),

  // ─── Conversation Session State ────────────────────────────────
  aiConversationSaveSessionState: invoke('ai:conversation:saveSessionState'),
  aiConversationLoadSessionState: invoke('ai:conversation:loadSessionState'),
  aiConversationClearSessionState: invoke('ai:conversation:clearSessionState'),

  // ─── Conversation Sync ─────────────────────────────────────────
  aiConversationSubscribe: invoke('ai:conversation:subscribe'),
  onAIConversationChanged: on('ai:conversation:changed'),

  // ─── Memory Promotion ──────────────────────────────────────────
  memoryPromote: invoke('memory:promote'),
  memoryProcessForPromotion: invoke('memory:processForPromotion'),
  memorySaveSkillConfig: invoke('memory:saveSkillConfig'),
  memoryLoadSkillConfig: invoke('memory:loadSkillConfig'),
  memoryLoadAllSkillConfigs: invoke('memory:loadAllSkillConfigs'),
  memoryFoldConversation: invoke('memory:foldConversation'),
  memoryQueryUserMemory: invoke('memory:queryUserMemory'),
  memoryGetUserMemoriesByCategory: invoke('memory:getUserMemoriesByCategory'),

  // ─── Scheduled Tasks ──────────────────────────────────────────
  taskCreate: invoke('task:create'),
  taskList: invoke('task:list'),
  taskGet: invoke('task:get'),
  taskUpdate: invoke('task:update'),
  taskDelete: invoke('task:delete'),
  taskPause: invoke('task:pause'),
  taskResume: invoke('task:resume'),
  taskExecute: invoke('task:execute'),
  taskGetHistory: invoke('task:getHistory'),
  taskParse: invoke('task:parse'),

  // ─── Agent Management ──────────────────────────────────────────
  agentCreate: invoke('agent:create'),
  agentList: invoke('agent:list'),
  agentGet: invoke('agent:get'),
  agentUpdate: invoke('agent:update'),
  agentDelete: invoke('agent:delete'),
  agentSummon: invoke('agent:summon'),
  agentStep: invoke('agent:step'),
  agentDismiss: invoke('agent:dismiss'),
  agentRun: invoke('agent:run'),

  // ─── Agent Teams ───────────────────────────────────────────────
  teamCreate: invoke('team:create'),
  teamList: invoke('team:list'),
  teamGet: invoke('team:get'),
  teamAddAgent: invoke('team:addAgent'),
  teamRemoveAgent: invoke('team:removeAgent'),
  teamSummon: invoke('team:summon'),
  teamStep: invoke('team:step'),
  teamDismiss: invoke('team:dismiss'),

  // ─── Wallet & Economics ────────────────────────────────────────
  walletBalance: invoke('wallet:balance'),
  walletSend: invoke('wallet:send'),
  walletStake: invoke('wallet:stake'),
  walletUnstake: invoke('wallet:unstake'),
  walletHistory: invoke('wallet:history'),

  // ─── Tier 6.5: Domains ─────────────────────────────────────────
  domainRegister: invoke('domain:register'),
  domainGet: invoke('domain:get'),
  domainList: invoke('domain:list'),
  domainJoin: invoke('domain:join'),
  domainLeave: invoke('domain:leave'),
  domainMembers: invoke('domain:members'),
  domainUpdateRules: invoke('domain:update-rules'),

  // ─── Content Store ─────────────────────────────────────────────
  contentStore: invoke('content:store'),
  contentRetrieve: invoke('content:retrieve'),
  contentList: invoke('content:list'),

  // ─── Marketplace ───────────────────────────────────────────────
  marketplacePublishService: invoke('marketplace:publishService'),
  marketplaceListServices: invoke('marketplace:listServices'),
  marketplaceGetService: invoke('marketplace:getService'),
  marketplaceSubscribe: invoke('marketplace:subscribe'),

  // ─── Identity Extended ─────────────────────────────────────────
  identitySign: invoke('identity:sign'),
  identityVerify: invoke('identity:verify'),
  identityExport: invoke('identity:export'),

  // ─── File System ───────────────────────────────────────────────
  fsList: invoke('fs:list'),
  fsRead: invoke('fs:read'),
  fsWrite: invoke('fs:write'),
  fsHome: invoke('fs:home'),

  // ─── Network ───────────────────────────────────────────────────
  alephConnect: invoke('aleph:connect'),
  alephStatus: invoke('aleph:status'),

  // ─── Real-time Events (subscriptions) ──────────────────────────
  onDirectMessage: on('aleph:directMessage'),
  onRoomMessage: on('aleph:roomMessage'),
  onFriendRequest: on('aleph:friendRequest'),
  onGroupPost: on('aleph:groupPost'),
  onFeedUpdate: on('aleph:feedUpdate'),
  onCoherenceTask: on('aleph:coherenceTask'),
  onAgentStep: on('aleph:agentStep'),
  onTeamStep: on('aleph:teamStep'),
  onMemoryFieldUpdate: on('aleph:memoryFieldUpdate'),
  onWalletTransaction: on('aleph:walletTransaction'),
  onTaskExecution: on('aleph:taskExecution'),
  onTaskStatusChange: on('aleph:taskStatusChange'),
  
  // ─── RISA Services ─────────────────────────────────────────────
  risaInstallScript: invoke('risa:installScript'),
  risaUpdateScript: invoke('risa:updateScript'),
  risaUninstallScript: invoke('risa:uninstallScript'),
  risaGetScripts: invoke('risa:getScripts'),
  risaStartTask: invoke('risa:startTask'),
  risaStopTask: invoke('risa:stopTask'),
  risaGetTasks: invoke('risa:getTasks'),
  onRISAEvent: on('risa:event'),
};
