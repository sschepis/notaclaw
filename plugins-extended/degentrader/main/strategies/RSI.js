
class RSI {
  constructor() {
    this.name = 'RSI Reversal';
    this.description = 'Buys when RSI is oversold (< 30)';
    this.enabled = true;
    this.weight = 1.0;
  }

  async evaluate(opportunity) {
    if (!opportunity.rsi) return 0.5; // Neutral if no data

    // RSI Logic
    // < 30: Oversold (Buy Signal) -> High Score
    // > 70: Overbought (Sell Signal) -> Low Score (or Short if we supported it)
    // 30-70: Neutral

    if (opportunity.rsi < 30) {
      // Strong buy signal as it approaches 0
      // 20 -> 0.8
      // 10 -> 0.9
      return 0.7 + ((30 - opportunity.rsi) / 30) * 0.3;
    } else if (opportunity.rsi > 70) {
      return 0.2; // Don't buy
    }

    return 0.5;
  }
}

module.exports = RSI;
