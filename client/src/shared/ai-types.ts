export type AIProviderType = 'openai' | 'anthropic' | 'local' | 'custom' | 'webllm' | 'vertex' | 'openrouter' | 'lmstudio' | 'google' | 'vertex-anthropic';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  endpoint?: string;
  apiKey?: string;
  models: string[];
  enabled: boolean;
  /** Google Vertex AI: GCP project ID */
  projectId?: string;
  /** Google Vertex AI: GCP region (e.g. 'us-central1') */
  location?: string;
  /** Google Vertex AI: Absolute path to the service-account JSON key file */
  authJsonPath?: string;
}

export type AIContentType = 'chat' | 'code' | 'embedding' | 'summary' | 'analysis' | 'agent';

export interface AIRoutingRule {
  id: string;
  contentType: AIContentType;
  providerId: string;
  model?: string;
  priority: number; // Higher number = higher priority
}

export interface AIRequestOptions {
  contentType: AIContentType;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  /** Per-request timeout in ms. If not set, uses content-type-aware defaults. */
  timeoutMs?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  providerId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: any[];
  raw?: any;
}

export interface AISettings {
  providers: AIProviderConfig[];
  rules: AIRoutingRule[];
  /** The currently selected model ID (e.g., 'claude-3-5-sonnet-20241022') */
  selectedModel?: string | null;
}
