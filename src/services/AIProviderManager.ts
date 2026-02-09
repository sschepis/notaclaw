import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { generateText, LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AIProviderConfig, AISettings, AIRequestOptions, AIResponse, AIContentType } from '../shared/ai-types';

const DEFAULT_SETTINGS: AISettings = {
  providers: [],
  rules: [
    { id: 'default-chat', contentType: 'chat', providerId: '', priority: 0 },
    { id: 'default-agent', contentType: 'agent', providerId: '', priority: 0 },
    { id: 'default-code', contentType: 'code', providerId: '', priority: 0 },
    { id: 'default-embedding', contentType: 'embedding', providerId: '', priority: 0 },
  ]
};

// Cache TTL: 24 hours in milliseconds
const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ModelCacheEntry {
  models: string[];
  fetchedAt: number;
}

interface ModelCache {
  [cacheKey: string]: ModelCacheEntry;
}

export class AIProviderManager {
  private settings: AISettings = DEFAULT_SETTINGS;
  private configPath: string | null = null;
  private modelCachePath: string | null = null;
  private modelCache: ModelCache = {};

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    this.configPath = path.join(dataDir, 'ai-settings.json');
    this.modelCachePath = path.join(dataDir, 'model-cache.json');
  }

  private getConfigPath(): string {
    return this.configPath!;
  }

  private getModelCachePath(): string {
    return this.modelCachePath!;
  }

  async initialize() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.getConfigPath());
    await fs.mkdir(dataDir, { recursive: true });

    try {
      const configPath = this.getConfigPath();
      const data = await fs.readFile(configPath, 'utf-8');
      this.settings = JSON.parse(data);
      console.log('AI Settings loaded');
    } catch (error) {
      console.log('No existing AI settings found, using defaults');
      await this.saveSettings(DEFAULT_SETTINGS);
    }

    // Load model cache from disk
    try {
      const modelCachePath = this.getModelCachePath();
      const cacheData = await fs.readFile(modelCachePath, 'utf-8');
      this.modelCache = JSON.parse(cacheData);
      console.log('Model cache loaded');

      // Hydrate providers with cached models
      this.settings.providers = this.settings.providers.map(provider => {
        const cacheKey = this.getModelCacheKey(provider);
        let models = provider.models || [];
        
        if (this.modelCache[cacheKey]) {
          models = this.modelCache[cacheKey].models;
        }

        // Force inject models for Vertex
        if (provider.type === 'vertex') {
           const requiredModels = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'claude-opus-4-6'];
           for (const model of [...requiredModels].reverse()) {
             if (!models.includes(model)) {
               models.unshift(model);
             }
           }
        }
        
        return { ...provider, models };
      });
    } catch {
      console.log('No existing model cache found');
      this.modelCache = {};
    }
  }

  /**
   * Generate a cache key for a provider config.
   * Includes type, endpoint, and API key hash to invalidate on credential change.
   */
  private getModelCacheKey(config: AIProviderConfig): string {
    const keyParts = [config.type, config.endpoint || 'default'];
    if (config.apiKey) {
      // Use a short hash of the API key so cache invalidates when key changes
      const hash = crypto.createHash('sha256').update(config.apiKey).digest('hex').substring(0, 8);
      keyParts.push(hash);
    }
    return keyParts.join(':');
  }

  private async saveModelCache(): Promise<void> {
    try {
      const modelCachePath = this.getModelCachePath();
      await fs.writeFile(modelCachePath, JSON.stringify(this.modelCache, null, 2));
    } catch (error) {
      console.error('Failed to save model cache:', error);
    }
  }

  /**
   * Dedicated method for Vertex AI models that ALWAYS returns the preview models.
   * This is separated to ensure the preview models are returned even if all API calls fail.
   */
  private async fetchVertexModels(config: AIProviderConfig, forceRefresh = false): Promise<string[]> {
    // ALWAYS start with the user-requested models
    const models: string[] = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'claude-opus-4-6'];
    
    try {
      const cacheKey = this.getModelCacheKey(config);
      const now = Date.now();
      
      // Check cache (unless force refresh)
      if (!forceRefresh && this.modelCache[cacheKey]) {
        const cached = this.modelCache[cacheKey];
        const age = now - cached.fetchedAt;
        
        // Return cache if fresh and contains all required models
        if (age < MODEL_CACHE_TTL_MS && cached.models.includes('gemini-3-pro-preview') && cached.models.includes('claude-opus-4-6')) {
          console.log(`Using cached Vertex models (age: ${Math.round(age / 1000 / 60)} min)`);
          return cached.models;
        }
      }
      
      // Try to fetch from API
      const project = config.projectId;
      const location = config.location || 'us-central1';
      
      if (project && config.authJsonPath) {
        try {
          const accessToken = await this.getVertexAccessToken(config);
          const host = this.vertexHost(location);
          const modelsUrl = `https://${host}/v1beta1/projects/${project}/locations/${location}/publishers/google/models`;
          
          console.log(`Fetching Vertex models from: ${modelsUrl}`);
          const response = await fetch(modelsUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            const apiModels = (data.models || [])
              .map((m: any) => {
                const parts = m.name?.split('/') || [];
                return parts[parts.length - 1];
              })
              .filter((id: string) => id && (id.includes('gemini') || id.includes('claude')));
            
            // Add API models that aren't already in our list
            for (const model of apiModels) {
              if (!models.includes(model)) {
                models.push(model);
              }
            }
          } else {
            console.warn(`Vertex AI API returned ${response.status} - using default models`);
          }
        } catch (apiError) {
          console.warn('Vertex AI API call failed (using default models):', apiError);
        }
      }
      
      // Cache the results
      this.modelCache[cacheKey] = { models, fetchedAt: now };
      await this.saveModelCache();
      console.log(`Vertex AI models available: ${models.join(', ')}`);
      
      // Update in-memory settings
      const providerIndex = this.settings.providers.findIndex(p => p.id === config.id);
      if (providerIndex !== -1) {
        this.settings.providers[providerIndex].models = models;
      }
    } catch (error) {
      console.warn('fetchVertexModels error (returning default models):', error);
    }
    
    // ALWAYS return at least the preview models
    return models;
  }

  async getSettings(): Promise<AISettings> {
    return this.settings;
  }

  async saveSettings(settings: AISettings): Promise<boolean> {
    try {
      this.settings = settings;
      
      // Don't persist model lists in settings - they are cached separately
      // This prevents stale/hardcoded models from sticking around
      const settingsToSave = {
        ...settings,
        providers: settings.providers.map(p => ({
          ...p,
          models: [] // Clear models before saving
        }))
      };
      
      const configPath = this.getConfigPath();
      await fs.writeFile(configPath, JSON.stringify(settingsToSave, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      return false;
    }
  }

  async testProvider(config: AIProviderConfig): Promise<boolean> {
    console.log(`Testing provider: ${config.name} (${config.type})`);
    
    try {
      // For SDK-supported providers, we can try a simple generation call or list models if supported
      // For now, we'll keep the manual fetch checks as they are lightweight
      if (config.type === 'openai') {
        const endpoint = config.endpoint || 'https://api.openai.com/v1';
        const response = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        return response.ok;
      } else if (config.type === 'anthropic') {
        const endpoint = config.endpoint || 'https://api.anthropic.com/v1';
        const response = await fetch(`${endpoint}/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': config.apiKey || '',
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        return response.ok || response.status === 400;
      } else if (config.type === 'local') {
        const endpoint = config.endpoint || 'http://localhost:11434';
        const response = await fetch(`${endpoint}/api/tags`);
        return response.ok;
      } else if (config.type === 'vertex' || config.type === 'vertex-anthropic') {
        const token = await this.getVertexAccessToken(config);
        const project = config.projectId || '';
        const location = config.location || 'us-central1';

        if (location === 'global') {
          console.log('[Vertex AI] Global location — token obtained, credentials valid.');
          return true;
        }

        const host = this.vertexHost(location);
        // Use v1beta1 to list models
        const testUrl = `https://${host}/v1beta1/projects/${project}/locations/${location}/publishers/google/models`;
        console.log(`[Vertex AI] Testing URL: ${testUrl}`);
        const response = await fetch(testUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`[Vertex AI] Test response: ${response.status} ${response.statusText}`);
        return response.ok;
      } else if (config.type === 'openrouter') {
        const endpoint = config.endpoint || 'https://openrouter.ai/api/v1';
        const response = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        return response.ok;
      } else if (config.type === 'lmstudio') {
        const endpoint = config.endpoint || 'http://localhost:1234/v1';
        const response = await fetch(`${endpoint}/models`);
        return response.ok;
      } else if (config.type === 'webllm') {
        return true;
      } else if (config.type === 'google') {
        const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
        const response = await fetch(`${endpoint}?key=${config.apiKey}`);
        return response.ok;
      }
      return true;
    } catch (error) {
      console.error('Provider test failed:', error);
      return false;
    }
  }

  /**
   * Fetch available models from a provider's API.
   */
  async fetchProviderModels(config: AIProviderConfig, forceRefresh = false): Promise<string[]> {
    // ALWAYS return the preview models for Vertex AI immediately to ensure they're available
    if (config.type === 'vertex') {
      const vertexModels = await this.fetchVertexModels(config, forceRefresh);
      return vertexModels;
    }
    
    const cacheKey = this.getModelCacheKey(config);
    const now = Date.now();

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.modelCache[cacheKey]) {
      const cached = this.modelCache[cacheKey];
      const age = now - cached.fetchedAt;
      
      // Check if cache contains known stale/hardcoded data
      const isStaleData = cached.models.includes('gemini-1.0-pro-002') && !cached.models.includes('gemini-1.5-pro');

      if (age < MODEL_CACHE_TTL_MS && !isStaleData) {
        console.log(`Using cached models for ${config.type} (age: ${Math.round(age / 1000 / 60)} min)`);
        return cached.models;
      } else if (isStaleData) {
        console.log('Cache contains stale/hardcoded data, forcing refresh');
      }
    }

    console.log(`Fetching models from API for provider: ${config.name} (${config.type})`);

    try {
      let models: string[] = [];

      if (config.type === 'openai') {
        const endpoint = config.endpoint || 'https://api.openai.com/v1';
        const response = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
        const data = await response.json();
        models = (data.data || [])
          .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'))
          .map((m: any) => m.id)
          .sort();
      } else if (config.type === 'anthropic') {
        models = [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      } else if (config.type === 'local') {
        const endpoint = config.endpoint || 'http://localhost:11434';
        const response = await fetch(`${endpoint}/api/tags`);
        if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
        const data = await response.json();
        models = (data.models || []).map((m: any) => m.name);
      } else if (config.type === 'openrouter') {
        const endpoint = config.endpoint || 'https://openrouter.ai/api/v1';
        const response = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
        const data = await response.json();
        models = (data.data || []).map((m: any) => m.id).sort();
      } else if (config.type === 'lmstudio') {
        const endpoint = config.endpoint || 'http://localhost:1234/v1';
        const response = await fetch(`${endpoint}/models`);
        if (!response.ok) throw new Error(`LM Studio API error: ${response.status}`);
        const data = await response.json();
        models = (data.data || []).map((m: any) => m.id);
      } else if (config.type === 'vertex-anthropic') {
        // Vertex Anthropic: Static list of supported models as requested
        models = [
          'claude-opus-4-6',
          'claude-opus-4-5'
        ];
      } else if (config.type === 'webllm') {
        models = [
          'Qwen3-8B-Instruct-q4f16_1-MLC',
          'Llama-3.1-8B-Instruct-q4f16_1-MLC',
          'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC'
        ];
      } else if (config.type === 'google') {
        const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
        const response = await fetch(`${endpoint}?key=${config.apiKey}`);
        if (!response.ok) throw new Error(`Google API error: ${response.status}`);
        const data = await response.json();
        models = (data.models || [])
          .map((m: any) => m.name.replace('models/', ''))
          .filter((id: string) => id.includes('gemini'))
          .sort();

        // Ensure gemini-3-pro-preview is present as requested
        if (!models.includes('gemini-3-pro-preview')) {
           models.unshift('gemini-3-pro-preview');
        }
      }

      // Cache the results
      if (models.length > 0) {
        this.modelCache[cacheKey] = { models, fetchedAt: now };
        await this.saveModelCache();
        console.log(`Cached ${models.length} models for ${config.type}`);

        // Update in-memory settings with new models
        const providerIndex = this.settings.providers.findIndex(p => p.id === config.id);
        if (providerIndex !== -1) {
          this.settings.providers[providerIndex].models = models;
        }
      }

      return models;
    } catch (error) {
      console.error('Failed to fetch provider models:', error);
      if (this.modelCache[cacheKey]) {
        console.log('Returning stale cache due to fetch error');
        return this.modelCache[cacheKey].models;
      }
      throw error;
    }
  }

  /**
   * Generate embeddings for a given text using the configured embedding provider.
   */
  async getEmbeddings(text: string, providerId?: string): Promise<number[]> {
    const resolution = this.getResolvedProvider('embedding', providerId);
    
    // If no provider configured, return mock (or maybe fail?)
    if (!resolution) {
      console.warn('No embedding provider configured, using random mock vector');
      return Array.from({ length: 768 }, () => Math.random());
    }

    const { config: provider } = resolution;
    
    try {
      if (provider.type === 'vertex') {
        return await this.getVertexEmbeddings(provider, text);
      } else if (provider.type === 'openai') {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        const response = await fetch(`${endpoint}/embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: text,
            model: 'text-embedding-3-small'
          })
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI Embedding Error: ${response.status} - ${err}`);
        }
        const data = await response.json();
        return data.data[0].embedding;
      }
      
      // Fallback for others
      console.warn(`Provider ${provider.type} not supported for embeddings yet, using mock`);
      return Array.from({ length: 768 }, () => Math.random());
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      // Fallback to mock on error to keep system running
      return Array.from({ length: 768 }, () => Math.random());
    }
  }

  private async getVertexEmbeddings(provider: AIProviderConfig, text: string): Promise<number[]> {
    const project = provider.projectId;
    const location = provider.location || 'us-central1';
    if (!project) throw new Error('Vertex AI provider requires a projectId');

    const accessToken = await this.getVertexAccessToken(provider);
    const host = this.vertexHost(location);
    // Use text-embedding-004
    const model = 'text-embedding-004';
    const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{ content: text }]
      })
    });

    if (!response.ok) {
       const err = await response.text();
       throw new Error(`Vertex Embedding Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const embedding = data.predictions?.[0]?.embeddings?.values;
    if (!embedding) throw new Error('No embedding found in Vertex response');
    return embedding;
  }

  getResolvedProvider(contentType: AIContentType, preferredProviderId?: string): { config: AIProviderConfig, model?: string } | null {
    if (preferredProviderId) {
      const preferred = this.settings.providers.find(p => p.id === preferredProviderId && p.enabled);
      if (preferred) return { config: preferred };
    }

    const rules = this.settings.rules
      .filter(r => r.contentType === contentType)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of rules) {
      const provider = this.settings.providers.find(p => p.id === rule.providerId && p.enabled);
      if (provider) return { config: provider, model: rule.model };
    }

    const fallback = this.settings.providers.find(p => p.enabled);
    return fallback ? { config: fallback } : null;
  }

  getProviderFor(contentType: AIContentType, preferredProviderId?: string): AIProviderConfig | null {
    const resolution = this.getResolvedProvider(contentType, preferredProviderId);
    return resolution ? resolution.config : null;
  }

  /**
   * Factory method to create a Vercel AI SDK LanguageModel instance
   */
  private getSDKModel(provider: AIProviderConfig, modelId: string): LanguageModel | null {
    switch (provider.type) {
      case 'openai':
        const openai = createOpenAI({ apiKey: provider.apiKey });
        return openai(modelId);
      case 'anthropic':
        const anthropic = createAnthropic({ apiKey: provider.apiKey });
        return anthropic(modelId);
      case 'google':
        const google = createGoogleGenerativeAI({ apiKey: provider.apiKey });
        return google(modelId);
      case 'openrouter':
        const openrouter = createOpenAI({ 
          baseURL: 'https://openrouter.ai/api/v1', 
          apiKey: provider.apiKey 
        });
        return openrouter(modelId);
      case 'local':
      case 'lmstudio':
        const local = createOpenAI({ 
          baseURL: provider.endpoint || (provider.type === 'local' ? 'http://localhost:11434/v1' : 'http://localhost:1234/v1'),
          apiKey: 'not-needed'
        });
        return local(modelId);
      default:
        return null; // Handle manually (Vertex, WebLLM)
    }
  }

  async processRequest(prompt: string, options: AIRequestOptions): Promise<AIResponse> {
    const resolution = this.getResolvedProvider(options.contentType, options.providerId);
    
    if (!resolution) {
      return {
        content: `[System] No AI providers configured.`,
        model: 'system-fallback',
        providerId: 'system',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }

    const { config: provider, model: ruleModel } = resolution;
    const modelToUse = options.model || ruleModel || provider.models[0] || 'gpt-4';

    if (provider.type === 'webllm') {
      return { content: '', model: modelToUse, providerId: 'webllm' };
    }

    console.log(`Routing '${options.contentType}' request to ${provider.name} (Model: ${modelToUse})`);

    try {
      // 1. Handle Manual Providers (Vertex, Vertex-Anthropic)
      if (provider.type === 'vertex') {
        return await this.callVertexAI(provider, prompt, modelToUse, options);
      } else if (provider.type === 'vertex-anthropic') {
        return await this.callVertexAnthropic(provider, prompt, modelToUse, options);
      }

      // 2. Handle SDK Providers
      const sdkModel = this.getSDKModel(provider, modelToUse);
      if (sdkModel) {
        const { text, usage } = await generateText({
          model: sdkModel,
          prompt: prompt,
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? 2048,
        } as any);

        return {
          content: text,
          model: modelToUse,
          providerId: provider.id,
          usage: {
            promptTokens: (usage as any).promptTokens || 0,
            completionTokens: (usage as any).completionTokens || 0,
            totalTokens: (usage as any).totalTokens || 0
          }
        };
      }

      throw new Error(`Unsupported provider type: ${provider.type}`);
    } catch (error) {
      console.error('AI request failed:', error);
      return {
        content: `[Error] Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: modelToUse,
        providerId: provider.id,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
  }

  async processChatRequest(messages: any[], tools: any[], options: AIRequestOptions): Promise<AIResponse> {
    const resolution = this.getResolvedProvider(options.contentType, options.providerId);
    
    if (!resolution) {
      return {
        content: `[System] No AI providers configured.`,
        model: 'system-fallback',
        providerId: 'system',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }

    const { config: provider, model: ruleModel } = resolution;
    const modelToUse = options.model || ruleModel || provider.models[0] || 'gpt-4';

    try {
        const sdkModel = this.getSDKModel(provider, modelToUse);
        if (sdkModel) {
            // Convert tools to Vercel AI SDK format if needed
            // For now assuming tools are already in compatible format or we map them
            const toolsMap = tools.reduce((acc: any, tool: any) => {
                acc[tool.function.name] = tool.function;
                return acc;
            }, {});

            const { text, usage, toolCalls } = await generateText({
                model: sdkModel,
                messages: messages,
                tools: toolsMap,
                temperature: options.temperature ?? 0.7,
                maxTokens: options.maxTokens ?? 2048,
            } as any);

            // Handle tool calls in response
            // We might need to return them in AIResponse
            
            return {
                content: text,
                model: modelToUse,
                providerId: provider.id,
                usage: {
                    promptTokens: (usage as any).promptTokens || 0,
                    completionTokens: (usage as any).completionTokens || 0,
                    totalTokens: (usage as any).totalTokens || 0
                },
                toolCalls: toolCalls // Need to update AIResponse type
            };
        }
        throw new Error(`Unsupported provider type for chat: ${provider.type}`);
    } catch (error) {
        console.error('AI chat request failed:', error);
        throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Google Vertex AI helpers (Manual Implementation)
  // ---------------------------------------------------------------------------

  private vertexHost(location: string): string {
    return location === 'global'
      ? 'aiplatform.googleapis.com'
      : `${location}-aiplatform.googleapis.com`;
  }

  private async getVertexAccessToken(provider: AIProviderConfig): Promise<string> {
    if (!provider.authJsonPath) throw new Error('Vertex AI provider requires authJsonPath');
    const raw = await fs.readFile(provider.authJsonPath, 'utf-8');
    const serviceAccount = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };
    const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedToken = `${encode(header)}.${encode(payload)}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');
    const jwt = `${unsignedToken}.${signature}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!tokenResponse.ok) throw new Error(`Vertex Token Error: ${tokenResponse.status}`);
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  private async callVertexAI(
    provider: AIProviderConfig,
    prompt: string,
    model: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    // Route Claude models through the Anthropic-on-Vertex endpoint
    if (model.startsWith('claude-')) {
      return await this.callVertexAnthropic(provider, prompt, model, options);
    }

    const project = provider.projectId;
    const location = provider.location || 'us-central1';
    if (!project) throw new Error('Vertex AI provider requires a projectId');

    const accessToken = await this.getVertexAccessToken(provider);
    const host = this.vertexHost(location);
    const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      model: data.modelVersion || model,
      providerId: provider.id,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  private async callVertexAnthropic(
    provider: AIProviderConfig,
    prompt: string,
    model: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    const project = provider.projectId;
    const location = provider.location || 'us-central1';
    if (!project) throw new Error('Vertex AI provider requires a projectId');

    const accessToken = await this.getVertexAccessToken(provider);
    const host = this.vertexHost(location);
    // Anthropic on Vertex uses rawPredict or streamRawPredict
    const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/publishers/anthropic/models/${model}:rawPredict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        anthropic_version: "vertex-2023-10-16",
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex Anthropic error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const contentBlock = data.content?.[0];
    
    return {
      content: contentBlock?.text || '',
      model: data.model || model,
      providerId: provider.id,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }
}
