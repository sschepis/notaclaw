import React from 'react';
import { Mic } from 'lucide-react';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';

const VoiceSuiteSettings = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Voice Suite Settings</h2>
      <p className="mb-4">Configure your voice providers in the settings menu.</p>
      <div className="bg-gray-100 p-4 rounded">
        <p>Providers available:</p>
        <ul className="list-disc pl-5">
          <li>ElevenLabs (TTS, Voice Cloning)</li>
          <li>OpenAI (TTS, Whisper STT)</li>
        </ul>
      </div>
    </div>
  );
};

export const activate = (context: RendererPluginContext) => {
  console.log('[Voice Suite] Renderer activated');

  // Register the settings tab
  if (context.ui?.registerSettingsTab) {
    context.ui.registerSettingsTab({
      id: 'voice-suite-settings',
      label: 'Voice Suite',
      icon: Mic,
      component: VoiceSuiteSettings
    });
  }
};
