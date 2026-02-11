import { activate } from '../renderer/index';

describe('Theme Studio Renderer', () => {
  it('should register components', () => {
    const registerComponent = jest.fn();
    const context: any = {
      registerComponent,
      useAppStore: () => ({ activeSidebarView: 'test', setActiveSidebarView: jest.fn() })
    };
    activate(context);
    expect(registerComponent).toHaveBeenCalledTimes(2);
    expect(registerComponent).toHaveBeenCalledWith('sidebar:nav-item', expect.any(Object));
    expect(registerComponent).toHaveBeenCalledWith('sidebar:view:theme-studio', expect.any(Object));
  });
});
