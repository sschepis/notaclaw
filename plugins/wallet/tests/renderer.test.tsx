import { activate } from '../renderer/index';

describe('Wallet Renderer', () => {
  it('should register components', () => {
    const registerComponent = jest.fn();
    const context: any = {
      registerComponent,
      useAppStore: () => ({ activeSidebarView: 'wallet', setActiveSidebarView: jest.fn() })
    };
    activate(context);
    expect(registerComponent).toHaveBeenCalledTimes(2);
  });
});
