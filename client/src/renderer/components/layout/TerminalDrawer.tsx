import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsolePanel } from '../inspector/ConsolePanel';
import { useAppStore } from '../../store/useAppStore';
import { X } from 'lucide-react';

export const TerminalDrawer: React.FC = () => {
    const { isTerminalOpen, setIsTerminalOpen } = useAppStore();

    return (
        <AnimatePresence>
            {isTerminalOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 300, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full bg-background border-t border-border shadow-2xl flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between px-4 py-1 bg-muted/20 border-b border-border shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">TERMINAL</span>
                        <button 
                            onClick={() => setIsTerminalOpen(false)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ConsolePanel />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
