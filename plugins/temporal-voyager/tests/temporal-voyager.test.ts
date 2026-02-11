import { activate } from '../src/main/index';

const mockContext: any = {
  dsn: {
    registerTool: jest.fn(),
    publishObservation: jest.fn(),
  },
  storage: {
    set: jest.fn(),
  },
};

describe('TemporalVoyager', () => {
  it('should activate and register tools', () => {
    activate(mockContext);
    expect(mockContext.dsn.registerTool).toHaveBeenCalledTimes(3);
    expect(mockContext.dsn.registerTool).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'travelToTime' }),
        expect.any(Function)
    );
  });
});
