import { activate } from '../src/main/index';

const mockContext: any = {
  dsn: {
    registerTool: jest.fn(),
  },
};

describe('SocialMirror', () => {
  it('should activate', () => {
    activate(mockContext);
    expect(mockContext.dsn.registerTool).toHaveBeenCalled();
  });
});
