import { SoftwareFactoryPlugin } from '../src/index';

const mockDSN: any = {
  registerTool: jest.fn(),
};

const mockAI: any = {
  ask: jest.fn(),
};

describe('SoftwareFactory', () => {
  it('should initialize', () => {
    const plugin = new SoftwareFactoryPlugin(mockDSN, mockAI);
    expect(plugin).toBeDefined();
  });
});
