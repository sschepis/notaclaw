# AI Providers

The application supports multiple AI providers, allowing you to choose between cloud services, local models, or even in-browser inference. This flexibility ensures you can work with your preferred models while maintaining privacy when needed.

## Provider Types

### Cloud Providers

#### OpenAI
*   **Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, O1, O3
*   **Requirements**: OpenAI API key
*   **Endpoint**: `https://api.openai.com/v1` (default)
*   **Best For**: General chat, coding assistance, complex reasoning

**Configuration**:
1. Go to Settings → AI & Models → Providers
2. Click "Add Provider"
3. Select "OpenAI"
4. Enter your API key from [platform.openai.com](https://platform.openai.com)
5. Test connection and save

#### Anthropic
*   **Models**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
*   **Requirements**: Anthropic API key
*   **Best For**: Long-form content, nuanced reasoning, safety-conscious applications

**Configuration**:
1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Add as Anthropic provider type
3. Models are automatically available

#### Google AI (Gemini)
*   **Models**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0
*   **Requirements**: Google AI Studio API key
*   **Best For**: Multimodal tasks, long context windows

**Configuration**:
1. Get API key from [aistudio.google.com](https://aistudio.google.com)
2. Add as Google provider type

#### Google Vertex AI
*   **Models**: Gemini Pro, Gemini Flash, Claude (via Model Garden)
*   **Requirements**: GCP service account with Vertex AI access
*   **Best For**: Enterprise deployments, compliance requirements

**Configuration**:
1. Create a GCP project with Vertex AI enabled
2. Create a service account with Vertex AI User role
3. Download the JSON key file
4. In settings, add Vertex AI provider:
   - Project ID: Your GCP project ID
   - Location: e.g., `us-central1`
   - Auth JSON Path: Path to your service account key

#### OpenRouter
*   **Models**: 100+ models from multiple providers
*   **Requirements**: OpenRouter API key
*   **Best For**: Model experimentation, cost optimization

**Configuration**:
1. Get API key from [openrouter.ai](https://openrouter.ai)
2. Add as OpenRouter provider type
3. Browse extensive model catalog

### Local Providers

#### Ollama
*   **Models**: Llama 3, Mistral, Phi, Qwen, and many more
*   **Requirements**: Ollama installed and running locally
*   **Endpoint**: `http://localhost:11434` (default)
*   **Best For**: Privacy, offline use, experimentation

**Setup**:
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.1`
3. Ollama runs automatically in the background
4. Add as Local (Ollama) provider in settings

**Available Models**:
Models are fetched automatically from your Ollama installation.

#### LM Studio
*   **Models**: Any GGUF model you download
*   **Requirements**: LM Studio running with server enabled
*   **Endpoint**: `http://localhost:1234/v1` (default)
*   **Best For**: GUI-based local model management

**Setup**:
1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Download and load a model
3. Enable the local server (Settings → Local Server)
4. Add as LM Studio provider in settings

### Browser Inference

#### WebLLM
*   **Models**: Llama 3 8B, Phi-3 Mini, Gemma 2B, Qwen2.5
*   **Requirements**: WebGPU-capable browser, sufficient GPU memory
*   **Best For**: Complete privacy, offline operation, no server needed

**Supported Models**:

| Model | Size | VRAM Required |
|-------|------|---------------|
| Hermes 2 Pro (Llama 3 8B) | ~4.5GB | 6GB |
| Llama 3 8B Instruct | ~4.5GB | 6GB |
| Phi-3 Mini | ~2.3GB | 3GB |
| Gemma 2B | ~1.5GB | 2GB |

**Setup**:
1. Add as WebLLM provider in settings
2. Select a model appropriate for your hardware
3. First use will download and cache the model
4. Progress shown during initialization

**Notes**:
- Initial download can take several minutes
- Models are cached in browser storage
- Performance depends on your GPU
- Falls back gracefully if WebGPU unavailable

## Routing Rules

Routing rules determine which provider handles different types of requests.

### Content Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| **chat** | General conversation | Q&A, brainstorming, general assistance |
| **code** | Programming tasks | Code generation, debugging, refactoring |
| **embedding** | Vector embeddings | Semantic search, similarity matching |

### Configuring Rules

1. Go to Settings → AI & Models → Routing Rules
2. For each content type, select:
   - **Provider**: Which provider handles this type
   - **Model**: Specific model to use (optional)
   - **Priority**: Order for fallback (higher = tried first)

### Example Configuration

```
Chat:
  1. OpenAI (GPT-4) - Priority 1
  2. Ollama (Llama 3) - Priority 0 (fallback)

Code:
  1. Anthropic (Claude 3.5 Sonnet) - Priority 1

Embedding:
  1. OpenAI (text-embedding-3-small) - Priority 1
```

### Fallback Behavior
If the primary provider fails:
1. System tries next provider by priority
2. If all fail, error is shown to user
3. Local providers are good fallbacks for offline scenarios

## Provider Management

### Testing Connectivity
1. Open Settings → AI & Models
2. Click the test icon on any provider
3. Green checkmark = connected
4. Red X = connection failed (hover for details)

### Refreshing Models
Models are cached for 24 hours. To refresh:
1. Click the refresh icon on a provider
2. New models will be fetched from the API

### Disabling Providers
1. Toggle the enable switch on a provider
2. Disabled providers are not used for routing
3. Settings are preserved for re-enabling

### Removing Providers
1. Click the delete icon on a provider
2. Confirm deletion
3. API keys are removed from storage

## Security Considerations

### API Key Storage
- API keys are stored encrypted locally
- Keys never leave your device (except to their respective APIs)
- Consider using environment variables for sensitive deployments

### Local vs. Cloud
| Aspect | Cloud Providers | Local/Browser |
|--------|----------------|---------------|
| Privacy | Data sent to provider | Stays on device |
| Speed | Depends on network | Depends on hardware |
| Cost | Pay per token | Free after download |
| Model Quality | Latest models | Open-source models |

### Recommendations
- **Sensitive data**: Use local or WebLLM providers
- **Best quality**: Use cloud providers (GPT-4, Claude 3 Opus)
- **Cost-conscious**: Use OpenRouter or local models
- **Offline work**: Configure Ollama or WebLLM as fallback

## Troubleshooting

### "No providers configured"
1. Open Settings → AI & Models
2. Add at least one provider
3. Ensure provider is enabled
4. Set routing rules for chat content type

### "API key invalid"
1. Verify key is correct (no extra spaces)
2. Check key hasn't expired
3. Ensure key has appropriate permissions
4. Test in provider's official playground first

### "Model not found"
1. Refresh models list
2. Check if model is available in your region/plan
3. Some models require special access (e.g., GPT-4)

### Local model slow
1. Check GPU is being utilized
2. Try a smaller model
3. Close other GPU-intensive applications
4. For Ollama: ensure CUDA/Metal is enabled

### WebLLM initialization fails
1. Check browser supports WebGPU
2. Verify sufficient GPU memory
3. Try a smaller model
4. Clear browser cache and retry
