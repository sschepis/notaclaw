import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ExtensionSlot } from '../ui/ExtensionSlot';
import { ExtensionsView } from './ExtensionsView';
import { TasksPanel } from './TasksPanel';
import { ConversationsPanel } from '../messaging/ConversationsPanel';
import { SocialPanel } from '../social/SocialPanel';
import { GroupsPanel } from '../groups/GroupsPanel';
import { ConnectionsPanel } from '../connections/ConnectionsPanel';
import { FileTree } from '../files/FileTree';
import { MemoryFieldPanel } from '../memory/MemoryFieldPanel';

export const Sidebar: React.FC = () => {
  const { activeSidebarView } = useAppStore();

  return (
    <div className="w-full h-full bg-card/80 backdrop-blur-xl flex flex-col shadow-2xl z-40 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto custom-scrollbar z-10 p-0">
        {activeSidebarView === 'extensions' ? (
            <div className="p-2"><ExtensionsView /></div>
        ) : activeSidebarView === 'friends' ? (
            <div className="p-2"><SocialPanel /></div>
        ) : activeSidebarView === 'tasks' ? (
            <div className="p-2"><TasksPanel /></div>
        ) : activeSidebarView === 'messages' ? (
            <ConversationsPanel />
        ) : activeSidebarView === 'groups' ? (
            <div className="p-2"><GroupsPanel /></div>
        ) : activeSidebarView === 'connections' ? (
            <div className="p-2"><ConnectionsPanel /></div>
        ) : activeSidebarView === 'memory' ? (
            <MemoryFieldPanel />
        ) : activeSidebarView === 'coherence' ? (
            <div className="p-2 h-full"><ExtensionSlot name="sidebar:view:coherence" /></div>
        ) : activeSidebarView === 'agents' ? (
            <div className="p-2 h-full"><ExtensionSlot name="sidebar:view:agents" /></div>
        ) : activeSidebarView === 'secrets' ? (
            <div className="p-2 h-full"><ExtensionSlot name="sidebar:view:secrets" /></div>
        ) : activeSidebarView === 'services' ? (
            <div className="p-2 h-full"><ExtensionSlot name="sidebar:view:services" /></div>
        ) : (
            <FileTree />
        )}
      </div>
      
    </div>
  );
};
