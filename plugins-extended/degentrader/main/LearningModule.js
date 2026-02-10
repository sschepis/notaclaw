
class LearningModule {
  constructor(context) {
    this.context = context;
    this.history = [];
    this.performanceStats = {
      totalTrades: 0,
      profitableTrades: 0,
      totalProfit: 0
    };
  }

  async initialize() {
    this.history = await this.context.storage.get('trade_history') || [];
    this.performanceStats = await this.context.storage.get('performance_stats') || this.performanceStats;
  }

  async recordDecision(opportunity, score, strategies) {
    // Record the decision context
    const decision = {
      timestamp: Date.now(),
      opportunity,
      score,
      activeStrategies: strategies.filter(s => s.enabled).map(s => s.name)
    };
    
    this.history.push(decision);
    if (this.history.length > 1000) this.history.shift(); // Keep last 1000 decisions
    
    await this.context.storage.set('trade_history', this.history);
  }

  async recordOutcome(tradeId, profit) {
    // Find the trade in history (if linked) and update stats
    this.performanceStats.totalTrades++;
    if (profit > 0) this.performanceStats.profitableTrades++;
    this.performanceStats.totalProfit += profit;
    
    await this.context.storage.set('performance_stats', this.performanceStats);
    
    // In a more advanced version, we would adjust strategy weights here
    // e.g., if Sentiment contributed to a win, increase its weight
  }

  async getPerformanceStats() {
    return this.performanceStats;
  }
}

module.exports = LearningModule;
