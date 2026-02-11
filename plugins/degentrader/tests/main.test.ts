import { activate, deactivate } from '../main/index';

describe('DegenTrader Main', () => {
  it('should activate and handle trades', async () => {
    const handle = jest.fn();
    const context: any = {
      ipc: { handle, send: jest.fn() },
      storage: { get: jest.fn(), set: jest.fn() }
    };
    await activate(context);
    expect(handle).toHaveBeenCalled();
  });
});
