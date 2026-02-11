import * as https from 'https';
import { Buffer } from 'buffer';
import { Context, TextToSpeechArgs, TranscribeAudioArgs, IVoiceProvider } from '../types';

export class OpenAIProvider implements IVoiceProvider {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private async getApiKey(): Promise<string> {
    const apiKey = await this.context.secrets.get('openaiApiKey');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set your API key in plugin settings.');
    }
    return apiKey;
  }

  public async textToSpeech({ text, voice }: TextToSpeechArgs) {
    const apiKey = await this.getApiKey();
    const defaultVoice = await this.context.storage.get('openaiDefaultVoice') || 'alloy';
    const selectedVoice = voice || defaultVoice;

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/audio/speech',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            const buffer = Buffer.concat(chunks);
            reject(new Error(`OpenAI TTS Error: ${res.statusCode} - ${buffer.toString()}`));
            return;
          }
          const buffer = Buffer.concat(chunks);
          resolve({
            success: true,
            audioData: buffer.toString('base64'),
            format: 'mp3',
            provider: 'openai',
            voice: selectedVoice
          });
        });
      });

      req.on('error', reject);

      req.write(JSON.stringify({
        model: "tts-1",
        voice: selectedVoice,
        input: text,
      }));
      req.end();
    });
  }

  public async transcribeAudio({ audioBuffer }: TranscribeAudioArgs) {
    const apiKey = await this.getApiKey();
    
    // We need to construct a multipart/form-data request manually since we can't use FormData easily without polyfills in some node envs, 
    // but assuming we can use a basic boundary approach.
    
    const boundary = '----OpenAIWhisperBoundary' + Math.random().toString(16);
    const filename = 'recording.wav';
    
    let content = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/wav\r\n\r\n`),
      Buffer.from(audioBuffer),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': content.length
        }
      }, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (res.statusCode && res.statusCode >= 400) {
             reject(new Error(`OpenAI STT Error: ${res.statusCode} - ${buffer.toString()}`));
             return;
          }
          try {
            const data = JSON.parse(buffer.toString());
            resolve({ text: data.text });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(content);
      req.end();
    });
  }
}
