import { activate } from '../main/index';

describe('Network Visualizer Main', () => {
  it('should activate and expose topology', async () => {
    const handle = jest.fn();
    const context: any = {
      ipc: { handle }
    };
    await activate(context);
    expect(handle).toHaveBeenCalledWith('network:get-topology', expect.any(Function));
  });
});
