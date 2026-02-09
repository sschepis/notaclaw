import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

export interface WebLLMModelOption {
  id: string;
  name: string;
  size: string;
  vram: string;
  description: string;
}

export const ROUTER_CONFIG = {
  agentic: "Qwen3-8B-Instruct-q4f16_1-MLC",
  social: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
  coding: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC"
};

export const AVAILABLE_WEBLLM_MODELS: WebLLMModelOption[] = [
  {
    id: "Qwen3-8B-Instruct-q4f16_1-MLC",
    name: "Qwen 3 8B",
    size: "~5GB",
    vram: "6GB",
    description: "High performance model for agentic tasks."
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    name: "Llama 3.1 8B",
    size: "~5GB",
    vram: "6GB",
    description: "Latest Llama model, optimized for social interaction."
  },
  {
    id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 Coder 7B",
    size: "~4.5GB",
    vram: "6GB",
    description: "Specialized for coding tasks."
  }
];

class WebLLMService {
  private engine: MLCEngine | null = null;
  private currentModelId: string | null = null;

  async initialize(modelId: string, onProgress?: InitProgressCallback) {
    if (this.engine && this.currentModelId === modelId) {
      return;
    }

    try {
        if (this.engine) {
            await this.engine.unload();
            this.engine = null;
        }

        this.engine = await CreateMLCEngine(modelId, {
            initProgressCallback: onProgress,
        });
        this.currentModelId = modelId;
    } catch (error) {
        console.error("Failed to initialize WebLLM:", error);
        throw error;
    }
  }

  async chat(messages: any[], stream: boolean = false) {
    if (!this.engine) {
      throw new Error("Engine not initialized");
    }
    
    // Convert messages to the format WebLLM expects if needed, 
    // but usually it matches OpenAI format
    return await this.engine.chat.completions.create({
      messages,
      stream,
    });
  }

  isInitialized() {
    return !!this.engine;
  }

  getCurrentModel() {
    return this.currentModelId;
  }
}

export const webLLMService = new WebLLMService();
