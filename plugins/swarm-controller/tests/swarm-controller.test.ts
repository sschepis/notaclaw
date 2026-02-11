import { activate, deactivate } from '../src/main/index';

const mockContext: any = {
  on: jest.fn(),
  ipc: {
    on: jest.fn(),
    send: jest.fn(),
  },
};

describe('SwarmController', () => {
  it('should activate', () => {
    activate(mockContext);
    expect(mockContext.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockContext.ipc.on).toHaveBeenCalledWith('ping', expect.any(Function));
  });

  it('should deactivate', () => {
    // Should not throw
    deactivate();
  });
});
