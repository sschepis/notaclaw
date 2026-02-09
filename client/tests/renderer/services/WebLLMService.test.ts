// Mock @mlc-ai/web-llm first
const mockCreateMLCEngine = jest.fn();

jest.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: mockCreateMLCEngine,
}));

describe('WebLLMService', () => {
  let webLLMService: any;
  let AVAILABLE_WEBLLM_MODELS: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module to get fresh instance
    jest.resetModules();
    
    // Re-import to get new instance
    const mod = require('../../../src/renderer/services/WebLLMService');
    webLLMService = mod.webLLMService;
    AVAILABLE_WEBLLM_MODELS = mod.AVAILABLE_WEBLLM_MODELS;
  });

  describe('AVAILABLE_WEBLLM_MODELS', () => {
    it('should have defined model options', () => {
      expect(AVAILABLE_WEBLLM_MODELS.length).toBeGreaterThan(0);
    });

    it('should have required properties for each model', () => {
      AVAILABLE_WEBLLM_MODELS.forEach((model: any) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('size');
        expect(model).toHaveProperty('vram');
        expect(model).toHaveProperty('description');
      });
    });

    it('should include Hermes model for tool calling', () => {
      const hermes = AVAILABLE_WEBLLM_MODELS.find((m: any) => m.id.includes('Hermes'));
      expect(hermes).toBeDefined();
      expect(hermes?.description).toContain('tool calling');
    });
  });

  describe('initialize', () => {
    it('should create MLC engine with specified model', async () => {
      const mockEngine = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      
      await webLLMService.initialize('test-model');
      
      expect(mockCreateMLCEngine).toHaveBeenCalledWith('test-model', expect.objectContaining({
        initProgressCallback: undefined,
      }));
    });

    it('should pass progress callback to engine', async () => {
      const mockEngine = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      const progressCallback = jest.fn();
      
      await webLLMService.initialize('test-model', progressCallback);
      
      expect(mockCreateMLCEngine).toHaveBeenCalledWith('test-model', expect.objectContaining({
        initProgressCallback: progressCallback,
      }));
    });

    it('should not reinitialize if same model already loaded', async () => {
      const mockEngine = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      
      await webLLMService.initialize('test-model');
      await webLLMService.initialize('test-model');
      
      // Should only be called once
      expect(mockCreateMLCEngine).toHaveBeenCalledTimes(1);
    });

    it('should unload previous engine when switching models', async () => {
      const mockEngine1 = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn().mockResolvedValueOnce(undefined),
      };
      const mockEngine2 = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine
        .mockResolvedValueOnce(mockEngine1)
        .mockResolvedValueOnce(mockEngine2);
      
      await webLLMService.initialize('model-1');
      await webLLMService.initialize('model-2');
      
      expect(mockEngine1.unload).toHaveBeenCalled();
      expect(mockCreateMLCEngine).toHaveBeenCalledTimes(2);
    });

    it('should throw error if initialization fails', async () => {
      mockCreateMLCEngine.mockRejectedValueOnce(new Error('Init failed'));
      
      await expect(webLLMService.initialize('test-model'))
        .rejects.toThrow('Init failed');
    });
  });

  describe('chat', () => {
    it('should throw error if engine not initialized', async () => {
      await expect(webLLMService.chat([{ role: 'user', content: 'Hello' }]))
        .rejects.toThrow('Engine not initialized');
    });

    it('should call engine chat completions with messages', async () => {
      const mockCreate = jest.fn().mockResolvedValueOnce({
        choices: [{ message: { content: 'Hello!' } }],
      });
      const mockEngine = {
        chat: { completions: { create: mockCreate } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      
      await webLLMService.initialize('test-model');
      
      const messages = [{ role: 'user', content: 'Hello' }];
      await webLLMService.chat(messages);
      
      expect(mockCreate).toHaveBeenCalledWith({
        messages,
        stream: false,
      });
    });

    it('should support streaming mode', async () => {
      const mockCreate = jest.fn().mockResolvedValueOnce({ /* stream response */ });
      const mockEngine = {
        chat: { completions: { create: mockCreate } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      
      await webLLMService.initialize('test-model');
      await webLLMService.chat([{ role: 'user', content: 'Hello' }], true);
      
      expect(mockCreate).toHaveBeenCalledWith({
        messages: expect.any(Array),
        stream: true,
      });
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(webLLMService.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      const mockEngine = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      
      await webLLMService.initialize('test-model');
      
      expect(webLLMService.isInitialized()).toBe(true);
    });
  });

  describe('getCurrentModel', () => {
    it('should return null before initialization', () => {
      expect(webLLMService.getCurrentModel()).toBeNull();
    });

    it('should return current model after initialization', async () => {
      const mockEngine = {
        chat: { completions: { create: jest.fn() } },
        unload: jest.fn(),
      };
      mockCreateMLCEngine.mockResolvedValueOnce(mockEngine);
      
      await webLLMService.initialize('test-model');
      
      expect(webLLMService.getCurrentModel()).toBe('test-model');
    });
  });
});
