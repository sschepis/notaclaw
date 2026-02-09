export interface ProviderMeta {
  name: string;
  icon: string;
  gradient: string;
  borderActive: string;
  desc: string;
  category: 'cloud' | 'local';
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  openai: {
    name: 'OpenAI',
    icon: '◐',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderActive: 'border-emerald-500/30',
    desc: 'GPT-4o, o1, DALL·E',
    category: 'cloud',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '◈',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderActive: 'border-amber-500/30',
    desc: 'Claude Sonnet, Opus, Haiku',
    category: 'cloud',
  },
  openrouter: {
    name: 'OpenRouter',
    icon: '◇',
    gradient: 'from-violet-500/20 to-purple-500/20',
    borderActive: 'border-violet-500/30',
    desc: 'Access 100+ models',
    category: 'cloud',
  },
  google: {
    name: 'Google Gemini API',
    icon: '✦',
    gradient: 'from-sky-500/20 to-blue-500/20',
    borderActive: 'border-sky-500/30',
    desc: 'Gemini via API key',
    category: 'cloud',
  },
  vertex: {
    name: 'Google Vertex AI',
    icon: '△',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderActive: 'border-blue-500/30',
    desc: 'Gemini via GCP',
    category: 'cloud',
  },
  lmstudio: {
    name: 'LM Studio',
    icon: '⊞',
    gradient: 'from-green-500/20 to-lime-500/20',
    borderActive: 'border-green-500/30',
    desc: 'Local OpenAI-compat server',
    category: 'local',
  },
  webllm: {
    name: 'WebLLM',
    icon: '⬡',
    gradient: 'from-rose-500/20 to-pink-500/20',
    borderActive: 'border-rose-500/30',
    desc: 'In-browser via WebGPU',
    category: 'local',
  },
};

export const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514', 'google/gemini-pro-1.5'],
  google: ['gemini-3-pro-preview', 'gemini-3-flash-preview'],
  vertex: ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'claude-opus-4-6'],
  lmstudio: [],
  webllm: ['Qwen3-8B-Instruct-q4f16_1-MLC', 'Llama-3.1-8B-Instruct-q4f16_1-MLC', 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC'],
};

export const API_KEY_PLACEHOLDER: Record<string, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  openrouter: 'sk-or-...',
  google: 'AIza...',
};

export const VERTEX_LOCATIONS = [
  'global',
  'us-central1',
  'us-east1',
  'us-west1',
  'europe-west1',
  'europe-west4',
  'asia-northeast1',
  'asia-southeast1',
];
