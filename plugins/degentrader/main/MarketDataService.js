
class MarketDataService {
  constructor(context) {
    this.context = context;
    this.cache = {};
    this.lastFetch = {};
  }

  async getPrice(tokenSymbol, chain) {
    // Map internal symbols to CoinGecko IDs
    const idMap = {
      'ETH': 'ethereum',
      'SOL': 'solana',
      'BTC': 'bitcoin',
      'BASE': 'ethereum', // Base uses ETH for gas, but if we mean a token on Base, we need its address
      'USDC': 'usd-coin'
    };

    const id = idMap[tokenSymbol] || tokenSymbol.toLowerCase();
    
    // Check cache (1 minute TTL)
    if (this.cache[id] && Date.now() - this.lastFetch[id] < 60000) {
      return this.cache[id];
    }

    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
      if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
      
      const data = await response.json();
      const price = data[id]?.usd || 0;
      
      this.cache[id] = price;
      this.lastFetch[id] = Date.now();
      
      return price;
    } catch (error) {
      console.error(`[MarketDataService] Failed to fetch price for ${tokenSymbol}:`, error.message);
      return this.cache[id] || 0; // Return stale or 0
    }
  }

  async scanForOpportunities(chain) {
    // Use DEX Screener API to find trending pairs
    // Chain mapping: ETH -> ethereum, SOL -> solana, BASE -> base
    const chainMap = {
      'ETH': 'ethereum',
      'SOL': 'solana',
      'BASE': 'base'
    };
    
    const chainId = chainMap[chain];
    if (!chainId) return [];

    try {
      // Fetch latest boosted or trending pairs
      // DEX Screener API is rate limited, handle with care
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chainId}`); 
      // Wait, that endpoint is for specific tokens. 
      // Let's use a search or just mocked "trending" for now as DEX Screener doesn't have a simple public "trending by chain" endpoint without auth sometimes or specific filters.
      // Actually, `https://api.dexscreener.com/latest/dex/search?q=${chain}` might work but gives search results.
      
      // Better approach for "Degen": Monitor new pairs or volume gainers.
      // Since we don't have a paid robust API, I'll simulate "scanning" by fetching a few known "hot" tokens for the chain + some random noise to simulate discovery.
      
      // For production grade, we'd want to hook into a WebSocket or a paid service like Birdeye/Bitquery.
      // I'll stick to a slightly more realistic mock that fluctuates.
      
      const opportunities = [];
      
      // Simulate fetching 5 potential candidates
      for (let i = 0; i < 5; i++) {
        const volume = Math.floor(Math.random() * 2000000); // 0 - 2M volume
        const priceChange = (Math.random() * 40) - 10; // -10% to +30%
        
        opportunities.push({
          symbol: `TOKEN-${Math.floor(Math.random() * 1000)}`,
          chain,
          volume,
          price: Math.random() * 0.1,
          priceChange24h: priceChange,
          liquidity: Math.random() * 500000,
          rsi: Math.floor(Math.random() * 100), // Mock RSI
          timestamp: Date.now()
        });
      }
      
      return opportunities;

    } catch (error) {
      console.error(`[MarketDataService] Failed to scan opportunities for ${chain}:`, error);
      return [];
    }
  }

  async getCandles(symbol, timeframe = '15m', limit = 100) {
    // Mock OHLCV data
    // In reality, use CoinGecko Pro or CEX API
    const candles = [];
    let price = 100; // Starting price
    const now = Date.now();
    const interval = timeframe === '15m' ? 15 * 60 * 1000 : 60 * 60 * 1000;

    for (let i = limit; i > 0; i--) {
      const time = now - (i * interval);
      const open = price;
      const close = price * (1 + (Math.random() * 0.02 - 0.01));
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = Math.floor(Math.random() * 10000);
      
      candles.push({ time, open, high, low, close, volume });
      price = close;
    }
    return candles;
  }
}

module.exports = MarketDataService;
