# Getting Started

## Installation

Currently, the application is built from source.

### Prerequisites
*   Node.js (v20+)
*   npm or yarn

### Steps
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd notaclaw
    ```
2.  Install dependencies:
    ```bash
    npm install
    cd client && npm install && cd ..
    ```
3.  Build plugins (optional):
    ```bash
    npm run build:plugins
    ```
4.  Start the application:
    ```bash
    npm start
    ```

## Initial Setup (Onboarding)

Upon first launch, you will be greeted by the **Onboarding Screen**, a guided setup process with four steps:

### Step 1: Welcome
An introduction to the AlephNet Resonant Terminal. Click "Begin Setup" to continue.

### Step 2: Identity Creation
The system generates a cryptographic identity for your node:
*   **Gun.js SEA Keypair**: For data signing and encryption
*   **AlephNet KeyTriplet**: For semantic identity in the mesh
*   **Local Wallet**: For economic interactions within the network

This identity is stored locally and never leaves your device without your consent.

### Step 3: AI Setup
Configure at least one AI provider to enable agent capabilities:

#### Supported Providers

| Provider | Type | Description |
|----------|------|-------------|
| **OpenAI** | Cloud | GPT-4, GPT-3.5-turbo, and other OpenAI models |
| **Anthropic** | Cloud | Claude 3 Opus, Sonnet, Haiku |
| **Google AI** | Cloud | Gemini Pro, Gemini Flash |
| **Google Vertex AI** | Cloud | Enterprise Google AI with service account auth |
| **OpenRouter** | Cloud | Multi-provider gateway with 100+ models |
| **Ollama** | Local | Run open-source models locally |
| **LM Studio** | Local | Local model inference with GUI |
| **WebLLM** | Browser | In-browser inference using WebGPU |

#### Quick Setup Options
1. **Cloud Provider**: Enter API key for OpenAI, Anthropic, or Google
2. **Local Model**: Connect to Ollama or LM Studio running locally
3. **Browser Model**: Use WebLLM for fully offline, in-browser inference

### Step 4: Complete
Review your setup and enter the main application.

## Post-Setup Configuration

After completing onboarding, you can adjust settings at any time:

### Accessing Settings
1. Click the **Settings** icon (gear) in the NavRail, or
2. Press `⌘,` (Mac) / `Ctrl+,` (Windows/Linux)

### AI Configuration
Navigate to **AI & Models** to:
*   Add additional providers
*   Configure routing rules (which provider handles which content type)
*   Set default models for chat, code, and embedding tasks
*   Test provider connectivity

### Managing Providers

#### Adding a Provider
1. Go to Settings → AI & Models → Providers
2. Click "Add Provider"
3. Select provider type
4. Enter credentials (API key, endpoint, etc.)
5. Click "Test Connection" to verify
6. Save settings

#### Routing Rules
Routing rules determine which provider handles different request types:
*   **Chat**: General conversation and Q&A
*   **Code**: Programming assistance
*   **Embedding**: Vector embeddings for semantic search

Set priority levels to create fallback chains.

## First Steps After Setup

### 1. Start a Conversation
1. Click **Chat Mode** in the NavRail (or press `⌘N`)
2. Type a message in the input area
3. Press Enter or click Send
4. The AI agent will respond

### 2. Explore Memory Fields
1. Click **Memory Fields** in the NavRail
2. Browse existing memory scopes:
   - **Global**: Shared knowledge across the mesh
   - **User**: Your personal memory
   - **Conversation**: Per-conversation context
   - **Organization**: Shared with your groups

### 3. Connect with Others
1. Click **Connections** in the NavRail
2. Enter a Node ID to add a connection
3. Accept incoming connection requests
4. Start direct messaging once connected

### 4. Join Groups
1. Click **Groups** in the NavRail
2. Browse or create groups
3. Subscribe to feeds for content aggregation

## Troubleshooting

### Application Won't Start
1. Ensure Node.js v20+ is installed: `node --version`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check for port conflicts on 5173 (Vite dev server)

### AI Responses Failing
1. Open Settings → AI & Models
2. Click "Test Connection" on your provider
3. Verify API key is correct and has sufficient credits
4. Check the Console tab in Inspector for detailed errors

### Identity Issues
If identity creation fails:
1. Check file system permissions in your home directory
2. The identity is stored in `~/.config/notaclaw/` (Linux/Mac) or `%APPDATA%/notaclaw/` (Windows)
3. Delete the identity folder to reset and re-run onboarding

### Network Connection Issues
1. Check **Mesh** tab in Inspector for connectivity status
2. Verify internet connection for cloud providers
3. For local models, ensure Ollama/LM Studio is running

## Next Steps

*   [Interface Overview](./02-interface.md) - Learn the UI layout
*   [Managing Plugins](./03-managing-plugins.md) - Extend functionality
*   [Developer Guide](../developer-guide/01-architecture.md) - Build your own plugins
