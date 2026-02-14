import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import {
  MessageSquare,
  Bot,
  Database,
  Puzzle,
  Keyboard,
  Zap,
  Users,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// ─── Quick Action Card ───────────────────────────────────────────────────

const QuickAction: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accent?: string;
  delay?: number;
}> = ({ icon, title, description, onClick, accent = 'primary', delay = 0 }) => (
  <motion.button
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group relative flex items-start gap-3 p-4 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/30 transition-all text-left w-full backdrop-blur-sm"
  >
    <div className={`shrink-0 w-9 h-9 rounded-lg bg-${accent}/10 border border-${accent}/20 flex items-center justify-center text-${accent} group-hover:bg-${accent}/20 transition-colors`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{title}</h4>
      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
    </div>
    <ArrowRight size={14} className="shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
  </motion.button>
);

// ─── Feature Tip ─────────────────────────────────────────────────────────

const FeatureTip: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}> = ({ icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
  >
    <div className="shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h5 className="text-xs font-medium text-foreground">{title}</h5>
      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
    </div>
  </motion.div>
);

// ─── Keyboard Shortcut ───────────────────────────────────────────────────

const Shortcut: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded shadow-sm min-w-[22px]"
        >
          {key}
        </kbd>
      ))}
    </div>
  </div>
);

// ─── Welcome Page ────────────────────────────────────────────────────────

export const WelcomePage: React.FC = () => {
  const { setActiveSidebarView, startDraftConversation, setLayoutAction } = useAppStore();

  const handleStartChat = () => {
    setActiveSidebarView('messages');
    startDraftConversation();
  };

  const handleOpenMemory = () => {
    setActiveSidebarView('memory');
    setLayoutAction({ type: 'open', component: 'memory-viewer', name: 'MEMORY', icon: 'database' });
  };

  const handleOpenAgents = () => {
    setActiveSidebarView('agents');
  };

  const handleOpenExtensions = () => {
    setActiveSidebarView('extensions');
  };

  const handleOpenGroups = () => {
    setActiveSidebarView('groups');
    setLayoutAction({ type: 'open', component: 'groups', name: 'GROUPS', icon: 'groups' });
  };

  const handleOpenCoherence = () => {
    setActiveSidebarView('coherence');
    setLayoutAction({ type: 'open', component: 'memory-viewer', name: 'KNOWLEDGE GRAPH', icon: 'database' });
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-accent/8 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 bg-primary rounded-full opacity-20 blur-xl animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            <div className="relative w-full h-full rounded-full bg-card border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/20">
              <Sparkles size={24} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            Welcome to <span className="text-primary">AlephNet</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your AI-powered workspace for conversations, memory, agents, and decentralized collaboration. Here's how to get started.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={12} />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <QuickAction
              icon={<MessageSquare size={16} />}
              title="Start a Conversation"
              description="Chat with AI in the sidebar. Use the dropdown to switch between conversations."
              onClick={handleStartChat}
              delay={0.25}
            />
            <QuickAction
              icon={<Database size={16} />}
              title="Explore Memory Fields"
              description="Browse and organize your persistent knowledge base and memory fragments."
              onClick={handleOpenMemory}
              delay={0.3}
            />
            <QuickAction
              icon={<Bot size={16} />}
              title="Manage Agents"
              description="Create and configure autonomous AI agents with custom personalities and tasks."
              onClick={handleOpenAgents}
              delay={0.35}
            />
            <QuickAction
              icon={<Puzzle size={16} />}
              title="Browse Extensions"
              description="Install plugins and extensions to customize your workspace experience."
              onClick={handleOpenExtensions}
              delay={0.4}
            />
            <QuickAction
              icon={<Users size={16} />}
              title="Join Groups"
              description="Collaborate with others in shared group conversations and AI sessions."
              onClick={handleOpenGroups}
              delay={0.45}
            />
            <QuickAction
              icon={<Shield size={16} />}
              title="Coherence Network"
              description="Visualize your knowledge graph and monitor trust across decentralized nodes."
              onClick={handleOpenCoherence}
              delay={0.5}
            />
          </div>
        </motion.div>

        {/* Layout Guide */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mb-8"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers size={12} />
            Understanding the Layout
          </h2>
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex gap-2 text-[11px]">
              <div className="shrink-0 w-12 h-20 rounded-md border border-primary/40 bg-primary/5 flex items-center justify-center">
                <span className="text-primary font-mono text-[9px] font-bold vertical-text" style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>NAV</span>
              </div>
              <div className="shrink-0 w-28 h-20 rounded-md border border-blue-500/40 bg-blue-500/5 flex flex-col items-center justify-center gap-1 p-1">
                <span className="text-blue-400 font-mono text-[9px] font-bold">SIDEBAR</span>
                <span className="text-muted-foreground text-[8px]">Chat + Views</span>
              </div>
              <div className="flex-1 h-20 rounded-md border border-emerald-500/40 bg-emerald-500/5 flex flex-col items-center justify-center gap-1 p-1">
                <span className="text-emerald-400 font-mono text-[9px] font-bold">WORKSPACE</span>
                <span className="text-muted-foreground text-[8px]">This area</span>
              </div>
              <div className="shrink-0 w-20 h-20 rounded-md border border-amber-500/40 bg-amber-500/5 flex flex-col items-center justify-center gap-1 p-1">
                <span className="text-amber-400 font-mono text-[9px] font-bold">INSPECTOR</span>
                <span className="text-muted-foreground text-[8px]">Details</span>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Navigation Rail</strong> — The icon bar on the far left switches between views (Messages, Memory, Agents, etc.).
              </p>
              <p>
                <strong className="text-foreground">Sidebar</strong> — Chat conversations live here. Use the <strong className="text-foreground">dropdown at the top</strong> to switch between conversations or create new ones with the <strong className="text-foreground">+</strong> button.
              </p>
              <p>
                <strong className="text-foreground">Workspace</strong> — This central area (where you're reading this) shows contextual content like memory viewers, groups, marketplace, and more.
              </p>
              <p>
                <strong className="text-foreground">Inspector</strong> — Toggle with the panel icon in the title bar to see details about the current context.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Feature Tips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="mb-8"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            Tips & Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureTip
              icon={<MessageSquare size={14} />}
              title="Conversation Dropdown"
              description="Click the chat name at the top of the sidebar to reveal all your conversations. Search, switch, or start new ones instantly."
              delay={0.6}
            />
            <FeatureTip
              icon={<Shield size={14} />}
              title="Coherence Network"
              description="Monitor your knowledge graph's consistency and trust levels across decentralized nodes."
              delay={0.65}
            />
            <FeatureTip
              icon={<Users size={14} />}
              title="Groups & Collaboration"
              description="Join or create groups for shared conversations and collaborative AI interactions."
              delay={0.7}
            />
            <FeatureTip
              icon={<Bot size={14} />}
              title="Autonomous Agents"
              description="Deploy SRIA agents that can run tasks, execute scheduled actions, and work autonomously with custom personalities."
              delay={0.75}
            />
          </div>
        </motion.div>

        {/* Keyboard Shortcuts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="mb-10"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Keyboard size={12} />
            Keyboard Shortcuts
          </h2>
          <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
              <Shortcut keys={['⌘', 'K']} label="Command Palette" />
              <Shortcut keys={['⌘', 'N']} label="New Conversation" />
              <Shortcut keys={['⌘', ',']} label="Open Settings" />
              <Shortcut keys={['⌘', 'Enter']} label="Send Message" />
              <Shortcut keys={['⌘', 'I']} label="Toggle Inspector" />
              <Shortcut keys={['Esc']} label="Close Dialogs" />
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-center pb-6"
        >
          <p className="text-[10px] text-muted-foreground/50 font-mono tracking-wider">
            ALEPH<span className="text-primary/50">NET</span> — Decentralized Intelligence Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
};
