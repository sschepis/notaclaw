// ═══════════════════════════════════════════════════════════════════════════
// AlephSocialClient — Friends, Profile, Direct Messaging & Chat Rooms
// Extracted from AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

import { AlephClientContext, generateId, now } from './types';
import type {
  Friend, FriendRequest, UserProfile, ProfileLink,
  DirectMessage, ChatRoom, RoomMessage, Conversation,
} from '../../../shared/alephnet-types';

// ─── AlephSocialClient ──────────────────────────────────────────────────

export class AlephSocialClient {
  private ctx: AlephClientContext;

  // ── Domain-specific state ────────────────────────────────────────────
  friends = new Map<string, Friend>();
  friendRequests = new Map<string, FriendRequest>();
  blockedUsers = new Set<string>();
  conversations = new Map<string, DirectMessage[]>();
  rooms = new Map<string, ChatRoom>();
  roomMessages = new Map<string, RoomMessage[]>();

  constructor(ctx: AlephClientContext) {
    this.ctx = ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Friends
  // ═══════════════════════════════════════════════════════════════════════

  async friendsList(params: { onlineFirst?: boolean }): Promise<{ friends: Friend[]; total: number }> {
    let list = [...this.friends.values()];
    if (params.onlineFirst) {
      list.sort((a, b) => (a.status === 'online' ? -1 : 1) - (b.status === 'online' ? -1 : 1));
    }
    return { friends: list, total: list.length };
  }

  async friendsAdd(params: { userId: string; message?: string }): Promise<{ requestId: string }> {
    const req: FriendRequest = {
      id: generateId('freq'),
      fromUserId: this.ctx.nodeId,
      fromDisplayName: this.ctx.profile?.displayName ?? 'Me',
      message: params.message,
      timestamp: now(),
      status: 'pending',
    };
    this.friendRequests.set(req.id, req);
    await this.ctx.bridge.put(`friends/requests/${params.userId}/${req.id}`, req);
    return { requestId: req.id };
  }

  async friendsRequests(): Promise<FriendRequest[]> {
    return [...this.friendRequests.values()].filter(r => r.status === 'pending');
  }

  async friendsAccept(params: { requestId: string }): Promise<{ accepted: boolean }> {
    const req = this.friendRequests.get(params.requestId);
    if (!req) return { accepted: false };
    req.status = 'accepted';
    const friend: Friend = {
      id: req.fromUserId,
      displayName: req.fromDisplayName,
      status: 'online',
      publicKey: '',
      resonance: 0.5,
      lastSeen: now(),
    };
    this.friends.set(friend.id, friend);
    return { accepted: true };
  }

  async friendsReject(params: { requestId: string }): Promise<{ rejected: boolean }> {
    const req = this.friendRequests.get(params.requestId);
    if (!req) return { rejected: false };
    req.status = 'rejected';
    return { rejected: true };
  }

  async friendsBlock(params: { userId: string }): Promise<{ blocked: boolean }> {
    this.blockedUsers.add(params.userId);
    this.friends.delete(params.userId);
    return { blocked: true };
  }

  async friendsUnblock(params: { userId: string }): Promise<{ unblocked: boolean }> {
    this.blockedUsers.delete(params.userId);
    return { unblocked: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Profile
  // ═══════════════════════════════════════════════════════════════════════

  async profileGet(params: { userId?: string }): Promise<UserProfile> {
    if (!params.userId || params.userId === this.ctx.nodeId) {
      if (!this.ctx.profile) {
        this.ctx.profile = {
          id: this.ctx.nodeId,
          displayName: `Node-${this.ctx.nodeId.substring(0, 6)}`,
          bio: '',
          links: [],
          tier: this.ctx.walletState.tier,
          reputation: 0,
          joinedAt: now(),
          publicKey: '',
        };
      }
      return this.ctx.profile;
    }
    // Look up friend profile
    const friend = this.friends.get(params.userId);
    return {
      id: params.userId,
      displayName: friend?.displayName ?? 'Unknown',
      bio: friend?.bio ?? '',
      links: [],
      tier: friend?.tier ?? 'Neophyte',
      reputation: 0,
      joinedAt: now(),
      publicKey: friend?.publicKey ?? '',
    };
  }

  async profileUpdate(params: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>): Promise<UserProfile> {
    const profile = await this.profileGet({});
    if (params.displayName) profile.displayName = params.displayName;
    if (params.bio) profile.bio = params.bio;
    if (params.avatar) profile.avatar = params.avatar;
    this.ctx.profile = profile;
    await this.ctx.bridge.put(`profiles/${this.ctx.nodeId}`, { displayName: profile.displayName, bio: profile.bio });
    return profile;
  }

  async profileLinks(params: { action: 'add' | 'remove'; url: string; title?: string }): Promise<ProfileLink[]> {
    const profile = await this.profileGet({});
    if (params.action === 'add') {
      profile.links.push({ url: params.url, title: params.title ?? params.url });
    } else {
      profile.links = profile.links.filter(l => l.url !== params.url);
    }
    this.ctx.profile = profile;
    return profile.links;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Direct Messaging
  // ═══════════════════════════════════════════════════════════════════════

  async chatSend(params: { userId: string; message: string }): Promise<DirectMessage> {
    const dm: DirectMessage = {
      id: generateId('dm'),
      fromUserId: this.ctx.nodeId,
      fromDisplayName: this.ctx.profile?.displayName ?? 'Me',
      toUserId: params.userId,
      content: params.message,
      timestamp: now(),
      read: false,
    };
    const convKey = params.userId;
    const conv = this.conversations.get(convKey) ?? [];
    conv.push(dm);
    this.conversations.set(convKey, conv);
    await this.ctx.bridge.put(`messages/dm/${params.userId}/${dm.id}`, dm);
    return dm;
  }

  async chatInbox(params: { limit?: number }): Promise<Conversation[]> {
    const convos: Conversation[] = [];
    for (const [peerId, msgs] of this.conversations) {
      if (msgs.length === 0) continue;
      const last = msgs[msgs.length - 1];
      const friend = this.friends.get(peerId);
      convos.push({
        peerId,
        peerDisplayName: friend?.displayName ?? peerId.substring(0, 12),
        lastMessage: last.content,
        lastMessageAt: last.timestamp,
        unreadCount: msgs.filter(m => !m.read && m.fromUserId !== this.ctx.nodeId).length,
      });
    }
    convos.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return convos.slice(0, params.limit ?? 50);
  }

  async chatHistory(params: { userId: string; limit?: number }): Promise<DirectMessage[]> {
    const msgs = this.conversations.get(params.userId) ?? [];
    return msgs.slice(-(params.limit ?? 50));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Chat Rooms
  // ═══════════════════════════════════════════════════════════════════════

  async chatRoomsCreate(params: { name: string; description?: string }): Promise<ChatRoom> {
    const room: ChatRoom = {
      id: generateId('room'),
      name: params.name,
      description: params.description ?? '',
      members: [this.ctx.nodeId],
      memberCount: 1,
      createdBy: this.ctx.nodeId,
      createdAt: now(),
    };
    this.rooms.set(room.id, room);
    this.roomMessages.set(room.id, []);
    await this.ctx.bridge.put(`rooms/${room.id}`, { name: room.name });
    return room;
  }

  async chatRoomsInvite(params: { roomId: string; userId: string }): Promise<{ invited: boolean }> {
    const room = this.rooms.get(params.roomId);
    if (!room) return { invited: false };
    if (!room.members.includes(params.userId)) {
      room.members.push(params.userId);
      room.memberCount = room.members.length;
    }
    return { invited: true };
  }

  async chatRoomsSend(params: { roomId: string; message: string }): Promise<RoomMessage> {
    const msg: RoomMessage = {
      id: generateId('rmsg'),
      roomId: params.roomId,
      fromUserId: this.ctx.nodeId,
      fromDisplayName: this.ctx.profile?.displayName ?? 'Me',
      content: params.message,
      timestamp: now(),
    };
    const msgs = this.roomMessages.get(params.roomId) ?? [];
    msgs.push(msg);
    this.roomMessages.set(params.roomId, msgs);
    const room = this.rooms.get(params.roomId);
    if (room) room.lastMessageAt = msg.timestamp;
    await this.ctx.bridge.put(`rooms/${params.roomId}/messages/${msg.id}`, msg);
    this.ctx.emit('aleph:roomMessage', msg);
    return msg;
  }

  async chatRoomsList(): Promise<ChatRoom[]> {
    return [...this.rooms.values()];
  }
}
