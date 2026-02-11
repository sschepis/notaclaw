import main from '../main/index';
// Since main/index.js is CommonJS, we might need require, but ts-jest handles it with esModuleInterop
const { activate } = main;

describe('HTML Artifacts Plugin', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      dsn: {
        registerTool: jest.fn(),
      },
      on: jest.fn((event, callback) => {
        if (event === 'ready') callback();
      }),
    };
  });

  test('activate registers generate_artifact tool', () => {
    activate(mockContext);

    expect(mockContext.dsn.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'generate_artifact',
        description: expect.stringContaining('Generates an HTML or React artifact'),
      }),
      expect.any(Function)
    );
  });
});
