import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Plus, MessageSquare, Users, Rss, FileText, Puzzle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConversationTabs: React.FC = () => {
    const { 
        tabs,
        activeTabId,
        setActiveTabId,
        closeTab,
        startDraftConversation
    } = useAppStore();

    // Icon mapping
    const getIcon = (type: string, isActive: boolean) => {
        const className = isActive ? 'text-primary' : 'opacity-50';
        switch (type) {
            case 'chat': return <MessageSquare size={12} className={className} />;
            case 'group': return <Users size={12} className={className} />;
            case 'feed': return <Rss size={12} className={className} />;
            case 'extension': return <Puzzle size={12} className={className} />;
            default: return <FileText size={12} className={className} />;
        }
    };

    return (
        <div className="flex items-center h-9 bg-card border-b border-border px-2 gap-1 overflow-x-auto custom-scrollbar shrink-0">
            <AnimatePresence initial={false}>
                {tabs.map(tab => {
                    const isActive = activeTabId === tab.id;

                    return (
                        <motion.div
                            key={tab.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, width: 0 }}
                            className={`
                                group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer transition-all min-w-[120px] max-w-[200px] border-b border-transparent select-none
                                ${isActive 
                                    ? 'bg-background text-foreground border-t border-x border-border !border-b-background'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                                }
                            `}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            {getIcon(tab.type, isActive)}
                            <span className="text-xs truncate flex-1">{tab.title}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                                className={`
                                    opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all
                                    ${isActive ? 'opacity-100' : ''}
                                `}
                            >
                                <X size={10} />
                            </button>
                            
                            {isActive && (
                                <div className="absolute bottom-[-1px] left-0 right-0 h-px bg-background z-10" />
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            <button
                onClick={() => startDraftConversation()}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
                title="New Chat"
            >
                <Plus size={14} />
            </button>
        </div>
    );
};
