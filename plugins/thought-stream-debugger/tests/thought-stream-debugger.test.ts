import { activate } from '../src/main/index';

const mockContext: any = {
  events: {
    on: jest.fn(),
  },
  dsn: {
    registerTool: jest.fn(),
  },
};

describe('ThoughtStreamDebugger', () => {
  it('should activate and hook events', () => {
    activate(mockContext);
    expect(mockContext.events.on).toHaveBeenCalledWith('agent:step', expect.any(Function));
    expect(mockContext.dsn.registerTool).toHaveBeenCalledTimes(2);
  });
});
