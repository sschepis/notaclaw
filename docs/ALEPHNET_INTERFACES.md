                                qqq qq# AlephNet Interface Plan

> Comprehensive list of interfaces needed to expose AlephNet functionality to users of the Electron app.

## Current State Summary

The app is an Electron-based "AlephNet Resonant Terminal" with:
- **Main process**: `DSNNode`, `AlephGunBridge` (thin Gun.js wrapper), `AIProviderManager`, `IdentityManager`, `SessionManager`, `SecretsManager`, `PluginManager`, `ServiceRegistry`, `ServiceClient`
- **Renderer**: Zustand store (`useAppStore`), layout components (NavRail, Sidebar, Stage/ChatView, Inspector with Cortex/Mesh/Session/Ledger/Console panels)
- **IPC bridge**: Identity, AI settings, sessions, services, logs, secrets, plugins — all wired through `preload/index.ts`

AlephNet Node provides **7 tiers** of functionality. Below is every interface needed, organized by architectural layer.

---

## 1. Shared Types (`client/src/shared/alephnet-types.ts`)

New type definitions needed for all AlephNet entities:

### 1.1 Semantic Computing Types
- `ThinkResult` — coherence score, themes[], insight string, suggested actions[]
- `CompareResult` — similarity (0-1), explanation, shared themes[], different themes[]
- `IntrospectionResult` — state (focused/exploring/etc), mood, confidence, recommendations[]
- `FocusResult` — focused topics[], expiration timestamp
- `ExploreResult` — session status, initial themes[]

### 1.2 Memory Field Types
- `MemoryField` — id, name, scope (global|user|conversation|organization), description, consensusThreshold, visibility, primeSignature, entropy, locked
- `MemoryFragment` — id, content, significance, primeFactors[], metadata, similarity?, confidence?, sourceNode?
- `MemoryFieldEntropy` — shannon entropy, stability trend, coherence metric
- `MemoryCheckpoint` — path, checksum, timestamp
- `HolographicPattern` — gridSize, field (intensity/phase arrays)
- `CreateMemoryFieldOptions` — name, scope, description?, consensusThreshold?, visibility?
- `StoreMemoryOptions` — fieldId, content, significance?, primeFactors?, metadata?
- `QueryMemoryOptions` — fieldId, query, threshold?, limit?, primeQuery?
- `QueryGlobalOptions` — query, minConsensus?

### 1.3 Social Graph Types
- `Friend` — id, displayName, status (online|offline|away), publicKey, resonance, lastSeen
- `FriendRequest` — id, fromUserId, fromDisplayName, message?, timestamp, status (pending|accepted|rejected)
- `UserProfile` — id, displayName, bio, avatar?, links[], tier, reputation, joinedAt
- `ProfileLink` — url, title, icon?

### 1.4 Messaging Types
- `DirectMessage` — id, fromUserId, toUserId, content, timestamp, read
- `ChatRoom` — id, name, description, members[], createdBy, createdAt
- `RoomMessage` — id, roomId, fromUserId, content, timestamp

### 1.5 Groups & Feed Types
- `Group` — id, name, topic, visibility (public|private), memberCount, createdBy, createdAt
- `GroupPost` — id, groupId, authorId, content, timestamp, reactions{}, commentCount
- `GroupComment` — id, postId, authorId, content, timestamp
- `FeedItem` — id, type (post|message|claim|event), source, content, timestamp, read

### 1.6 Coherence Network Types
- `Claim` — id, statement, authorId, status (OPEN|VERIFIED|REFUTED|DISPUTED), verificationCount, consensusScore, timestamp
- `VerificationTask` — id, claimId, type (VERIFY|SYNTHESIZE|REVIEW), status (OPEN|CLAIMED|COMPLETED), reward, assignedTo?
- `CoherenceEdge` — id, fromClaimId, toClaimId, edgeType (SUPPORTS|CONTRADICTS|REFINES), authorId
- `Synthesis` — id, title, acceptedClaimIds[], authorId, status, timestamp

### 1.7 Agent Management Types (SRIA)
- `SRIAAgent` — id, name, templateId?, status (idle|active|dismissed), goalPriors, beliefs[], createdAt
- `AgentTemplate` — id, name, description, defaultGoalPriors
- `AgentStepResult` — action, freeEnergy, learningUpdates[], beliefs[]
- `AgentSession` — sessionId, agentId, startedAt, beaconFingerprint?
- `AgentRunHandle` — runId, agentId, status (running|stopped|completed), steps, maxSteps

### 1.8 Agent Team Types
- `AgentTeam` — id, name, agentIds[], createdAt
- `CollectiveStepResult` — collectiveFreeEnergy, sharedBeliefs[], phaseAlignment, agentResults[]

### 1.9 Wallet / Economic Types
- `WalletBalance` — balance, staked, tier (Neophyte|Adept|Magus|Archon), pendingRewards
- `Transaction` — id, type (transfer|stake|unstake|reward|fee), amount, from?, to?, memo?, timestamp
- `StakeInfo` — amount, lockDays, unlockDate, tier

### 1.10 Content Store Types
- `StoredContent` — hash, data?, visibility (public|private), size, createdAt
- `ContentListItem` — hash, visibility, size, createdAt

### 1.11 Node / Network Types
- `NodeStatus` — id, status (ONLINE|DRAINING|OFFLINE), tier, peers, uptime, version, semanticDomain

---

## 2. IPC Channels (`client/src/main/index.ts`)

New `ipcMain.handle(...)` registrations grouped by feature:

### 2.1 Semantic Computing (6 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `aleph:think` | `{ text, depth? }` | `ThinkResult` |
| `aleph:compare` | `{ text1, text2 }` | `CompareResult` |
| `aleph:remember` | `{ content, importance? }` | `{ confirmed, themes[] }` |
| `aleph:recall` | `{ query, limit? }` | `MemoryFragment[]` |
| `aleph:introspect` | — | `IntrospectionResult` |
| `aleph:focus` | `{ topics, duration? }` | `FocusResult` |

### 2.2 Memory Fields (16 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `memory:create` | `CreateMemoryFieldOptions` | `MemoryField` |
| `memory:list` | `{ scope?, includePublic? }` | `MemoryField[]` |
| `memory:get` | `{ fieldId }` | `MemoryField` |
| `memory:store` | `StoreMemoryOptions` | `MemoryFragment` |
| `memory:query` | `QueryMemoryOptions` | `{ fragments: MemoryFragment[] }` |
| `memory:queryGlobal` | `QueryGlobalOptions` | `{ fragments: MemoryFragment[] }` |
| `memory:contribute` | `{ fieldId, content }` | `{ contributionId, status }` |
| `memory:sync` | `{ conversationId, targetFieldId, verifiedOnly? }` | `{ syncedCount, entropyDelta }` |
| `memory:project` | `{ text, gridSize? }` | `HolographicPattern` |
| `memory:reconstruct` | `{ pattern }` | `{ amplitudes, phases }` |
| `memory:similarity` | `{ fragment1, fragment2 }` | `{ similarity, correlationPattern }` |
| `memory:entropy` | `{ fieldId }` | `MemoryFieldEntropy` |
| `memory:checkpoint` | `{ fieldId }` | `MemoryCheckpoint` |
| `memory:rollback` | `{ fieldId, checkpointId }` | `{ restored, verified }` |
| `memory:join` | `{ fieldId }` | `{ joined: boolean }` |
| `memory:delete` | `{ fieldId, force? }` | `{ deleted: boolean }` |

### 2.3 Social Graph (10 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `friends:list` | `{ onlineFirst? }` | `{ friends: Friend[], total }` |
| `friends:add` | `{ userId, message? }` | `{ requestId }` |
| `friends:requests` | — | `FriendRequest[]` |
| `friends:accept` | `{ requestId }` | `{ accepted: boolean }` |
| `friends:reject` | `{ requestId }` | `{ rejected: boolean }` |
| `friends:block` | `{ userId }` | `{ blocked: boolean }` |
| `friends:unblock` | `{ userId }` | `{ unblocked: boolean }` |
| `profile:get` | `{ userId? }` | `UserProfile` |
| `profile:update` | `{ displayName?, bio?, avatar? }` | `UserProfile` |
| `profile:links` | `{ action: 'add'\|'remove', url, title? }` | `ProfileLink[]` |

### 2.4 Messaging (7 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `chat:send` | `{ userId, message }` | `DirectMessage` |
| `chat:inbox` | `{ limit? }` | `DirectMessage[]` |
| `chat:history` | `{ userId, limit? }` | `DirectMessage[]` |
| `chat:rooms:create` | `{ name, description? }` | `ChatRoom` |
| `chat:rooms:invite` | `{ roomId, userId }` | `{ invited: boolean }` |
| `chat:rooms:send` | `{ roomId, message }` | `RoomMessage` |
| `chat:rooms:list` | — | `ChatRoom[]` |

### 2.5 Groups & Feed (8 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `groups:create` | `{ name, topic, visibility }` | `Group` |
| `groups:join` | `{ groupId }` | `{ joined: boolean }` |
| `groups:leave` | `{ groupId }` | `{ left: boolean }` |
| `groups:list` | — | `Group[]` |
| `groups:post` | `{ groupId, content }` | `GroupPost` |
| `groups:react` | `{ groupId, postId, reaction }` | `{ reacted: boolean }` |
| `groups:comment` | `{ groupId, postId, content }` | `GroupComment` |
| `feed:get` | `{ limit? }` | `FeedItem[]` |

### 2.6 Coherence Network (7 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `coherence:submitClaim` | `{ statement }` | `Claim` |
| `coherence:verifyClaim` | `{ claimId, result, evidence }` | `{ verified: boolean }` |
| `coherence:listTasks` | `{ type?, status? }` | `VerificationTask[]` |
| `coherence:claimTask` | `{ taskId }` | `{ claimed: boolean }` |
| `coherence:createEdge` | `{ fromClaimId, toClaimId, edgeType }` | `CoherenceEdge` |
| `coherence:createSynthesis` | `{ title, acceptedClaimIds }` | `Synthesis` |
| `coherence:securityReview` | `{ synthesisId }` | `{ requestId }` |

### 2.7 Agent Management (9 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `agent:create` | `{ name, templateId? }` | `SRIAAgent` |
| `agent:list` | `{ name? }` | `SRIAAgent[]` |
| `agent:get` | `{ agentId }` | `SRIAAgent` |
| `agent:update` | `{ agentId, goalPriors? }` | `SRIAAgent` |
| `agent:delete` | `{ agentId }` | `{ deleted: boolean }` |
| `agent:summon` | `{ agentId, context? }` | `AgentSession` |
| `agent:step` | `{ agentId, observation }` | `AgentStepResult` |
| `agent:dismiss` | `{ agentId }` | `{ beaconFingerprint }` |
| `agent:run` | `{ agentId, maxSteps? }` | `AgentRunHandle` |

### 2.8 Agent Teams (8 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `team:create` | `{ name, agentIds }` | `AgentTeam` |
| `team:list` | — | `AgentTeam[]` |
| `team:get` | `{ teamId }` | `AgentTeam` |
| `team:addAgent` | `{ teamId, agentId }` | `AgentTeam` |
| `team:removeAgent` | `{ teamId, agentId }` | `AgentTeam` |
| `team:summon` | `{ teamId }` | `{ summoned: boolean }` |
| `team:step` | `{ teamId, observation }` | `CollectiveStepResult` |
| `team:dismiss` | `{ teamId }` | `{ dismissed: boolean }` |

### 2.9 Wallet / Economics (5 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `wallet:balance` | — | `WalletBalance` |
| `wallet:send` | `{ userId, amount, memo? }` | `Transaction` |
| `wallet:stake` | `{ amount, lockDays }` | `StakeInfo` |
| `wallet:unstake` | `{ amount }` | `Transaction` |
| `wallet:history` | `{ limit?, type? }` | `Transaction[]` |

### 2.10 Content Store (3 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `content:store` | `{ data, visibility }` | `StoredContent` |
| `content:retrieve` | `{ hash }` | `StoredContent` |
| `content:list` | `{ visibility?, limit? }` | `ContentListItem[]` |

### 2.11 Identity (extended) (3 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `identity:sign` | `{ message }` | `{ signature }` |
| `identity:verify` | `{ message, signature, publicKey }` | `{ valid: boolean }` |
| `identity:export` | — | `{ publicKey, fingerprint, resonance }` |

### 2.12 Network (2 channels)
| Channel | Params | Returns |
|---------|--------|---------|
| `aleph:connect` | — | `{ connected: boolean }` |
| `aleph:status` | — | `NodeStatus` |

**Total: ~84 new IPC channels**

---

## 3. Preload Bridge Additions (`client/src/preload/index.ts`)

Every IPC channel above needs a corresponding `window.electronAPI` method. These also need to be declared in the `IElectronAPI` interface in `client/src/shared/types.ts`.

Additionally, subscribe-based events (real-time updates pushed from main → renderer):

| Event | Payload | Purpose |
|-------|---------|---------|
| `onDirectMessage` | `DirectMessage` | Incoming DM notification |
| `onRoomMessage` | `RoomMessage` | New room message |
| `onFriendRequest` | `FriendRequest` | Incoming friend request |
| `onGroupPost` | `GroupPost` | New post in joined group |
| `onFeedUpdate` | `FeedItem[]` | Feed refresh |
| `onCoherenceTask` | `VerificationTask` | New available verification task |
| `onAgentStep` | `AgentStepResult` | Agent step completion event |
| `onTeamStep` | `CollectiveStepResult` | Team step completion event |
| `onMemoryFieldUpdate` | `{ fieldId, entropy }` | Memory field change notification |
| `onWalletTransaction` | `Transaction` | Incoming transfer / reward |

---

## 4. Main Process Services (new files in `client/src/main/services/`)

### 4.1 `AlephNetClient.ts` — Core AlephNet Node wrapper
Central service that wraps the `@sschepis/alephnet-node` package and delegates to sub-managers. Initializes the AlephNet node, connects to the mesh, and routes IPC calls.

### 4.2 `MemoryFieldManager.ts`
Manages memory field CRUD, holographic encoding, querying, checkpointing, and rollback. Delegates to the AlephNet memory API.

### 4.3 `SocialManager.ts`
Handles friends, profiles, and social graph operations through AlephNet's friends/profiles modules.

### 4.4 `MessagingManager.ts`
Direct messages, chat rooms, real-time message subscriptions. Wraps AlephNet's `chat.*` actions and subscribes to Gun.js paths for live updates.

### 4.5 `GroupsManager.ts`
Group creation, membership, posting, reacting, commenting. Wraps AlephNet's `groups.*` and `feed.*` actions.

### 4.6 `CoherenceManager.ts`
Claim submission, verification tasks, edge creation, synthesis. Wraps AlephNet's `coherence.*` actions.

### 4.7 `AgentManager.ts`
SRIA agent lifecycle (create/summon/step/dismiss/run), agent templates, persistent state. Wraps AlephNet's `agent.*` actions.

### 4.8 `TeamManager.ts`
Agent team coordination, collective steps, belief propagation. Wraps AlephNet's `team.*` actions.

### 4.9 `WalletManager.ts`
Wallet balance, transfers, staking/unstaking, transaction history. Wraps AlephNet's `wallet.*` actions.

### 4.10 `ContentStoreManager.ts`
Content-addressed storage and retrieval. Wraps AlephNet's `content.*` actions.

---

## 5. Zustand Store Slices (new stores or extensions to `useAppStore.ts`)

### 5.1 `useMemoryStore.ts`
```
State: fields[], activeFieldId, queryResults[], isLoading
Actions: createField, listFields, queryField, storeToField, deleteField, setActiveField
```

### 5.2 `useSocialStore.ts`
```
State: friends[], friendRequests[], myProfile, blockedUsers[], isLoading
Actions: loadFriends, addFriend, acceptRequest, rejectRequest, blockUser, updateProfile
```

### 5.3 `useMessagingStore.ts`
```
State: conversations{}, activeConversation, rooms[], activeRoom, unreadCount
Actions: sendDM, loadInbox, loadHistory, createRoom, sendRoomMessage, setActiveConversation
```

### 5.4 `useGroupStore.ts`
```
State: groups[], activeGroupId, posts[], feed[], unreadFeedCount
Actions: createGroup, joinGroup, leaveGroup, createPost, reactToPost, commentOnPost, loadFeed
```

### 5.5 `useCoherenceStore.ts`
```
State: claims[], myVerifications[], availableTasks[], syntheses[]
Actions: submitClaim, verifyClaim, claimTask, createEdge, createSynthesis
```

### 5.6 `useAgentStore.ts`
```
State: agents[], teams[], activeAgentId, activeTeamId, runHandles{}
Actions: createAgent, summonAgent, stepAgent, dismissAgent, runAgent, createTeam, summonTeam, stepTeam
```

### 5.7 `useWalletStore.ts`
```
State: balance, staked, tier, transactions[], pendingRewards
Actions: loadBalance, send, stake, unstake, loadHistory
```

### 5.8 `useContentStore.ts`
```
State: storedContent[], isUploading
Actions: storeContent, retrieveContent, listContent
```

---

## 6. UI Components (React, in `client/src/renderer/components/`)

### 6.1 Messaging & Social (Priority: HIGH)

#### `messaging/DirectMessageView.tsx`
Full DM interface: conversation list on left, messages on right, composing. Replaces/extends the existing chat concept for peer-to-peer messaging.

#### `messaging/ChatRoomView.tsx`
Room-based chat with member list, room settings, invite controls.

#### `messaging/InboxPanel.tsx`
Unified inbox showing DMs and room messages, badge counts.

#### `social/FriendsList.tsx` (upgrade existing `FriendsPanel.tsx`)
Real friends list with online status, search, add friend button, pending requests section.

#### `social/FriendRequestCard.tsx`
Individual friend request with accept/reject/block actions.

#### `social/ProfileCard.tsx`
User profile display (own and others), with edit capability for own profile.

#### `social/ProfileEditor.tsx`
Full profile editing form: display name, bio, avatar, links.

### 6.2 Groups & Feed (Priority: HIGH)

#### `groups/GroupListView.tsx`
Browse available groups, search, create new group button.

#### `groups/GroupDetailView.tsx`
Single group view with posts feed, post composer, member list.

#### `groups/GroupPostCard.tsx`
Individual post with reactions, comment count, expand to comments.

#### `groups/GroupComposer.tsx`
Text input for creating a group post.

#### `groups/FeedView.tsx`
Unified activity feed from all joined groups, friends, and coherence events.

### 6.3 Memory Fields (Priority: HIGH)

#### `memory/MemoryFieldBrowser.tsx`
List and browse memory fields (my fields, public fields, global). Visual indicators for scope, entropy, consensus.

#### `memory/MemoryFieldDetail.tsx`
Single field view: query interface, stored fragments, entropy stats, checkpoint controls.

#### `memory/MemoryStoreDialog.tsx`
Modal for storing new knowledge to a memory field with significance slider.

#### `memory/MemoryQueryPanel.tsx`
Search/query interface with threshold slider, results display with similarity scores.

#### `memory/HolographicVisualization.tsx`
Visual rendering of holographic patterns (heat map or 3D surface).

#### `memory/MemoryFieldCreateDialog.tsx`
Form for creating a new memory field: name, scope, description, consensus threshold.

### 6.4 Coherence Network (Priority: HIGH)

#### `coherence/CoherenceDashboard.tsx`
Overview of the coherence network: active claims, open tasks, my verifications, reputation.

#### `coherence/ClaimSubmitForm.tsx`
Form for submitting a new claim for verification.

#### `coherence/ClaimCard.tsx`
Display a single claim with status, verification count, score.

#### `coherence/VerificationTaskList.tsx`
List of available verification tasks with rewards, claim to work on.

#### `coherence/VerificationWorkbench.tsx`
Interface for performing a verification: claim display, evidence editor, verdict buttons.

#### `coherence/SynthesisEditor.tsx`
Editor for creating syntheses from multiple verified claims.

#### `coherence/CoherenceGraph.tsx`
Visual graph of claims and their edges (supports/contradicts/refines).

### 6.5 Agent Management (Priority: MEDIUM)

#### `agents/AgentListView.tsx`
List all agents with status, summon/dismiss controls.

#### `agents/AgentCreateDialog.tsx`
Form for creating a new SRIA agent: name, template selection.

#### `agents/AgentDetailPanel.tsx`
Single agent view: state, beliefs, step controls, autonomous run toggle.

#### `agents/AgentStepLog.tsx`
Live log of agent perception-decision-action cycles.

#### `agents/TeamListView.tsx`
List all agent teams, create team, summon/dismiss.

#### `agents/TeamDetailPanel.tsx`
Team view: member agents, collective free energy, phase alignment visualization.

### 6.6 Wallet & Economics (Priority: MEDIUM)

#### `wallet/WalletPanel.tsx` (upgrade existing `LedgerPanel.tsx`)
Full wallet view: balance, tier badge, staking controls, recent transactions.

#### `wallet/SendTokensDialog.tsx`
Transfer tokens form: recipient, amount, memo.

#### `wallet/StakingDialog.tsx`
Staking interface: amount, lock period, tier upgrade preview.

#### `wallet/TransactionHistory.tsx`
Paginated transaction list with filters (transfers, stakes, rewards, fees).

### 6.7 Content Store (Priority: LOW)

#### `content/ContentBrowser.tsx`
Browse stored content, upload new content, retrieve by hash.

#### `content/ContentUploadDialog.tsx`
Upload form with visibility toggle.

### 6.8 Inspector Panel Extensions (Priority: MEDIUM)

#### `inspector/CoherencePanel.tsx`
Inspector tab showing coherence network status, active claims count, verification queue.

#### `inspector/MemoryPanel.tsx`
Inspector tab showing active memory field stats, entropy trends, recent queries.

#### `inspector/AgentPanel.tsx`
Inspector tab showing active SRIA agents, their states, team coordination metrics.

### 6.9 Navigation Additions (Priority: HIGH)

Updates to `NavRail.tsx`:
- Add **Groups** nav button → `activeSidebarView: 'groups'`
- Add **Messages** nav button → `activeSidebarView: 'messages'`  
- Add **Memory** nav button → `activeSidebarView: 'memory'`
- Add **Coherence** nav button → `activeSidebarView: 'coherence'`
- Add **Agents** nav button → `activeSidebarView: 'agents'`

Updates to `Sidebar.tsx`:
- Add cases for new sidebar views (groups, messages, memory, coherence, agents)

Updates to `useAppStore.ts`:
- Extend `activeSidebarView` type with: `'groups' | 'messages' | 'memory' | 'coherence' | 'agents'`

---

## 7. Implementation Priority Order

| Phase | Features | IPC Channels | Components | Complexity |
|-------|----------|-------------|------------|------------|
| **Phase 1** | Messaging + Social Graph | 17 channels | 7 components | Medium |
| **Phase 2** | Groups + Feed | 8 channels | 5 components | Medium |
| **Phase 3** | Memory Fields | 16 channels | 6 components | High |
| **Phase 4** | Coherence Network | 7 channels | 7 components | High |
| **Phase 5** | Wallet (upgrade) | 5 channels | 4 components | Low |
| **Phase 6** | Agent Management | 17 channels | 6 components | High |
| **Phase 7** | Content Store + Misc | 8 channels | 2 components | Low |
| **Phase 8** | Inspector extensions + Navigation polish | 0 | 6 components | Medium |

---

## 8. Summary Totals

| Layer | Count |
|-------|-------|
| New shared types | ~40 interfaces/types |
| New IPC channels | ~84 |
| New preload methods | ~84 invoke + ~10 subscribe |
| New main process services | 10 |
| New Zustand stores | 8 |
| New UI components | ~43 |
| NavRail additions | 5 new views |
| Inspector tab additions | 3 new panels |
