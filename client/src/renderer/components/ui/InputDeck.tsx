import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TooltipProvider } from '../ui/tooltip';
import { useAppStore, Attachment, Message } from '../../store/useAppStore';
import { AttachmentPreview } from './input-deck/AttachmentPreview';
import { InputArea } from './input-deck/InputArea';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, LARGE_TEXT_THRESHOLD } from './input-deck/constants';
import { useSpeechToText } from '../../hooks/useSpeechToText';

interface InputDeckProps {
  onMessageSent?: () => void;
}

export const InputDeck: React.FC<InputDeckProps> = ({ onMessageSent }) => {
  const [mode, setMode] = useState<'Chat' | 'Task' | 'Proposal'>('Chat');
  const [resonance, setResonance] = useState(50);
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isGenerating,
    pendingAttachments,
    addPendingAttachment,
    removePendingAttachment,
    clearPendingAttachments,
    setIsGenerating,
    setGenerationProgress,
    addMessage,
    abortController,
    setAbortController,
    selectedModel,
    setSelectedModel
  } = useAppStore();

  // Speech-to-text hook - appends transcribed text progressively
  const handleSpeechTranscript = useCallback((text: string) => {
    // Append transcribed text with a space if there's existing content
    setContent(prev => {
      const trimmedPrev = prev.trimEnd();
      if (trimmedPrev) {
        return `${trimmedPrev} ${text}`;
      }
      return text;
    });
  }, []);

  const {
    isListening,
    interimTranscript,
    toggleListening,
    isSupported: isSpeechSupported,
  } = useSpeechToText({
    lang: 'en-US',
    onTranscript: handleSpeechTranscript,
  });

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Read file as data URL for images
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Check if file type is allowed
  const isFileAllowed = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.type);
  };

  // Process a file and add as attachment
  const processFile = async (file: File) => {
    if (!isFileAllowed(file)) {
      console.warn(`File type not allowed: ${file.name}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      console.warn(`File too large: ${file.name}`);
      return;
    }

    const isImage = file.type.startsWith('image/');
    const attachment: Attachment = {
      id: generateId(),
      type: isImage ? 'image' : 'file',
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };

    if (isImage) {
      attachment.dataUrl = await readFileAsDataUrl(file);
    } else if (file.type.startsWith('text/') || file.type === 'application/javascript') {
      attachment.content = await readFileAsText(file);
    }

    addPendingAttachment(attachment);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      await processFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasHandledFile = false;

    // Check for files/images first
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await processFile(file);
          hasHandledFile = true;
        }
      }
    }

    // If no files, check for large text content
    if (!hasHandledFile) {
      const text = e.clipboardData.getData('text/plain');
      if (text.length > LARGE_TEXT_THRESHOLD) {
        e.preventDefault();
        const attachment: Attachment = {
          id: generateId(),
          type: 'document',
          name: `Pasted text (${text.length} chars)`,
          size: text.length,
          mimeType: 'text/plain',
          content: text,
        };
        addPendingAttachment(attachment);
      }
    }
  }, [addPendingAttachment]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
  };

  // Handle send/stop
  const handleSend = async () => {
    if (!content.trim() && pendingAttachments.length === 0) return;
    if (isGenerating) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    setGenerationProgress({ status: 'Initializing request...', step: 0 });

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      content: content.trim(),
      type: 'cognitive',
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    addMessage(userMessage);

    // Clear input immediately
    const sentContent = content;
    const sentAttachments = [...pendingAttachments];
    setContent('');
    clearPendingAttachments();

    try {
      setGenerationProgress({ status: 'Connecting to AI provider...', step: 1 });

      // Prepare message payload with attachments and model selection
      const messagePayload = {
        content: sentContent,
        mode,
        resonance,
        model: selectedModel || undefined,
        attachments: sentAttachments.map(a => ({
          name: a.name,
          type: a.type,
          content: a.content,
          dataUrl: a.dataUrl,
        })),
      };

      setGenerationProgress({ status: 'Processing your message...', step: 2 });

      await window.electronAPI.sendMessage(messagePayload);

      onMessageSent?.();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted by user');
      } else {
        console.error("Failed to send message:", error);
      }
      setIsGenerating(false);
      setGenerationProgress(null);
    } finally {
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsGenerating(false);
      setGenerationProgress(null);
      setAbortController(null);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isGenerating) {
        handleStop();
      } else {
        handleSend();
      }
      return;
    }

    // Enter without shift to send (existing behavior)
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (!isGenerating) {
        handleSend();
      }
    }
  };

  return (
    <TooltipProvider>
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className={`glass-panel border-t border-x-0 border-b-0 px-3 pt-2 pb-2 z-30 mx-0 mb-0 rounded-none shrink-0 ${
        dragOver ? 'ring-1 ring-primary ring-inset bg-primary/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      <div className="max-w-4xl mx-auto space-y-2">
        
        <AttachmentPreview 
          attachments={pendingAttachments} 
          onRemove={removePendingAttachment} 
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <InputArea 
          content={content}
          setContent={setContent}
          isGenerating={isGenerating}
          onSend={handleSend}
          onStop={handleStop}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          isFocused={isFocused}
          dragOver={dragOver}
          mode={mode}
          hasAttachments={pendingAttachments.length > 0}
          resonance={resonance}
          setResonance={setResonance}
          onFileSelect={() => fileInputRef.current?.click()}
          isListening={isListening}
          onToggleListening={toggleListening}
          isSpeechSupported={isSpeechSupported}
          interimTranscript={interimTranscript}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </motion.div>
    </TooltipProvider>
  );
};
