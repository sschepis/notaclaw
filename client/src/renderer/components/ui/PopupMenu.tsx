import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface PopupMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean; // For checkbox items
  divider?: boolean; // Separator
}

interface PopupMenuProps {
  items: PopupMenuItem[];
  onClose: () => void;
  position?: { x: number; y: number };
  anchorEl?: HTMLElement | null;
}

export const PopupMenu: React.FC<PopupMenuProps> = ({ items, onClose, position, anchorEl }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position
  let style: React.CSSProperties = {};
  
  if (position) {
    style = { top: position.y, left: position.x };
  } else if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    // Default to bottom-left relative to anchor
    let top = rect.bottom + 5;
    let left = rect.left;
    
    // Check if it goes off screen (simple check)
    if (left + 180 > window.innerWidth) {
        left = rect.right - 180;
    }
    
    style = { top, left };
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Use capture to handle events before they reach other elements
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [onClose]);

  // Prevent right click on the menu itself from closing it or opening native context menu
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  return createPortal(
    <div 
      ref={menuRef}
      onContextMenu={handleContextMenu}
      className="fixed z-[9999] min-w-[180px] bg-gray-950 border border-gray-800 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={style}
    >
      {items.map((item, index) => {
        if (item.divider) {
            return <div key={index} className="h-px bg-gray-800 my-1" />;
        }

        return (
            <button
            key={index}
            onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) {
                item.onClick();
                onClose();
                }
            }}
            disabled={item.disabled}
            className={`
                w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                ${item.danger ? 'text-red-400 hover:bg-red-900/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            >
            {item.checked !== undefined && (
                <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${item.checked ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                {item.checked && <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
            )}
            {item.icon && <span className="w-4 h-4 opacity-70">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            </button>
        );
      })}
    </div>,
    document.body
  );
};
