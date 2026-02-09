import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Attachment } from '../../../store/useAppStore';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments, onRemove }) => {
  return (
    <AnimatePresence>
      {attachments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap gap-1.5 pb-2">
            {attachments.map(attachment => (
              <motion.div
                key={attachment.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                {attachment.type === 'image' && attachment.dataUrl ? (
                  <div className="relative">
                    <img 
                      src={attachment.dataUrl} 
                      alt={attachment.name}
                      className="h-12 w-12 object-cover rounded border border-border shadow-sm transition-transform group-hover:scale-105"
                    />
                    <button
                      onClick={() => onRemove(attachment.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 shadow-md"
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-1.5 px-2 py-1.5 bg-muted/80 rounded border border-border hover:bg-muted transition-colors">
                    {attachment.type === 'document' ? (
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="text-[10px] text-foreground max-w-[80px] truncate font-medium">{attachment.name}</span>
                    <button
                      onClick={() => onRemove(attachment.id)}
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove attachment"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
