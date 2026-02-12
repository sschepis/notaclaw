import { useState, useRef, useCallback, useEffect } from 'react';

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechToTextOptions {
  /** Language for speech recognition (default: 'en-US') */
  lang?: string;
  /** Callback when a transcript segment is finalized */
  onTranscript?: (text: string) => void;
  /** Callback for interim (in-progress) results */
  onInterimTranscript?: (text: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
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
  /** Whether speech recognition is supported in the browser */
  isSupported: boolean;
  /** Current error message, if any */
  error: string | null;
}

/**
 * Hook for continuous speech-to-text recognition.
 * 
 * Captures speech up to a pause, then automatically restarts listening.
 * This creates a progressive capture effect where speech is captured
 * in natural segments.
 */
export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const {
    lang = 'en-US',
    onTranscript,
    onInterimTranscript,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const isStartingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for browser support
  const SpeechRecognitionAPI = 
    typeof window !== 'undefined' 
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : undefined;
  
  const isSupported = !!SpeechRecognitionAPI;

  // Stop listening
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    isStartingRef.current = false;

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
    }

    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Reset silence timeout
  const resetSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    silenceTimeoutRef.current = setTimeout(() => {
      stopListening();
    }, 5000);
  }, [stopListening]);

  // Create recognition instance
  const createRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    return recognition;
  }, [SpeechRecognitionAPI, lang]);

  // Handle recognition results
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    resetSilenceTimeout();

    let finalTranscript = '';
    let interim = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }

    // Update interim display
    setInterimTranscript(interim);
    onInterimTranscript?.(interim);

    // If we have a final result, send it and clear interim
    if (finalTranscript) {
      setInterimTranscript('');
      onTranscript?.(finalTranscript);
    }
  }, [onTranscript, onInterimTranscript, resetSilenceTimeout]);

  // Handle recognition end - auto-restart if still listening
  const handleEnd = useCallback(() => {
    isStartingRef.current = false;
    
    if (shouldRestartRef.current && recognitionRef.current) {
      // Small delay before restarting to avoid rapid start/stop cycles
      setTimeout(() => {
        if (shouldRestartRef.current && recognitionRef.current) {
          try {
            isStartingRef.current = true;
            recognitionRef.current.start();
          } catch (e) {
            // Recognition might still be running, ignore
            isStartingRef.current = false;
          }
        }
      }, 100);
    } else {
      setIsListening(false);
      setInterimTranscript('');
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  }, []);

  // Handle recognition errors
  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    isStartingRef.current = false;
    
    // Handle specific error types
    switch (event.error) {
      case 'no-speech':
        // No speech detected - restart listening if still active
        // But if we hit our own silence timeout, we should have stopped already.
        // If the API stops for no-speech before our timeout, we might want to restart
        // OR we might want to respect the API's decision.
        // Given the 5s requirement, we probably want to keep listening until *our* timeout hits
        // if the API's timeout is shorter.
        if (shouldRestartRef.current) {
          handleEnd();
        }
        break;
      case 'audio-capture':
        setError('Microphone not available. Please check your microphone settings.');
        shouldRestartRef.current = false;
        setIsListening(false);
        onError?.('Microphone not available');
        break;
      case 'not-allowed':
        setError('Microphone access denied. Please allow microphone access to use speech-to-text.');
        shouldRestartRef.current = false;
        setIsListening(false);
        onError?.('Microphone access denied');
        break;
      case 'aborted':
        // User or system aborted - don't restart
        break;
      case 'network':
        setError('Network error. Speech recognition requires an internet connection.');
        shouldRestartRef.current = false;
        setIsListening(false);
        onError?.('Network error');
        break;
      default:
        console.warn('Speech recognition error:', event.error, event.message);
        // For other errors, try to restart if still listening
        if (shouldRestartRef.current) {
          handleEnd();
        }
    }
  }, [handleEnd, onError]);

  // Initialize recognition with event handlers
  const initRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onstart = null;
    }

    const recognition = createRecognition();
    if (!recognition) return null;

    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;
    recognition.onstart = () => {
      isStartingRef.current = false;
      setError(null);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [createRecognition, handleResult, handleError, handleEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      onError?.('Speech recognition not supported');
      return;
    }

    if (isListening || isStartingRef.current) return;

    setError(null);
    shouldRestartRef.current = true;

    const recognition = initRecognition();
    if (!recognition) return;

    try {
      isStartingRef.current = true;
      recognition.start();
      setIsListening(true);
      resetSilenceTimeout(); // Start silence timer
    } catch (e) {
      isStartingRef.current = false;
      console.error('Failed to start speech recognition:', e);
      setError('Failed to start speech recognition.');
      onError?.('Failed to start');
    }
  }, [isSupported, isListening, initRecognition, onError, resetSilenceTimeout]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    error,
  };
}
