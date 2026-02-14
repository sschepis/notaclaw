// ═══════════════════════════════════════════════════════════════════════════
// AlephGroupsClient — Groups & Feed sub-module
// Extracted from AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

import { AlephClientContext, generateId, now } from './types';
import type {
  Group, GroupPost, GroupComment, FeedItem,
} from '../../../shared/alephnet-types';

// ─── Default groups seeded on first connect ─────────────────────────────

const INITIAL_GROUPS: Partial<Group>[] = [
  { name: 'AlephNet General', topic: 'General discussion about the AlephNet ecosystem', visibility: 'public' },
  { name: 'Prompt Engineering', topic: 'Share and refine your prompt crafting skills', visibility: 'public' },
  { name: 'Agent Development', topic: 'Building and deploying SRIA agents', visibility: 'public' },
  { name: 'Coherence & Truth', topic: 'Verifying claims and building the truth graph', visibility: 'public' },
  { name: 'Marketplace', topic: 'Trading plugins, skills, and resources', visibility: 'public' },
  { name: 'Developers', topic: 'Technical discussion and SDK support', visibility: 'public' },
  { name: 'Off-Topic', topic: 'Everything else', visibility: 'public' },
];

// ─── AlephGroupsClient ──────────────────────────────────────────────────

export class AlephGroupsClient {
  private ctx: AlephClientContext;

  // ── Domain-specific state ────────────────────────────────────────────
  groups = new Map<string, Group>();
  groupPosts = new Map<string, GroupPost[]>();
  postComments = new Map<string, GroupComment[]>();
  feedItems: FeedItem[] = [];

  constructor(ctx: AlephClientContext) {
    this.ctx = ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════════════

  async initializeDefaultGroups(): Promise<void> {
    if (this.groups.size > 0) return;

    console.log('AlephGroupsClient: Initializing default groups...');
    for (const g of INITIAL_GROUPS) {
      const exists = [...this.groups.values()].some(existing => existing.name === g.name);
      if (!exists) {
        await this.groupsCreate({
          name: g.name!,
          topic: g.topic!,
          visibility: g.visibility as 'public' | 'private',
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Groups
  // ═══════════════════════════════════════════════════════════════════════

  async groupsCreate(params: { name: string; topic: string; visibility: 'public' | 'private' }): Promise<Group> {
    const group: Group = {
      id: generateId('grp'),
      name: params.name,
      topic: params.topic,
      visibility: params.visibility,
      memberCount: 1,
      createdBy: this.ctx.nodeId,
      createdAt: now(),
      joined: true,
    };
    this.groups.set(group.id, group);
    this.groupPosts.set(group.id, []);
    await this.ctx.bridge.put(`groups/${group.id}`, { name: group.name, topic: group.topic });
    return group;
  }

  async groupsJoin(params: { groupId: string }): Promise<{ joined: boolean }> {
    const group = this.groups.get(params.groupId);
    if (!group) return { joined: false };
    group.joined = true;
    group.memberCount++;
    return { joined: true };
  }

  async groupsLeave(params: { groupId: string }): Promise<{ left: boolean }> {
    const group = this.groups.get(params.groupId);
    if (!group) return { left: false };
    group.joined = false;
    group.memberCount = Math.max(0, group.memberCount - 1);
    return { left: true };
  }

  async groupsList(): Promise<Group[]> {
    return [...this.groups.values()];
  }

  async groupsPosts(params: { groupId: string; limit?: number }): Promise<GroupPost[]> {
    const posts = this.groupPosts.get(params.groupId) ?? [];
    return posts.slice(-(params.limit ?? 50));
  }

  async groupsPost(params: { groupId: string; content: string }): Promise<GroupPost> {
    const post: GroupPost = {
      id: generateId('post'),
      groupId: params.groupId,
      authorId: this.ctx.nodeId,
      authorDisplayName: this.ctx.profile?.displayName ?? 'Me',
      content: params.content,
      timestamp: now(),
      reactions: {},
      commentCount: 0,
    };
    const posts = this.groupPosts.get(params.groupId) ?? [];
    posts.push(post);
    this.groupPosts.set(params.groupId, posts);
    await this.ctx.bridge.put(`groups/${params.groupId}/posts/${post.id}`, post);
    this.ctx.emit('aleph:groupPost', post);
    return post;
  }

  async groupsReact(params: { groupId: string; postId: string; reaction: string }): Promise<{ reacted: boolean }> {
    const posts = this.groupPosts.get(params.groupId) ?? [];
    const post = posts.find(p => p.id === params.postId);
    if (!post) return { reacted: false };
    post.reactions[params.reaction] = (post.reactions[params.reaction] ?? 0) + 1;
    return { reacted: true };
  }

  async groupsComment(params: { groupId: string; postId: string; content: string }): Promise<GroupComment> {
    const comment: GroupComment = {
      id: generateId('cmt'),
      postId: params.postId,
      authorId: this.ctx.nodeId,
      authorDisplayName: this.ctx.profile?.displayName ?? 'Me',
      content: params.content,
      timestamp: now(),
    };
    const comments = this.postComments.get(params.postId) ?? [];
    comments.push(comment);
    this.postComments.set(params.postId, comments);
    // Update post comment count
    const posts = this.groupPosts.get(params.groupId) ?? [];
    const post = posts.find(p => p.id === params.postId);
    if (post) post.commentCount++;
    return comment;
  }

  async groupsComments(params: { groupId: string; postId: string }): Promise<GroupComment[]> {
    return this.postComments.get(params.postId) ?? [];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Feed
  // ═══════════════════════════════════════════════════════════════════════

  async feedGet(params: { limit?: number }): Promise<FeedItem[]> {
    return this.feedItems.slice(-(params.limit ?? 50));
  }

  async feedMarkRead(params: { itemIds: string[] }): Promise<{ marked: number }> {
    let count = 0;
    for (const item of this.feedItems) {
      if (params.itemIds.includes(item.id)) {
        item.read = true;
        count++;
      }
    }
    return { marked: count };
  }
}
