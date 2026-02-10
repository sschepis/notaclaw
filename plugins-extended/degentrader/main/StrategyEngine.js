
const VolumeSpike = require('./strategies/VolumeSpike');
const Sentiment = require('./strategies/Sentiment');
const RSI = require('./strategies/RSI');
const PaperTrader = require('./PaperTrader');
// const LiveTrader = require('./LiveTrader'); 

class StrategyEngine {
  constructor(context, walletManager, marketDataService, learningModule) {
    this.context = context;
    this.walletManager = walletManager;
    this.marketDataService = marketDataService;
    this.learningModule = learningModule;
    
    this.strategies = [
      new VolumeSpike(),
      new Sentiment(context),
      new RSI()
    ];
    
    this.paperTrader = new PaperTrader(context, marketDataService, learningModule);
    this.isRunning = false;
    this.intervalId = null;
    this.config = {
        minScore: 0.7,
        tradeInterval: 30000,
        maxOpenPositions: 5,
        allocationPct: 0.1 // 10% per trade
    };
  }

  getStrategies() {
    return this.strategies.map(s => ({
      name: s.name,
      description: s.description,
      enabled: s.enabled,
      weight: s.weight
    }));
  }

  updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      if (this.isRunning) {
          this.stop();
          this.start();
      }
  }

  async setStrategyEnabled(name, enabled) {
      const strategy = this.strategies.find(s => s.name === name);
      if (strategy) {
          strategy.enabled = enabled;
          // Persist this setting? ideally yes
      }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DegenTrader] Strategy Engine started.');
    
    this.paperTrader.initialize();

    this.intervalId = setInterval(() => this.runLoop(), this.config.tradeInterval);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    console.log('[DegenTrader] Strategy Engine stopped.');
  }

  async runLoop() {
    try {
      // 0. Check Open Positions (Stop Loss / Take Profit)
      await this.paperTrader.checkPositions();

      // 1. Scan for opportunities
      const chains = ['ETH', 'SOL', 'BASE'];
      for (const chain of chains) {
        const opportunities = await this.marketDataService.scanForOpportunities(chain);
        
        for (const opportunity of opportunities) {
          // 2. Evaluate with strategies
          let totalScore = 0;
          let activeStrategies = 0;

          for (const strategy of this.strategies) {
            if (strategy.enabled) {
              const score = await strategy.evaluate(opportunity);
              totalScore += score * (strategy.weight || 1.0);
              activeStrategies++;
            }
          }

          const avgScore = activeStrategies > 0 ? totalScore / activeStrategies : 0;

          // 3. Execute Trade
          if (avgScore > this.config.minScore) {
            console.log(`[DegenTrader] High confidence opportunity found: ${opportunity.symbol} on ${chain} (Score: ${avgScore.toFixed(2)})`);
            
            // Check max positions
            if (this.paperTrader.positions.filter(p => p.status === 'OPEN').length < this.config.maxOpenPositions) {
                await this.paperTrader.executeTrade({
                    ...opportunity,
                    score: avgScore,
                    timestamp: Date.now()
                }, this.config.allocationPct);
                
                await this.learningModule.recordDecision(opportunity, avgScore, this.strategies);
            } else {
                console.log('[DegenTrader] Max open positions reached. Skipping trade.');
            }
          }
        }
      }
    } catch (error) {
      console.error('[DegenTrader] Error in strategy loop:', error);
    }
  }

  async scanMarket(chain) {
      return await this.marketDataService.scanForOpportunities(chain);
  }
}

module.exports = StrategyEngine;
