import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ModelSelector } from './ModelSelector';

interface InputAreaProps {
  content: string;
  setContent: (content: string) => void;
  isGenerating: boolean;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
  dragOver: boolean;
  mode: string;
  hasAttachments: boolean;
  onFileSelect: () => void;
  isListening?: boolean;
  onToggleListening?: () => void;
  isSpeechSupported?: boolean;
  interimTranscript?: string;
  speechError?: string | null;
  selectedModel?: string | null;
  onModelChange?: (model: string) => void;
  className?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  content,
  setContent,
  isGenerating,
  onSend,
  onStop,
  onKeyDown,
  onPaste,
  onFocus,
  onBlur,
  isFocused,
  dragOver,
  mode,
  hasAttachments,
  onFileSelect,
  isListening = false,
  onToggleListening,
  interimTranscript = '',
  speechError,
  selectedModel,
  onModelChange,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when not generating
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  const displayContent = isListening && interimTranscript 
    ? `${content}${content ? ' ' : ''}${interimTranscript}`
    : content;

  return (
    <div className={`
        relative rounded-xl border transition-all duration-300 flex flex-col
        ${dragOver
          ? 'bg-primary/10 border-primary shadow-lg shadow-primary/20'
          : isFocused
            ? 'bg-background border-primary/50 shadow-glow-sm'
            : 'bg-muted/10 border-border/40 hover:border-primary/20 hover:bg-muted/20'}
        ${isGenerating ? 'opacity-75' : ''}
        ${className || ''}
    `}>
      {/* Drop overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-xl z-10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-primary-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-medium text-sm">Drop files here</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Textarea 
        ref={textareaRef}
        value={displayContent}
        onChange={(e) => !isListening && setContent(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={isGenerating ? 'Generating response...' : isListening ? 'Listening...' : `Enter ${mode.toLowerCase()}... (Ctrl+Enter to send)`}
        rows={1}
        disabled={isGenerating}
        readOnly={isListening}
        className={`bg-transparent border-none placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-3 w-full resize-none custom-scrollbar font-medium leading-relaxed min-h-[60px] flex-1 ${
          isGenerating ? 'text-muted-foreground cursor-not-allowed' : 'text-foreground'
        } ${isListening ? 'cursor-wait' : ''}`}
      />
      
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-2 pb-2 mt-1">
        <div className="flex items-center gap-2">
            {/* Model Selector */}
            {onModelChange && (
              <div className="w-[180px]">
                <ModelSelector
                  selectedModel={selectedModel || null}
                  onModelChange={onModelChange}
                  isGenerating={isGenerating}
                />
              </div>
            )}

            {/* File Upload Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={onFileSelect}
                  disabled={isGenerating}
                  className={`p-1.5 rounded-md transition-all border border-transparent ${
                    isGenerating 
                      ? 'bg-transparent text-muted-foreground cursor-not-allowed'
                      : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>

            {/* Speech-to-Text Button */}
            {onToggleListening && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={onToggleListening}
                    disabled={isGenerating}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={isListening}
                    className={`relative p-1.5 rounded-md transition-all border ${
                      speechError
                        ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : isListening
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : isGenerating
                            ? 'bg-transparent text-muted-foreground cursor-not-allowed border-transparent'
                            : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border/50 border-transparent'
                    }`}
                    whileTap={{ scale: isGenerating ? 1 : 0.95 }}
                  >
                    {/* Microphone Icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    
                    {/* Listening indicator pulse */}
                    <AnimatePresence>
                      {isListening && (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                          }}
                          className="absolute inset-0 rounded-md bg-destructive"
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{speechError ? `Error: ${speechError}` : isListening ? 'Stop listening' : 'Start voice input'}</p>
                </TooltipContent>
              </Tooltip>
            )}
        </div>

        <div className="flex items-center">
            <AnimatePresence mode="wait">
            {isGenerating ? (
                <motion.div
                key="stop"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                >
                <Button 
                    size="sm" 
                    variant="destructive"
                    className="h-8 px-4 bg-destructive hover:bg-destructive/90 border-none shadow-sm text-xs font-medium rounded-md"
                    onClick={onStop}
                >
                    <div className="flex items-center space-x-1.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                    <span>Stop</span>
                    </div>
                </Button>
                </motion.div>
            ) : (content.trim() || hasAttachments) ? (
                <motion.div
                key="send"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                >
                <Button 
                    size="sm" 
                    className="h-8 px-4 bg-primary text-primary-foreground border-none hover:opacity-90 transition-all shadow-sm text-xs font-medium rounded-md"
                    onClick={onSend}
                >
                    <div className="flex items-center space-x-1.5">
                    <span>Send</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </div>
                </Button>
                </motion.div>
            ) : null}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
