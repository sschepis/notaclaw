
class WalletService {
  constructor(context) {
    this.context = context;
    this.balance = 0;
  }

  async activate() {
    // Load balance
    const stored = await this.context.storage.get('balance');
    this.balance = typeof stored === 'number' ? stored : 1000; // Default airdrop

    this.context.ipc.handle('wallet:get-balance', async () => this.balance);
    
    this.context.ipc.handle('wallet:transfer', async ({ to, amount }) => {
      if (this.balance < amount) throw new Error('Insufficient funds');
      this.balance -= amount;
      await this.context.storage.set('balance', this.balance);
      this.context.ipc.send('wallet:update', this.balance);
      return { success: true, txId: Math.random().toString(36) };
    });

    // Register tool for balance check
    this.context.dsn.registerTool({
      name: 'get_wallet_balance',
      description: 'Get current wallet balance',
      executionLocation: 'SERVER',
      parameters: { type: 'object', properties: {} },
      requiredTier: 'Neophyte'
    }, async () => {
      return { 
        available: this.balance, 
        staked: 5000, // Mock staked for now
        currency: 'ALEPH' 
      };
    });
  }
}

module.exports = {
  activate: async (context) => {
    console.log('[Wallet] Activating...');
    const service = new WalletService(context);
    await service.activate();
    console.log('[Wallet] Ready');
  },
  deactivate: () => {}
};
