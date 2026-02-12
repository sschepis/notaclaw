import React, { useState, useEffect, useRef, useMemo } from 'react';
import { buildHtml, LIBRARIES } from './utils/sandbox';
import { CodeEditor } from './components/CodeEditor';
import { Toolbar } from './components/Toolbar';

export const activate = (context: any) => {
    console.log('[Canvas Viz] Renderer activated');
    const { useFenceStore } = context.require('alephnet');
    const { registerRenderer } = useFenceStore.getState();

    const CanvasRenderer = (props: any) => {
        const { block } = props;
        const initialCode = block.content || '';
        
        const [code, setCode] = useState(initialCode);
        const [view, setView] = useState<'canvas' | 'editor' | 'split'>('split');
        const [isPaused, setIsPaused] = useState(false);
        const [iframeSrc, setIframeSrc] = useState('');
        const iframeRef = useRef<HTMLIFrameElement>(null);

        // Parse libraries from meta (e.g. ```canvas meta="d3,three" ... ```)
        const libraries = useMemo(() => {
            const libs: string[] = [];
            const meta = block.meta || '';
            if (meta.includes('d3')) libs.push(LIBRARIES.d3);
            if (meta.includes('three')) libs.push(LIBRARIES.three);
            if (meta.includes('chartjs')) libs.push(LIBRARIES.chartjs);
            if (meta.includes('p5')) libs.push(LIBRARIES.p5);
            return libs;
        }, [block.meta]);

        useEffect(() => {
            const html = buildHtml(code, libraries);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            setIframeSrc(url);
            
            return () => URL.revokeObjectURL(url);
        }, [libraries]); // Only rebuild if libs change, code change handled by Run button

        // Initial run
        useEffect(() => {
             handleRun();
        }, []);

        const handleRun = () => {
            const html = buildHtml(code, libraries);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            setIframeSrc(url);
            setIsPaused(false);
        };

        const handlePause = () => {
            const newPaused = !isPaused;
            setIsPaused(newPaused);
            iframeRef.current?.contentWindow?.postMessage({ type: newPaused ? 'pause' : 'resume' }, '*');
        };
        
        const handleReset = () => {
            setCode(initialCode);
            // We need to trigger run after state update, but state update is async.
            // For simplicity, we just set code. User can click run.
            // Or use effect.
        };
        
        const handleExportImage = () => {
             iframeRef.current?.contentWindow?.postMessage({ type: 'export-image' }, '*');
        };
        
        useEffect(() => {
            const handler = (e: MessageEvent) => {
                if (e.data.type === 'export-image-data') {
                    const a = document.createElement('a');
                    a.href = e.data.payload;
                    a.download = 'visualization.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            };
            window.addEventListener('message', handler);
            return () => window.removeEventListener('message', handler);
        }, []);

        return (
            <div className="flex flex-col h-[500px] border border-gray-800 rounded bg-gray-950 overflow-hidden my-2 shadow-lg">
                <Toolbar 
                    onRun={handleRun} 
                    onPause={handlePause} 
                    onReset={handleReset} 
                    onExportImage={handleExportImage}
                    isPaused={isPaused}
                    view={view}
                    setView={setView}
                />
                <div className="flex-1 flex overflow-hidden relative">
                    {(view === 'split' || view === 'editor') && (
                        <div className={`${view === 'split' ? 'w-1/2' : 'w-full'} h-full border-r border-gray-800 overflow-hidden`}>
                            <CodeEditor code={code} onChange={setCode} />
                        </div>
                    )}
                    {(view === 'split' || view === 'canvas') && (
                        <div className={`${view === 'split' ? 'w-1/2' : 'w-full'} h-full bg-black relative`}>
                            <iframe 
                                ref={iframeRef}
                                src={iframeSrc} 
                                className="w-full h-full border-0 block"
                                sandbox="allow-scripts allow-popups allow-downloads allow-modals" 
                                title="Canvas Visualization"
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    registerRenderer({
        id: 'canvas-viz-renderer',
        languages: ['canvas', 'viz', 'canvasviz'],
        component: CanvasRenderer,
        priority: 10
    });
    
    console.log('[Canvas Viz] Fence renderer registered');
};
