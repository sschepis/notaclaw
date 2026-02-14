import React from 'react';
import { motion } from 'framer-motion';

interface SuggestionChipsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
    disabled?: boolean;
}

/**
 * Renders a row of clickable suggestion chips below the last agent message.
 * Each chip represents a predicted next action the user might want to take.
 * Clicking a chip auto-populates and sends the message.
 */
export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
    suggestions,
    onSelect,
    disabled = false,
}) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-wrap gap-2 px-4 py-2"
        >
            {suggestions.slice(0, 4).map((suggestion, index) => (
                <motion.button
                    key={`${suggestion}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.08, duration: 0.2 }}
                    onClick={() => !disabled && onSelect(suggestion)}
                    disabled={disabled}
                    className={`
                        inline-flex items-center gap-1.5
                        px-3 py-1.5
                        text-xs font-medium
                        rounded-full
                        border border-primary/30
                        bg-primary/5 hover:bg-primary/15
                        text-primary/80 hover:text-primary
                        transition-all duration-200
                        cursor-pointer
                        disabled:opacity-40 disabled:cursor-not-allowed
                        hover:shadow-sm hover:shadow-primary/10
                        active:scale-95
                    `}
                    title={suggestion}
                >
                    <span className="text-primary/50 text-[10px]">→</span>
                    <span className="truncate max-w-[200px]">{suggestion}</span>
                </motion.button>
            ))}
        </motion.div>
    );
};
