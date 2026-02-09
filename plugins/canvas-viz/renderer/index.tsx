import React, { useState, useMemo } from 'react';

export const activate = (context: any) => {
    console.log('[Canvas Viz] Renderer activated');

    const MAX_CODE_SIZE = 51200; // 50KB
    const DEFAULT_WIDTH = 600;
    const DEFAULT_HEIGHT = 400;

    const BASE_CLASS = `
    class CanvasVisualization {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            this.animationId = null;
            this.isRunning = false;
        }

        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.animate();
        }

        stop() {
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }

        animate() {
            if (!this.isRunning) return;
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.animate());
        }

        update() {}
        draw() {}
    }
    `;

    const buildSrcdoc = (code: string, width: number, height: number) => {
        return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
        <style>html,body{margin:0;padding:0;overflow:hidden;background:#0a0a0f;width:100%;height:100%}
        canvas{display:block}
        #error-overlay{position:fixed;bottom:0;left:0;right:0;background:rgba(220,38,38,.9);color:#fff;
        font:12px/1.4 monospace;padding:8px 12px;display:none;z-index:1000;max-height:30%;overflow-y:auto}
        </style></head><body>
        <canvas id="canvas" width="${width}" height="${height}"></canvas>
        <div id="error-overlay"></div>
        <script>
        ${BASE_CLASS}
        (function(){var e=document.getElementById("error-overlay");
        window.onerror=function(m,s,l,c,err){e.style.display="block";e.textContent="Error (line "+l+"): "+m;return true};
        try{
            ${code}
        }catch(ex){e.style.display="block";e.textContent="Error: "+ex.message}})();</script>
        </body></html>`;
    };

    // Icons
    const Icon = ({ d }: { d: string }) => (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
        </svg>
    );

    const PlayIcon = () => (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
    const PauseIcon = () => <Icon d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />;
    const CodeIcon = () => <Icon d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />;
    const EditIcon = () => <Icon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />;
    const CopyIcon = () => <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />;
    const ExpandIcon = () => <Icon d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />;
    const CheckIcon = () => <Icon d="M5 13l4 4L19 7" />;
    const RefreshIcon = () => <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;

    const Btn = ({ onClick, active, title, children }: any) => (
        <button
            onClick={onClick}
            className={`p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors ${active ? 'text-cyan-400 bg-cyan-500/10' : ''}`}
            title={title}
        >
            {children}
        </button>
    );

    const CanvasRenderer = (props: any) => {
        const block = props.block;
        const code = block.content || '';

        const [view, setView] = useState<'canvas' | 'source' | 'edit'>('canvas');
        const [editCode, setEditCode] = useState(code);
        const [activeCode, setActiveCode] = useState(code);
        const [isPaused, setIsPaused] = useState(false);
        const [copied, setCopied] = useState(false);
        const [isExpanded, setIsExpanded] = useState(false);
        const [iframeKey, setIframeKey] = useState(0);

        const isOversize = code.length > MAX_CODE_SIZE;

        const dims = useMemo(() => {
            let w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT;
            if (block.meta) {
                const wm = block.meta.match(/width=(\d+)/);
                const hm = block.meta.match(/height=(\d+)/);
                if (wm) w = parseInt(wm[1], 10);
                if (hm) h = parseInt(hm[1], 10);
            }
            return { width: w, height: h };
        }, [block.meta]);

        const srcdoc = useMemo(() => {
            if (isOversize) return '';
            return buildSrcdoc(activeCode, dims.width, dims.height);
        }, [activeCode, dims.width, dims.height, iframeKey]);

        if (isOversize) {
            return (
                <div className="my-2 p-4 rounded-lg border border-red-500/30 bg-red-900/10 text-red-300 text-xs">
                    Canvas code exceeds 50KB limit ({(code.length / 1024).toFixed(1)}KB)
                </div>
            );
        }

        const containerH = isExpanded ? '80vh' : Math.min(dims.height + 40, 500) + 'px';

        return (
            <div className={`my-2 rounded-lg overflow-hidden border border-cyan-500/20 bg-gray-950 shadow-[0_0_20px_-5px_rgba(6,182,212,0.1)] ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
                <div className="flex items-center justify-between px-2 py-1 bg-gray-900/80 border-b border-cyan-500/10">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider font-bold">
                            {view === 'edit' ? 'EDITING' : view === 'source' ? 'SOURCE' : 'CANVAS'}
                        </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <Btn onClick={() => setIsPaused(p => !p)} title={isPaused ? 'Resume' : 'Pause'} active={isPaused}>
                            {isPaused ? <PlayIcon /> : <PauseIcon />}
                        </Btn>
                        <Btn onClick={() => { setIframeKey(k => k + 1); setIsPaused(false); setView('canvas'); }} title="Restart">
                            <RefreshIcon />
                        </Btn>
                        <div className="w-px h-4 bg-white/10 mx-0.5" />
                        <Btn onClick={() => setView(v => v === 'source' ? 'canvas' : 'source')} title="View Source" active={view === 'source'}>
                            <CodeIcon />
                        </Btn>
                        <Btn onClick={() => {
                            if (view === 'edit') { setActiveCode(editCode); setIframeKey(k => k + 1); setView('canvas'); }
                            else { setEditCode(activeCode); setView('edit'); }
                        }} title={view === 'edit' ? 'Save & Run' : 'Edit Source'} active={view === 'edit'}>
                            {view === 'edit' ? <CheckIcon /> : <EditIcon />}
                        </Btn>
                        <Btn onClick={() => {
                            navigator.clipboard.writeText(activeCode).then(() => {
                                setCopied(true); setTimeout(() => setCopied(false), 2000);
                            });
                        }} title={copied ? 'Copied!' : 'Copy Code'}>
                            {copied ? <CheckIcon /> : <CopyIcon />}
                        </Btn>
                        <div className="w-px h-4 bg-white/10 mx-0.5" />
                        <Btn onClick={() => setIsExpanded(e => !e)} title={isExpanded ? 'Collapse' : 'Expand'}>
                            <ExpandIcon />
                        </Btn>
                    </div>
                </div>

                <div style={{ height: containerH, position: 'relative' }}>
                    {view === 'canvas' && !isPaused && (
                        <iframe
                            key={'f-' + iframeKey}
                            srcDoc={srcdoc}
                            sandbox="allow-scripts"
                            className="w-full h-full border-0"
                            style={{ background: '#0a0a0f' }}
                            title="Canvas Visualization"
                        />
                    )}
                    {view === 'canvas' && isPaused && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-950 text-gray-500">
                            <div className="text-center">
                                <div className="text-3xl mb-2">⏸</div>
                                <div className="text-xs font-mono">Paused</div>
                            </div>
                        </div>
                    )}
                    {view === 'source' && (
                        <pre className="w-full h-full overflow-auto p-3 text-xs font-mono text-gray-300 bg-gray-950 leading-5 m-0">
                            <code>{activeCode}</code>
                        </pre>
                    )}
                    {view === 'edit' && (
                        <textarea
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="w-full h-full p-3 text-xs font-mono text-gray-200 bg-gray-950 border-0 outline-none resize-none leading-5"
                            spellCheck={false}
                            placeholder="Enter canvas JavaScript code..."
                        />
                    )}
                </div>
            </div>
        );
    };

    const { useFenceStore } = context.require('alephnet');
    const { registerRenderer } = useFenceStore.getState();

    registerRenderer({
        id: 'canvas-viz-renderer',
        languages: ['canvas', 'viz', 'canvasviz'],
        component: CanvasRenderer,
        priority: 10
    });

    console.log('[Canvas Viz] Fence renderer registered for: canvas, viz, canvasviz');
};
