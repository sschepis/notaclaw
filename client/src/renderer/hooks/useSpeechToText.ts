import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Public interface ──────────────────────────────────────────────────
export interface UseSpeechToTextOptions {
  /** Language for speech recognition (default: 'en-US') */
  lang?: string;
  /** Callback when a transcript segment is finalized (raw, immediate) */
  onTranscript?: (text: string) => void;
  /** Callback for interim (in-progress) results */
  onInterimTranscript?: (text: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /**
   * Callback with LLM-refined full transcript.
   * Fires after each new segment, with a debounce.
   * The text replaces (not appends to) the input content.
   */
  onRefinedTranscript?: (text: string) => void;
  /** Silence timeout in ms before auto-stop (default: 30000) */
  silenceTimeoutMs?: number;
  /** Duration of each recording chunk in ms (default: 3000) */
  chunkDurationMs?: number;
  /** Debounce delay before triggering LLM refinement (ms, default: 1500) */
  refineDebounceMs?: number;
}

export interface UseSpeechToTextReturn {
  /** Whether speech recognition is currently active */
  isListening: boolean;
  /** The current interim transcript (not yet finalized) */
  interimTranscript: string;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening for speech */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => void;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Current error message, if any */
  error: string | null;
  /** The accumulated raw transcript so far */
  accumulatedText: string;
}

// ─── WAV Encoding Utilities ────────────────────────────────────────────

/** Encode raw PCM Float32 samples into a 16-bit 16kHz mono WAV buffer. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const targetRate = 16000;
  let resampled: Float32Array;

  if (Math.abs(sampleRate - targetRate) > 1) {
    const ratio = sampleRate / targetRate;
    const newLength = Math.round(samples.length / ratio);
    resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = Math.floor(i * ratio);
      resampled[i] = samples[Math.min(srcIdx, samples.length - 1)];
    }
  } else {
    resampled = samples;
  }

  const numSamples = resampled.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, targetRate, true);   // sample rate
  view.setUint32(28, targetRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Convert ArrayBuffer to base64 string.
 * Uses chunked approach for large buffers to avoid call stack overflow.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Hook for progressive speech-to-text using local Whisper (via Electron IPC)
 * with LLM-powered refinement.
 *
 * Design:
 *   - Captures microphone audio via MediaStream + AudioContext + ScriptProcessorNode.
 *   - Records PCM in configurable chunks (default 3s).
 *   - Encodes each chunk as 16kHz 16-bit mono WAV.
 *   - Sends base64 WAV to main process where whisper.cpp transcribes it.
 *   - Delivers raw transcribed text immediately via onTranscript callback.
 *   - Accumulates all segments, then after a debounce sends the full text
 *     through the LLM for refinement (punctuation, capitalization, error correction).
 *   - Delivers refined text via onRefinedTranscript callback for input replacement.
 *   - Shows "..." as interim indicator while a chunk is being transcribed.
 *   - Auto-stops after silenceTimeoutMs of no speech results.
 */
export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const {
    onTranscript,
    onInterimTranscript,
    onError,
    onRefinedTranscript,
    silenceTimeoutMs = 30000,
    chunkDurationMs = 3000,
    refineDebounceMs = 1500,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [accumulatedText, setAccumulatedText] = useState('');
  // Always true — mic button is always visible. Errors surface at click time.
  const [isSupported] = useState(true);

  // ─── Refs ───────────────────────────────────────────────────────────
  const mountedRef = useRef(true);
  const wantListeningRef = useRef(false);
  const startingRef = useRef(false);  // prevents double-start race
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(16000);  // saved before cleanup for final flush
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcribingRef = useRef(false);
  const lastSpeechTimeRef = useRef(Date.now());
  const bufferedSamplesRef = useRef(0);  // track total buffered sample count
  const accumulatedTextRef = useRef('');  // raw accumulated transcript
  const refineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refiningRef = useRef(false);  // LLM refinement in progress
  const lastRefinedVersionRef = useRef('');  // avoid redundant refinement calls

  // Max buffered audio: ~30s of 16kHz = 480,000 samples ≈ 1.8MB
  const maxBufferedSamples = 480000;

  // Keep callbacks in refs to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterimTranscript);
  const onErrorRef = useRef(onError);
  const onRefinedRef = useRef(onRefinedTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterimRef.current = onInterimTranscript; }, [onInterimTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onRefinedRef.current = onRefinedTranscript; }, [onRefinedTranscript]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (refineTimerRef.current) {
      clearTimeout(refineTimerRef.current);
      refineTimerRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    // Save sample rate before destroying context — needed by final flush
    if (audioContextRef.current) {
      sampleRateRef.current = audioContextRef.current.sampleRate;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.onaudioprocess = null;
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    recordedChunksRef.current = [];
    bufferedSamplesRef.current = 0;
  }, []);

  /**
   * Trigger LLM refinement of the accumulated transcript.
   * Debounced — only fires after refineDebounceMs of no new segments.
   */
  const triggerRefinement = useCallback(() => {
    // Cancel any pending refinement timer
    if (refineTimerRef.current) {
      clearTimeout(refineTimerRef.current);
      refineTimerRef.current = null;
    }

    refineTimerRef.current = setTimeout(async () => {
      const rawText = accumulatedTextRef.current.trim();
      if (!rawText || refiningRef.current) return;
      // Don't refine if text hasn't changed since last refinement
      if (rawText === lastRefinedVersionRef.current) return;
      // Don't refine very short fragments (< 10 chars) — not enough context
      if (rawText.length < 10) return;

      refiningRef.current = true;
      lastRefinedVersionRef.current = rawText;

      try {
        if (!window.electronAPI?.whisperRefine) {
          console.warn('[useSpeechToText] whisperRefine not available');
          return;
        }
        const result = await window.electronAPI.whisperRefine(rawText);
        if (!mountedRef.current) return;

        if (result.text && result.text.trim()) {
          console.log('[useSpeechToText] LLM refined:', result.text.trim().substring(0, 100));
          onRefinedRef.current?.(result.text.trim());
        }
      } catch (err) {
        console.error('[useSpeechToText] LLM refinement failed:', err);
        // Silently fall back — raw text is already in the input
      } finally {
        refiningRef.current = false;
      }
    }, refineDebounceMs);
  }, [refineDebounceMs]);

  /** Flush accumulated audio, encode as WAV, send to Whisper via IPC. */
  const flushAndTranscribe = useCallback(async () => {
    if (transcribingRef.current) return;
    if (recordedChunksRef.current.length === 0) return;

    // Grab current chunks and reset buffer
    const chunks = recordedChunksRef.current;
    recordedChunksRef.current = [];
    bufferedSamplesRef.current = 0;

    // Merge chunks into single Float32Array
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLength === 0) return;

    const merged = new Float32Array(totalLength);
    let mergeOffset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, mergeOffset);
      mergeOffset += chunk.length;
    }

    // Simple RMS check — skip silent chunks
    let sumSq = 0;
    for (let i = 0; i < merged.length; i++) {
      sumSq += merged[i] * merged[i];
    }
    const rms = Math.sqrt(sumSq / merged.length);
    if (rms < 0.005) {
      return; // Too quiet, skip transcription
    }

    // Show interim indicator while transcribing
    if (mountedRef.current) {
      setInterimTranscript('...');
      onInterimRef.current?.('...');
    }
    transcribingRef.current = true;

    try {
      // Use saved sampleRate (survives audioContext cleanup)
      const sampleRate = audioContextRef.current?.sampleRate || sampleRateRef.current;
      const wavBuffer = encodeWav(merged, sampleRate);
      const wavBase64 = arrayBufferToBase64(wavBuffer);

      const result = await window.electronAPI!.whisperTranscribe(wavBase64);

      if (!mountedRef.current) return; // Component unmounted during transcription

      if (result.error) {
        console.error('[useSpeechToText] Transcription error:', result.error);
        // Surface persistent errors to user (not transient ones)
        if (result.error.includes('not initialized') || result.error.includes('not available')) {
          setError(result.error);
          onErrorRef.current?.(result.error);
        }
      } else if (result.text && result.text.trim()) {
        // Post-process: strip annotations, convert spoken punctuation
        const processed = postProcessTranscript(result.text.trim());
        // Filter out whisper hallucinations (common with silence/noise)
        if (processed && !isHallucination(processed)) {
          lastSpeechTimeRef.current = Date.now();
          setInterimTranscript('');
          onInterimRef.current?.('');

          // Accumulate the raw segment
          const prevAccum = accumulatedTextRef.current;
          const newAccum = prevAccum
            ? `${prevAccum.trimEnd()} ${processed}`
            : processed;
          accumulatedTextRef.current = newAccum;
          if (mountedRef.current) {
            setAccumulatedText(newAccum);
          }

          // Deliver raw segment immediately
          onTranscriptRef.current?.(processed);

          // Schedule LLM refinement
          triggerRefinement();
        } else {
          setInterimTranscript('');
          onInterimRef.current?.('');
        }
      } else {
        setInterimTranscript('');
        onInterimRef.current?.('');
      }
    } catch (err: any) {
      console.error('[useSpeechToText] IPC error:', err);
      if (mountedRef.current) {
        setInterimTranscript('');
        onInterimRef.current?.('');
      }
    } finally {
      transcribingRef.current = false;
    }
  }, [triggerRefinement]);

  // ─── Core: start/stop ─────────────────────────────────────────────

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    startingRef.current = false;
    clearTimers();

    // Save sample rate before cleanup so final flush can use it
    if (audioContextRef.current) {
      sampleRateRef.current = audioContextRef.current.sampleRate;
    }

    // Do one final flush of any remaining audio
    flushAndTranscribe().catch(() => {});

    cleanupAudio();

    if (mountedRef.current) {
      setIsListening(false);
      setInterimTranscript('');
    }

    // Trigger one final refinement when stopping
    triggerRefinement();
  }, [clearTimers, cleanupAudio, flushAndTranscribe, triggerRefinement]);

  const startListening = useCallback(async () => {
    // Prevent double-start (rapid toggle protection)
    if (wantListeningRef.current || startingRef.current) return;
    startingRef.current = true;

    // Reset accumulated text for new session
    accumulatedTextRef.current = '';
    lastRefinedVersionRef.current = '';
    if (mountedRef.current) {
      setAccumulatedText('');
    }

    // Check Whisper readiness via IPC
    try {
      if (window.electronAPI?.whisperIsReady) {
        const ready = await window.electronAPI.whisperIsReady();
        if (!ready) {
          const msg = 'Speech recognition not available. Whisper binary or model may not be installed.';
          if (mountedRef.current) {
            setError(msg);
            onErrorRef.current?.(msg);
          }
          startingRef.current = false;
          return;
        }
      } else {
        const msg = 'Speech recognition not available in this environment.';
        if (mountedRef.current) {
          setError(msg);
          onErrorRef.current?.(msg);
        }
        startingRef.current = false;
        return;
      }
    } catch {
      const msg = 'Failed to check speech recognition availability.';
      if (mountedRef.current) {
        setError(msg);
        onErrorRef.current?.(msg);
      }
      startingRef.current = false;
      return;
    }

    // Abort if user toggled off while we were checking readiness
    if (!startingRef.current) return;

    if (mountedRef.current) {
      setError(null);
    }
    wantListeningRef.current = true;
    if (mountedRef.current) {
      setIsListening(true);
    }
    lastSpeechTimeRef.current = Date.now();

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Abort if user stopped while we were awaiting mic permission
      if (!wantListeningRef.current) {
        stream.getTracks().forEach(t => t.stop());
        startingRef.current = false;
        return;
      }

      mediaStreamRef.current = stream;

      // Create AudioContext — request 16kHz but accept whatever the system gives
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      sampleRateRef.current = audioContext.sampleRate;

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // ScriptProcessorNode captures raw PCM data in real-time
      // (Deprecated but AudioWorklet requires a separate module file,
      //  which is complex to set up in Electron+Vite. ScriptProcessor
      //  works reliably for our 3-second chunk use case.)
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!wantListeningRef.current) return;

        // Memory cap: discard old chunks if we've buffered too much
        if (bufferedSamplesRef.current > maxBufferedSamples) {
          recordedChunksRef.current = [];
          bufferedSamplesRef.current = 0;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        // Must copy — the underlying buffer is reused by the audio system
        const copy = new Float32Array(inputData.length);
        copy.set(inputData);
        recordedChunksRef.current.push(copy);
        bufferedSamplesRef.current += copy.length;
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Flush and transcribe every chunkDurationMs
      chunkTimerRef.current = setInterval(() => {
        if (wantListeningRef.current) {
          flushAndTranscribe();
        }
      }, chunkDurationMs);

      // Silence timeout — stop if no speech for silenceTimeoutMs
      const checkSilence = () => {
        if (!wantListeningRef.current || !mountedRef.current) return;
        const elapsed = Date.now() - lastSpeechTimeRef.current;
        if (elapsed > silenceTimeoutMs) {
          console.log('[useSpeechToText] Silence timeout, stopping.');
          stopListening();
        } else {
          silenceTimerRef.current = setTimeout(checkSilence, 2000);
        }
      };
      silenceTimerRef.current = setTimeout(checkSilence, silenceTimeoutMs);

      startingRef.current = false;
    } catch (err: any) {
      console.error('[useSpeechToText] Failed to start:', err);
      let msg: string;
      if (err.name === 'NotAllowedError') {
        msg = 'Microphone access denied. Check System Preferences > Privacy > Microphone.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone found.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Microphone is in use by another application.';
      } else {
        msg = `Microphone error: ${err.message}`;
      }
      if (mountedRef.current) {
        setError(msg);
        onErrorRef.current?.(msg);
      }
      wantListeningRef.current = false;
      startingRef.current = false;
      if (mountedRef.current) {
        setIsListening(false);
      }
      cleanupAudio();
    }
  }, [chunkDurationMs, silenceTimeoutMs, flushAndTranscribe, stopListening, cleanupAudio]);

  const toggleListening = useCallback(() => {
    if (wantListeningRef.current || startingRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // ─── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      wantListeningRef.current = false;
      startingRef.current = false;
      clearTimers();
      cleanupAudio();
    };
  }, [clearTimers, cleanupAudio]);

  return {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    error,
    accumulatedText,
  };
}

/**
 * Post-process whisper transcript:
 * 1. Strip bracketed/parenthesized annotations like [BLANK_AUDIO], (music), etc.
 * 2. Convert spoken punctuation words to their actual symbols.
 * 3. Clean up extra whitespace.
 */
function postProcessTranscript(text: string): string {
  // 1. Remove bracketed/parenthesized annotations: [BLANK_AUDIO], (music), [laughter], etc.
  let result = text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');

  // 2. Convert spoken punctuation to symbols.
  // These replacements are case-insensitive and handle word boundaries.
  // Order matters: longer phrases before shorter ones to avoid partial matches.
  const punctuationMap: Array<[RegExp, string]> = [
    // Multi-word phrases first
    [/\bquestion mark\b/gi, '?'],
    [/\bexclamation point\b/gi, '!'],
    [/\bexclamation mark\b/gi, '!'],
    [/\bopen parenthesis\b/gi, '('],
    [/\bclose parenthesis\b/gi, ')'],
    [/\bopen bracket\b/gi, '['],
    [/\bclose bracket\b/gi, ']'],
    [/\bopen quote\b/gi, '"'],
    [/\bclose quote\b/gi, '"'],
    [/\bnew line\b/gi, '\n'],
    [/\bnew paragraph\b/gi, '\n\n'],
    // Single words
    [/\bperiod\b/gi, '.'],
    [/\bfull stop\b/gi, '.'],
    [/\bcomma\b/gi, ','],
    [/\bapostrophe\b/gi, "'"],
    [/\bcolon\b/gi, ':'],
    [/\bsemicolon\b/gi, ';'],
    [/\bdash\b/gi, '—'],
    [/\bhyphen\b/gi, '-'],
    [/\bellipsis\b/gi, '…'],
    [/\bampersand\b/gi, '&'],
    [/\bat sign\b/gi, '@'],
    [/\bhashtag\b/gi, '#'],
    [/\bpercent\b/gi, '%'],
    [/\basterisk\b/gi, '*'],
    [/\bunderscore\b/gi, '_'],
    [/\bslash\b/gi, '/'],
    [/\bbackslash\b/gi, '\\'],
    [/\bequals\b/gi, '='],
    [/\bplus sign\b/gi, '+'],
  ];

  for (const [pattern, replacement] of punctuationMap) {
    result = result.replace(pattern, replacement);
  }

  // 3. Fix spacing around punctuation marks (remove space before punctuation)
  result = result.replace(/\s+([.,;:!?…)\]])/g, '$1');
  // Fix space after opening brackets
  result = result.replace(/([\[(])\s+/g, '$1');

  // 4. Clean up multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

/**
 * Whisper sometimes "hallucinates" text when given silence or noise.
 * Common hallucinations include repeated phrases, thank-you messages,
 * and transcription artifacts. Filter these out.
 */
function isHallucination(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Common whisper hallucinations with silence/noise
  const hallucinations = [
    'thank you',
    'thank you.',
    'thanks for watching',
    'thanks for watching.',
    'thanks for listening',
    'thanks for listening.',
    'subscribe',
    'please subscribe',
    'like and subscribe',
    'you',
    '...',
    'the end',
    'the end.',
    'bye',
    'bye.',
    'goodbye',
    'goodbye.',
    '♪',
    '♫',
    '[music]',
    '(music)',
    '[silence]',
    '(silence)',
    '[blank_audio]',
    '[applause]',
    '(applause)',
    '[laughter]',
    '(laughter)',
    'i\'m going to',
    'so',
    'um',
    'uh',
  ];
  if (hallucinations.some(h => lower === h)) return true;

  // Single character or very short noise
  if (lower.length <= 1) return true;

  // Repeated single word/char pattern (e.g., "you you you you")
  const words = lower.split(/\s+/);
  if (words.length > 2 && new Set(words).size === 1) return true;

  // All punctuation / special chars
  if (/^[^a-z0-9]+$/.test(lower)) return true;

  return false;
}
