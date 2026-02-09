import { AIProviderManager } from '../../../src/main/services/AIProviderManager';
import fs from 'fs/promises';
import crypto from 'crypto';
import { AIProviderConfig, AISettings } from '../../../src/shared/ai-types';

// Mock the AI SDK's generateText function
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock fetch for basic API calls
global.fetch = jest.fn();

// Import mocked module
import { generateText } from 'ai';
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

// Helper: fake service-account JSON used by Vertex AI tests
const FAKE_SERVICE_ACCOUNT = {
  client_email: 'test@project.iam.gserviceaccount.com',
  private_key: 'fake-key'
};

describe('AIProviderManager', () => {
  let aiManager: AIProviderManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    aiManager = new AIProviderManager();
  });

  describe('initialize', () => {
    it('should load existing settings from file', async () => {
      const existingSettings: AISettings = {
        providers: [
          { id: 'test', name: 'Test', type: 'openai', models: ['gpt-4'], enabled: true }
        ],
        rules: []
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingSettings));
      
      await aiManager.initialize();
      
      const settings = await aiManager.getSettings();
      expect(settings.providers).toHaveLength(1);
      expect(settings.providers[0].name).toBe('Test');
    });

    it('should create default settings if file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      
      await aiManager.initialize();
      
      const settings = await aiManager.getSettings();
      expect(settings.providers).toHaveLength(0);
      expect(settings.rules).toHaveLength(3); // default rules for chat, code, embedding
    });
  });

  describe('saveSettings', () => {
    it('should save settings to file', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      
      const settings: AISettings = {
        providers: [{ id: 'new', name: 'New', type: 'openai', models: [], enabled: true }],
        rules: []
      };
      
      const result = await aiManager.saveSettings(settings);
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return false if save fails', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write error'));
      
      const result = await aiManager.saveSettings({ providers: [], rules: [] });
      
      expect(result).toBe(false);
    });
  });

  describe('testProvider', () => {
    it('should test OpenAI provider successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
      
      const config: AIProviderConfig = {
        id: 'test',
        name: 'OpenAI',
        type: 'openai',
        apiKey: 'sk-test',
        models: ['gpt-4'],
        enabled: true
      };
      
      const result = await aiManager.testProvider(config);
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test'
          })
        })
      );
    });

    it('should test Anthropic provider successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });
      
      const config: AIProviderConfig = {
        id: 'test',
        name: 'Anthropic',
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        models: ['claude-3'],
        enabled: true
      };
      
      const result = await aiManager.testProvider(config);
      
      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const config: AIProviderConfig = {
        id: 'test',
        name: 'OpenAI',
        type: 'openai',
        apiKey: 'sk-test',
        models: [],
        enabled: true
      };
      
      const result = await aiManager.testProvider(config);
      
      expect(result).toBe(false);
    });

    it('should return true for webllm provider', async () => {
      const config: AIProviderConfig = {
        id: 'test',
        name: 'WebLLM',
        type: 'webllm',
        models: ['llama'],
        enabled: true
      };
      
      const result = await aiManager.testProvider(config);
      
      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should test Vertex AI provider successfully', async () => {
      // Mock reading service-account JSON
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(FAKE_SERVICE_ACCOUNT));
      // Mock crypto.createSign
      const mockSign = { update: jest.fn(), sign: jest.fn().mockReturnValue('fake-signature') };
      jest.spyOn(crypto, 'createSign').mockReturnValueOnce(mockSign as any);
      // Mock OAuth token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'ya29.fake' })
      });
      // Mock Vertex AI models endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const config: AIProviderConfig = {
        id: 'vertex-1',
        name: 'Vertex AI',
        type: 'vertex',
        projectId: 'my-project',
        location: 'us-central1',
        authJsonPath: '/path/to/sa.json',
        models: ['gemini-1.5-pro'],
        enabled: true
      };

      const result = await aiManager.testProvider(config);
      expect(result).toBe(true);
    });

    it('should test OpenRouter provider successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const config: AIProviderConfig = {
        id: 'or-1',
        name: 'OpenRouter',
        type: 'openrouter',
        apiKey: 'sk-or-test',
        models: ['openai/gpt-4'],
        enabled: true
      };

      const result = await aiManager.testProvider(config);
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-or-test'
          })
        })
      );
    });

    it('should test LM Studio provider successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      const config: AIProviderConfig = {
        id: 'lms-1',
        name: 'LM Studio',
        type: 'lmstudio',
        models: ['local-model'],
        enabled: true
      };

      const result = await aiManager.testProvider(config);
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:1234/v1/models');
    });
  });

  describe('getResolvedProvider', () => {
    beforeEach(async () => {
      const settings: AISettings = {
        providers: [
          { id: 'openai-1', name: 'OpenAI', type: 'openai', models: ['gpt-4'], enabled: true },
          { id: 'anthropic-1', name: 'Anthropic', type: 'anthropic', models: ['claude-3'], enabled: true },
          { id: 'disabled-1', name: 'Disabled', type: 'openai', models: [], enabled: false }
        ],
        rules: [
          { id: 'chat-rule', contentType: 'chat', providerId: 'openai-1', priority: 1 },
          { id: 'code-rule', contentType: 'code', providerId: 'anthropic-1', model: 'claude-3-opus', priority: 1 }
        ]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();
    });

    it('should resolve preferred provider if specified', () => {
      const result = aiManager.getResolvedProvider('chat', 'anthropic-1');
      
      expect(result?.config.id).toBe('anthropic-1');
    });

    it('should resolve based on routing rules', () => {
      const result = aiManager.getResolvedProvider('code');
      
      expect(result?.config.id).toBe('anthropic-1');
      expect(result?.model).toBe('claude-3-opus');
    });

    it('should fallback to first enabled provider', () => {
      const result = aiManager.getResolvedProvider('embedding'); // no rule for embedding
      
      expect(result?.config.id).toBe('openai-1');
    });

    it('should not resolve disabled providers', () => {
      const result = aiManager.getResolvedProvider('chat', 'disabled-1');
      
      // Should fallback since disabled-1 is not enabled
      expect(result?.config.id).not.toBe('disabled-1');
    });
  });

  describe('processRequest', () => {
    it('should return fallback response if no providers configured', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      await aiManager.initialize();
      
      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });
      
      expect(result.providerId).toBe('system');
      expect(result.content).toContain('No AI providers configured');
    });

    it('should make OpenAI API call for openai provider', async () => {
      const settings: AISettings = {
        providers: [
          { id: 'openai-1', name: 'OpenAI', type: 'openai', apiKey: 'sk-test', models: ['gpt-4'], enabled: true }
        ],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'openai-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();
      
      // Mock the AI SDK's generateText
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello back!',
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
      } as any);
      
      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });
      
      expect(result.content).toBe('Hello back!');
      expect(result.providerId).toBe('openai-1');
    });

    it('should return empty content for webllm provider', async () => {
      const settings: AISettings = {
        providers: [
          { id: 'webllm-1', name: 'WebLLM', type: 'webllm', models: ['llama'], enabled: true }
        ],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'webllm-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();
      
      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });
      
      expect(result.providerId).toBe('webllm');
      expect(result.content).toBe('');
    });

    it('should handle API errors gracefully', async () => {
      const settings: AISettings = {
        providers: [
          { id: 'openai-1', name: 'OpenAI', type: 'openai', apiKey: 'sk-test', models: ['gpt-4'], enabled: true }
        ],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'openai-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid API key')
      });
      
      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });
      
      expect(result.content).toContain('Error');
    });

    it('should make Vertex AI API call for vertex provider', async () => {
      const settings: AISettings = {
        providers: [{
          id: 'vertex-1', name: 'Vertex AI', type: 'vertex',
          projectId: 'my-project', location: 'us-central1',
          authJsonPath: '/path/to/sa.json',
          models: ['gemini-1.5-pro'], enabled: true
        }],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'vertex-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();

      // Mock reading service-account JSON
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(FAKE_SERVICE_ACCOUNT));
      // Mock crypto.createSign
      const mockSign = { update: jest.fn(), sign: jest.fn().mockReturnValue('fake-signature') };
      jest.spyOn(crypto, 'createSign').mockReturnValueOnce(mockSign as any);
      
      // Use mockImplementation to handle different URLs
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ access_token: 'ya29.fake' }),
            text: () => Promise.resolve(''),
          });
        }
        // Vertex AI generateContent call
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: 'Hello from Gemini!' }] } }],
            modelVersion: 'gemini-1.5-pro-001',
            usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 5, totalTokenCount: 9 }
          }),
          text: () => Promise.resolve(''),
        });
      });

      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });

      expect(result.content).toBe('Hello from Gemini!');
      expect(result.providerId).toBe('vertex-1');
      expect(result.usage?.totalTokens).toBe(9);
    });

    it('should make OpenRouter API call for openrouter provider', async () => {
      const settings: AISettings = {
        providers: [{
          id: 'or-1', name: 'OpenRouter', type: 'openrouter',
          apiKey: 'sk-or-test', models: ['openai/gpt-4'], enabled: true
        }],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'or-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();

      // Mock the AI SDK's generateText
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello from OpenRouter!',
        usage: { promptTokens: 5, completionTokens: 4, totalTokens: 9 },
      } as any);

      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });

      expect(result.content).toBe('Hello from OpenRouter!');
      expect(result.providerId).toBe('or-1');
    });

    it('should make LM Studio API call for lmstudio provider', async () => {
      const settings: AISettings = {
        providers: [{
          id: 'lms-1', name: 'LM Studio', type: 'lmstudio',
          models: ['local-model'], enabled: true
        }],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'lms-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();

      // Mock the AI SDK's generateText
      mockGenerateText.mockResolvedValueOnce({
        text: 'Hello from LM Studio!',
        usage: { promptTokens: 5, completionTokens: 4, totalTokens: 9 },
      } as any);

      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });

      expect(result.content).toBe('Hello from LM Studio!');
      expect(result.providerId).toBe('lms-1');
    });

    it('should handle Vertex AI errors gracefully', async () => {
      const settings: AISettings = {
        providers: [{
          id: 'vertex-1', name: 'Vertex AI', type: 'vertex',
          projectId: 'my-project', location: 'us-central1',
          authJsonPath: '/path/to/sa.json',
          models: ['gemini-1.5-pro'], enabled: true
        }],
        rules: [{ id: 'chat-rule', contentType: 'chat', providerId: 'vertex-1', priority: 1 }]
      };
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(settings));
      await aiManager.initialize();

      // Service-account file not found
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await aiManager.processRequest('Hello', { contentType: 'chat' });
      expect(result.content).toContain('Error');
    });
  });
});
