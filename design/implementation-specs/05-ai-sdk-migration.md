# AI SDK Migration Design

## 1. Objective
Replace the manual, fragile HTTP fetch implementations in `AIProviderManager` with the **Vercel AI SDK**. This will provide a robust, standardized, and maintained interface for interacting with various AI providers (OpenAI, Anthropic, Google, etc.), reducing maintenance burden and improving reliability.

## 2. Current State vs. Future State

### Current State (`AIProviderManager`)
- **Manual HTTP Calls**: Uses `fetch` for every provider (OpenAI, Anthropic, Vertex, etc.).
- **Fragile Error Handling**: Custom error parsing for each provider.
- **Inconsistent Interfaces**: Different response formats manually mapped to `AIResponse`.
- **Maintenance Burden**: API changes require manual code updates.

### Future State (Vercel AI SDK)
- **Unified Interface**: Uses `generateText` and `streamText` for all providers.
- **Provider Packages**: Uses official/community packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`).
- **Standardized Output**: Consistent response format handled by the SDK.
- **Flexible Routing**: Easy to switch providers or use custom endpoints (Ollama/LM Studio via OpenAI compatibility).

## 3. Architecture

### 3.1. Dependencies
We will install the following packages in `client/package.json`:
- `ai`: Core SDK.
- `@ai-sdk/openai`: For OpenAI, OpenRouter, LM Studio, Ollama (via OpenAI compatibility).
- `@ai-sdk/anthropic`: For Anthropic.
- `@ai-sdk/google`: For Google Gemini (API Key) and Vertex AI.

### 3.2. Provider Mapping
The `AIProviderManager` will map our `AIProviderConfig` to SDK Provider instances on the fly.

| Internal Type | SDK Provider | Configuration | Notes |
| :--- | :--- | :--- | :--- |
| `openai` | `createOpenAI` | `apiKey: config.apiKey` | Standard OpenAI |
| `anthropic` | `createAnthropic` | `apiKey: config.apiKey` | Standard Anthropic |
| `google` | `createGoogleGenerativeAI` | `apiKey: config.apiKey` | **Google Gemini (API Key)**. Supports `gemini-3-pro-preview`. |
| `vertex-anthropic` | `createVertex` | `project: ...`, `location: ...` | **Google Vertex Anthropic**. Targets Anthropic models on Vertex. |
| `vertex` | `createVertex` | `project: ...`, `location: ...` | Standard Vertex AI (Gemini models on GCP). |
| `openrouter` | `createOpenAI` | `baseURL: 'https://openrouter.ai/api/v1'`, `apiKey: ...` | OpenRouter |
| `local` | `createOpenAI` | `baseURL: 'http://localhost:11434/v1'` | Ollama |
| `lmstudio` | `createOpenAI` | `baseURL: 'http://localhost:1234/v1'` | LM Studio |

### 3.3. Model Listing (`fetchProviderModels`)
We will adopt a hybrid strategy for model listing:

*   **Dynamic Fetching**: For providers with standard listing endpoints (OpenAI, OpenRouter, Local/Ollama, Google Gemini API), we will fetch the list dynamically.
*   **Static/Curated Lists**: For providers where listing is complex, unavailable, or we want to enforce specific models:
    *   **Google Vertex Anthropic**: Hardcoded list: `['claude-opus-4-6', 'claude-opus-4-5']`. (Note: We will map these to actual Vertex Model IDs internally if needed).
    *   **Anthropic (Direct)**: Hardcoded list of supported models (API doesn't support listing).
    *   **Google Gemini (API Key)**: Dynamic fetch, but ensure `gemini-3-pro-preview` is included/highlighted.

## 4. Implementation Plan

### Phase 1: Installation & Setup
1. Install dependencies: `npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google` in `client`.

### Phase 2: Refactor `AIProviderManager`
1.  **Update `AIProviderType`**: Add `vertex-anthropic` to the allowed types in `shared/ai-types.ts`.
2.  **Factory Method**: Create `getSDKModel(config: AIProviderConfig, modelId: string)` that instantiates the correct SDK provider.
    *   For `vertex-anthropic`, use `createVertex({ ... })` but ensure we request the Anthropic model IDs correctly (Vertex uses specific naming conventions for partner models).
3.  **Refactor `processRequest`**: Replace manual fetch logic with `generateText` using the factory method.

### Phase 3: Model Listing Logic
Update `fetchProviderModels` in `AIProviderManager`:
*   **Vertex Anthropic**: Return `['claude-opus-4-6', 'claude-opus-4-5']` immediately.
*   **Google (API Key)**: Fetch from `generativelanguage.googleapis.com` AND append `gemini-3-pro-preview` if not present.

### Phase 4: Verification
- Verify `vertex-anthropic` correctly routes to Vertex AI but uses Claude models.
- Verify `google` provider works with API Key and shows `gemini-3-pro-preview`.
- Verify existing providers (OpenAI, Local) still work.

## 5. Benefits
- **Less Code**: Deletes ~300 lines of manual fetch logic.
- **Better Reliability**: Relies on maintained SDKs.
- **Future Proof**: Easier to add new providers supported by the SDK.
- **Streaming Ready**: The SDK makes switching to streaming responses trivial in the future.
- **Curated Control**: Hybrid model listing allows us to guide users to specific high-value models (like Claude on Vertex) while still supporting dynamic discovery where appropriate.
