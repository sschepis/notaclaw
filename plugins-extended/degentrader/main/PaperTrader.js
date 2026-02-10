
class PaperTrader {
  constructor(context, marketDataService, learningModule) {
    this.context = context;
    this.marketDataService = marketDataService;
    this.learningModule = learningModule;
    this.positions = [];
    this.balance = {
      ETH: 10,
      SOL: 100,
      USDC: 10000
    };
    this.stopLoss = 0.05; // 5%
    this.takeProfit = 0.10; // 10%
  }

  async initialize() {
    this.positions = await this.context.storage.get('paper_positions') || [];
    this.balance = await this.context.storage.get('paper_balance') || this.balance;
  }

  async executeTrade(opportunity, allocationPct = 0.1) {
    const tradeId = Date.now().toString();
    
    // Calculate trade size based on allocation
    // Assuming USDC is the base currency for simplicity
    const tradeAmountUSDC = this.balance.USDC * allocationPct;
    
    // If we don't have enough balance, cap it
    const actualAmount = Math.min(tradeAmountUSDC, this.balance.USDC);
    
    // Deduct from balance (simulated swap)
    this.balance.USDC -= actualAmount;
    
    const trade = {
      id: tradeId,
      type: 'PAPER',
      symbol: opportunity.symbol,
      chain: opportunity.chain,
      entryPrice: opportunity.price,
      amount: actualAmount, // Amount in USDC
      tokenAmount: actualAmount / opportunity.price, // Amount in Tokens
      timestamp: opportunity.timestamp,
      score: opportunity.score,
      status: 'OPEN'
    };

    this.positions.push(trade);
    console.log(`[PaperTrader] Opened position: ${trade.symbol} @ ${trade.entryPrice} on ${trade.chain} ($${actualAmount.toFixed(2)})`);
    
    await this.saveState();
    return trade;
  }

  async checkPositions() {
    const closedTrades = [];
    
    for (let i = this.positions.length - 1; i >= 0; i--) {
      const position = this.positions[i];
      if (position.status !== 'OPEN') continue;

      // Simulate fetching current price
      // In reality, marketDataService.getPrice(position.symbol)
      // Since we are simulating tokens, we'll simulate price movement
      const currentPrice = position.entryPrice * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10% fluctuation

      const pnl = (currentPrice - position.entryPrice) / position.entryPrice;

      if (pnl <= -this.stopLoss) {
        // Stop Loss Hit
        console.log(`[PaperTrader] Stop Loss hit for ${position.symbol}: ${pnl.toFixed(2)}%`);
        position.status = 'CLOSED';
        position.exitPrice = currentPrice;
        position.pnl = pnl;
        position.reason = 'STOP_LOSS';
        closedTrades.push(position);
      } else if (pnl >= this.takeProfit) {
        // Take Profit Hit
        console.log(`[PaperTrader] Take Profit hit for ${position.symbol}: ${pnl.toFixed(2)}%`);
        position.status = 'CLOSED';
        position.exitPrice = currentPrice;
        position.pnl = pnl;
        position.reason = 'TAKE_PROFIT';
        closedTrades.push(position);
      } else {
        // Still open
        // console.log(`[PaperTrader] Position ${position.symbol} still open. PnL: ${pnl.toFixed(2)}%`);
      }
    }

    if (closedTrades.length > 0) {
      // Update balance and learning module
      for (const trade of closedTrades) {
        const profitAmount = trade.amount * trade.pnl;
        this.balance.USDC += profitAmount; // Assume settling in USDC
        await this.learningModule.recordOutcome(trade.id, profitAmount);
      }
      await this.saveState();
    }
  }

  async getHistory() {
      return this.positions.filter(p => p.status === 'CLOSED').sort((a, b) => b.timestamp - a.timestamp);
  }

  async saveState() {
    await this.context.storage.set('paper_positions', this.positions);
    await this.context.storage.set('paper_balance', this.balance);
  }
}

module.exports = PaperTrader;
