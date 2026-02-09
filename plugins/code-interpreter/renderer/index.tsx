import React, { useState } from 'react';

export const activate = (context: any) => {
    console.log('[Code Interpreter] Renderer activated');

    const CodeBlockRenderer = ({ block, language }: any) => {
        const [output, setOutput] = useState<string | null>(null);
        const [isRunning, setIsRunning] = useState(false);

        const handleRun = async () => {
            setIsRunning(true);
            setOutput(null);
            
            try {
                if (language === 'javascript' || language === 'js') {
                    // Client-side execution
                    let logs: string[] = [];
                    const originalConsoleLog = console.log;
                    const originalConsoleError = console.error;
                    
                    try {
                        // Capture logs
                        console.log = (...args) => logs.push(args.map(a => String(a)).join(' '));
                        console.error = (...args) => logs.push('Error: ' + args.map(a => String(a)).join(' '));
                        
                        // Execute
                        // eslint-disable-next-line no-eval
                        const result = eval(block.content);
                        
                        if (result !== undefined) {
                            logs.push('Result: ' + String(result));
                        }
                    } catch (e: any) {
                        logs.push('Error: ' + e.message);
                    } finally {
                        console.log = originalConsoleLog;
                        console.error = originalConsoleError;
                    }
                    
                    setOutput(logs.join('\n') || 'Executed successfully (no output)');
                }
            } catch (err: any) {
                setOutput('System Error: ' + err.message);
            } finally {
                setIsRunning(false);
            }
        };

        return (
            <div className="my-2 rounded-lg overflow-hidden border border-white/10 bg-black/30">
                <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs font-mono text-gray-400 uppercase">{language}</span>
                    <button 
                        onClick={handleRun}
                        disabled={isRunning}
                        className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${isRunning ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                    >
                        {isRunning ? 'Running...' : 'Run'}
                    </button>
                </div>
                <pre className="p-3 text-sm font-mono text-gray-300 overflow-x-auto m-0">
                    <code>{block.content}</code>
                </pre>
                {output && (
                    <div className="border-t border-white/10 bg-black/50 p-3">
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Output</div>
                        <pre className="text-xs font-mono text-white whitespace-pre-wrap">{output}</pre>
                    </div>
                )}
            </div>
        );
    };

    // Register for javascript
    const { useFenceStore } = context.require('alephnet');
    const { registerRenderer } = useFenceStore.getState();

    registerRenderer({
        id: 'js-interpreter',
        languages: ['javascript', 'js'],
        component: (props: any) => <CodeBlockRenderer {...props} language="javascript" />,
        priority: 10
    });
    
    // Register sidebar button
    /*
    const CodeInterpreterButton = () => {
        return (
            <button
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                onClick={() => console.log('Code Interpreter clicked')}
                title="Code Interpreter"
            >
                CI
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'code-interpreter-nav',
        component: CodeInterpreterButton
    });
    */
};
