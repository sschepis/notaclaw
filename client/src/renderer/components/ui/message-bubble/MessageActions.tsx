import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { CopyIcon, EditIcon, DeleteIcon, RerunIcon, CheckIcon } from './icons';

interface MessageActionsProps {
  content?: string;
  isUser: boolean;
  isGenerating: boolean;
  copied: boolean;
  showConfirmDelete: boolean;
  onCopy: () => void;
  onStartEdit: () => void;
  onRerun: () => void;
  onDelete: () => void;
}

const SpeakIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

export const MessageActions: React.FC<MessageActionsProps> = ({
  content,
  isUser,
  isGenerating,
  copied,
  showConfirmDelete,
  onCopy,
  onStartEdit,
  onRerun,
  onDelete,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!content) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    // Attempt to use a decent voice if available
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google US English or similar natural voices
    const preferredVoice = voices.find(v => 
      (v.name.includes('Google') && v.lang.includes('en-US')) || 
      (v.name.includes('Samantha') && v.lang.includes('en-US'))
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className={`
      absolute -top-7 ${isUser ? 'right-0' : 'left-0'}
      flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200
      bg-gray-900/90 backdrop-blur-md rounded-md p-0.5 border border-white/10 shadow-lg z-10
    `}>
      {/* Speak Button */}
      {content && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSpeak}
              className={`p-1 rounded-sm transition-colors ${
                isSpeaking 
                  ? 'text-blue-400 bg-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? <StopIcon /> : <SpeakIcon />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-2 py-1">
            <p>{isSpeaking ? 'Stop' : 'Read'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Copy Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCopy}
            className="p-1 rounded-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Copy message"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-2 py-1">
          <p>{copied ? 'Copied!' : 'Copy'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Edit Button (user messages only) */}
      {isUser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onStartEdit}
              disabled={isGenerating}
              className={`p-1 rounded-sm transition-colors ${
                isGenerating 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Edit message"
            >
              <EditIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-2 py-1">
            <p>{isGenerating ? 'Cannot edit' : 'Edit'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Rerun Button (agent messages only) */}
      {!isUser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRerun}
              disabled={isGenerating}
              className={`p-1 rounded-sm transition-colors ${
                isGenerating 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Regenerate response"
            >
              <RerunIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs px-2 py-1">
            <p>{isGenerating ? 'Cannot regenerate' : 'Regenerate'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Delete Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onDelete}
            disabled={isGenerating}
            className={`p-1 rounded-sm transition-colors ${
              showConfirmDelete 
                ? 'text-red-400 bg-red-500/20 hover:bg-red-500/30' 
                : isGenerating
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-400 hover:bg-white/10'
            }`}
            aria-label={showConfirmDelete ? 'Click again to confirm delete' : 'Delete message'}
          >
            <DeleteIcon />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-2 py-1">
          <p>{showConfirmDelete ? 'Confirm' : 'Delete'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

