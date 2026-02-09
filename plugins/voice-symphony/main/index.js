let apiKey = null;

exports.activate = function(context) {
  console.log('[Voice Symphony] Activating Audio Pipeline...');

  context.dsn.registerTool({
    name: 'initialize',
    description: 'Sets up the OpenAI client for TTS/STT',
    parameters: {
      type: 'object',
      properties: {
        apiKey: { type: 'string' }
      },
      required: ['apiKey']
    }
  }, async (args) => {
    apiKey = args.apiKey;
    return { status: 'success' };
  });

  context.dsn.registerTool({
    name: 'transcribeAudio',
    description: 'Converts audio blob to text (Whisper)',
    parameters: {
      type: 'object',
      properties: {
        audioBuffer: { type: 'object' } // Buffer passed from renderer
      }
    }
  }, async (args) => {
    if (!apiKey) throw new Error('Voice Symphony not initialized');
    
    // Create FormData for the file upload
    const formData = new FormData();
    // Assuming args.audioBuffer is a Buffer or Uint8Array. 
    // We need to wrap it in a Blob or similar for fetch to handle it as a file.
    // In Node 18+, Blob is available globally.
    const blob = new Blob([args.audioBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'recording.wav');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI STT Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return { text: data.text };
  });

  context.dsn.registerTool({
    name: 'speakText',
    description: 'Converts text to speech (TTS)',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        voice: { type: 'string', default: 'alloy' }
      },
      required: ['text']
    }
  }, async (args) => {
    if (!apiKey) throw new Error('Voice Symphony not initialized');

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "tts-1",
            voice: args.voice,
            input: args.text,
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI TTS Error: ${response.status} - ${error}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // In a real plugin, we'd send this buffer back to the renderer to play
    return { audioData: buffer.toString('base64') };
  });

  console.log('[Voice Symphony] Activated.');
}
