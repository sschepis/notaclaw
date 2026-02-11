import { Buffer } from 'buffer';

export interface Context {
  secrets: {
    get(key: string): Promise<string | undefined>;
  };
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
  };
  dsn: {
    registerTool(definition: any, handler: Function): void;
  };
  ipc: {
    handle(channel: string, handler: Function): void;
  };
}

export interface TextToSpeechArgs {
  text: string;
  provider?: 'elevenlabs' | 'openai';
  voiceId?: string; // For ElevenLabs
  voice?: string; // For OpenAI
  model?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TranscribeAudioArgs {
  audioBuffer: Buffer | Uint8Array;
  provider?: 'openai'; // Currently only OpenAI supported for STT
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface IVoiceProvider {
  textToSpeech(args: TextToSpeechArgs): Promise<any>;
  getVoices?(): Promise<any>;
}
