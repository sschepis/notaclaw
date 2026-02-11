import { activate } from '../renderer/index';

describe('Network Visualizer Renderer', () => {
  it('should register network graph', () => {
    const registerComponent = jest.fn();
    const context: any = { registerComponent };
    activate(context);
    expect(registerComponent).toHaveBeenCalledWith('sidebar:view:network-viz', expect.any(Object));
  });
});
