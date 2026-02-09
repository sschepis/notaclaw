import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { CopyIcon, EditIcon, DeleteIcon, RerunIcon, CheckIcon } from './icons';

interface MessageActionsProps {
  isUser: boolean;
  isGenerating: boolean;
  copied: boolean;
  showConfirmDelete: boolean;
  onCopy: () => void;
  onStartEdit: () => void;
  onRerun: () => void;
  onDelete: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  isUser,
  isGenerating,
  copied,
  showConfirmDelete,
  onCopy,
  onStartEdit,
  onRerun,
  onDelete,
}) => {
  return (
    <div className={`
      absolute -top-7 ${isUser ? 'right-0' : 'left-0'}
      flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200
      bg-gray-900/90 backdrop-blur-md rounded-md p-0.5 border border-white/10 shadow-lg z-10
    `}>
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
