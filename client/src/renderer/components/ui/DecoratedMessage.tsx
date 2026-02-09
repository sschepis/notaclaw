/**
 * DecoratedMessage - Renders a message with plugin decorators applied
 *
 * This component applies registered message decorators (before, after, wrapper,
 * and actions) to enhance message rendering.
 *
 * Performance: Uses memoization to prevent unnecessary re-renders
 * Error handling: Each decorator component is wrapped in SlotErrorBoundary
 */

import React, { useMemo, useCallback, memo } from 'react';
import { useMessageDecorators } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from './SlotErrorBoundary';
import type { ChatMessage, MessageDecoratorDefinition, MessageAction } from '../../../shared/slot-types';
import type { Message } from '../../store/useAppStore';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface DecoratedMessageProps {
  /** The message to decorate */
  message: Message;
  /** The core message component to render */
  children: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper to convert Message to ChatMessage
// ═══════════════════════════════════════════════════════════════════════════

function toChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    type: message.type as ChatMessage['type'], // Type assertion for compatibility
    sender: message.sender,
    timestamp: message.timestamp,
    attachments: message.attachments?.map(a => ({
      id: a.name, // Use name as ID if not available
      type: a.type === 'image' ? 'image' : a.type === 'document' ? 'document' : 'file',
      name: a.name,
      size: 0, // Not available in Message type
      mimeType: '', // Not available in Message type
      dataUrl: a.dataUrl,
      content: a.content,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Message Actions Component
// ═══════════════════════════════════════════════════════════════════════════

interface MessageActionsProps {
  decorators: MessageDecoratorDefinition[];
  chatMessage: ChatMessage;
}

const MessageActions: React.FC<MessageActionsProps> = memo(({ decorators, chatMessage }) => {
  // Collect all actions from all matching decorators
  const allActions = useMemo(() => {
    const actions: MessageAction[] = [];
    for (const decorator of decorators) {
      for (const action of decorator.actions) {
        if (!action.visible) {
          actions.push(action);
        } else {
          try {
            if (action.visible(chatMessage)) {
              actions.push(action);
            }
          } catch (error) {
            console.warn(`[DecoratedMessage] Action visibility check failed for "${action.id}":`, error);
            // Include action on error to avoid hiding functionality
            actions.push(action);
          }
        }
      }
    }
    return actions;
  }, [decorators, chatMessage]);

  // Handle action click with error boundary
  const handleActionClick = useCallback((action: MessageAction) => {
    try {
      action.onClick(chatMessage);
    } catch (error) {
      console.error(`[DecoratedMessage] Action "${action.id}" failed:`, error);
    }
  }, [chatMessage]);

  if (allActions.length === 0) return null;

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {allActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title={action.label}
            aria-label={action.label}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
});

MessageActions.displayName = 'MessageActions';

// ═══════════════════════════════════════════════════════════════════════════
// Decorated Message Component
// ═══════════════════════════════════════════════════════════════════════════

export const DecoratedMessage: React.FC<DecoratedMessageProps> = memo(({ message, children }) => {
  // Convert to ChatMessage type for decorator matching
  // Only recompute when message.id changes (stable reference for same message)
  const chatMessage = useMemo(() => toChatMessage(message), [message.id, message.content, message.type]);
  
  // Get matching decorators
  const decorators = useMessageDecorators(chatMessage);

  // If no decorators match, just render children (fast path)
  if (decorators.length === 0) {
    return <>{children}</>;
  }

  // Collect before and after components
  const beforeComponents = decorators
    .filter(d => d.before)
    .map(d => ({ id: d.id, component: d.before! }));
  
  const afterComponents = decorators
    .filter(d => d.after)
    .map(d => ({ id: d.id, component: d.after! }));

  // Find wrapper (use first matching wrapper, highest priority wins)
  const wrapperDecorator = decorators.find(d => d.wrapper);

  // Build the content
  let content = (
    <div className="decorated-message group">
      {/* Before decorations */}
      {beforeComponents.length > 0 && (
        <div className="message-decorations-before mb-1">
          {beforeComponents.map(({ id, component: BeforeComponent }) => (
            <SlotErrorBoundary key={`before-${id}`} slotId="chat:message-before" extensionId={id}>
              <BeforeComponent message={chatMessage} />
            </SlotErrorBoundary>
          ))}
        </div>
      )}

      {/* Main message content */}
      <div className="message-content relative">
        {children}
        
        {/* Plugin-added actions */}
        <div className="absolute top-0 right-0 mt-1 mr-1">
          <MessageActions decorators={decorators} chatMessage={chatMessage} />
        </div>
      </div>

      {/* After decorations */}
      {afterComponents.length > 0 && (
        <div className="message-decorations-after mt-1">
          {afterComponents.map(({ id, component: AfterComponent }) => (
            <SlotErrorBoundary key={`after-${id}`} slotId="chat:message-after" extensionId={id}>
              <AfterComponent message={chatMessage} />
            </SlotErrorBoundary>
          ))}
        </div>
      )}
    </div>
  );

  // Apply wrapper if present
  if (wrapperDecorator && wrapperDecorator.wrapper) {
    const WrapperComponent = wrapperDecorator.wrapper;
    content = (
      <SlotErrorBoundary slotId="chat:message-wrapper" extensionId={wrapperDecorator.id}>
        <WrapperComponent message={chatMessage}>
          {content}
        </WrapperComponent>
      </SlotErrorBoundary>
    );
  }

  return content;
});

DecoratedMessage.displayName = 'DecoratedMessage';

export default DecoratedMessage;
