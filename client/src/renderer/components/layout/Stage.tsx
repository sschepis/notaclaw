import React, { useState, useCallback } from 'react';
import { ChatView } from './ChatView';
import { ExtensionDetailView } from './ExtensionDetailView';
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationTabs } from './ConversationTabs';
import { ConversationSidebar, TaskDetailDialog } from '../conversation';
import { ScheduledTask } from '../../../shared/alephnet-types';
import { useAppStore } from '../../store/useAppStore';

interface StageProps {
  mode: 'chat' | 'canvas';
}

export const Stage: React.FC<StageProps> = ({ mode }) => {
  const { tabs, activeTabId } = useAppStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Task detail dialog state
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  // Handlers
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  
  const handleTaskClick = useCallback((task: ScheduledTask) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  }, []);
  
  const handleCloseTaskDialog = useCallback(() => {
    setIsTaskDialogOpen(false);
    // Delay clearing selectedTask to allow exit animation
    setTimeout(() => setSelectedTask(null), 200);
  }, []);

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-background flex flex-col relative overflow-hidden">
      
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.04]" 
            style={{ 
                backgroundImage: `
                    linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px' 
            }}
          />
          
          {/* Glow Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {mode === 'chat' ? (
            <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-h-0 flex flex-col relative"
            >
                <ConversationTabs />
                
                {/* Main content area with sidebar */}
                <div className="flex-1 min-h-0 flex relative">
                    {/* Content area */}
                    <div className="flex-1 min-w-0 min-h-0 relative">
                        {activeTab?.type === 'extension' ? (
                            <ExtensionDetailView />
                        ) : (
                            <ChatView onTaskClick={handleTaskClick} />
                        )}
                    </div>
                    
                    {/* Collapsible Sidebar - Only show for chat views */}
                    {activeTab?.type !== 'extension' && (
                        <ConversationSidebar
                            isOpen={isSidebarOpen}
                            onToggle={handleToggleSidebar}
                            onTaskClick={handleTaskClick}
                        />
                    )}
                </div>
            </motion.div>
        ) : (
            <motion.div 
                key="canvas"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 h-full flex items-center justify-center relative z-10"
            >
                <div className="text-center p-8 rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-foreground mb-2">Infinite Canvas</h3>
                    <p className="text-muted-foreground mb-6">Visual thinking mode is under construction.</p>
                    <button className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors">
                        Check Roadmap
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      
      {/* Task Detail Dialog */}
      <TaskDetailDialog
          task={selectedTask}
          isOpen={isTaskDialogOpen}
          onClose={handleCloseTaskDialog}
      />
    </div>
  );
};
