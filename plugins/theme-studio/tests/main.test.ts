import { activate, deactivate } from '../main/index';

describe('Theme Studio Main', () => {
  it('should activate/deactivate', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    activate({} as any);
    deactivate();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('activated'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deactivated'));
    consoleSpy.mockRestore();
  });
});
