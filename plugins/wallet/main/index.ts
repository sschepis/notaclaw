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
    registerTool: (metadata: any, handler: () => Promise<any>) => void;
  };
}

class WalletService {
  private context: PluginContext;
  private balance: number;

  constructor(context: PluginContext) {
    this.context = context;
    this.balance = 0;
  }

  async activate() {
    const stored = await this.context.storage.get('balance');
    this.balance = typeof stored === 'number' ? stored : 1000;

    this.context.ipc.handle('wallet:get-balance', async () => this.balance);
    
    this.context.ipc.handle('wallet:transfer', async (args: any) => {
      const { to, amount } = args;
      if (this.balance < amount) throw new Error('Insufficient funds');
      this.balance -= amount;
      await this.context.storage.set('balance', this.balance);
      this.context.ipc.send('wallet:update', this.balance);
      return { success: true, txId: Math.random().toString(36) };
    });

    this.context.dsn.registerTool({
      name: 'get_wallet_balance',
      description: 'Get current wallet balance',
      executionLocation: 'SERVER',
      parameters: { type: 'object', properties: {} },
      requiredTier: 'Neophyte'
    }, async () => {
      return { 
        available: this.balance, 
        staked: 5000, 
        currency: 'ALEPH' 
      };
    });
  }
}

export const activate = async (context: PluginContext) => {
  console.log('[Wallet] Activating...');
  const service = new WalletService(context);
  await service.activate();
  console.log('[Wallet] Ready');
};

export const deactivate = () => {};
