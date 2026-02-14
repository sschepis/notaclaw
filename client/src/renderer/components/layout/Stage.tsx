import React, { useState, useCallback } from 'react';
import { ExtensionDetailView } from './ExtensionDetailView';
import { TextEditorPanel } from './TextEditorPanel';
import { WelcomePage } from './WelcomePage';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskDetailDialog } from '../conversation';
import { ScheduledTask } from '../../../shared/alephnet-types';
import { useAppStore } from '../../store/useAppStore';

interface StageProps {
  mode: 'chat' | 'canvas';
}

export const Stage: React.FC<StageProps> = ({ mode }) => {
  const { tabs, activeTabId, setActiveSidebarView } = useAppStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Sync sidebar with active tab
  React.useEffect(() => {
    if (!activeTab) return;
    
    switch (activeTab.type) {
        case 'chat':
            setActiveSidebarView('messages');
            break;
        case 'group':
        case 'feed':
            setActiveSidebarView('groups');
            break;
        case 'extension':
            setActiveSidebarView('extensions');
            break;
        case 'file':
            setActiveSidebarView('explorer');
            break;
    }
  }, [activeTabId, activeTab, setActiveSidebarView]);

  // Task detail dialog state
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  // Exposed for future use when workspace panels trigger task views
  const _handleTaskClick = useCallback((task: ScheduledTask) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  }, []);
  void _handleTaskClick; // suppress unused warning
  
  const handleCloseTaskDialog = useCallback(() => {
    setIsTaskDialogOpen(false);
    setTimeout(() => setSelectedTask(null), 200);
  }, []);

  // Determine what to render in the workspace area
  const renderContent = () => {
    // If there's an active tab that's an extension or file, show that
    if (activeTab?.type === 'extension') {
      return <ExtensionDetailView />;
    }
    if (activeTab?.type === 'file') {
      return (
        <TextEditorPanel 
          content={activeTab.data?.content || ''} 
          filePath={activeTab.data?.path || ''} 
        />
      );
    }
    // Default: show the Welcome Page
    return <WelcomePage />;
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-background flex flex-col relative overflow-hidden">
      
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
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
                {/* Main content area - Welcome page or contextual content */}
                <div className="flex-1 min-h-0 flex relative">
                    <div className="flex-1 min-w-0 min-h-0 relative">
                        {renderContent()}
                    </div>
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
