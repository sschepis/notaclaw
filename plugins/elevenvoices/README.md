# @alephnet/elevenvoices

ElevenLabs voice synthesis integration for AlephNet, providing AI-powered text-to-speech, voice cloning, and sound effect generation capabilities.

## Features

- **Text-to-Speech (TTS)**: Convert text to natural-sounding speech using state-of-the-art AI voices
- **Voice Library**: Access to pre-made voices and your own cloned voices
- **Voice Cloning**: Create custom voice clones from audio samples
- **Sound Effects**: Generate sound effects from text descriptions
- **Speech-to-Speech**: Transform voice recordings while preserving emotion and tone
- **Multi-language Support**: Over 29 languages with the Multilingual v2 model

## Installation

The plugin is included in the AlephNet plugins directory. Enable it through the Extensions panel in the application.

## Configuration

### Required Settings

1. **ElevenLabs API Key**: Obtain from [elevenlabs.io](https://elevenlabs.io)
   - Navigate to Plugin Settings → ElevenVoices → API Key
   - Your API key is stored securely using the secrets manager

### Optional Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Default Voice ID | Rachel (21m00Tcm4TlvDq8ikWAM) | Default voice for TTS |
| Default Model | eleven_multilingual_v2 | TTS model to use |
| Output Format | mp3_44100_128 | Audio output format |
| Stability | 0.5 | Voice consistency (0-1) |
| Similarity Boost | 0.75 | Closeness to original voice (0-1) |
| Style | 0 | Style exaggeration (0-1, v2 models) |
| Speaker Boost | true | Enhance speaker similarity |

## Available Tools

### `text_to_speech`

Convert text to speech using ElevenLabs AI voices.

**Parameters:**
- `text` (required): The text to convert (max 5000 characters)
- `voiceId`: ElevenLabs voice ID
- `model`: TTS model (`eleven_multilingual_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2_5`, `eleven_monolingual_v1`)
- `stability`: Voice stability (0-1)
- `similarityBoost`: Similarity to original voice (0-1)
- `style`: Style exaggeration (0-1)

**Example:**
```json
{
  "tool": "text_to_speech",
  "args": {
    "text": "Hello! Welcome to AlephNet.",
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  }
}
```

### `get_voices`

List all available ElevenLabs voices.

**Parameters:**
- `refresh`: Force refresh the cache (boolean)

**Returns:**
```json
{
  "voices": [
    {
      "voiceId": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "category": "premade",
      "description": "American female voice"
    }
  ],
  "count": 42
}
```

### `clone_voice`

Create a new voice clone from audio samples.

**Parameters:**
- `name` (required): Name for the cloned voice
- `files` (required): Array of audio file paths
- `description`: Description of the voice
- `labels`: Optional metadata labels

**Requirements:**
- At least one audio file (MP3, WAV, or M4A)
- Clear speech with minimal background noise
- 1-2 minutes of audio recommended

### `generate_sound_effect`

Generate sound effects from text descriptions.

**Parameters:**
- `text` (required): Description of the sound effect
- `duration`: Duration in seconds (0.5-22)
- `promptInfluence`: How much text influences generation (0-1)

**Example:**
```json
{
  "tool": "generate_sound_effect",
  "args": {
    "text": "Thunder rolling in the distance with rain",
    "duration": 5
  }
}
```

### `speech_to_speech`

Transform speech from one voice to another while preserving emotion and pacing.

**Parameters:**
- `audioFile` (required): Path to source audio file
- `voiceId`: Target voice ID
- `model`: Transformation model
- `stability`: Voice stability (0-1)
- `similarityBoost`: Similarity to target voice (0-1)

### `get_subscription_info`

Get your ElevenLabs subscription information including character usage and limits.

**Returns:**
```json
{
  "tier": "creator",
  "characterCount": 15000,
  "characterLimit": 100000,
  "voiceLimit": 30,
  "canUseInstantVoiceCloning": true
}
```

## Models

| Model | Speed | Quality | Languages |
|-------|-------|---------|-----------|
| `eleven_multilingual_v2` | Medium | Highest | 29+ languages |
| `eleven_turbo_v2_5` | Fast | High | 32 languages |
| `eleven_flash_v2_5` | Fastest | Good | 32 languages |
| `eleven_monolingual_v1` | Medium | High | English only |

## Voice Settings

### Stability (0-1)
- **Low (0-0.3)**: More expressive, variable delivery
- **Medium (0.3-0.7)**: Balanced consistency and expression
- **High (0.7-1)**: Very consistent, robotic at extremes

### Similarity Boost (0-1)
- **Low**: More generic voice characteristics
- **High**: Closer to original voice, may amplify artifacts

### Style (0-1)
- Only effective with v2 models
- Exaggerates the speaking style of the original voice

## UI Panel

The plugin provides a sidebar panel for interactive voice generation:

1. **Voices Tab**: Browse and preview available voices
2. **Generate Speech Tab**: Enter text and generate audio
3. **Sound Effects Tab**: Create sound effects from descriptions

## API Rate Limits

- Character limits depend on your ElevenLabs subscription tier
- The plugin caches voice lists for 5 minutes to reduce API calls
- Generated audio files are stored temporarily and cleaned up after 1 hour

## Permissions Required

- `network:http`: API communication with ElevenLabs
- `fs:read`: Read audio files for cloning/transformation
- `fs:write`: Save generated audio files
- `store:read`: Access plugin settings
- `store:write`: Cache voice data
- `dsn:register-tool`: Register tools with the AI system

## Troubleshooting

### "API key not configured"
Set your API key in the plugin settings or secrets manager.

### "Rate limit exceeded"
You've exceeded your subscription's character limit. Check usage with `get_subscription_info`.

### "Voice not found"
The specified voice ID doesn't exist. Use `get_voices` to list available voices.

### Audio quality issues
- Increase `stability` for more consistent output
- Lower `similarityBoost` if artifacts occur
- Use `eleven_multilingual_v2` for highest quality

## License

MIT License - See LICENSE file for details.

## Credits

- Powered by [ElevenLabs](https://elevenlabs.io)
- Built for [AlephNet](https://aleph.network)
