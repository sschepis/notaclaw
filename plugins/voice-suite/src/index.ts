import { Context, TextToSpeechArgs, TranscribeAudioArgs } from './types';
import { ElevenLabsProvider } from './providers/elevenlabs';
import { OpenAIProvider } from './providers/openai';
import { Buffer } from 'buffer';

class VoiceSuite {
  private context: Context;
  private elevenLabs: ElevenLabsProvider;
  private openAI: OpenAIProvider;

  constructor(context: Context) {
    this.context = context;
    this.elevenLabs = new ElevenLabsProvider(context);
    this.openAI = new OpenAIProvider(context);
  }

  private async getProvider(requestedProvider?: string) {
    if (requestedProvider) {
      if (requestedProvider === 'elevenlabs') return this.elevenLabs;
      if (requestedProvider === 'openai') return this.openAI;
    }
    
    const defaultProvider = await this.context.storage.get('defaultProvider');
    if (defaultProvider === 'openai') return this.openAI;
    
    return this.elevenLabs; // Default to ElevenLabs
  }

  public async textToSpeech(args: TextToSpeechArgs) {
    const provider = await this.getProvider(args.provider);
    return provider.textToSpeech(args);
  }

  public async transcribeAudio(args: TranscribeAudioArgs) {
    // Currently only OpenAI supports STT in this suite
    return this.openAI.transcribeAudio(args);
  }

  public async getVoices(args: { provider?: string, refresh?: boolean }) {
    const provider = await this.getProvider(args.provider);
    if (provider === this.elevenLabs) {
        return this.elevenLabs.getVoices({ refresh: args.refresh });
    }
    // OpenAI doesn't have a dynamic getVoices endpoint in the same way, but we could return static list
    return { voices: [], message: "Voice listing only supported for ElevenLabs currently" };
  }
}

export const activate = async (context: Context) => {
  console.log('[Voice Suite] Activating...');
  const plugin = new VoiceSuite(context);

  // Unified Text-to-Speech Tool
  context.dsn.registerTool({
    name: 'text_to_speech',
    description: 'Convert text to speech using ElevenLabs or OpenAI',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        provider: { type: 'string', enum: ['elevenlabs', 'openai'] },
        voiceId: { type: 'string', description: 'Voice ID (ElevenLabs)' },
        voice: { type: 'string', description: 'Voice name (OpenAI)' },
        model: { type: 'string' }
      },
      required: ['text']
    }
  }, async (args: any) => plugin.textToSpeech(args));

  // Legacy 'speak' tool for compatibility
  context.dsn.registerTool({
      name: 'speak',
      description: 'Convert text to speech (legacy alias)',
      executionLocation: 'SERVER',
      parameters: {
          type: 'object',
          properties: {
              text: { type: 'string' }
          },
          required: ['text']
      }
  }, async (args: any) => plugin.textToSpeech(args));

  // Transcription Tool
  context.dsn.registerTool({
    name: 'transcribe_audio',
    description: 'Convert audio to text using OpenAI Whisper',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        audioBuffer: { type: 'object', description: 'Audio buffer' }
      },
      required: ['audioBuffer']
    }
  }, async (args: any) => plugin.transcribeAudio(args));

  // Get Voices Tool
  context.dsn.registerTool({
    name: 'get_voices',
    description: 'List available voices',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['elevenlabs', 'openai'] },
        refresh: { type: 'boolean' }
      }
    }
  }, async (args: any) => plugin.getVoices(args));

  // ElevenLabs specific tools
  context.dsn.registerTool({
      name: 'clone_voice',
      description: 'Clone a voice (ElevenLabs)',
      executionLocation: 'SERVER',
      parameters: { type: 'object', properties: {} } // Placeholder
  }, async (args: any) => { throw new Error("Not implemented yet"); });

   context.dsn.registerTool({
      name: 'generate_sound_effect',
      description: 'Generate sound effect (ElevenLabs)',
      executionLocation: 'SERVER',
      parameters: { type: 'object', properties: {} } // Placeholder
  }, async (args: any) => { throw new Error("Not implemented yet"); });

  return plugin;
};

export const deactivate = () => {
  console.log('[Voice Suite] Deactivated');
};
