import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Search, ChevronDown } from 'lucide-react';
import { MessageBubble } from '../ui/MessageBubble';
import { ProgressSpinner } from '../ui/ProgressSpinner';
import { SuggestionChips } from '../ui/SuggestionChips';
import { InputDeck } from '../ui/InputDeck';
import { useAppStore, Message, Conversation } from '../../store/useAppStore';
import { useTaskStore, useTasksForConversation } from '../../store/useTaskStore';
import { TaskResultMessage } from '../conversation/TaskResultMessage';
import { ScheduledTask, TaskExecutionResult } from '../../../shared/alephnet-types';
import { DecoratedMessage } from '../ui/DecoratedMessage';
import { ChatEmptyStateSlot } from '../ui/ExtensionSlotV2';

// ─── Types ───────────────────────────────────────────────────────────────

type TimelineItem =
  | { type: 'message'; data: Message }
  | { type: 'taskResult'; data: TaskExecutionResult; task?: ScheduledTask };

// ─── Conversation List Header ────────────────────────────────────────────

const ConversationListHeader: React.FC<{
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ conversations, activeConversationId, onSelect, onCreate, isExpanded, onToggle }) => {
  const [search, setSearch] = useState('');
  const searchLower = search.toLowerCase();

  const sortedConversations = useMemo(() => {
    return Object.values(conversations)
      .filter(c => !searchLower || (c.title ?? '').toLowerCase().includes(searchLower))
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }, [conversations, searchLower]);

  const activeConv = activeConversationId ? conversations[activeConversationId] : null;

  return (
    <div className="shrink-0 border-b border-border bg-card/60">
      {/* Active conversation header / toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
          <Bot size={12} className="text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {activeConv?.title?.trim() || 'New Chat'}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-muted-foreground" />
        </motion.div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreate();
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="New Chat"
        >
          <Plus size={14} />
        </button>
      </button>

      {/* Expandable conversation list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-muted/20 border border-border rounded-md pl-7 pr-2 py-1 text-[11px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/30 transition-all"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar px-1 pb-2">
              {sortedConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onSelect(conv.id);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-[11px] ${
                    activeConversationId === conv.id
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  <Bot size={12} className={activeConversationId === conv.id ? 'text-primary' : 'opacity-50'} />
                  <span className="truncate flex-1">{conv.title?.trim() || 'Chat'}</span>
                </button>
              ))}
              {sortedConversations.length === 0 && (
                <div className="px-2 py-3 text-center">
                  <p className="text-[11px] text-muted-foreground italic">No conversations</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Chat Sidebar Component ──────────────────────────────────────────────

export const ChatSidebar: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    startDraftConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    deleteMessagesAfter,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
    activeTaskByConversation,
    scrollSignal,
    triggerScrollToBottom,
    pendingSuggestions,
    setPendingSuggestions,
  } = useAppStore();

  const conversationTasks = useTasksForConversation(activeConversationId || '');
  const { tasks } = useTaskStore();

  const messages = activeConversationId
    ? conversations[activeConversationId]?.messages || []
    : [];
  const activeTask = activeConversationId
    ? activeTaskByConversation[activeConversationId]
    : null;

  const bottomRef = useRef<HTMLDivElement>(null);
  const [listExpanded, setListExpanded] = useState(false);

  // Ensure there's always an active conversation
  useEffect(() => {
    if (!activeConversationId) {
      startDraftConversation();
    }
  }, [activeConversationId, startDraftConversation]);

  // Build timeline
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    messages.forEach(msg => {
      items.push({ type: 'message', data: msg });
    });

    conversationTasks.forEach(task => {
      task.executionHistory.forEach(result => {
        items.push({ type: 'taskResult', data: result, task });
      });
    });

    items.sort((a, b) => {
      const timeA =
        a.type === 'message'
          ? new Date(a.data.timestamp).getTime()
          : a.data.executedAt;
      const timeB =
        b.type === 'message'
          ? new Date(b.data.timestamp).getTime()
          : b.data.executedAt;
      return timeA - timeB;
    });

    return items;
  }, [messages, conversationTasks]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, isGenerating, activeConversationId, scrollSignal]);

  // Message handlers
  const handleEditMessage = useCallback(
    (id: string, newContent: string) => {
      updateMessage(id, newContent);
      deleteMessagesAfter(id);
      const message = messages.find(m => m.id === id);
      if (message) handleResend(message);
    },
    [messages, updateMessage, deleteMessagesAfter]
  );

  const handleDeleteMessage = useCallback(
    (id: string) => deleteMessage(id),
    [deleteMessage]
  );

  const handleRerunMessage = useCallback(
    (id: string) => {
      const agentMsgIndex = messages.findIndex(m => m.id === id);
      if (agentMsgIndex === -1) return;
      const userMsg = messages[agentMsgIndex - 1];
      if (userMsg && userMsg.sender === 'user') {
        deleteMessagesAfter(userMsg.id);
        handleResend(userMsg);
      }
    },
    [messages, deleteMessagesAfter]
  );

  const handleResend = async (message: Message) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress({ status: 'Initializing rerun...', step: 0 });

    try {
      setGenerationProgress({ status: 'Connecting to AI provider...', step: 1 });
      const messagePayload: import('../../../shared/types').MessagePayload = {
        content: message.content,
        mode: 'Chat',
        resonance: 50,
        attachments: message.attachments?.map(a => ({
          name: a.name,
          type: a.type,
          content: a.content,
          dataUrl: a.dataUrl,
        })),
      };
      setGenerationProgress({ status: 'Processing message...', step: 2 });
      await window.electronAPI.sendMessage(messagePayload);
    } catch (error) {
      console.error('Failed to resend message:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleTaskResultClick = useCallback(
    (taskId: string) => {
      const task = tasks[taskId];
      if (task) {
        console.log('Task clicked:', task.title || taskId);
      }
    },
    [tasks]
  );

  const handleSuggestionSelect = useCallback(async (suggestion: string) => {
    if (isGenerating) return;

    // Clear pending suggestions immediately on selection
    setPendingSuggestions(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: suggestion,
      type: 'cognitive',
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    addMessage(userMessage);

    setIsGenerating(true);
    setGenerationProgress({ status: 'Processing suggestion...', step: 1 });
    try {
      await window.electronAPI.sendMessage({
        content: suggestion,
        mode: 'Chat',
        resonance: 50,
      });
    } catch (error) {
      console.error('Failed to send suggestion:', error);
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  }, [isGenerating, addMessage, setIsGenerating, setGenerationProgress, setPendingSuggestions]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      setListExpanded(false);
    },
    [setActiveConversationId]
  );

  const handleCreateConversation = useCallback(() => {
    startDraftConversation();
    setListExpanded(false);
  }, [startDraftConversation]);

  return (
    <div className="w-full h-full flex flex-col bg-card/80 backdrop-blur-xl overflow-hidden relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      {/* Conversation list header */}
      <div className="relative z-20">
        <ConversationListHeader
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={handleSelectConversation}
          onCreate={handleCreateConversation}
          isExpanded={listExpanded}
          onToggle={() => setListExpanded(!listExpanded)}
        />
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative z-10">
        {/* Background dot pattern */}
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="min-h-full flex flex-col justify-end p-2 relative z-10">
          <div className="w-full space-y-3">
            {timeline.length === 0 ? (
              <ChatEmptyStateSlot
                fallback={
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="text-center space-y-3"
                    >
                      <div className="relative w-12 h-12 mx-auto mb-3">
                        <div className="absolute inset-0 bg-primary rounded-full opacity-20 blur-xl animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        <div className="relative w-full h-full rounded-full bg-card border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
                          <span className="text-lg">⚛️</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-light text-foreground tracking-tight">
                          Start a <span className="text-primary font-normal">conversation</span>
                        </h3>
                        <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                          Type a message below to begin chatting with the AI assistant.
                        </p>
                      </div>
                    </motion.div>
                  </div>
                }
              />
            ) : (
              <AnimatePresence initial={false}>
                {timeline.map(item => {
                  if (item.type === 'message') {
                    const msg = item.data;
                    return (
                      <DecoratedMessage key={`msg-${msg.id}`} message={msg}>
                        <MessageBubble
                          id={msg.id}
                          content={msg.content}
                          type={msg.type}
                          sender={msg.sender}
                          timestamp={msg.timestamp}
                          attachments={msg.attachments}
                          metadata={msg.metadata}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onRerun={handleRerunMessage}
                        />
                      </DecoratedMessage>
                    );
                  } else {
                    const result = item.data;
                    return (
                      <TaskResultMessage
                        key={`task-${result.id}`}
                        result={result}
                        task={item.task}
                        timestamp={new Date(result.executedAt).toISOString()}
                        onTaskClick={handleTaskResultClick}
                      />
                    );
                  }
                })}
              </AnimatePresence>
            )}

            {/* Suggestion Chips */}
            {!isGenerating && pendingSuggestions && pendingSuggestions.length > 0 && (
              <SuggestionChips
                suggestions={pendingSuggestions}
                onSelect={handleSuggestionSelect}
                disabled={isGenerating}
              />
            )}

            {/* Generation Progress */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex justify-center py-2"
                >
                  <ProgressSpinner />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} className="h-2" />
          </div>
        </div>
      </div>

      {/* Agent status bar */}
      <AnimatePresence>
        {activeTask &&
          !['completed', 'cancelled', 'error'].includes(activeTask.status) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="shrink-0 px-3 py-1.5 bg-background/80 backdrop-blur border-t border-border flex items-center gap-2 text-[10px] font-mono z-20"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary font-bold uppercase tracking-wider">
                {activeTask.status === 'thinking'
                  ? 'Thinking'
                  : activeTask.status === 'tool_executing'
                  ? `Executing: ${activeTask.currentTool || 'Tool'}`
                  : activeTask.status === 'waiting_user'
                  ? 'Waiting for Input'
                  : 'Processing'}
              </span>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Input area */}
      <div className="shrink-0 relative z-20 border-t border-border">
        <div className="p-0">
          <InputDeck onMessageSent={() => triggerScrollToBottom()} />
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
