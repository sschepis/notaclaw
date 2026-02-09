import React, { useEffect, useState, useRef } from 'react';
import { useAlephStore } from '../../store/useAlephStore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft } from 'lucide-react';

export const DirectMessageView: React.FC = () => {
  const {
    messaging: { conversations, activeConversationPeerId, activeMessages, unreadDMCount },
    loadInbox, setActiveConversation, sendDirectMessage, loading,
  } = useAlephStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadInbox(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMessages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConversationPeerId) return;
    await sendDirectMessage(activeConversationPeerId, input.trim());
    setInput('');
  };

  // Conversation list view
  if (!activeConversationPeerId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Messages</h2>
          {unreadDMCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">{unreadDMCount} unread</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-8">
              <p>No conversations yet.</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Send a message to a friend to start chatting.</p>
            </div>
          ) : (
            conversations.map((conv, i) => (
              <motion.div
                key={conv.peerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setActiveConversation(conv.peerId)}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer border-b border-border transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-bold">
                    {conv.peerDisplayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-foreground truncate">{conv.peerDisplayName}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                    {conv.unreadCount}
                  </span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Active conversation view
  const peerName = conversations.find(c => c.peerId === activeConversationPeerId)?.peerDisplayName ?? activeConversationPeerId;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/20">
        <button onClick={() => setActiveConversation(null)} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs font-bold">
            {peerName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="text-sm font-medium text-foreground">{peerName}</span>
          <p className="text-[10px] text-muted-foreground">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence initial={false}>
          {activeMessages.map((msg) => {
            const isMe = msg.fromUserId !== activeConversationPeerId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted/50 text-foreground rounded-bl-sm'
                }`}>
                  <p>{msg.content}</p>
                  <span className={`text-[9px] mt-1 block ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-muted/20 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading.sendDM}
            className="bg-primary hover:bg-primary/90 rounded-xl px-3 text-primary-foreground"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
