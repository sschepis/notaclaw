import { activate } from '../src/index';

// Mock types inline for test simplicity or import if complex
interface Tool {
  name: string;
  description: string;
  executionLocation: 'SERVER' | 'CLIENT';
  parameters: any;
  semanticDomain?: string;
  primeDomain?: number[];
  smfAxes?: number[];
  requiredTier?: string;
  version?: string;
}

interface Context {
  dsn: {
    registerTool: (tool: Tool, handler: (args: any) => Promise<any>) => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  on: (event: string, callback: () => void) => void;
}

describe('Document Reader Plugin', () => {
  let mockContext: Context;
  let registeredTools: { [name: string]: any } = {};
  let toolHandlers: { [name: string]: any } = {};

  beforeEach(() => {
    registeredTools = {};
    toolHandlers = {};
    mockContext = {
      dsn: {
        registerTool: (tool: Tool, handler: (args: any) => Promise<any>) => {
          registeredTools[tool.name] = tool;
          toolHandlers[tool.name] = handler;
        }
      },
      storage: {
        get: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue(undefined)
      },
      on: jest.fn()
    };
  });

  test('should register summarize_document tool on activation', async () => {
    await activate(mockContext);
    expect(registeredTools['summarize_document']).toBeDefined();
  });

  test('should summarize content correctly', async () => {
    await activate(mockContext);
    const handler = toolHandlers['summarize_document'];
    // Ensure we have a valid handler
    expect(handler).toBeDefined();

    const content = "This is sentence one. This is sentence two. This is sentence three. This is sentence four.";
    const result = await handler({ content, maxLength: 200 });
    
    // The implementation takes the first 3 sentences
    expect(result.summary).toContain("sentence one");
    expect(result.summary).toContain("sentence three");
    // Should NOT contain sentence four
    expect(result.summary).not.toContain("sentence four");
    expect(result.originalLength).toBe(content.length);
  });
  
  test('should truncate long summaries', async () => {
      await activate(mockContext);
      const handler = toolHandlers['summarize_document'];
      const longSentence = "This is a very long sentence designed to exceed the maximum length limit set for the summary. ";
      const content = longSentence.repeat(10);
      const maxLength = 50;
      
      const result = await handler({ content, maxLength });
      
      // implementation: summary.substring(0, maxLength) + '...'
      // expected length: 50 + 3 = 53
      expect(result.summary.length).toBeLessThanOrEqual(maxLength + 3); 
      expect(result.summary.endsWith('...')).toBe(true);
  });
});
