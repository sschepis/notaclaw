import React, { useEffect, useRef } from 'react';
import { CommandSuggestion } from '../../../services/commands/types';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandSuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: CommandSuggestion) => void;
  visible: boolean;
}

export const CommandSuggestions: React.FC<CommandSuggestionsProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  visible
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, visible]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50"
      >
        <div className="max-h-[300px] overflow-y-auto p-1" ref={listRef}>
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            const isSelected = index === selectedIndex;
            
            return (
              <div
                key={suggestion.text + index}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                  ${isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/50'}
                `}
                onClick={() => onSelect(suggestion)}
              >
                {Icon && (
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-background/20' : 'bg-muted'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{suggestion.label}</span>
                    {suggestion.category && (
                      <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold">
                        {suggestion.category}
                      </span>
                    )}
                  </div>
                  {suggestion.description && (
                    <span className="text-xs opacity-70 truncate">
                      {suggestion.description}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="px-3 py-1.5 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex gap-2">
            <span>↑↓ to navigate</span>
            <span>Tab to select</span>
          </div>
          <span>Esc to close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
