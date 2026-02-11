import { activate, deactivate } from '../renderer/index';

describe('Secrets Manager Renderer', () => {
  it('should register panel and commands', () => {
    const registerPanel = jest.fn();
    const registerCommand = jest.fn();
    const context: any = {
      ui: {
        registerPanel,
        registerCommand
      },
      useAppStore: {
        getState: jest.fn()
      },
      ipc: {
        invoke: jest.fn(),
        send: jest.fn()
      }
    };

    activate(context);

    expect(registerPanel).toHaveBeenCalledTimes(1);
    expect(registerCommand).toHaveBeenCalledTimes(7); // Check if 6 or 7 commands
  });

  it('should clean up on deactivate', () => {
    const context: any = {};
    const cleanup = jest.fn();
    context._cleanups = [cleanup];
    deactivate(context);
    expect(cleanup).toHaveBeenCalled();
  });
});
