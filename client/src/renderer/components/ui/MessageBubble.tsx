import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { motion } from 'framer-motion';
import { TooltipProvider } from '../ui/tooltip';
import { useAppStore, Attachment } from '../../store/useAppStore';
import { MessageType, typeStyles } from './message-bubble/types';
import { MessageActions } from './message-bubble/MessageActions';
import { MessageAttachments } from './message-bubble/MessageAttachments';
import { MessageContent } from './message-bubble/MessageContent';

export type { MessageType };

interface MessageBubbleProps {
  id: string;
  content: string;
  type: MessageType;
  sender: 'user' | 'agent';
  timestamp: string;
  attachments?: Attachment[];
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
  onRerun?: (id: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  id,
  content, 
  type, 
  sender, 
  timestamp,
  attachments,
  onEdit,
  onDelete,
  onRerun
}) => {
  const isUser = sender === 'user';
  const styles = typeStyles[type] || typeStyles.perceptual;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const { isGenerating } = useAppStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartEdit = () => {
    if (isGenerating) return;
    setEditContent(content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleSubmitEdit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit?.(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = () => {
    if (showConfirmDelete) {
      onDelete?.(id);
      setShowConfirmDelete(false);
    } else {
      setShowConfirmDelete(true);
      setTimeout(() => setShowConfirmDelete(false), 3000);
    }
  };

  const handleRerun = () => {
    if (!isGenerating) {
      onRerun?.(id);
    }
  };

  return (
    <TooltipProvider>
      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        <div className={`flex max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
          
          {/* Avatar */}
          <div className="mt-0.5 flex-shrink-0">
              <Avatar className={`h-7 w-7 ${isUser ? 'ring-border' : 'ring-primary/50'} ring-1 shadow-md`}>
                  <AvatarFallback className="bg-muted text-[9px] font-bold">{isUser ? "ME" : "AI"}</AvatarFallback>
              </Avatar>
          </div>

          {/* Bubble Container */}
          <div className="relative group/bubble">
            
            <MessageActions 
              isUser={isUser}
              isGenerating={isGenerating}
              copied={copied}
              showConfirmDelete={showConfirmDelete}
              onCopy={handleCopy}
              onStartEdit={handleStartEdit}
              onRerun={handleRerun}
              onDelete={handleDelete}
            />

            {/* Main Bubble */}
            <div className={`
                relative p-3 rounded-lg shadow-sm backdrop-blur-md
                ${isUser 
                    ? 'bg-secondary border border-border text-secondary-foreground rounded-tr-sm' 
                    : `${styles.bg} border ${styles.border} ${styles.text} ${styles.glow} rounded-tl-sm`}
            `}>
                
                <MessageAttachments attachments={attachments || []} />

                <MessageContent 
                  content={content}
                  isUser={isUser}
                  isEditing={isEditing}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onCancelEdit={handleCancelEdit}
                  onSubmitEdit={handleSubmitEdit}
                  onEditKeyDown={handleEditKeyDown}
                />
                
                {/* Metadata Footer */}
                {!isEditing && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border opacity-50 text-[9px] uppercase tracking-wider font-bold">
                      <span className={isUser ? 'text-muted-foreground' : styles.icon}>{type}</span>
                      <span className="text-muted-foreground font-mono">{timestamp}</span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};
