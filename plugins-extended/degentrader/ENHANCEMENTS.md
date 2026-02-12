# Degen Trader — Enhancements

## Critical Issues

### 1. Market Data is Entirely Simulated
- **Current**: [`MarketDataService.scanForOpportunities()`](main/MarketDataService.js:43) generates random fake token data (`TOKEN-{random}` with random prices/volumes). The DEX Screener API call is commented out in favor of mock data.
- **Enhancement**: Integrate with real APIs — DEX Screener, Birdeye (Solana), or DeFiLlama for actual market data. Add WebSocket subscriptions for real-time price feeds. Implement proper rate limiting and API key management.
- **Priority**: Critical

### 2. Price Simulation in Position Checks
- **Current**: [`PaperTrader.checkPositions()`](main/PaperTrader.js:55) simulates current prices with `entryPrice * (1 + random)` instead of fetching actual current prices. This makes paper trading results meaningless.
- **Enhancement**: Use `MarketDataService.getPrice()` (once integrated with real APIs) to fetch actual current prices for open positions.
- **Priority**: Critical

### 3. LiveTrader is a Stub
- **Current**: [`LiveTrader.js`](main/LiveTrader.js) returns `{ status: 'FAILED', reason: 'Not implemented' }` for all trades. The strategy engine never instantiates it.
- **Enhancement**: Implement actual DEX integration using ethers.js for EVM chains (Uniswap Router) and `@solana/web3.js` for Solana (Jupiter). Add critical safety guards: transaction simulation, slippage protection, gas estimation, and maximum position limits.
- **Priority**: High (but requires extreme caution)

### 4. Sentiment Strategy Uses Fake Social Data
- **Current**: [`Sentiment.js`](main/strategies/Sentiment.js:14) hardcodes a fake social media snippet instead of fetching real data from Twitter/X, Reddit, or news APIs.
- **Enhancement**: Integrate with social data APIs (Twitter/X API, LunarCrush, Santiment) to feed real sentiment data to the AI analysis. Cache results to avoid excessive API calls.
- **Priority**: High

### 5. Solana Wallet Support is Mocked
- **Current**: [`WalletManager.js`](main/WalletManager.js:30) generates a random string for Solana addresses (`SOL_${random}`) instead of using `@solana/web3.js`.
- **Enhancement**: Add proper Solana keypair handling using `@solana/web3.js`. Support both raw keypairs and Base58-encoded secret keys.
- **Priority**: High

---

## Functional Enhancements

### 6. Additional Trading Strategies
- Add more strategies: MACD crossover, Bollinger Band squeeze, on-chain whale tracking, new pair detection, liquidity pool analysis, and token contract audit scoring (detecting rug pull patterns).

### 7. Strategy Backtesting
- Implement a backtesting engine that replays historical data against strategies to validate performance before live deployment. Store and display backtest results with metrics (Sharpe ratio, max drawdown, etc.).

### 8. Position Sizing Algorithms
- Replace the simple percentage-based allocation with more sophisticated sizing: Kelly Criterion, volatility-adjusted sizing, or risk-parity allocation across positions.

### 9. Portfolio Dashboard
- Show real-time portfolio value across all chains, asset allocation breakdown, unrealized PnL per position, and historical portfolio value chart.

### 10. Token Screening Filters
- Add configurable filters: minimum liquidity, minimum holder count, contract verification status, token age, and honeypot detection.

### 11. Multi-DEX Support
- Support multiple DEXes per chain (e.g., Uniswap + SushiSwap on ETH, Jupiter + Raydium on SOL) and implement best-price routing.

### 12. DCA (Dollar Cost Averaging) Mode
- Add a DCA strategy that automatically buys a target token at regular intervals, useful for accumulation strategies.

### 13. Trailing Stop Loss
- The current stop-loss is fixed at 5%. Implement trailing stop-loss that ratchets up as the price increases, locking in profits.

### 14. Strategy Weight Auto-Tuning
- The `LearningModule` has a comment "we would adjust strategy weights here" but doesn't. Implement reinforcement learning or Bayesian optimization to automatically tune strategy weights based on historical performance.

---

## UI/UX Enhancements

### 15. Price Charts
- Add candlestick/line charts for tracked tokens using the existing `getCandles()` method. Consider lightweight-charts or a simple SVG-based renderer.

### 16. Real-Time Notifications
- Send notifications via the Notification Center plugin when trades are executed, stop-losses hit, or high-confidence opportunities are found.

### 17. Risk Dashboard
- Display current risk exposure: total capital at risk, maximum potential loss, concentration in any single position, and overall portfolio beta.

### 18. Replace `alert()` Calls
- [`Dashboard.tsx`](renderer/Dashboard.tsx:39) uses `alert('Configuration updated!')`. Replace with in-UI toast notifications.

### 19. Trade Entry/Exit Detail View
- Click on a trade in the history to see full details: which strategies fired, confidence scores, entry/exit timestamps, gas costs, and slippage.

### 20. Dark/Light Theme for Charts
- Add chart theme support matching the application's current theme.

---

## Security Enhancements

### 21. Private Key Handling Audit
- Private keys are stored via `context.secrets.set()` which is good, but the import flow sends raw private keys over IPC. Consider using Web Crypto API in the renderer for key generation and never transmitting raw keys.

### 22. Transaction Confirmation Gate
- Before executing any live trade, require explicit user confirmation with a summary of the trade details, estimated gas, and slippage tolerance.

### 23. Spending Limits
- Implement configurable daily/weekly spending limits that halt trading when reached, even if strategies signal opportunities.

### 24. Wallet Balance Validation
- Before executing trades, verify the wallet actually has sufficient balance. Currently `PaperTrader` checks `this.balance.USDC` but this is a simulated balance.

---

## Testing Enhancements

### 25. Add Test Suite
- No tests exist. Create tests for: strategy evaluation logic (RSI thresholds, volume detection), PaperTrader trade execution and PnL calculation, LearningModule decision recording and stats aggregation, WalletManager initialization and import, and StrategyEngine loop correctness.

### 26. Strategy Unit Tests
- Each strategy should have isolated unit tests verifying score ranges for various input scenarios.

---

## Architecture Enhancements

### 27. Convert from JavaScript to TypeScript
- All main process files are `.js` with no type safety. Convert to TypeScript for better maintainability, especially critical for financial logic.

### 28. Event-Driven Architecture
- Emit events for all significant actions (`trade:opened`, `trade:closed`, `strategy:signal`, `opportunity:detected`) so other plugins can react.

### 29. Strategy Plugin Interface
- Define a formal strategy interface so users can add custom strategies without modifying the core engine. Load strategies dynamically from a strategies directory.

### 30. Configurable Settings in Manifest
- Move hardcoded configuration (stop-loss %, take-profit %, trade interval, supported chains) into the manifest or `aleph.json` settings for per-user customization.
