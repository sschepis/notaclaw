import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '../../store/useAppStore';
import { 
  Calculator, 
  Settings, 
  User,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  Box
} from 'lucide-react';

export const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const { setActiveSidebarView } = useAppStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+K or Cmd+Shift+K
      if ((e.key === 'k' || e.key === 'K') && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[90vw] bg-gray-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center border-b border-white/10 px-3">
        <Command.Input 
            className="w-full bg-transparent p-4 text-white placeholder-gray-500 outline-none text-sm"
            placeholder="Type a command or search..." 
        />
        <div className="flex gap-1">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-gray-400">
                <span className="text-xs">⌘⇧</span>K
            </kbd>
        </div>
      </div>
      
      <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
        <Command.Empty className="py-6 text-center text-sm text-gray-500">No results found.</Command.Empty>

        <Command.Group heading="Navigation" className="text-xs font-medium text-gray-500 px-2 py-1.5 mb-2">
            <Command.Item 
                onSelect={() => runCommand(() => setActiveSidebarView('explorer'))}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors"
            >
                <MessageSquare className="w-4 h-4" />
                <span>Chat / Explorer</span>
            </Command.Item>
            <Command.Item 
                onSelect={() => runCommand(() => setActiveSidebarView('extensions'))}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors"
            >
                <Box className="w-4 h-4" />
                <span>Extensions</span>
            </Command.Item>
            <Command.Item 
                onSelect={() => runCommand(() => setActiveSidebarView('friends'))}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors"
            >
                <User className="w-4 h-4" />
                <span>Friends Panel</span>
            </Command.Item>
            <Command.Item 
                onSelect={() => runCommand(() => setActiveSidebarView('tasks'))}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors"
            >
                <ListTodo className="w-4 h-4" />
                <span>Tasks Panel</span>
            </Command.Item>
            <Command.Item 
                onSelect={() => runCommand(() => setActiveSidebarView('settings'))}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors"
            >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
            </Command.Item>
        </Command.Group>

        <Command.Group heading="System" className="text-xs font-medium text-gray-500 px-2 py-1.5 mb-2">
            <Command.Item className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors">
                <LayoutGrid className="w-4 h-4" />
                <span>Toggle Inspector</span>
            </Command.Item>
             <Command.Item className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-300 rounded-lg aria-selected:bg-blue-500/20 aria-selected:text-blue-400 cursor-pointer transition-colors">
                <Calculator className="w-4 h-4" />
                <span>Run Diagnostics</span>
            </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};
