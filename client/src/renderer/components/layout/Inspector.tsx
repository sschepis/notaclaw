import React, { useState, useMemo } from 'react';
import { CortexPanel } from '../inspector/CortexPanel';
import { MeshPanel } from '../inspector/MeshPanel';
import { SessionPanel } from '../inspector/SessionPanel';
import { LedgerPanel } from '../inspector/LedgerPanel';
import { ConsolePanel } from '../inspector/ConsolePanel';
import { Brain, Network, Eye, Wallet, Terminal } from 'lucide-react';
import { useInspectorTabs, useInspectorSections } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from '../ui/SlotErrorBoundary';

type BuiltInInspectorTab = 'Cortex' | 'Mesh' | 'Session' | 'Ledger' | 'Console';

export const Inspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Cortex');
  
  // Get plugin-registered inspector tabs
  const pluginTabs = useInspectorTabs();
  
  // Get sections for current tab
  const tabSections = useInspectorSections(activeTab);

  // Built-in tab definitions
  const builtInTabs = useMemo(() => [
    { id: 'Cortex', icon: Brain, label: 'Cortex' },
    { id: 'Mesh', icon: Network, label: 'Mesh' },
    { id: 'Session', icon: Eye, label: 'Session' },
    { id: 'Ledger', icon: Wallet, label: 'Ledger' },
    { id: 'Console', icon: Terminal, label: 'Console' },
  ], []);

  const renderBuiltInContent = () => {
    switch (activeTab as BuiltInInspectorTab) {
      case 'Cortex': return <CortexPanel />;
      case 'Mesh': return <MeshPanel />;
      case 'Session': return <SessionPanel />;
      case 'Ledger': return <LedgerPanel />;
      case 'Console': return <ConsolePanel />;
      default: return null;
    }
  };
  
  // Check if active tab is a plugin tab
  const activePluginTab = pluginTabs.find(t => t.id === activeTab);
  
  // Get top/bottom sections
  const topSections = tabSections.filter(s => s.location === 'top');
  const bottomSections = tabSections.filter(s => s.location === 'bottom');

  // Helper to render a tab button
  const renderTabButton = (id: string, Icon: React.ComponentType<any>, label: string, badge?: () => number | null) => {
    const isActive = activeTab === id;
    const badgeCount = badge?.() ?? null;
    
    return (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={`flex-none px-4 py-3 flex items-center space-x-2 transition-all duration-200 group relative ${
          isActive
            ? 'text-primary border-b-2 border-primary bg-primary/5'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Icon size={14} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} />
        <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
        {badgeCount !== null && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full h-full bg-background flex flex-col shadow-2xl z-50 font-sans">
      
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-muted/20 scrollbar-hide shrink-0">
        {/* Built-in tabs */}
        {builtInTabs.map((tab) => renderTabButton(tab.id, tab.icon, tab.label))}
        
        {/* Plugin-registered tabs */}
        {pluginTabs.map((tab) => renderTabButton(tab.id, tab.icon, tab.label, tab.badge))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-background/50 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Top sections from plugins */}
        {topSections.map((section) => {
          const SectionComponent = section.component;
          return (
            <SlotErrorBoundary key={section.id} slotId="inspector:section" extensionId={section.id}>
              <SectionComponent context={{ activeTab }} />
            </SlotErrorBoundary>
          );
        })}
        
        {/* Main content - either plugin tab or built-in */}
        {activePluginTab ? (
          <SlotErrorBoundary slotId="inspector:tab" extensionId={activePluginTab.id}>
            <activePluginTab.component context={{ activeTab }} />
          </SlotErrorBoundary>
        ) : (
          renderBuiltInContent()
        )}
        
        {/* Bottom sections from plugins */}
        {bottomSections.map((section) => {
          const SectionComponent = section.component;
          return (
            <SlotErrorBoundary key={section.id} slotId="inspector:section" extensionId={section.id}>
              <SectionComponent context={{ activeTab }} />
            </SlotErrorBoundary>
          );
        })}
      </div>
      
    </div>
  );
};
