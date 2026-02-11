import { activate } from '../renderer/index';

describe('DegenTrader Renderer', () => {
  it('should register dashboard', () => {
    const registerComponent = jest.fn();
    const context: any = { registerComponent };
    activate(context);
    expect(registerComponent).toHaveBeenCalledWith('sidebar:view:degentrader', expect.any(Object));
  });
});
