import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface MenuItem {
  label: string;
  shortcut?: string;
  checked?: boolean;
  onClick?: () => void;
  separator?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

interface AppMenuBarProps {
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  onOpenSettings: () => void;
}

export const AppMenuBar: React.FC<AppMenuBarProps> = ({
  inspectorOpen,
  setInspectorOpen,
  onOpenSettings,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Conversation', shortcut: '⌘N', onClick: () => {} },
        { separator: true, label: '' },
        { label: 'Settings...', shortcut: '⌘,', onClick: onOpenSettings },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: '⌘Z', onClick: () => document.execCommand('undo') },
        { label: 'Redo', shortcut: '⇧⌘Z', onClick: () => document.execCommand('redo') },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: '⌘X', onClick: () => document.execCommand('cut') },
        { label: 'Copy', shortcut: '⌘C', onClick: () => document.execCommand('copy') },
        { label: 'Paste', shortcut: '⌘V', onClick: () => document.execCommand('paste') },
        { label: 'Select All', shortcut: '⌘A', onClick: () => document.execCommand('selectAll') },
      ],
    },
    {
      label: 'View',
      items: [
        { 
          label: 'Show Inspector', 
          shortcut: '⌘I', 
          checked: inspectorOpen, 
          onClick: () => setInspectorOpen(!inspectorOpen) 
        },
        { separator: true, label: '' },
        { label: 'Toggle Terminal', shortcut: '⌘`', onClick: () => {} },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', onClick: () => window.open('https://alephnet.io/docs', '_blank') },
        { label: 'Report Issue...', onClick: () => window.open('https://github.com/alephnet/client/issues', '_blank') },
      ],
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
      // Keyboard shortcut: ⌘I to toggle inspector
      if (event.metaKey && event.key === 'i') {
        event.preventDefault();
        setInspectorOpen(!inspectorOpen);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inspectorOpen, setInspectorOpen]);

  const handleMenuClick = (menuLabel: string) => {
    setOpenMenu(openMenu === menuLabel ? null : menuLabel);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.onClick) {
      item.onClick();
    }
    setOpenMenu(null);
  };

  return (
    <div 
      ref={menuRef}
      className="flex items-center h-full pl-[76px]"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => handleMenuClick(menu.label)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
            className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${
              openMenu === menu.label
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {menu.label}
          </button>
          
          {openMenu === menu.label && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-popover/95 backdrop-blur-xl border border-border rounded-lg shadow-2xl py-1 z-[100]">
              {menu.items.map((item, index) => (
                item.separator ? (
                  <div key={index} className="h-px bg-border my-1" />
                ) : (
                  <button
                    key={index}
                    onClick={() => handleItemClick(item)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left text-[12px] text-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {item.checked !== undefined && (
                        <span className="w-4">
                          {item.checked && <Check size={12} className="text-primary" />}
                        </span>
                      )}
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <span className="text-[10px] text-muted-foreground ml-4">{item.shortcut}</span>
                    )}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
