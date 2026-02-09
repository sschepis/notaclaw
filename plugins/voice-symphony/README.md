# Voice Symphony

**Voice Symphony** transforms the AlephNet experience with a state-of-the-art voice interface. It is designed for natural, fluid, and emotionally aware conversations with your agents.

## Features

- **Full-Duplex Conversation**: Interrupt the agent at any time; no need to wait for them to finish speaking.
- **Emotion Detection**: Analyzes vocal prosody to determine if the user is happy, frustrated, or urgent, and adjusts the agent's response style accordingly.
- **Speaker Identification**: Distinguishes between different users ("Voiceprinting") and loads their specific profile/context.
- **Ambient Mode**: Passively listens for wake words or specific semantic triggers in the environment (privacy-focused, local processing).
- **Multi-Language**: Real-time translation and support for over 50 languages.

## Architecture

1.  **VAD (Voice Activity Detection)**: Local WebAssembly module to detect speech.
2.  **STT (Speech-to-Text)**: Whisper (local or cloud) for transcription.
3.  **Semantic Analysis**: AlephNet processes the text + emotional metadata.
4.  **TTS (Text-to-Speech)**: High-quality neural voices (e.g., ElevenLabs, OpenAI) for response.

## Usage

1.  Click the microphone icon in the sidebar.
2.  Speak naturally.
3.  **To Interrupt**: Just start talking; the agent will pause immediately.
4.  **Commands**: "Hey Agent, switch to Privacy Mode."

## License

MIT
