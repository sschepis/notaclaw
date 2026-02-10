
const WalletManager = require('./WalletManager');
const MarketDataService = require('./MarketDataService');
const StrategyEngine = require('./StrategyEngine');
const LearningModule = require('./LearningModule');

let walletManager;
let marketDataService;
let strategyEngine;
let learningModule;
let intervalId;

module.exports = {
  activate: async (context) => {
    console.log('[DegenTrader] Activating...');

    // Initialize Managers
    walletManager = new WalletManager(context);
    marketDataService = new MarketDataService(context);
    learningModule = new LearningModule(context);
    strategyEngine = new StrategyEngine(context, walletManager, marketDataService, learningModule);

    await walletManager.initialize();
    await learningModule.initialize();

    // Register IPC Handlers
    context.ipc.handle('degentrader:get-status', async () => {
      return {
        active: strategyEngine.isRunning,
        strategies: strategyEngine.getStrategies(),
        performance: await learningModule.getPerformanceStats(),
        history: await strategyEngine.paperTrader.getHistory()
      };
    });

    context.ipc.handle('degentrader:start', async () => {
      strategyEngine.start();
      return { success: true };
    });

    context.ipc.handle('degentrader:stop', async () => {
      strategyEngine.stop();
      return { success: true };
    });

    context.ipc.handle('degentrader:update-config', async (config) => {
        strategyEngine.updateConfig(config);
        return { success: true };
    });

    context.ipc.handle('degentrader:toggle-strategy', async ({ name, enabled }) => {
        await strategyEngine.setStrategyEnabled(name, enabled);
        return { success: true };
    });
    
    context.ipc.handle('degentrader:import-wallet', async (data) => {
        return await walletManager.importWallet(data.chain, data.privateKey, data.label);
    });
    
    context.ipc.handle('degentrader:get-wallets', async () => {
        return await walletManager.getWallets();
    });

    // Register AlephNet Tool
    if (context.dsn && context.dsn.registerTool) {
      context.dsn.registerTool({
        name: 'get_market_status',
        description: 'Get current market status and active opportunities',
        parameters: {
          type: 'object',
          properties: {
            chain: {
              type: 'string',
              enum: ['ETH', 'SOL', 'BASE'],
              description: 'Blockchain to query'
            }
          }
        }
      }, async ({ chain }) => {
        const opportunities = await strategyEngine.scanMarket(chain);
        return {
            chain,
            opportunities: opportunities.length,
            top_opportunity: opportunities[0] || null
        };
      });
    }

    console.log('[DegenTrader] Activated successfully.');
  },

  deactivate: async () => {
    console.log('[DegenTrader] Deactivating...');
    if (strategyEngine) strategyEngine.stop();
    console.log('[DegenTrader] Deactivated.');
  }
};
