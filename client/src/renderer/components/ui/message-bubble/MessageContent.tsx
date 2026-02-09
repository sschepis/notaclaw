import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { MarkdownContent } from '../MarkdownContent';
import { CheckIcon, CancelIcon } from './icons';

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isEditing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isUser,
  isEditing,
  editContent,
  setEditContent,
  onCancelEdit,
  onSubmitEdit,
  onEditKeyDown,
}) => {
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing, editContent.length]);

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <motion.div
          key="editing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-2"
        >
          <Textarea
            ref={editTextareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={onEditKeyDown}
            className="bg-black/20 border-white/10 text-gray-100 text-xs min-h-[80px] resize-none focus:ring-1 focus:ring-purple-500/50 p-2"
            placeholder="Edit your message..."
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-500 font-medium">
              Ctrl+Enter to save
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelEdit}
                className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
              >
                <CancelIcon />
                <span className="ml-1">Cancel</span>
              </Button>
              <Button
                size="sm"
                onClick={onSubmitEdit}
                className="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
              >
                <CheckIcon />
                <span className="ml-1">Save</span>
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`text-sm leading-6 font-sans tracking-normal ${isUser ? 'text-gray-200' : 'text-gray-100'}`}
        >
          <MarkdownContent content={content} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
