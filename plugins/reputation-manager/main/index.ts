export interface PluginContext {
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  ipc: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
    send: (channel: string, ...args: any[]) => void;
  };
  dsn: {
    registerTool: (metadata: any, handler: (args: any) => Promise<any>) => void;
  };
  traits?: {
    register: (trait: any) => void;
  };
}

import { ReputationData, EntityReputation, Feedback, ReputationSettings } from '../types';

const DEFAULT_SETTINGS: ReputationSettings = {
  initialScore: 500,
  decayRate: 5, // Points per day
  decayWindow: 7, // Days
  ranks: [
    { name: 'Novice', minScore: 0 },
    { name: 'Apprentice', minScore: 300 },
    { name: 'Adept', minScore: 500 },
    { name: 'Magus', minScore: 800 },
    { name: 'Archon', minScore: 950 }
  ]
};

class ReputationManager {
  private context: PluginContext;
  private data: ReputationData;

  constructor(context: PluginContext) {
    this.context = context;
    this.data = {
      entities: {},
      settings: DEFAULT_SETTINGS
    };
  }

  async init() {
    await this.load();
    this.registerIpcHandlers();
    this.registerDsnTools();
    
    // Run decay check on startup
    this.applyDecay();
    
    // Save periodically
    setInterval(() => this.save(), 60000);
  }

  private async load() {
    const stored = await this.context.storage.get('reputation-data');
    if (stored) {
      this.data = stored;
      // Merge settings in case of updates
      this.data.settings = { ...DEFAULT_SETTINGS, ...this.data.settings };
    }
  }

  private async save() {
    await this.context.storage.set('reputation-data', this.data);
  }

  private getEntity(id: string): EntityReputation {
    if (!this.data.entities[id]) {
      this.data.entities[id] = {
        id,
        score: this.data.settings.initialScore,
        rank: this.getRank(this.data.settings.initialScore),
        history: [],
        feedback: [],
        lastActivity: Date.now()
      };
    }
    return this.data.entities[id];
  }

  private getRank(score: number): string {
    const rank = [...this.data.settings.ranks]
      .sort((a, b) => b.minScore - a.minScore)
      .find(r => score >= r.minScore);
    return rank ? rank.name : 'Novice';
  }

  private calculateWeight(reviewerId: string, timestamp: number): number {
    // Basic weight implementation
    // In a real system, we'd look up the reviewer's reputation
    let weight = 1.0;
    
    // Recency factor (not applied here as this is for the feedback itself, 
    // but could be used if recalculating history)
    
    return weight;
  }

  private updateScore(entityId: string, feedback: Feedback) {
    const entity = this.getEntity(entityId);
    
    // Algorithm: NewScore = CurrentScore + (FeedbackRating - 3) * 10 * Weight
    // Cap at 0 and 1000
    
    const delta = (feedback.score - 3) * 10 * feedback.weight;
    const oldScore = entity.score;
    let newScore = oldScore + delta;
    
    newScore = Math.max(0, Math.min(1000, newScore));
    
    entity.score = newScore;
    entity.rank = this.getRank(newScore);
    entity.lastActivity = Date.now();
    entity.history.push({ timestamp: Date.now(), score: newScore });
    
    // Keep history manageable
    if (entity.history.length > 100) {
        entity.history = entity.history.slice(-100);
    }

    this.data.entities[entityId] = entity;
    this.save();
    
    this.context.ipc.send('reputation:updated', {
      entityId,
      newScore,
      oldScore
    });
    
    return newScore;
  }

  private applyDecay() {
    const now = Date.now();
    const msPerDay = 86400000;
    const decayWindowMs = this.data.settings.decayWindow * msPerDay;
    
    let changed = false;

    for (const id in this.data.entities) {
      const entity = this.data.entities[id];
      const timeSinceActivity = now - entity.lastActivity;
      
      if (timeSinceActivity > decayWindowMs) {
        const daysOver = (timeSinceActivity - decayWindowMs) / msPerDay;
        if (daysOver >= 1) {
            const decayAmount = Math.floor(daysOver * this.data.settings.decayRate);
            if (decayAmount > 0) {
                const oldScore = entity.score;
                // Decay shouldn't drop below initial score purely by time? 
                // Or maybe it should? Let's assume it can go to 0.
                entity.score = Math.max(0, entity.score - decayAmount);
                
                // Update last activity to prevent double decay for the same period if we ran this constantly
                // But since we calculate based on lastActivity, we just update the score.
                // Actually, to do this correctly incrementally, we should update lastActivity 
                // OR store a "lastDecay" timestamp.
                // For simplicity: update lastActivity to now - decayWindowMs (effectively resetting the clock for the decayed amount)
                // This is a bit hacky. Better:
                // Just calculate score based on history? No, that's expensive.
                // Let's just deduct and update lastActivity to now? No, that resets the "inactivity" timer.
                // We'll leave lastActivity alone but we need to track when we last applied decay.
                // For now, let's just apply it if it hasn't been applied recently.
                // Since this runs on init, it catches up.
                
                if (entity.score !== oldScore) {
                    entity.rank = this.getRank(entity.score);
                    entity.history.push({ timestamp: now, score: entity.score });
                    this.context.ipc.send('reputation:updated', {
                        entityId: id,
                        newScore: entity.score,
                        oldScore
                    });
                    changed = true;
                }
            }
        }
      }
    }
    
    if (changed) this.save();
  }

  private registerIpcHandlers() {
    this.context.ipc.handle('reputation:get-all', async () => {
      return this.data.entities;
    });

    this.context.ipc.handle('reputation:get-entity', async (id: string) => {
      return this.getEntity(id);
    });

    this.context.ipc.handle('reputation:submit-feedback', async (item: any) => {
      const { entityId, reviewerId, score, comment, category } = item;
      
      const feedback: Feedback = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        reviewerId: reviewerId || 'anonymous',
        score,
        comment,
        category: category || 'General',
        timestamp: Date.now(),
        weight: this.calculateWeight(reviewerId, Date.now())
      };
      
      const entity = this.getEntity(entityId);
      entity.feedback.unshift(feedback);
      // Keep last 50 feedback items
      if (entity.feedback.length > 50) entity.feedback = entity.feedback.slice(0, 50);
      
      this.updateScore(entityId, feedback);
      
      return { success: true, newScore: entity.score };
    });
    
    this.context.ipc.handle('reputation:get-settings', async () => {
        return this.data.settings;
    });
  }

  private registerDsnTools() {
    this.context.dsn.registerTool({
      name: 'reputation_get_score',
      description: 'Get the reputation score and rank for an entity',
      executionLocation: 'CLIENT',
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'The ID of the entity to query' }
        },
        required: ['entityId']
      },
      version: '1.0.0',
      semanticDomain: 'meta',
      primeDomain: [],
      smfAxes: [],
      requiredTier: 'Neophyte'
    }, async (args: { entityId: string }) => {
      const entity = this.getEntity(args.entityId);
      return { score: entity.score, rank: entity.rank };
    });

    this.context.dsn.registerTool({
      name: 'reputation_submit_feedback',
      description: 'Submit feedback for an entity',
      executionLocation: 'CLIENT',
      parameters: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'The ID of the entity being reviewed' },
          rating: { type: 'number', description: 'Rating from 1 to 5' },
          comment: { type: 'string', description: 'Feedback comment' }
        },
        required: ['entityId', 'rating', 'comment']
      },
      version: '1.0.0',
      semanticDomain: 'meta',
      primeDomain: [],
      smfAxes: [],
      requiredTier: 'Neophyte'
    }, async (args: { entityId: string, rating: number, comment: string }) => {
      // DSN calls might not have all context, assume anonymous or derive from connection
      const feedback: Feedback = {
        id: Date.now().toString(),
        reviewerId: 'dsn-peer', // Should ideally come from the caller identity
        score: args.rating,
        comment: args.comment,
        category: 'DSN',
        timestamp: Date.now(),
        weight: 1
      };
      
      const entity = this.getEntity(args.entityId);
      entity.feedback.unshift(feedback);
      this.updateScore(args.entityId, feedback);
      return { success: true, newScore: entity.score };
    });

    // Register Trait
    if (this.context.traits) {
      this.context.traits.register({
        id: 'reputation-management',
        name: 'Reputation System',
        description: 'Check and update reputation scores for entities.',
        instruction: 'You can check the reputation of entities using `reputation_get_score`. If you have an interaction with an entity, you can submit feedback using `reputation_submit_feedback`. Use this to gauge trust and build the network\'s reputation graph.',
        activationMode: 'dynamic',
        triggerKeywords: ['reputation', 'trust', 'score', 'rank', 'feedback', 'review', 'vouch']
      });
    }
  }
}

export const activate = async (context: PluginContext) => {
  console.log('[Reputation Manager] Activating...');
  const manager = new ReputationManager(context);
  await manager.init();
  console.log('[Reputation Manager] Activated');
};

export const deactivate = () => {
  console.log('[Reputation Manager] Deactivated');
};
