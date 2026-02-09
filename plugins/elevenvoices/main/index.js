const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');

const ELEVENLABS_API_BASE = 'api.elevenlabs.io';

/**
 * ElevenVoices - ElevenLabs voice synthesis integration for AlephNet
 * Provides AI-powered text-to-speech, voice cloning, and sound effects
 */
class ElevenVoices {
  constructor(context) {
    this.context = context;
    this.outputDir = path.join(os.tmpdir(), 'aleph-elevenvoices');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.voicesCache = null;
    this.voicesCacheTime = 0;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get API key from secrets or storage
   */
  async getApiKey() {
    // Try secrets first (more secure)
    let apiKey = await this.context.secrets.get('apiKey');
    if (!apiKey) {
      // Fall back to storage
      apiKey = await this.context.storage.get('apiKey');
    }
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured. Please set your API key in plugin settings.');
    }
    return apiKey;
  }

  /**
   * Make HTTPS request to ElevenLabs API
   */
  async makeRequest(method, endpoint, data = null, isFormData = false) {
    const apiKey = await this.getApiKey();
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: ELEVENLABS_API_BASE,
        port: 443,
        path: endpoint,
        method: method,
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'application/json'
        }
      };

      if (data && !isFormData) {
        options.headers['Content-Type'] = 'application/json';
      }

      const req = https.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => chunks.push(chunk));
        
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          
          if (res.statusCode >= 400) {
            let errorMessage;
            try {
              const errorBody = JSON.parse(buffer.toString());
              errorMessage = errorBody.detail?.message || errorBody.message || buffer.toString();
            } catch {
              errorMessage = buffer.toString() || `HTTP ${res.statusCode}`;
            }
            reject(new Error(`ElevenLabs API error (${res.statusCode}): ${errorMessage}`));
            return;
          }
          
          if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
            resolve({ type: 'audio', data: buffer, contentType });
          } else {
            try {
              resolve({ type: 'json', data: JSON.parse(buffer.toString()) });
            } catch {
              resolve({ type: 'text', data: buffer.toString() });
            }
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        if (isFormData) {
          // Handle multipart form data for file uploads
          req.write(data);
        } else {
          req.write(JSON.stringify(data));
        }
      }
      
      req.end();
    });
  }

  /**
   * Get voice settings from storage or use defaults
   */
  async getVoiceSettings() {
    const stability = (await this.context.storage.get('stability')) ?? 0.5;
    const similarityBoost = (await this.context.storage.get('similarityBoost')) ?? 0.75;
    const style = (await this.context.storage.get('style')) ?? 0;
    const useSpeakerBoost = (await this.context.storage.get('useSpeakerBoost')) ?? true;
    
    return {
      stability,
      similarity_boost: similarityBoost,
      style,
      use_speaker_boost: useSpeakerBoost
    };
  }

  /**
   * Generate unique filename for audio output
   */
  generateFilename(prefix, format) {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = format.startsWith('mp3') ? 'mp3' : 'wav';
    return path.join(this.outputDir, `${prefix}_${id}.${ext}`);
  }

  /**
   * Text-to-Speech: Convert text to speech using ElevenLabs
   */
  async textToSpeech({ text, voiceId, model, outputFormat, stability, similarityBoost, style, useSpeakerBoost }) {
    const defaultVoiceId = await this.context.storage.get('defaultVoiceId') || '21m00Tcm4TlvDq8ikWAM';
    const defaultModel = await this.context.storage.get('defaultModel') || 'eleven_multilingual_v2';
    const defaultFormat = await this.context.storage.get('outputFormat') || 'mp3_44100_128';
    
    const finalVoiceId = voiceId || defaultVoiceId;
    const finalModel = model || defaultModel;
    const finalFormat = outputFormat || defaultFormat;
    
    const voiceSettings = await this.getVoiceSettings();
    
    const requestBody = {
      text,
      model_id: finalModel,
      voice_settings: {
        stability: stability ?? voiceSettings.stability,
        similarity_boost: similarityBoost ?? voiceSettings.similarity_boost,
        style: style ?? voiceSettings.style,
        use_speaker_boost: useSpeakerBoost ?? voiceSettings.use_speaker_boost
      }
    };

    const response = await this.makeRequest(
      'POST',
      `/v1/text-to-speech/${finalVoiceId}?output_format=${finalFormat}`,
      requestBody
    );

    if (response.type !== 'audio') {
      throw new Error('Unexpected response type from ElevenLabs API');
    }

    const filename = this.generateFilename('tts', finalFormat);
    await fs.promises.writeFile(filename, response.data);

    // Calculate duration estimate based on text length (rough estimate)
    const estimatedDuration = Math.ceil(text.split(' ').length / 2.5);

    return {
      success: true,
      audioFile: filename,
      format: finalFormat,
      voiceId: finalVoiceId,
      model: finalModel,
      textLength: text.length,
      estimatedDurationSeconds: estimatedDuration,
      message: `Generated speech saved to ${filename}`
    };
  }

  /**
   * Get Voices: List all available voices
   */
  async getVoices({ refresh = false } = {}) {
    // Check cache
    if (!refresh && this.voicesCache && (Date.now() - this.voicesCacheTime) < this.CACHE_TTL) {
      return this.voicesCache;
    }

    const response = await this.makeRequest('GET', '/v1/voices');
    
    if (response.type !== 'json') {
      throw new Error('Unexpected response from voices endpoint');
    }

    const voices = response.data.voices.map(voice => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      previewUrl: voice.preview_url,
      labels: voice.labels,
      settings: voice.settings
    }));

    this.voicesCache = { voices, count: voices.length };
    this.voicesCacheTime = Date.now();

    return this.voicesCache;
  }

  /**
   * Clone Voice: Create a voice clone from audio samples
   */
  async cloneVoice({ name, description, files, labels }) {
    if (!name) {
      throw new Error('Voice name is required');
    }
    if (!files || files.length === 0) {
      throw new Error('At least one audio file is required for voice cloning');
    }

    const boundary = `----AlephBoundary${crypto.randomBytes(16).toString('hex')}`;
    const parts = [];

    // Add name
    parts.push(`--${boundary}\r\n`);
    parts.push('Content-Disposition: form-data; name="name"\r\n\r\n');
    parts.push(`${name}\r\n`);

    // Add description if provided
    if (description) {
      parts.push(`--${boundary}\r\n`);
      parts.push('Content-Disposition: form-data; name="description"\r\n\r\n');
      parts.push(`${description}\r\n`);
    }

    // Add labels if provided
    if (labels) {
      parts.push(`--${boundary}\r\n`);
      parts.push('Content-Disposition: form-data; name="labels"\r\n\r\n');
      parts.push(`${JSON.stringify(labels)}\r\n`);
    }

    // Add files
    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const filename = path.basename(filePath);
      const fileBuffer = await fs.promises.readFile(filePath);
      
      parts.push(`--${boundary}\r\n`);
      parts.push(`Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`);
      parts.push('Content-Type: audio/mpeg\r\n\r\n');
      parts.push(fileBuffer);
      parts.push('\r\n');
    }

    parts.push(`--${boundary}--\r\n`);

    const body = Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));

    const apiKey = await this.getApiKey();
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: ELEVENLABS_API_BASE,
        port: 443,
        path: '/v1/voices/add',
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Voice cloning failed: ${data}`));
            return;
          }
          try {
            const result = JSON.parse(data);
            // Invalidate voices cache
            this.voicesCache = null;
            resolve({
              success: true,
              voiceId: result.voice_id,
              name: name,
              message: `Voice "${name}" cloned successfully`
            });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Generate Sound Effect: Create sound effects from text descriptions
   */
  async generateSoundEffect({ text, duration, promptInfluence }) {
    if (!text) {
      throw new Error('Text description is required for sound effect generation');
    }

    const requestBody = {
      text,
      duration_seconds: duration,
      prompt_influence: promptInfluence ?? 0.3
    };

    const response = await this.makeRequest(
      'POST',
      '/v1/sound-generation',
      requestBody
    );

    if (response.type !== 'audio') {
      throw new Error('Unexpected response type from sound generation API');
    }

    const filename = this.generateFilename('sfx', 'mp3_44100_128');
    await fs.promises.writeFile(filename, response.data);

    return {
      success: true,
      audioFile: filename,
      description: text,
      duration: duration || 'auto',
      message: `Sound effect saved to ${filename}`
    };
  }

  /**
   * Speech-to-Speech: Transform voice while preserving emotion/tone
   */
  async speechToSpeech({ audioFile, voiceId, model, stability, similarityBoost, style }) {
    if (!audioFile) {
      throw new Error('Audio file path is required');
    }

    const defaultVoiceId = await this.context.storage.get('defaultVoiceId') || '21m00Tcm4TlvDq8ikWAM';
    const defaultModel = await this.context.storage.get('defaultModel') || 'eleven_multilingual_v2';
    
    const finalVoiceId = voiceId || defaultVoiceId;
    const finalModel = model || defaultModel;
    
    const voiceSettings = await this.getVoiceSettings();
    const audioBuffer = await fs.promises.readFile(audioFile);
    
    const boundary = `----AlephBoundary${crypto.randomBytes(16).toString('hex')}`;
    const parts = [];

    // Add audio file
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="audio"; filename="${path.basename(audioFile)}"\r\n`);
    parts.push('Content-Type: audio/mpeg\r\n\r\n');
    parts.push(audioBuffer);
    parts.push('\r\n');

    // Add model_id
    parts.push(`--${boundary}\r\n`);
    parts.push('Content-Disposition: form-data; name="model_id"\r\n\r\n');
    parts.push(`${finalModel}\r\n`);

    // Add voice settings
    const settings = {
      stability: stability ?? voiceSettings.stability,
      similarity_boost: similarityBoost ?? voiceSettings.similarity_boost,
      style: style ?? voiceSettings.style
    };
    parts.push(`--${boundary}\r\n`);
    parts.push('Content-Disposition: form-data; name="voice_settings"\r\n\r\n');
    parts.push(`${JSON.stringify(settings)}\r\n`);

    parts.push(`--${boundary}--\r\n`);

    const body = Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));

    const apiKey = await this.getApiKey();
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: ELEVENLABS_API_BASE,
        port: 443,
        path: `/v1/speech-to-speech/${finalVoiceId}`,
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
          'Accept': 'audio/mpeg'
        }
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          if (res.statusCode >= 400) {
            reject(new Error(`Speech-to-speech failed: ${buffer.toString()}`));
            return;
          }
          
          const filename = this.generateFilename('sts', 'mp3_44100_128');
          await fs.promises.writeFile(filename, buffer);
          
          resolve({
            success: true,
            audioFile: filename,
            sourceFile: audioFile,
            voiceId: finalVoiceId,
            model: finalModel,
            message: `Transformed speech saved to ${filename}`
          });
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Get subscription info and usage
   */
  async getSubscriptionInfo() {
    const response = await this.makeRequest('GET', '/v1/user/subscription');
    
    if (response.type !== 'json') {
      throw new Error('Unexpected response from subscription endpoint');
    }

    const sub = response.data;
    return {
      tier: sub.tier,
      characterCount: sub.character_count,
      characterLimit: sub.character_limit,
      canExtendCharacterLimit: sub.can_extend_character_limit,
      allowedToExtendCharacterLimit: sub.allowed_to_extend_character_limit,
      nextCharacterCountResetUnix: sub.next_character_count_reset_unix,
      voiceLimit: sub.voice_limit,
      professionalVoiceLimit: sub.professional_voice_limit,
      canUseInstantVoiceCloning: sub.can_use_instant_voice_cloning,
      canUseProfessionalVoiceCloning: sub.can_use_professional_voice_cloning
    };
  }

  /**
   * Activate the plugin and register all tools
   */
  async activate() {
    // Register text-to-speech tool
    this.context.dsn.registerTool({
      name: 'text_to_speech',
      description: 'Convert text to natural-sounding speech using ElevenLabs AI voices. Returns the path to the generated audio file.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          text: { 
            type: 'string', 
            description: 'The text to convert to speech (max 5000 characters)' 
          },
          voiceId: { 
            type: 'string', 
            description: 'ElevenLabs voice ID (optional, uses default if not specified)' 
          },
          model: { 
            type: 'string', 
            enum: ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5', 'eleven_monolingual_v1'],
            description: 'TTS model to use (optional)' 
          },
          stability: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1,
            description: 'Voice stability (0-1, higher = more consistent)' 
          },
          similarityBoost: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1,
            description: 'Similarity to original voice (0-1)' 
          },
          style: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1,
            description: 'Style exaggeration (0-1, for v2 models)' 
          }
        },
        required: ['text']
      },
      semanticDomain: 'creative',
      primeDomain: [3, 7],
      smfAxes: [0.9, 0.6],
      requiredTier: 'Adept',
      version: '1.0.0'
    }, async (args) => this.textToSpeech(args));

    // Register get voices tool
    this.context.dsn.registerTool({
      name: 'get_voices',
      description: 'List all available ElevenLabs voices including pre-made and cloned voices.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          refresh: { 
            type: 'boolean', 
            description: 'Force refresh the voice list cache' 
          }
        },
        required: []
      },
      semanticDomain: 'creative',
      primeDomain: [3],
      smfAxes: [0.5],
      requiredTier: 'Initiate',
      version: '1.0.0'
    }, async (args) => this.getVoices(args));

    // Register voice cloning tool
    this.context.dsn.registerTool({
      name: 'clone_voice',
      description: 'Create a new voice clone from audio samples. Requires at least one audio file with clear speech.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Name for the cloned voice' 
          },
          description: { 
            type: 'string', 
            description: 'Description of the voice' 
          },
          files: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Array of paths to audio files for cloning (mp3, wav)' 
          },
          labels: { 
            type: 'object', 
            description: 'Optional labels/tags for the voice' 
          }
        },
        required: ['name', 'files']
      },
      semanticDomain: 'creative',
      primeDomain: [3, 11],
      smfAxes: [0.95, 0.8],
      requiredTier: 'Virtuoso',
      version: '1.0.0'
    }, async (args) => this.cloneVoice(args));

    // Register sound effect generation tool
    this.context.dsn.registerTool({
      name: 'generate_sound_effect',
      description: 'Generate sound effects from text descriptions. Creates realistic audio based on your description.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          text: { 
            type: 'string', 
            description: 'Description of the sound effect to generate (e.g., "thunder rolling in the distance")' 
          },
          duration: { 
            type: 'number', 
            minimum: 0.5,
            maximum: 22,
            description: 'Duration in seconds (0.5-22, optional)' 
          },
          promptInfluence: { 
            type: 'number', 
            minimum: 0,
            maximum: 1,
            description: 'How much the text influences generation (0-1)' 
          }
        },
        required: ['text']
      },
      semanticDomain: 'creative',
      primeDomain: [3, 7],
      smfAxes: [0.85, 0.7],
      requiredTier: 'Adept',
      version: '1.0.0'
    }, async (args) => this.generateSoundEffect(args));

    // Register speech-to-speech tool
    this.context.dsn.registerTool({
      name: 'speech_to_speech',
      description: 'Transform speech from one voice to another while preserving the original tone, emotion, and pacing.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          audioFile: { 
            type: 'string', 
            description: 'Path to the source audio file' 
          },
          voiceId: { 
            type: 'string', 
            description: 'Target voice ID for transformation' 
          },
          model: { 
            type: 'string', 
            enum: ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5'],
            description: 'Model to use for transformation' 
          },
          stability: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1,
            description: 'Voice stability (0-1)' 
          },
          similarityBoost: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1,
            description: 'Similarity to target voice (0-1)' 
          }
        },
        required: ['audioFile']
      },
      semanticDomain: 'creative',
      primeDomain: [3, 7, 11],
      smfAxes: [0.9, 0.75, 0.6],
      requiredTier: 'Virtuoso',
      version: '1.0.0'
    }, async (args) => this.speechToSpeech(args));

    // Register subscription info tool
    this.context.dsn.registerTool({
      name: 'get_subscription_info',
      description: 'Get ElevenLabs subscription information including character usage and limits.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      semanticDomain: 'creative',
      primeDomain: [2],
      smfAxes: [0.3],
      requiredTier: 'Initiate',
      version: '1.0.0'
    }, async () => this.getSubscriptionInfo());

    console.log('[ElevenVoices] All tools registered successfully');
  }

  /**
   * Cleanup on deactivation
   */
  async deactivate() {
    // Clean up temp files older than 1 hour
    try {
      if (fs.existsSync(this.outputDir)) {
          const files = await fs.promises.readdir(this.outputDir);
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          
          for (const file of files) {
            const filePath = path.join(this.outputDir, file);
            const stats = await fs.promises.stat(filePath);
            if (stats.mtimeMs < oneHourAgo) {
              await fs.promises.unlink(filePath);
            }
          }
      }
    } catch (e) {
      console.warn('[ElevenVoices] Cleanup warning:', e.message);
    }
  }
}

module.exports = {
  activate: async (context) => {
    console.log('[ElevenVoices] Activating...');
    const plugin = new ElevenVoices(context);
    await plugin.activate();
    
    // Register IPC Handlers
    context.ipc.handle('elevenvoices:text_to_speech', async (args) => {
        return await plugin.textToSpeech(args);
    });

    context.ipc.handle('elevenvoices:get_voices', async (args) => {
        return await plugin.getVoices(args);
    });

    context.ipc.handle('elevenvoices:clone_voice', async (args) => {
        return await plugin.cloneVoice(args);
    });

    context.ipc.handle('elevenvoices:generate_sound_effect', async (args) => {
        return await plugin.generateSoundEffect(args);
    });

    context.ipc.handle('elevenvoices:speech_to_speech', async (args) => {
        return await plugin.speechToSpeech(args);
    });

    context.ipc.handle('elevenvoices:get_subscription_info', async () => {
        return await plugin.getSubscriptionInfo();
    });

    context.on('ready', () => {
      console.log('[ElevenVoices] Ready - ElevenLabs voice synthesis available');
    });
    
    context.on('stop', async () => {
      await plugin.deactivate();
    });
    
    return plugin;
  },
  
  deactivate: () => {
    console.log('[ElevenVoices] Deactivated');
  }
};
