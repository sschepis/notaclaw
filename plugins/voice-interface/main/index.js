
const https = require('https');

class VoiceService {
  constructor(context) {
    this.context = context;
  }

  async activate() {
    this.context.ipc.handle('voice:speak', async ({ text, voiceId }) => {
      return this.synthesize(text, voiceId);
    });
    
    // Register tool so agents can speak
    this.context.dsn.registerTool({
      name: 'speak',
      description: 'Convert text to speech audio',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' }
        },
        required: ['text']
      },
      semanticDomain: 'perceptual',
      primeDomain: [2],
      smfAxes: [0.1],
      requiredTier: 'Neophyte',
      version: '1.0.0'
    }, async ({ text }) => {
      const url = await this.synthesize(text);
      return { audioUrl: url, message: 'Audio generated' };
    });
  }

  async synthesize(text, voiceId) {
    const apiKey = await this.context.secrets.get('elevenlabs_api_key');
    if (!apiKey) {
      console.warn('[Voice] No API key found. Returning mock URL.');
      return `data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA`; // Empty wav
    }

    // Call ElevenLabs
    console.log(`[Voice] Synthesizing: "${text.substring(0, 20)}..."`);
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId || '21m00Tcm4TlvDq8ikWAM'}`,
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`[Voice] ElevenLabs API error: ${res.statusCode}`);
                    resolve("https://mock.audio/output.mp3"); // Fallback
                    return;
                }
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                resolve(`data:audio/mpeg;base64,${base64}`);
            });
        });

        req.on('error', (e) => {
            console.error('[Voice] Request error:', e);
            resolve("https://mock.audio/output.mp3"); // Fallback
        });

        req.write(JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.5 }
        }));
        req.end();
    });
  }
}

module.exports = {
  activate: (context) => {
    console.log('[Voice Interface] Activating...');
    const service = new VoiceService(context);
    service.activate();
    console.log('[Voice Interface] Ready');
  },
  deactivate: () => {}
};
