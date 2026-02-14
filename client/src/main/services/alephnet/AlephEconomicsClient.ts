// ═══════════════════════════════════════════════════════════════════════════
// AlephEconomicsClient — Wallet, Domains, Content, Identity,
//                        Marketplace & Filesystem sub-module
// Extracted from AlephNetClient monolith.
// ═══════════════════════════════════════════════════════════════════════════

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { AlephClientContext, generateId, now } from './types';
import type { AlephMemoryClient } from './AlephMemoryClient';
import type {
  WalletBalance, Transaction, StakeInfo,
  DomainDefinition, DomainRules, DomainMembership, DomainVisibility,
  StoredContent, ContentListItem,
  FileSystemItem,
  PluginRegistryEntry, PluginLicense,
} from '../../../shared/alephnet-types';

// ─── AlephEconomicsClient ───────────────────────────────────────────────

export class AlephEconomicsClient {
  private ctx: AlephClientContext;

  /**
   * Reference to the memory client, needed for marketplace publish/list
   * operations that store plugin manifests as memory fragments.
   * Set via `setMemoryClient()` after construction to avoid circular deps.
   */
  private memoryClient: AlephMemoryClient | null = null;

  // ── Domain-specific state ────────────────────────────────────────────
  transactions: Transaction[] = [];
  contentStore = new Map<string, StoredContent>();

  constructor(ctx: AlephClientContext) {
    this.ctx = ctx;
  }

  /**
   * Inject the AlephMemoryClient for marketplace operations.
   * Called after both clients are constructed to avoid circular dependencies.
   */
  setMemoryClient(client: AlephMemoryClient): void {
    this.memoryClient = client;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Wallet & Economics
  // ═══════════════════════════════════════════════════════════════════════

  async walletBalance(): Promise<WalletBalance> {
    return { ...this.ctx.walletState };
  }

  async walletSend(params: { userId: string; amount: number; memo?: string }): Promise<Transaction> {
    if (this.ctx.walletState.balance < params.amount) throw new Error('Insufficient balance');
    this.ctx.walletState.balance -= params.amount;
    const tx: Transaction = {
      id: generateId('tx'),
      type: 'transfer',
      amount: params.amount,
      from: this.ctx.nodeId,
      to: params.userId,
      memo: params.memo,
      timestamp: now(),
    };
    this.transactions.push(tx);
    this.ctx.emit('aleph:walletTransaction', tx);
    return tx;
  }

  async walletStake(params: { amount: number; lockDays: number }): Promise<StakeInfo> {
    if (this.ctx.walletState.balance < params.amount) throw new Error('Insufficient balance');
    this.ctx.walletState.balance -= params.amount;
    this.ctx.walletState.staked += params.amount;
    // Determine tier
    if (this.ctx.walletState.staked >= 10000) this.ctx.walletState.tier = 'Archon';
    else if (this.ctx.walletState.staked >= 1000) this.ctx.walletState.tier = 'Magus';
    else if (this.ctx.walletState.staked >= 100) this.ctx.walletState.tier = 'Adept';
    else this.ctx.walletState.tier = 'Neophyte';
    const tx: Transaction = { id: generateId('tx'), type: 'stake', amount: params.amount, timestamp: now() };
    this.transactions.push(tx);
    return {
      amount: params.amount,
      lockDays: params.lockDays,
      unlockDate: now() + params.lockDays * 86400000,
      currentTier: this.ctx.walletState.tier,
    };
  }

  async walletUnstake(params: { amount: number }): Promise<Transaction> {
    if (this.ctx.walletState.staked < params.amount) throw new Error('Insufficient staked amount');
    this.ctx.walletState.staked -= params.amount;
    this.ctx.walletState.balance += params.amount;
    // Recalculate tier
    if (this.ctx.walletState.staked >= 10000) this.ctx.walletState.tier = 'Archon';
    else if (this.ctx.walletState.staked >= 1000) this.ctx.walletState.tier = 'Magus';
    else if (this.ctx.walletState.staked >= 100) this.ctx.walletState.tier = 'Adept';
    else this.ctx.walletState.tier = 'Neophyte';
    const tx: Transaction = { id: generateId('tx'), type: 'unstake', amount: params.amount, timestamp: now() };
    this.transactions.push(tx);
    return tx;
  }

  async walletHistory(params: { limit?: number; type?: string }): Promise<Transaction[]> {
    let list = [...this.transactions];
    if (params.type) list = list.filter(t => t.type === params.type);
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list.slice(0, params.limit ?? 20);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Domains (delegated to ctx.domainManager)
  // ═══════════════════════════════════════════════════════════════════════

  async domainRegister(params: { handle: string; name: string; description: string; visibility: DomainVisibility; rules?: Partial<DomainRules> }): Promise<DomainDefinition> {
    return this.ctx.domainManager.registerDomain(params.handle, params.name, params.description, params.visibility, params.rules);
  }

  async domainGet(params: { domainId?: string; handle?: string }): Promise<DomainDefinition> {
    if (params.domainId) {
      const domain = await this.ctx.domainManager.getDomain(params.domainId);
      if (!domain) throw new Error("Domain not found");
      return domain;
    }
    if (params.handle) {
      const domain = await this.ctx.domainManager.getDomainByHandle(params.handle);
      if (!domain) throw new Error("Domain not found");
      return domain;
    }
    throw new Error("Either domainId or handle must be provided");
  }

  async domainList(params: { limit?: number }): Promise<DomainDefinition[]> {
    return this.ctx.domainManager.listDomains(params.limit);
  }

  async domainJoin(params: { domainId: string }): Promise<{ status: any }> {
    return this.ctx.domainManager.joinDomain(params.domainId);
  }

  async domainLeave(params: { domainId: string }): Promise<{ left: boolean }> {
    return { left: await this.ctx.domainManager.leaveDomain(params.domainId) };
  }

  async domainMembers(params: { domainId: string; limit?: number }): Promise<DomainMembership[]> {
    return this.ctx.domainManager.getMembers(params.domainId, params.limit);
  }

  async domainUpdateRules(_params: { domainId: string; rules: Partial<DomainRules> }): Promise<DomainDefinition> {
    // TODO: Implement update rules in DomainManager
    throw new Error("Not implemented");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Content Store
  // ═══════════════════════════════════════════════════════════════════════

  async contentStoreData(params: { data: string; visibility: 'public' | 'private' }): Promise<StoredContent> {
    const hash = 'Qm' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    const content: StoredContent = {
      hash,
      data: params.data,
      visibility: params.visibility,
      size: params.data.length,
      createdAt: now(),
    };
    this.contentStore.set(hash, content);
    return content;
  }

  async contentRetrieve(params: { hash: string }): Promise<StoredContent> {
    const content = this.contentStore.get(params.hash);
    if (!content) throw new Error(`Content ${params.hash} not found`);
    return content;
  }

  async contentList(params: { visibility?: string; limit?: number }): Promise<ContentListItem[]> {
    let list = [...this.contentStore.values()];
    if (params.visibility) list = list.filter(c => c.visibility === params.visibility);
    return list.slice(0, params.limit ?? 20).map(({ hash, visibility, size, createdAt }) => ({ hash, visibility, size, createdAt }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Identity (extended)
  // ═══════════════════════════════════════════════════════════════════════

  async identitySign(_params: { message: string }): Promise<{ signature: string }> {
    return { signature: 'sig_' + Math.random().toString(36).slice(2, 20) };
  }

  async identityVerify(params: { message: string; signature: string; publicKey: string }): Promise<{ valid: boolean }> {
    return { valid: params.signature.startsWith('sig_') };
  }

  async identityExport(): Promise<{ publicKey: string; fingerprint: string; resonance: number[] }> {
    return {
      publicKey: 'pk_' + this.ctx.nodeId,
      fingerprint: this.ctx.nodeId.substring(0, 16),
      resonance: Array.from({ length: 16 }, () => Math.random()),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Marketplace
  // ═══════════════════════════════════════════════════════════════════════

  async marketplacePublish(params: { manifest: Omit<PluginRegistryEntry, 'authorId'|'createdAt'|'updatedAt'> }): Promise<{ success: boolean; entry: PluginRegistryEntry }> {
    if (!this.memoryClient) throw new Error('Memory client not configured');

    const MARKETPLACE_FIELD_ID = 'global-marketplace-registry';

    if (this.ctx.walletState.balance < params.manifest.bondAmount) {
      throw new Error(`Insufficient balance for bond. Required: ${params.manifest.bondAmount}, Available: ${this.ctx.walletState.balance}`);
    }

    await this.walletStake({ amount: params.manifest.bondAmount, lockDays: 30 });

    const entry: PluginRegistryEntry = {
      ...params.manifest,
      authorId: this.ctx.nodeId,
      createdAt: now(),
      updatedAt: now(),
    };

    if (!this.memoryClient.memoryFields.has(MARKETPLACE_FIELD_ID)) {
      await this.memoryClient.memoryCreate({
        name: 'Marketplace Registry',
        scope: 'global',
        visibility: 'public',
        description: 'Registry of published plugins',
      });
      // Find the created field and rename ID (hack for MVP)
      for (const [id, f] of this.memoryClient.memoryFields) {
        if (f.name === 'Marketplace Registry' && f.id !== MARKETPLACE_FIELD_ID) {
          this.memoryClient.memoryFields.delete(id);
          f.id = MARKETPLACE_FIELD_ID;
          this.memoryClient.memoryFields.set(MARKETPLACE_FIELD_ID, f);
          this.memoryClient.memoryFragments.set(MARKETPLACE_FIELD_ID, []);
          break;
        }
      }
    }

    await this.memoryClient.memoryStore({
      fieldId: MARKETPLACE_FIELD_ID,
      content: JSON.stringify(entry),
      metadata: { type: 'plugin-manifest', pluginId: entry.id },
    });

    return { success: true, entry };
  }

  async marketplaceList(params: { query?: string; tag?: string }): Promise<PluginRegistryEntry[]> {
    if (!this.memoryClient) return [];

    const MARKETPLACE_FIELD_ID = 'global-marketplace-registry';
    const frags = this.memoryClient.memoryFragments.get(MARKETPLACE_FIELD_ID) ?? [];

    let entries = frags
      .filter(f => f.metadata.type === 'plugin-manifest')
      .map(f => {
        try { return JSON.parse(f.content) as PluginRegistryEntry; }
        catch { return null; }
      })
      .filter((e): e is PluginRegistryEntry => e !== null);

    if (params.query) {
      const q = params.query.toLowerCase();
      entries = entries.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    if (params.tag) {
      entries = entries.filter(e => e.tags.includes(params.tag!));
    }

    return entries;
  }

  async marketplaceInstall(params: { pluginId: string }): Promise<{ success: boolean; license?: PluginLicense }> {
    const entries = await this.marketplaceList({});
    const plugin = entries.find(e => e.id === params.pluginId);
    if (!plugin) throw new Error('Plugin not found');

    if (plugin.pricing.type === 'free') {
      const license: PluginLicense = {
        pluginId: plugin.id,
        userId: this.ctx.nodeId,
        type: 'perpetual',
        status: 'active',
        purchasedAt: now(),
        transactionId: 'free-' + generateId(),
      };
      return { success: true, license };
    } else {
      if (this.ctx.walletState.balance < plugin.pricing.amount) {
        throw new Error('Insufficient balance');
      }

      const tx = await this.walletSend({
        userId: plugin.authorId,
        amount: plugin.pricing.amount,
        memo: `License for ${plugin.id}`,
      });

      const license: PluginLicense = {
        pluginId: plugin.id,
        userId: this.ctx.nodeId,
        type: plugin.pricing.type === 'subscription' ? 'subscription' : 'perpetual',
        status: 'active',
        purchasedAt: now(),
        transactionId: tx.id,
      };

      return { success: true, license };
    }
  }

  async marketplaceLicense(_params: { pluginId: string }): Promise<PluginLicense | null> {
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // File System
  // ═══════════════════════════════════════════════════════════════════════

  async fsList(params: { path: string }): Promise<FileSystemItem[]> {
    try {
      const entries = await fs.readdir(params.path, { withFileTypes: true });
      return Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(params.path, entry.name);
        let size = 0;
        let lastModified = 0;
        try {
          const stats = await fs.stat(fullPath);
          size = stats.size;
          lastModified = stats.mtimeMs;
        } catch (e) {
          // Ignore stat errors (e.g. permission denied)
        }
        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size,
          lastModified,
        };
      }));
    } catch (error) {
      console.error(`fsList error for ${params.path}:`, error);
      throw error;
    }
  }

  async fsRead(params: { path: string }): Promise<string> {
    return fs.readFile(params.path, 'utf-8');
  }

  async fsWrite(params: { path: string; content: string }): Promise<{ success: boolean }> {
    await fs.writeFile(params.path, params.content, 'utf-8');
    return { success: true };
  }

  async fsHome(): Promise<string> {
    return app.getPath('home');
  }
}
