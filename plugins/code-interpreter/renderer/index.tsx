import React, { useState } from 'react';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';

export const activate = (context: RendererPluginContext) => {
    console.log('[Code Interpreter] Renderer activated');

    const CodeBlockRenderer = ({ context: { code, language } }: any) => {
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
                        const result = eval(code);
                        
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
                    <code>{code}</code>
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
    if (context.ui.registerSlot) {
        context.ui.registerSlot('fence:renderer', {
            component: CodeBlockRenderer,
            filter: (ctx) => ctx.language === 'javascript' || ctx.language === 'js'
        });
    } else {
        // Fallback to old store if available
        try {
            const { useFenceStore } = (context as any).require('alephnet');
            const { registerRenderer } = useFenceStore.getState();
            registerRenderer({
                id: 'js-interpreter',
                languages: ['javascript', 'js'],
                component: (props: any) => <CodeBlockRenderer context={{ code: props.block.content, language: 'javascript' }} />,
                priority: 10
            });
        } catch (e) {
            console.warn('[Code Interpreter] Failed to register renderer (legacy fallback failed)', e);
        }
    }
};

