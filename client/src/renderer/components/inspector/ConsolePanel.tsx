import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronRight, Trash2 } from 'lucide-react';

export const ConsolePanel: React.FC = () => {
    const [history, setHistory] = useState<Array<{ type: 'in' | 'out' | 'err', content: string }>>([
        { type: 'out', content: 'AlephNet Debug Console v1.0.0' },
        { type: 'out', content: 'Context: window.electronAPI, useAppStore' }
    ]);
    const [input, setInput] = useState('');
    const [historyIndex, setHistoryIndex] = useState(-1);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Filter input history for navigation
    const inputHistory = history.filter(h => h.type === 'in').map(h => h.content);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const executeCommand = async () => {
        if (!input.trim()) return;

        const cmd = input;
        setHistory(prev => [...prev, { type: 'in', content: cmd }]);
        setInput('');
        setHistoryIndex(-1);

        try {
            // eslint-disable-next-line no-eval
            const result = await eval(`(async () => { return ${cmd} })()`);
            
            setHistory(prev => [...prev, { 
                type: 'out', 
                content: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result) 
            }]);
        } catch (err: any) {
            setHistory(prev => [...prev, { type: 'err', content: err.message }]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (inputHistory.length === 0) return;
            const newIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInput(inputHistory[newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex === -1) return;
            const newIndex = Math.min(inputHistory.length - 1, historyIndex + 1);
            if (historyIndex === inputHistory.length - 1) {
                setHistoryIndex(-1);
                setInput('');
            } else {
                setHistoryIndex(newIndex);
                setInput(inputHistory[newIndex]);
            }
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setHistory([]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background font-mono text-[10px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                <div className="flex items-center space-x-2 text-muted-foreground">
                    <Terminal size={12} />
                    <span className="font-bold tracking-wider">REPL</span>
                </div>
                <button 
                    onClick={() => setHistory([])}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Clear Console (Ctrl+L)"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Output Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {history.map((entry, idx) => (
                    <div key={idx} className={`${
                        entry.type === 'in' ? 'text-muted-foreground mt-2 opacity-70' : 
                        entry.type === 'err' ? 'text-red-400 bg-red-500/10 p-1 rounded border border-red-500/20' : 'text-emerald-400'
                    } whitespace-pre-wrap break-all font-medium`}>
                        {entry.type === 'in' ? <span className="text-muted-foreground mr-2">$</span> : ''}
                        {entry.content}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border bg-muted/10 flex items-center space-x-2">
                <ChevronRight size={14} className="text-primary animate-pulse" />
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground/50"
                    placeholder="Enter command..."
                    autoFocus
                />
            </div>
        </div>
    );
};
