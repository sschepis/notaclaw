import React, { useState, useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';

interface Voice {
  voiceId: string;
  name: string;
  category: string;
  description?: string;
  previewUrl?: string;
  labels?: Record<string, string>;
}

interface SubscriptionInfo {
  tier: string;
  characterCount: number;
  characterLimit: number;
  voiceLimit: number;
  canUseInstantVoiceCloning: boolean;
  nextCharacterCountResetUnix: number;
}

interface ElevenVoicesPanelProps {
  context: any;
}

const ElevenVoicesPanel: React.FC<ElevenVoicesPanelProps> = ({ context }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [testText, setTestText] = useState('Hello! This is a test of the ElevenLabs voice synthesis.');
  const [generating, setGenerating] = useState(false);
  const [lastAudioFile, setLastAudioFile] = useState<string | null>(null);
  const [sfxText, setSfxText] = useState('');
  const [activeTab, setActiveTab] = useState<'voices' | 'generate' | 'effects'>('voices');

  const loadVoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await context.ipc.invoke('elevenvoices:get_voices', { refresh: true });
      setVoices(result.voices || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load voices');
    }
    setLoading(false);
  }, [context]);

  const loadSubscription = useCallback(async () => {
    try {
      const result = await context.ipc.invoke('elevenvoices:get_subscription_info', {});
      setSubscription(result);
    } catch (e: any) {
      console.warn('Failed to load subscription info:', e.message);
    }
  }, [context]);

  useEffect(() => {
    loadVoices();
    loadSubscription();
  }, [loadVoices, loadSubscription]);

  const handleGenerateSpeech = async () => {
    if (!testText.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await context.ipc.invoke('elevenvoices:text_to_speech', {
        text: testText,
        voiceId: selectedVoice || undefined
      });
      setLastAudioFile(result.audioFile);
    } catch (e: any) {
      setError(e.message || 'Failed to generate speech');
    }
    setGenerating(false);
  };

  const handleGenerateSoundEffect = async () => {
    if (!sfxText.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await context.ipc.invoke('elevenvoices:generate_sound_effect', {
        text: sfxText
      });
      setLastAudioFile(result.audioFile);
    } catch (e: any) {
      setError(e.message || 'Failed to generate sound effect');
    }
    setGenerating(false);
  };

  const formatResetDate = (unix: number) => {
    if (!unix) return 'Unknown';
    return new Date(unix * 1000).toLocaleDateString();
  };

  const usagePercentage = subscription 
    ? Math.round((subscription.characterCount / subscription.characterLimit) * 100) 
    : 0;

  return (
    <div className="elevenvoices-panel p-4 space-y-4 bg-gray-900 text-white min-h-full">
      <div className="header flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          ElevenVoices
        </h2>
        {subscription && (
          <div className="text-sm text-gray-400">
            <span className="text-green-400">{subscription.tier}</span> | 
            {subscription.characterCount.toLocaleString()} / {subscription.characterLimit.toLocaleString()} chars
          </div>
        )}
      </div>

      {/* Usage Bar */}
      {subscription && (
        <div className="usage-bar bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Character Usage</span>
            <span>{usagePercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                usagePercentage > 90 ? 'bg-red-500' : 
                usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Resets: {formatResetDate(subscription.nextCharacterCountResetUnix)}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('voices')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'voices' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Voices
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'generate' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Generate Speech
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'effects' 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sound Effects
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Voices Tab */}
      {activeTab === 'voices' && (
        <div className="voices-tab space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">
              {voices.length} voices available
            </span>
            <button
              onClick={loadVoices}
              disabled={loading}
              className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          <div className="voices-grid grid gap-2 max-h-96 overflow-y-auto">
            {voices.map((voice) => (
              <div
                key={voice.voiceId}
                onClick={() => setSelectedVoice(voice.voiceId)}
                className={`voice-card p-3 rounded-lg cursor-pointer transition-all ${
                  selectedVoice === voice.voiceId
                    ? 'bg-blue-600/30 border border-blue-500'
                    : 'bg-gray-800 border border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs text-gray-400">
                      {voice.category} • {voice.voiceId.slice(0, 8)}...
                    </div>
                  </div>
                  {voice.previewUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const audio = new Audio(voice.previewUrl);
                        audio.play();
                      }}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      ▶ Preview
                    </button>
                  )}
                </div>
                {voice.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {voice.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Speech Tab */}
      {activeTab === 'generate' && (
        <div className="generate-tab space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Selected Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Default Voice</option>
              {voices.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId}>
                  {voice.name} ({voice.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Text to Speak</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
              maxLength={5000}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm resize-none"
            />
            <div className="text-xs text-gray-500 text-right">
              {testText.length} / 5000
            </div>
          </div>

          <button
            onClick={handleGenerateSpeech}
            disabled={generating || !testText.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {generating ? 'Generating...' : '🔊 Generate Speech'}
          </button>

          {lastAudioFile && (
            <div className="audio-result bg-gray-800 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-2">Generated Audio:</div>
              <div className="text-xs text-green-400 font-mono break-all">
                {lastAudioFile}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sound Effects Tab */}
      {activeTab === 'effects' && (
        <div className="effects-tab space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Describe the Sound Effect</label>
            <textarea
              value={sfxText}
              onChange={(e) => setSfxText(e.target.value)}
              placeholder="e.g., Thunder rolling in the distance, waves crashing on a beach, robotic door opening..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm resize-none"
            />
          </div>

          <button
            onClick={handleGenerateSoundEffect}
            disabled={generating || !sfxText.trim()}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
          >
            {generating ? 'Generating...' : '🎵 Generate Sound Effect'}
          </button>

          <div className="examples">
            <div className="text-sm text-gray-400 mb-2">Example Prompts:</div>
            <div className="flex flex-wrap gap-2">
              {[
                'Thunder rumbling',
                'Door creaking open',
                'Futuristic laser blast',
                'Rain on window',
                'Crowd cheering',
                'Cat meowing'
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setSfxText(example)}
                  className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="footer text-xs text-gray-500 pt-4 border-t border-gray-800">
        <div className="flex justify-between">
          <span>Powered by ElevenLabs AI</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  );
};

export const activate = (context: any) => {
    console.log('[ElevenVoices Renderer] Activating...');
    const { ui } = context;

    const cleanupNav = ui.registerNavigation({
        id: 'elevenvoices-nav',
        label: 'ElevenVoices',
        icon: Mic,
        view: {
            id: 'elevenvoices-panel',
            name: 'ElevenVoices',
            icon: Mic,
            component: ElevenVoicesPanel
        },
        order: 300
    });

    context._cleanups = [cleanupNav];
    console.log('[ElevenVoices Renderer] Ready');
};

export const deactivate = (context: any) => {
    console.log('[ElevenVoices Renderer] Deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

