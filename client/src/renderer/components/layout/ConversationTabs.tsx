import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Plus, MessageSquare, Users, Rss, FileText, Puzzle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PopupMenu } from '../ui/PopupMenu';

export const ConversationTabs: React.FC = () => {
    const { 
        tabs,
        activeTabId,
        setActiveTabId,
        closeTab,
        startDraftConversation
    } = useAppStore();

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null);

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

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, tabId });
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
                                group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer transition-all min-w-[160px] max-w-[220px] border-b border-transparent select-none
                                ${isActive
                                    ? 'bg-background text-foreground border-t border-x border-border !border-b-background'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                                }
                            `}
                            onClick={() => setActiveTabId(tab.id)}
                            onContextMenu={(e) => handleContextMenu(e, tab.id)}
                        >
                            {getIcon(tab.type, isActive)}
                            <span className="text-xs truncate flex-1">{tab.title}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                                className="shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all opacity-60 hover:opacity-100"
                                title="Close tab"
                            >
                                <X size={12} />
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
                title="Chat"
            >
                <Plus size={14} />
            </button>

            {contextMenu && (
                <PopupMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={() => setContextMenu(null)}
                    items={[
                        {
                            label: 'Close Tab',
                            icon: <X size={14} />,
                            onClick: () => closeTab(contextMenu.tabId),
                            danger: true
                        }
                    ]}
                />
            )}
        </div>
    );
};
