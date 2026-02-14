/**
 * DegenTrader - High-frequency trading and portfolio management.
 */

export interface PluginContext {
  ipc?: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
    send: (channel: string, ...args: any[]) => void;
  };
  storage?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  traits?: {
    register: (trait: any) => void;
  };
}

class TradingService {
  private context: PluginContext;
  private positions: any[] = [];

  constructor(context: PluginContext) {
    this.context = context;
  }

  async activate() {
    this.context.ipc?.handle('trade:get-positions', async () => {
      return this.positions;
    });

    this.context.ipc?.handle('trade:execute', async ({ symbol, amount, side }: any) => {
      // Mock execution
      const trade = {
        id: Math.random().toString(36),
        symbol,
        amount,
        side,
        price: Math.random() * 1000,
        timestamp: Date.now()
      };
      this.positions.push(trade);
      return trade;
    });

    if (this.context.traits) {
      this.context.traits.register({
        id: 'degen-trader',
        name: 'Crypto Trading',
        description: 'Execute trades and manage portfolio.',
        instruction: 'You can execute cryptocurrency trades using `trade:execute` (via IPC or tool mapping). Use this carefully for portfolio management tasks.',
        activationMode: 'manual' // Manual activation for safety
      });
    }
  }
}

export const activate = async (context: PluginContext) => {
  console.log('[DegenTrader] Activating...');
  const service = new TradingService(context);
  await service.activate();
  console.log('[DegenTrader] Ready');
};

export const deactivate = () => {
  console.log('[DegenTrader] Deactivated');
};
