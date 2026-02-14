import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TooltipProvider } from '../ui/tooltip';
import { useAppStore, Attachment, Message } from '../../store/useAppStore';
import { AttachmentPreview } from './input-deck/AttachmentPreview';
import { InputArea } from './input-deck/InputArea';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, LARGE_TEXT_THRESHOLD } from './input-deck/constants';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { ChatInputBeforeSlot, ChatInputAfterSlot } from './ExtensionSlotV2';
import { useCommandSystem } from '../../services/commands/useCommandSystem';
import { CommandSuggestions } from './input-deck/CommandSuggestions';
import { useDraftPersistence } from '../../hooks/useDraftPersistence';

interface InputDeckProps {
  onMessageSent?: () => void;
}

export const InputDeck: React.FC<InputDeckProps> = ({ onMessageSent }) => {
  const [mode] = useState<'Chat' | 'Task' | 'Proposal'>('Chat');
  const activeConversationId = useAppStore(s => s.activeConversationId);
  const { content, setContent, clearDraft } = useDraftPersistence(activeConversationId);
  const [isFocused, setIsFocused] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [inputMetadata, setInputMetadata] = useState<Record<string, any>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    suggestions,
    showSuggestions,
    selectedIndex,
    setSelectedIndex,
    updateSuggestions,
    executeCommand,
    setShowSuggestions
  } = useCommandSystem();
  
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

  const handleSetMetadata = useCallback((key: string, value: any) => {
    setInputMetadata(prev => ({ ...prev, [key]: value }));
  }, []);

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

  // LLM-refined transcript replaces the entire content
  const handleRefinedTranscript = useCallback((text: string) => {
    setContent(text);
  }, []);

  const {
    isListening,
    interimTranscript,
    toggleListening,
    isSupported: isSpeechSupported,
    error: speechError,
  } = useSpeechToText({
    lang: 'en-US',
    onTranscript: handleSpeechTranscript,
    onRefinedTranscript: handleRefinedTranscript,
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

  // File extensions that should always be read as text, regardless of MIME type
  const TEXT_FILE_EXTENSIONS = new Set([
    '.md', '.txt', '.html', '.htm', '.css', '.js', '.ts', '.tsx', '.jsx',
    '.json', '.yaml', '.yml', '.xml', '.csv', '.log', '.sh', '.bash',
    '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
    '.toml', '.ini', '.cfg', '.conf', '.env', '.sql', '.graphql', '.gql',
    '.svelte', '.vue', '.astro',
  ]);

  // Check if a file should be read as text content
  const isTextFile = (file: File): boolean => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (TEXT_FILE_EXTENSIONS.has(ext)) return true;
    if (file.type.startsWith('text/')) return true;
    if (file.type === 'application/javascript' || file.type === 'application/typescript') return true;
    if (file.type === 'application/json') return true;
    return false;
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
    } else if (isTextFile(file)) {
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
    
    // Check for slash command
    if (content.trim().startsWith('/')) {
      const handled = await executeCommand(content.trim());
      if (handled) {
        clearDraft();
        setShowSuggestions(false);
        return;
      }
    }

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
      metadata: inputMetadata, // Pass metadata to user message
    };

    addMessage(userMessage);

    // Clear input immediately
    const sentContent = content;
    const sentAttachments = [...pendingAttachments];
    const sentMetadata = { ...inputMetadata }; // Capture current metadata
    clearDraft();
    clearPendingAttachments();
    // Don't clear metadata here, as it might be a persistent toggle (like "secure mode")

    try {
      setGenerationProgress({ status: 'Connecting to AI provider...', step: 1 });

      // Prepare message payload with attachments and model selection
      const messagePayload = {
        content: sentContent,
        mode,
        model: selectedModel || undefined,
        attachments: sentAttachments.map(a => ({
          name: a.name,
          type: a.type,
          content: a.content,
          dataUrl: a.dataUrl,
        })),
        ...sentMetadata, // Spread metadata into payload
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
    // Handle command suggestions navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const suggestion = suggestions[selectedIndex];
        if (suggestion) {
          // Replace content with suggestion
          const newContent = suggestion.text;
          setContent(newContent);
          // If suggestion is complete/terminal, we might want to just set it
          // But usually we want to keep typing args
          setShowSuggestions(false);
          
          // Focus back on input if needed (usually automatic)
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

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

  // Update suggestions when content changes
  React.useEffect(() => {
    if (content.startsWith('/')) {
      const cursorPosition = content.length; // Simplified for now
      updateSuggestions(content, cursorPosition);
    } else {
      setShowSuggestions(false);
    }
  }, [content, updateSuggestions, setShowSuggestions]);

  return (
    <TooltipProvider>
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className={`glass-panel border-t border-x-0 border-b-0 px-3 pt-2 pb-2 z-30 mx-0 mb-0 rounded-none shrink-0 h-full flex flex-col ${
        dragOver ? 'ring-1 ring-primary ring-inset bg-primary/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      <div className="w-full h-full flex flex-col space-y-2">
        
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

        <ChatInputBeforeSlot />

        <CommandSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={(suggestion) => {
            setContent(suggestion.text);
            setShowSuggestions(false);
            // Focus input logic if needed
          }}
          visible={showSuggestions}
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
          onFileSelect={() => fileInputRef.current?.click()}
          isListening={isListening}
          onToggleListening={toggleListening}
          isSpeechSupported={isSpeechSupported}
          interimTranscript={interimTranscript}
          speechError={speechError}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          className="flex-1"
        />

        <ChatInputAfterSlot 
          context={{
            content,
            setContent,
            metadata: inputMetadata,
            setMetadata: handleSetMetadata,
            onSend: handleSend
          }}
        />
      </div>
    </motion.div>
    </TooltipProvider>
  );
};
