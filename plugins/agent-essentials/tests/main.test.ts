import plugin from '../main/index';
import { PluginContext } from '../../../client/src/shared/plugin-types';

// Mock https
jest.mock('https', () => ({
  get: jest.fn()
}));

const https = require('https');

describe('Agent Essentials Plugin', () => {
  let mockContext: any;
  let registeredTools: Record<string, Function> = {};

  beforeEach(() => {
    registeredTools = {};
    mockContext = {
      traits: {
        register: jest.fn()
      },
      dsn: {
        registerTool: jest.fn((def, handler) => {
          registeredTools[def.name] = handler;
        })
      },
      secrets: {
        get: jest.fn()
      },
      on: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('should activate and register traits and tools', () => {
    plugin.activate(mockContext);

    expect(mockContext.traits.register).toHaveBeenCalledTimes(2);
    expect(mockContext.dsn.registerTool).toHaveBeenCalledTimes(2);
    expect(registeredTools['web_search']).toBeDefined();
    expect(registeredTools['read_url']).toBeDefined();
  });

  describe('web_search tool', () => {
    it('should return mock results when no API key is present', async () => {
      plugin.activate(mockContext);
      mockContext.secrets.get.mockResolvedValue(null);

      const handler = registeredTools['web_search'];
      const result = await handler({ query: 'test query' });

      expect(result.metadata.source).toBe('simulation');
      expect(result.results).toHaveLength(2);
    });

    it('should call Google API when API key is present', async () => {
      plugin.activate(mockContext);
      mockContext.secrets.get.mockResolvedValue('fake-api-key');

      const mockResponse = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(JSON.stringify({ items: [{ title: 'Test', snippet: 'Test snippet', link: 'http://test.com' }] }));
          }
          if (event === 'end') {
            cb();
          }
        })
      };

      (https.get as jest.Mock).mockImplementation((url, cb) => {
        cb(mockResponse);
        return { on: jest.fn() };
      });

      const handler = registeredTools['web_search'];
      const result = await handler({ query: 'test query' });

      expect(https.get).toHaveBeenCalledWith(
        expect.stringContaining('key=fake-api-key'),
        expect.any(Function)
      );
      expect(result.results[0].title).toBe('Test');
    });
  });

  describe('read_url tool', () => {
    it('should read content from a URL', async () => {
      plugin.activate(mockContext);

      const mockResponse = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb('<html><body>Content</body></html>');
          }
          if (event === 'end') {
            cb();
          }
        }),
        statusCode: 200
      };

      (https.get as jest.Mock).mockImplementation((url, cb) => {
        cb(mockResponse);
        return { on: jest.fn(), end: jest.fn() };
      });

      const handler = registeredTools['read_url'];
      const result = await handler({ url: 'https://example.com' });

      expect(result.content).toBe('<html><body>Content</body></html>');
    });
  });
});
