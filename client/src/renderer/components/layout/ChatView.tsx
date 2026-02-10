import React, { useEffect, useRef, useMemo } from 'react';
import { MessageBubble } from '../ui/MessageBubble';
import { InputDeck } from '../ui/InputDeck';
import { ProgressSpinner } from '../ui/ProgressSpinner';
import { useAppStore, Message } from '../../store/useAppStore';
import { useTaskStore, useTasksForConversation } from '../../store/useTaskStore';
import { TaskResultMessage } from '../conversation/TaskResultMessage';
import { ScheduledTask, TaskExecutionResult } from '../../../shared/alephnet-types';
import { motion, AnimatePresence } from 'framer-motion';
import { DecoratedMessage } from '../ui/DecoratedMessage';
import { ChatEmptyStateSlot } from '../ui/ExtensionSlotV2';

// ─── Types ───────────────────────────────────────────────────────────────

interface ChatViewProps {
    onTaskClick?: (task: ScheduledTask) => void;
}

type TimelineItem = 
    | { type: 'message'; data: Message }
    | { type: 'taskResult'; data: TaskExecutionResult; task?: ScheduledTask };

// ─── Chat View Component ─────────────────────────────────────────────────

export const ChatView: React.FC<ChatViewProps> = ({ onTaskClick }) => {
  const { 
    conversations,
    activeConversationId,
    updateMessage, 
    deleteMessage, 
    deleteMessagesAfter, 
    isGenerating,
    setIsGenerating,
    setGenerationProgress
  } = useAppStore();
  
  const { tasks } = useTaskStore();
  const conversationTasks = useTasksForConversation(activeConversationId || '');
  
  const messages = activeConversationId ? conversations[activeConversationId]?.messages || [] : [];
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Combine messages and task results into a unified timeline
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    
    // Add all messages
    messages.forEach(msg => {
      items.push({ type: 'message', data: msg });
    });
    
    // Add task execution results from all tasks in this conversation
    conversationTasks.forEach(task => {
      task.executionHistory.forEach(result => {
        items.push({ 
          type: 'taskResult', 
          data: result,
          task 
        });
      });
    });
    
    // Sort by timestamp
    items.sort((a, b) => {
      const timeA = a.type === 'message' 
        ? new Date(a.data.timestamp).getTime() 
        : a.data.executedAt;
      const timeB = b.type === 'message' 
        ? new Date(b.data.timestamp).getTime() 
        : b.data.executedAt;
      return timeA - timeB;
    });
    
    return items;
  }, [messages, conversationTasks]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, isGenerating, activeConversationId]);

  const handleEditMessage = (id: string, newContent: string) => {
    updateMessage(id, newContent);
    deleteMessagesAfter(id);
    
    const message = messages.find(m => m.id === id);
    if (message) {
      handleResend(message);
    }
  };

  const handleDeleteMessage = (id: string) => {
    deleteMessage(id);
  };

  const handleRerunMessage = (id: string) => {
    const agentMsgIndex = messages.findIndex(m => m.id === id);
    if (agentMsgIndex === -1) return;

    const userMsg = messages[agentMsgIndex - 1];
    if (userMsg && userMsg.sender === 'user') {
      deleteMessagesAfter(userMsg.id);
      handleResend(userMsg);
    }
  };

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
      console.error("Failed to resend message:", error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };
  
  const handleTaskResultClick = (taskId: string) => {
    const task = tasks[taskId];
    if (task && onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <div className="h-full min-h-0 w-full overflow-hidden flex flex-col relative z-10 bg-background">
      {/* Background Grid Pattern */}
       <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px)',
             backgroundSize: '30px 30px'
           }}
       />
      
      {/* Messages Area - takes remaining space and scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 relative z-10 scroll-smooth">
        <div className="min-h-full flex flex-col justify-end">
            <div className="max-w-4xl mx-auto w-full space-y-1">
                {timeline.length === 0 ? (
                    <ChatEmptyStateSlot
                        fallback={
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="text-center space-y-4"
                                >
                                    <div className="relative w-16 h-16 mx-auto mb-4 group cursor-default">
                                        <div className="absolute inset-0 bg-primary rounded-full opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500 animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
                                        <div className="relative w-full h-full rounded-full bg-card border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/20">
                                            <span className="text-2xl filter drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]">⚛️</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-light text-foreground tracking-tight">Resonance Field <span className="text-primary font-normal">Initialized</span></h3>
                                        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                            The neural uplink is active. Begin by typing a query, selecting a context, or importing data to the resonance chamber.
                                        </p>
                                    </div>
                                    
                                    <div className="pt-4 flex justify-center gap-2 opacity-50">
                                        {[1, 2, 3].map((i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 + (i * 0.1) }}
                                                className="w-1.5 h-1.5 rounded-full bg-primary/50"
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        }
                    />
            ) : (
                <AnimatePresence initial={false}>
                  {timeline.map((item) => {
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
            
            {/* Generation Progress Spinner */}
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

      {/* Input Area - at bottom (InputDeck handles its own extension slots internally) */}
      <div className="shrink-0 z-20">
        <InputDeck onMessageSent={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} />
      </div>
    </div>
  );
};
