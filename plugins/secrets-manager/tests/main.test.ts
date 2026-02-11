import { activate, deactivate } from '../main/index';

describe('Secrets Manager Main Process', () => {
  it('should activate without errors', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const mockContext: any = {};
    activate(mockContext);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('activated'));
    consoleSpy.mockRestore();
  });

  it('should deactivate without errors', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    deactivate();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deactivated'));
    consoleSpy.mockRestore();
  });
});
