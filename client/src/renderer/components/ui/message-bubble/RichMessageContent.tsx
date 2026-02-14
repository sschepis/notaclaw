/**
 * RichMessageContent - Enhanced message content renderer with streaming support.
 *
 * Replaces the simple MarkdownContent display path with:
 *  - Streaming cursor animation for messages being streamed
 *  - Rich content awareness (renders tool_call, status, image etc. fences inline)
 *  - Metadata-driven step badges for agent task messages
 *
 * The actual fence rendering is still handled by MarkdownContent → ReactMarkdown
 * → useFenceStore, so this component is primarily a wrapper that adds streaming
 * overlay and step metadata display.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MarkdownContent } from '../MarkdownContent';
import { useAppStore } from '../../../store/useAppStore';

interface RichMessageContentProps {
  /** Message ID — used to detect if this message is currently being streamed */
  messageId: string;
  /** The finalized content (from the store) */
  content: string;
  /** Whether this is a user message */
  isUser: boolean;
  /** Optional metadata from the message */
  metadata?: Record<string, any>;
}

export const RichMessageContent: React.FC<RichMessageContentProps> = ({
  messageId,
  content,
  isUser,
  metadata,
}) => {
  const { streamingMessageId, streamingContent } = useAppStore();

  const isStreaming = streamingMessageId === messageId;

  // Use streaming content if this message is actively being streamed,
  // otherwise use the finalized content from the store
  const displayContent = isStreaming ? streamingContent : content;

  // Step badge for agent task messages
  const stepNumber = metadata?.stepNumber;
  const isCompletion = metadata?.isCompletion;
  const isPlan = metadata?.isPlan;
  const isUpdate = metadata?.isUpdate;

  // Determine step label
  const stepLabel = useMemo(() => {
    if (isCompletion) return '✓ Complete';
    if (isPlan) return '📋 Plan';
    if (isUpdate) return '📝 Update';
    if (stepNumber !== undefined) return `Step ${stepNumber}`;
    return null;
  }, [stepNumber, isCompletion, isPlan, isUpdate]);

  return (
    <div className="relative">
      {/* Step badge for agent messages */}
      {stepLabel && !isUser && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider bg-muted/30 px-1.5 py-0.5 rounded">
            {stepLabel}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className={`text-sm leading-6 font-sans tracking-normal ${isUser ? 'text-gray-200' : 'text-gray-100'}`}>
        {displayContent ? (
          <MarkdownContent content={displayContent} />
        ) : isStreaming ? (
          // Empty streaming state — show placeholder
          <span className="text-muted-foreground/50 italic text-xs">Generating...</span>
        ) : null}

        {/* Streaming cursor */}
        {isStreaming && (
          <motion.span
            className="inline-block w-2 h-4 bg-primary/80 rounded-sm ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
};

export default RichMessageContent;
