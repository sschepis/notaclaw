// ═══════════════════════════════════════════════════════════════════════════
// AlephNetIPC — Registers all AlephNet IPC handlers on ipcMain
// Single source of truth for all ~84 channels, delegating to AlephNetClient.
// ═══════════════════════════════════════════════════════════════════════════

import { ipcMain, BrowserWindow } from 'electron';
import { AlephNetClient } from './AlephNetClient';
import type { AlephNetEvents } from '../../shared/alephnet-types';

/**
 * Register all AlephNet IPC handlers and event forwarding.
 * Call once during app.on('ready').
 */
export function registerAlephNetIPC(
  client: AlephNetClient,
  getMainWindow: () => BrowserWindow | null
): void {
  // ─── Helper: wrap async handler with error handling ──────────────
  const handle = (channel: string, handler: (params: any) => Promise<any>) => {
    ipcMain.handle(channel, async (_event, params) => {
      try {
        return await handler(params);
      } catch (err: any) {
        console.error(`[AlephNet IPC] Error on ${channel}:`, err.message);
        throw err;
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════
  // Semantic Computing (6 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('aleph:think', (p) => client.think(p));
  handle('aleph:compare', (p) => client.compare(p));
  handle('aleph:remember', (p) => client.remember(p));
  handle('aleph:recall', (p) => client.recall(p));
  handle('aleph:introspect', () => client.introspect());
  handle('aleph:focus', (p) => client.focus(p));

  // ═══════════════════════════════════════════════════════════════════
  // Memory Fields (16 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('memory:create', (p) => client.memoryCreate(p));
  handle('memory:list', (p) => client.memoryList(p ?? {}));
  handle('memory:get', (p) => client.memoryGet(p));
  handle('memory:store', (p) => client.memoryStore(p));
  handle('memory:query', (p) => client.memoryQuery(p));
  handle('memory:queryGlobal', (p) => client.memoryQueryGlobal(p));
  handle('memory:contribute', (p) => client.memoryContribute(p));
  handle('memory:sync', (p) => client.memorySync(p));
  handle('memory:project', (p) => client.memoryProject(p));
  handle('memory:reconstruct', (p) => client.memoryReconstruct(p));
  handle('memory:similarity', (p) => client.memorySimilarity(p));
  handle('memory:entropy', (p) => client.memoryEntropy(p));
  handle('memory:checkpoint', (p) => client.memoryCheckpoint(p));
  handle('memory:rollback', (p) => client.memoryRollback(p));
  handle('memory:join', (p) => client.memoryJoin(p));
  handle('memory:delete', (p) => client.memoryDelete(p));

  // ═══════════════════════════════════════════════════════════════════
  // Social Graph (10 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('friends:list', (p) => client.friendsList(p ?? {}));
  handle('friends:add', (p) => client.friendsAdd(p));
  handle('friends:requests', () => client.friendsRequests());
  handle('friends:accept', (p) => client.friendsAccept(p));
  handle('friends:reject', (p) => client.friendsReject(p));
  handle('friends:block', (p) => client.friendsBlock(p));
  handle('friends:unblock', (p) => client.friendsUnblock(p));
  handle('profile:get', (p) => client.profileGet(p ?? {}));
  handle('profile:update', (p) => client.profileUpdate(p));
  handle('profile:links', (p) => client.profileLinks(p));

  // ═══════════════════════════════════════════════════════════════════
  // Messaging (7 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('chat:send', (p) => client.chatSend(p));
  handle('chat:inbox', (p) => client.chatInbox(p ?? {}));
  handle('chat:history', (p) => client.chatHistory(p));
  handle('chat:rooms:create', (p) => client.chatRoomsCreate(p));
  handle('chat:rooms:invite', (p) => client.chatRoomsInvite(p));
  handle('chat:rooms:send', (p) => client.chatRoomsSend(p));
  handle('chat:rooms:list', () => client.chatRoomsList());

  // ═══════════════════════════════════════════════════════════════════
  // Groups & Feed (11 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('groups:create', (p) => client.groupsCreate(p));
  handle('groups:join', (p) => client.groupsJoin(p));
  handle('groups:leave', (p) => client.groupsLeave(p));
  handle('groups:list', () => client.groupsList());
  handle('groups:posts', (p) => client.groupsPosts(p));
  handle('groups:post', (p) => client.groupsPost(p));
  handle('groups:react', (p) => client.groupsReact(p));
  handle('groups:comment', (p) => client.groupsComment(p));
  handle('groups:comments', (p) => client.groupsComments(p));
  handle('feed:get', (p) => client.feedGet(p ?? {}));
  handle('feed:markRead', (p) => client.feedMarkRead(p));

  // ═══════════════════════════════════════════════════════════════════
  // Coherence Network (7 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('coherence:submitClaim', (p) => client.coherenceSubmitClaim(p));
  handle('coherence:verifyClaim', (p) => client.coherenceVerifyClaim(p));
  handle('coherence:listTasks', (p) => client.coherenceListTasks(p ?? {}));
  handle('coherence:claimTask', (p) => client.coherenceClaimTask(p));
  handle('coherence:createEdge', (p) => client.coherenceCreateEdge(p));
  handle('coherence:createSynthesis', (p) => client.coherenceCreateSynthesis(p));
  handle('coherence:securityReview', (p) => client.coherenceSecurityReview(p));

  // ═══════════════════════════════════════════════════════════════════
  // Agent Management (9 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('agent:create', (p) => client.agentCreate(p));
  handle('agent:list', (p) => client.agentList(p ?? {}));
  handle('agent:get', (p) => client.agentGet(p));
  handle('agent:update', (p) => client.agentUpdate(p));
  handle('agent:delete', (p) => client.agentDelete(p));
  handle('agent:summon', (p) => client.agentSummon(p));
  handle('agent:step', (p) => client.agentStep(p));
  handle('agent:dismiss', (p) => client.agentDismiss(p));
  handle('agent:run', (p) => client.agentRun(p));

  // ═══════════════════════════════════════════════════════════════════
  // Wallet & Economics (5 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('wallet:balance', () => client.walletBalance());
  handle('wallet:send', (p) => client.walletSend(p));
  handle('wallet:stake', (p) => client.walletStake(p));
  handle('wallet:unstake', (p) => client.walletUnstake(p));
  handle('wallet:history', (p) => client.walletHistory(p ?? {}));

  // ═══════════════════════════════════════════════════════════════════
  // Tier 6.5: Domains (7 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('domain:register', (p) => client.domainRegister(p));
  handle('domain:get', (p) => client.domainGet(p));
  handle('domain:list', (p) => client.domainList(p ?? {}));
  handle('domain:join', (p) => client.domainJoin(p));
  handle('domain:leave', (p) => client.domainLeave(p));
  handle('domain:members', (p) => client.domainMembers(p));
  handle('domain:update-rules', (p) => client.domainUpdateRules(p));

  // ═══════════════════════════════════════════════════════════════════
  // Content Store (3 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('content:store', (p) => client.contentStoreData(p));
  handle('content:retrieve', (p) => client.contentRetrieve(p));
  handle('content:list', (p) => client.contentList(p ?? {}));

  // ═══════════════════════════════════════════════════════════════════
  // Identity Extended (3 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('identity:sign', (p) => client.identitySign(p));
  handle('identity:verify', (p) => client.identityVerify(p));
  handle('identity:export', () => client.identityExport());

  // ═══════════════════════════════════════════════════════════════════
  // Marketplace (4 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('marketplace:publish', (p) => client.marketplacePublish(p));
  handle('marketplace:list', (p) => client.marketplaceList(p ?? {}));
  handle('marketplace:install', (p) => client.marketplaceInstall(p));
  handle('marketplace:license', (p) => client.marketplaceLicense(p));

  // ═══════════════════════════════════════════════════════════════════
  // File System
  // ═══════════════════════════════════════════════════════════════════
  handle('fs:list', (p) => client.fsList(p));
  handle('fs:read', (p) => client.fsRead(p));
  handle('fs:write', (p) => client.fsWrite(p));
  handle('fs:home', () => client.fsHome());

  // ═══════════════════════════════════════════════════════════════════
  // Network (2 channels)
  // ═══════════════════════════════════════════════════════════════════
  handle('aleph:connect', () => client.connect());
  handle('aleph:status', () => client.getStatus());

  // ═══════════════════════════════════════════════════════════════════
  // Real-time Event Forwarding (main → renderer)
  // ═══════════════════════════════════════════════════════════════════
  const eventNames: (keyof AlephNetEvents)[] = [
    'aleph:directMessage',
    'aleph:roomMessage',
    'aleph:friendRequest',
    'aleph:groupPost',
    'aleph:feedUpdate',
    'aleph:coherenceTask',
    'aleph:agentStep',
    'aleph:teamStep',
    'aleph:memoryFieldUpdate',
    'aleph:walletTransaction',
  ];

  for (const eventName of eventNames) {
    client.on(eventName, (data: any) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(eventName, data);
      }
    });
  }
}
