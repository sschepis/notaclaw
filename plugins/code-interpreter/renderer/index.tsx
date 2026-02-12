import React, { useState, useEffect, useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';

// Styles for the editor
const styles = {
    root: {
        fontFamily: '"Fira code", "Fira Mono", monospace',
        fontSize: 12,
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        borderRadius: 4,
    },
}

export const activate = (context: RendererPluginContext) => {
    console.log('[Code Interpreter] Renderer activated');

    const CodeBlockRenderer = ({ context: { code: initialCode, language } }: any) => {
        const [code, setCode] = useState(initialCode);
        const [output, setOutput] = useState<string | null>(null);
        const [error, setError] = useState<string | null>(null);
        const [isRunning, setIsRunning] = useState(false);
        const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem(`code-interpreter-session-${language}`));

        useEffect(() => {
            // Update local storage if session changes
            if (sessionId) {
                localStorage.setItem(`code-interpreter-session-${language}`, sessionId);
            }
        }, [sessionId, language]);

        const highlight = (code: string) => {
            if (language === 'python' || language === 'py') {
                return Prism.highlight(code, Prism.languages.python || Prism.languages.clike, 'python');
            } else {
                return Prism.highlight(code, Prism.languages.javascript || Prism.languages.clike, 'javascript');
            }
        };

        const handleRun = async () => {
            setIsRunning(true);
            setOutput(null);
            setError(null);

            try {
                let currentSessionId = sessionId;

                // Create session if not exists
                if (!currentSessionId) {
                    const result = await context.ipc.invoke('create-session', { language: language === 'py' ? 'python' : language });
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    currentSessionId = result.sessionId;
                    setSessionId(currentSessionId);
                }

                // Execute code
                const result = await context.ipc.invoke('execute', { sessionId: currentSessionId, code });
                
                if (result.code === 0) {
                    setOutput(result.output || 'Executed successfully (no output)');
                } else {
                    setError(result.error || result.output || 'Unknown error');
                }

            } catch (err: any) {
                setError('System Error: ' + err.message);
            } finally {
                setIsRunning(false);
            }
        };

        const handleReset = async () => {
             if (sessionId) {
                 await context.ipc.invoke('end-session', { sessionId });
                 setSessionId(null);
                 localStorage.removeItem(`code-interpreter-session-${language}`);
                 setOutput(null);
                 setError(null);
             }
        };

        return (
            <div className="my-2 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e]">
                <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 uppercase">{language}</span>
                        {sessionId && <span className="text-[10px] text-green-500 bg-green-500/10 px-1 rounded">Active Session</span>}
                    </div>
                    <div className="flex gap-2">
                        {sessionId && (
                            <button 
                                onClick={handleReset}
                                disabled={isRunning}
                                className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                Reset
                            </button>
                        )}
                        <button 
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${isRunning ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                        >
                            {isRunning ? 'Running...' : 'Run'}
                        </button>
                    </div>
                </div>
                
                <div className="p-2">
                    <Editor
                        value={code}
                        onValueChange={(code: string) => setCode(code)}
                        highlight={highlight}
                        padding={10}
                        style={styles.root}
                        className="font-mono text-sm"
                    />
                </div>

                {(output || error) && (
                    <div className={`border-t border-white/10 p-3 ${error ? 'bg-red-900/20' : 'bg-black/50'}`}>
                        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider flex justify-between">
                            <span>{error ? 'Error' : 'Output'}</span>
                        </div>
                        <pre className={`text-xs font-mono whitespace-pre-wrap ${error ? 'text-red-300' : 'text-white'}`}>
                            {error || output}
                        </pre>
                    </div>
                )}
            </div>
        );
    };

    // Register for javascript and python
    if (context.ui.registerSlot) {
        context.ui.registerSlot('fence:renderer', {
            component: CodeBlockRenderer,
            filter: (ctx) => ['javascript', 'js', 'python', 'py'].includes(ctx.language)
        });
    }
};
