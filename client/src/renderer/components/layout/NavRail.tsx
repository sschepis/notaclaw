import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { motion, Reorder } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { usePluginNavigations } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from '../ui/SlotErrorBoundary';
import type { NavigationDefinition } from '../../../shared/slot-types';

interface NavRailProps {
  currentMode: 'chat' | 'canvas';
  setMode: (mode: 'chat' | 'canvas') => void;
  onOpenSettings: () => void;
}

const RailButton: React.FC<{
    isActive?: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}> = ({ isActive, onClick, icon, label }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                className={`
                    relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
                    ${isActive 
                        ? `bg-primary text-primary-foreground shadow shadow-primary/40 ring-1 ring-primary/50` 
                        : 'bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border'}
                `}
            >
                {icon}
                {isActive && (
                    <motion.div 
                        layoutId="activeRail"
                        className={`absolute -left-2 w-0.5 h-4 rounded-full bg-primary shadow-[0_0_5px_currentColor]`} 
                    />
                )}
            </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs px-2 py-1">
            <p className="font-medium">{label}</p>
        </TooltipContent>
    </Tooltip>
);

const NAV_ITEMS: Record<string, { label: string; icon: React.ReactNode; color?: string }> = {
  explorer: {
    label: "Explorer",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
  },
  extensions: {
    label: "Extensions",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
  },
  messages: {
    label: "Messages",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
  groups: {
    label: "Groups",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  },
  memory: {
    label: "Memory Fields",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
  },
  coherence: {
    label: "Coherence Network",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
  },
  agents: {
    label: "SRIA Agents",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
  marketplace: {
    label: "Marketplace",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  },
  connections: {
    label: "Connections",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
  }
};

// Plugin Navigation Button Component
const PluginNavButton: React.FC<{
  nav: NavigationDefinition;
  isActive: boolean;
  onClick: () => void;
}> = ({ nav, isActive, onClick }) => {
  // Render icon - can be a component or string
  const renderIcon = () => {
    if (typeof nav.icon === 'string') {
      // String icon name - would need an icon registry, for now show placeholder
      return <span className="text-xs">{nav.icon.charAt(0).toUpperCase()}</span>;
    }
    const IconComponent = nav.icon;
    return <IconComponent size={16} className="w-4 h-4" />;
  };

  // Get badge count if function provided
  const badgeCount = nav.badge?.() ?? null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className={`
            relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
            ${isActive
              ? 'bg-primary text-primary-foreground shadow shadow-primary/40 ring-1 ring-primary/50'
              : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent hover:border-border'}
          `}
        >
          <SlotErrorBoundary slotId="nav:rail-item" extensionId={nav.id}>
            {renderIcon()}
          </SlotErrorBoundary>
          {isActive && (
            <motion.div
              layoutId={`activeRail-${nav.id}`}
              className="absolute -left-2 w-0.5 h-4 rounded-full bg-primary shadow-[0_0_5px_currentColor]"
            />
          )}
          {badgeCount !== null && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs px-2 py-1">
        <p className="font-medium">{nav.label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const NavRail: React.FC<NavRailProps> = ({ currentMode, setMode, onOpenSettings }) => {
  const { activeSidebarView, setActiveSidebarView, navOrder, setNavOrder, setLayoutAction, activeConversationId, startDraftConversation } = useAppStore();
  
  // Get plugin-registered navigation items
  const pluginNavigations = usePluginNavigations();

  return (
    <TooltipProvider>
    <div className="w-[52px] h-full bg-card/80 backdrop-blur-xl border-r border-border flex flex-col items-center py-4 space-y-4 z-50 shadow-2xl relative">
      {/* Account */}
      <div className="mb-1">
        <Tooltip>
            <TooltipTrigger asChild>
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="p-0.5 rounded-full ring-1 ring-border hover:ring-blue-500 transition-all cursor-pointer shadow-lg relative group"
                >
                    <Avatar className="h-8 w-8 transition-opacity group-hover:opacity-90">
                        <AvatarFallback className="bg-muted text-foreground text-xs font-bold">U</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs px-2 py-1">
                <p className="font-bold">Identity Active</p>
            </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 flex flex-col items-center w-full overflow-y-auto custom-scrollbar">
        <Reorder.Group 
            axis="y" 
            values={navOrder} 
            onReorder={setNavOrder} 
            className="flex flex-col space-y-2 w-full items-center py-2"
        >
            {navOrder.map(id => {
                const item = NAV_ITEMS[id];
                if (!item) return null;

                const isActive = id === 'chat-mode' ? currentMode === 'chat' : activeSidebarView === id;
                
                let onClick = () => setActiveSidebarView(id as any);
                if (id === 'messages') {
                    onClick = () => {
                        setActiveSidebarView('messages');
                        setMode('chat');
                        // Always open chat stage when clicking messages
                        setLayoutAction({ type: 'open', component: 'stage', name: 'CHAT', icon: 'stage' });
                        if (!activeConversationId) {
                            startDraftConversation();
                        }
                    };
                } else if (id === 'groups') {
                    onClick = () => {
                        setActiveSidebarView('groups');
                        setLayoutAction({ type: 'open', component: 'groups', name: 'GROUPS', icon: 'groups' });
                    };
                } else if (id === 'memory') {
                    onClick = () => {
                        setActiveSidebarView('memory');
                        setLayoutAction({ type: 'open', component: 'memory-viewer', name: 'MEMORY', icon: 'database' });
                    };
                } else if (id === 'coherence') {
                    onClick = () => {
                        setActiveSidebarView('coherence');
                        // Open memory viewer with graph view for knowledge graph visualization
                        setLayoutAction({ type: 'open', component: 'memory-viewer', name: 'KNOWLEDGE GRAPH', icon: 'database' });
                    };
                } else if (id === 'marketplace') {
                    onClick = () => {
                        setActiveSidebarView('marketplace');
                        setLayoutAction({ type: 'open', component: 'marketplace-stage', name: 'MARKETPLACE', icon: 'zap' });
                    };
                }

                return (
                    <Reorder.Item key={id} value={id} className="relative z-10">
                        <RailButton
                            label={item.label}
                            isActive={isActive}
                            onClick={onClick}
                            icon={item.icon}
                        />
                    </Reorder.Item>
                );
            })}
        </Reorder.Group>

        {/* Plugin-Registered Navigation Items */}
        {pluginNavigations.length > 0 && (
          <div className="flex flex-col space-y-2 w-full items-center mt-2 pt-2 border-t border-border">
            {pluginNavigations.map((nav) => (
              <PluginNavButton
                key={nav.id}
                nav={nav}
                isActive={activeSidebarView === nav.view.id}
                onClick={() => {
                  setActiveSidebarView(nav.view.id as any);
                  setLayoutAction({
                    type: 'open',
                    component: nav.view.id,
                    name: nav.view.name.toUpperCase(),
                    icon: nav.view.id
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center space-y-3 mb-2 w-full pt-2 border-t border-border">
        <RailButton
            label="Network Status"
            onClick={() => {}}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            isActive={false} 
        />
        
        <div className="h-px w-6 bg-white/10" />
        
        <RailButton
            label="Settings"
            onClick={onOpenSettings}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>
    </div>
    </TooltipProvider>
  );
};
