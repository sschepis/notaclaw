import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIProviderConfig, AIProviderType } from '../../../../shared/ai-types';
import { AVAILABLE_WEBLLM_MODELS, webLLMService } from '../../../services/WebLLMService';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Progress } from '../../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { PROVIDER_META, DEFAULT_MODELS, API_KEY_PLACEHOLDER, VERTEX_LOCATIONS } from '../../ai-provider/ProviderMetadata';

export const AISetupStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);

  // Shared state
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vertex AI state
  const [vertexProjectId, setVertexProjectId] = useState('');
  const [vertexLocation, setVertexLocation] = useState('us-central1');
  const [vertexAuthPath, setVertexAuthPath] = useState('');

  // LM Studio state
  const [lmStudioEndpoint, setLmStudioEndpoint] = useState('http://localhost:1234/v1');

  // WebLLM state
  const [orchestratorModel, setOrchestratorModel] = useState('Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC');
  const [chatModel, setChatModel] = useState('Llama-3-8B-Instruct-q4f32_1-MLC');
  const [codeModel, setCodeModel] = useState('Llama-3-8B-Instruct-q4f32_1-MLC');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ text: string; progress: number } | null>(null);

  const resetForm = () => {
    setApiKey('');
    setTestResult(null);
    setError(null);
    setVertexProjectId('');
    setVertexLocation('us-central1');
    setVertexAuthPath('');
    setLmStudioEndpoint('http://localhost:1234/v1');
  };

  const handleSelectProvider = (type: AIProviderType) => {
    if (type === selectedProvider) {
      setSelectedProvider(null);
      return;
    }
    resetForm();
    setSelectedProvider(type);
  };

  // ── Save helpers ──────────────────────────────────────────────────────
  const saveProviderConfig = async (config: AIProviderConfig) => {
    const settings = await window.electronAPI.getAISettings();
    settings.providers = settings.providers.filter(p => p.type !== config.type);
    settings.providers.push(config);

    const chatRule = settings.rules.find(r => r.contentType === 'chat');
    if (chatRule) {
      chatRule.providerId = config.id;
      chatRule.model = config.models[0] ?? '';
    }
    const codeRule = settings.rules.find(r => r.contentType === 'code');
    if (codeRule) {
      codeRule.providerId = config.id;
      codeRule.model = config.models[0] ?? '';
    }

    await window.electronAPI.saveAISettings(settings);
  };

  // ── API-key-based providers (OpenAI / Anthropic / OpenRouter) ─────────
  const handleSaveApiKeyProvider = async () => {
    if (!selectedProvider) return;
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const meta = PROVIDER_META[selectedProvider];
      const config: AIProviderConfig = {
        id: `${selectedProvider}-provider`,
        name: meta.name,
        type: selectedProvider,
        apiKey,
        models: DEFAULT_MODELS[selectedProvider] || [],
        enabled: true,
      };

      const testOk = await window.electronAPI.testAIProvider(config);
      if (!testOk) {
        setTestResult('fail');
        setError('API key validation failed. Check your key and try again.');
        setTesting(false);
        return;
      }

      setTestResult('success');
      await saveProviderConfig(config);
      setTimeout(() => onComplete(), 800);
    } catch (err) {
      setError('Failed to save AI configuration.');
      console.error(err);
      setTesting(false);
    }
  };

  // ── Vertex AI ─────────────────────────────────────────────────────────
  const handleBrowseAuthJson = async () => {
    const filePath = await window.electronAPI.selectFile({
      title: 'Select Google Cloud Service Account JSON',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (filePath) setVertexAuthPath(filePath);
  };

  const handleSaveVertex = async () => {
    if (!vertexProjectId || !vertexAuthPath) {
      setError('Project ID and Auth JSON file are required.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const config: AIProviderConfig = {
        id: 'vertex-provider',
        name: 'Google Vertex AI',
        type: 'vertex',
        projectId: vertexProjectId,
        location: vertexLocation,
        authJsonPath: vertexAuthPath,
        models: DEFAULT_MODELS.vertex,
        enabled: true,
      };

      const testOk = await window.electronAPI.testAIProvider(config);
      if (!testOk) {
        setTestResult('fail');
        setError('Vertex AI authentication failed. Check your service account file and project ID.');
        setTesting(false);
        return;
      }

      setTestResult('success');
      await saveProviderConfig(config);
      setTimeout(() => onComplete(), 800);
    } catch (err) {
      setError('Failed to save Vertex AI configuration.');
      console.error(err);
      setTesting(false);
    }
  };

  // ── LM Studio ─────────────────────────────────────────────────────────
  const handleSaveLMStudio = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const config: AIProviderConfig = {
        id: 'lmstudio-provider',
        name: 'LM Studio',
        type: 'lmstudio',
        endpoint: lmStudioEndpoint,
        models: [],
        enabled: true,
      };

      const testOk = await window.electronAPI.testAIProvider(config);
      if (!testOk) {
        setTestResult('fail');
        setError('Cannot reach LM Studio. Make sure it is running and the server is started.');
        setTesting(false);
        return;
      }

      setTestResult('success');
      await saveProviderConfig(config);
      setTimeout(() => onComplete(), 800);
    } catch (err) {
      setError('Failed to save LM Studio configuration.');
      console.error(err);
      setTesting(false);
    }
  };

  // ── WebLLM ────────────────────────────────────────────────────────────
  const handleSetupWebLLM = async () => {
    setDownloading(true);
    setError(null);

    try {
      await webLLMService.initialize(orchestratorModel, (report) => {
        setProgress({ text: report.text, progress: report.progress });
      });

      const config: AIProviderConfig = {
        id: 'webllm-local',
        name: 'Local WebLLM',
        type: 'webllm',
        models: [orchestratorModel, chatModel, codeModel],
        enabled: true,
      };

      await saveProviderConfig(config);
      onComplete();
    } catch (err) {
      setError('Failed to initialize WebLLM. Your device may not support WebGPU.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  // ── Check if the Connect button should be enabled ─────────────────────
  const isApiKeyProvider = selectedProvider === 'openai' || selectedProvider === 'anthropic' || selectedProvider === 'openrouter' || selectedProvider === 'google';
  const canConnect =
    (isApiKeyProvider && apiKey.length > 0) ||
    (selectedProvider === 'vertex' && vertexProjectId.length > 0 && vertexAuthPath.length > 0) ||
    (selectedProvider === 'lmstudio') ||
    (selectedProvider === 'webllm');

  const handleConnect = () => {
    if (isApiKeyProvider) handleSaveApiKeyProvider();
    else if (selectedProvider === 'vertex') handleSaveVertex();
    else if (selectedProvider === 'lmstudio') handleSaveLMStudio();
    else if (selectedProvider === 'webllm') handleSetupWebLLM();
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-5 max-h-[70vh] overflow-y-auto pr-1"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Connect Intelligence
        </motion.h2>
        <motion.p
          className="text-gray-400 text-sm max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Choose an AI provider to power your agent — cloud APIs, Google Cloud, or local models.
        </motion.p>
      </div>

      {/* ── Provider Grid ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {/* Cloud providers */}
        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-semibold">Cloud Providers</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(['openai', 'anthropic', 'openrouter', 'google', 'vertex'] as AIProviderType[]).map((type) => {
            const meta = PROVIDER_META[type];
            const isSelected = selectedProvider === type;
            return (
              <button
                key={type}
                onClick={() => handleSelectProvider(type)}
                className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                  isSelected
                    ? `bg-gradient-to-br ${meta.gradient} ${meta.borderActive} shadow-lg ring-1 ring-white/10`
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <div className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-white/60'}`}>
                      {meta.name}
                    </div>
                    <div className="text-[9px] text-white/30 leading-tight">{meta.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Local providers */}
        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 font-semibold">Local / On-Device</p>
        <div className="grid grid-cols-2 gap-2">
          {(['lmstudio', 'webllm'] as AIProviderType[]).map((type) => {
            const meta = PROVIDER_META[type];
            const isSelected = selectedProvider === type;
            return (
              <button
                key={type}
                onClick={() => handleSelectProvider(type)}
                className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                  isSelected
                    ? `bg-gradient-to-br ${meta.gradient} ${meta.borderActive} shadow-lg ring-1 ring-white/10`
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <div className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-white/60'}`}>
                      {meta.name}
                    </div>
                    <div className="text-[9px] text-white/30 leading-tight">{meta.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dynamic Configuration Forms ────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* API-key providers: OpenAI / Anthropic / OpenRouter */}
        {isApiKeyProvider && selectedProvider && (
          <motion.div
            key="apikey-form"
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">API Key</Label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder={API_KEY_PLACEHOLDER[selectedProvider] || 'Enter API key...'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                    setError(null);
                  }}
                  className="bg-white/[0.03] border-white/[0.08] focus:border-blue-500/50 h-11 pr-12"
                />
                {testResult === 'success' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                {testResult === 'fail' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/20">
                Your key is stored locally and encrypted. It never leaves your device.
              </p>
            </div>
          </motion.div>
        )}

        {/* Vertex AI form */}
        {selectedProvider === 'vertex' && (
          <motion.div
            key="vertex-form"
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {/* Auth JSON file */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Service Account JSON</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={vertexAuthPath}
                  placeholder="No file selected"
                  className="bg-white/[0.03] border-white/[0.08] h-11 flex-1 text-white/60 cursor-default"
                />
                <Button
                  type="button"
                  onClick={handleBrowseAuthJson}
                  variant="outline"
                  className="h-11 px-4 shrink-0 border-white/[0.08] hover:bg-white/[0.06]"
                >
                  Browse…
                </Button>
              </div>
              <p className="text-[10px] text-white/20">
                The key file stays on disk — only the path is stored.
              </p>
            </div>

            {/* Project ID */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">GCP Project ID</Label>
              <Input
                placeholder="my-gcp-project"
                value={vertexProjectId}
                onChange={(e) => setVertexProjectId(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] focus:border-blue-500/50 h-11"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Region</Label>
              <Select value={vertexLocation} onValueChange={setVertexLocation}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERTEX_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        {/* LM Studio form */}
        {selectedProvider === 'lmstudio' && (
          <motion.div
            key="lmstudio-form"
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-3 bg-green-900/20 border border-green-500/20 rounded-xl text-green-300/80 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>No API key needed.</strong> Make sure LM Studio is running with the local server started.
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Server Endpoint</Label>
              <Input
                placeholder="http://localhost:1234/v1"
                value={lmStudioEndpoint}
                onChange={(e) => setLmStudioEndpoint(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] focus:border-blue-500/50 h-11"
              />
              <p className="text-[10px] text-white/20">
                Default: http://localhost:1234/v1 — change only if you configured a custom port.
              </p>
            </div>
          </motion.div>
        )}

        {/* WebLLM form */}
        {selectedProvider === 'webllm' && (
          <motion.div
            key="webllm-form"
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-xl text-amber-300/80 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <strong>Requires WebGPU.</strong> Models download on first use (2-8 GB). Performance depends on your GPU.
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-white/70 text-sm mb-2 block">Orchestrator Model</Label>
                <Select value={orchestratorModel} onValueChange={setOrchestratorModel}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] h-11">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_WEBLLM_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.vram} VRAM)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-2 block">Chat Model</Label>
                <Select value={chatModel} onValueChange={setChatModel}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] h-11">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_WEBLLM_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.vram} VRAM)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-2 block">Code Model</Label>
                <Select value={codeModel} onValueChange={setCodeModel}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] h-11">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_WEBLLM_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.vram} VRAM)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Download Progress */}
            <AnimatePresence>
              {downloading && progress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-xs text-gray-400">
                    <span className="truncate max-w-[70%]">{progress.text}</span>
                    <span className="font-mono">{Math.round(progress.progress * 100)}%</span>
                  </div>
                  <Progress value={progress.progress * 100} className="h-2" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Connect Button ─────────────────────────────────────────── */}
      {selectedProvider && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            onClick={handleConnect}
            disabled={!canConnect || testing || downloading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 border border-blue-500/20 transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </span>
            ) : downloading ? (
              'Downloading Model...'
            ) : (
              'Connect & Continue'
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
