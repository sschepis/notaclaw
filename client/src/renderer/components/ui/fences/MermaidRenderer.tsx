import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FenceBlock } from '../../../store/useFenceStore';

interface MermaidRendererProps {
  block: FenceBlock;
}

// Mermaid diagram type detection
function detectDiagramType(content: string): string {
  const firstLine = content.trim().split('\n')[0].toLowerCase();
  
  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) return 'Flowchart';
  if (firstLine.startsWith('sequencediagram')) return 'Sequence Diagram';
  if (firstLine.startsWith('classDiagram')) return 'Class Diagram';
  if (firstLine.startsWith('statediagram')) return 'State Diagram';
  if (firstLine.startsWith('erdiagram')) return 'ER Diagram';
  if (firstLine.startsWith('journey')) return 'User Journey';
  if (firstLine.startsWith('gantt')) return 'Gantt Chart';
  if (firstLine.startsWith('pie')) return 'Pie Chart';
  if (firstLine.startsWith('gitgraph')) return 'Git Graph';
  if (firstLine.startsWith('mindmap')) return 'Mindmap';
  if (firstLine.startsWith('timeline')) return 'Timeline';
  
  return 'Diagram';
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ block }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const diagramType = detectDiagramType(block.content);
  
  const renderDiagram = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Dynamically import mermaid to keep initial bundle size small
      // @ts-ignore
      const mermaid = (await import('mermaid')).default;
      
      // Initialize mermaid with dark theme
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#6366f1',
          primaryTextColor: '#e5e7eb',
          primaryBorderColor: '#4f46e5',
          lineColor: '#9ca3af',
          secondaryColor: '#1f2937',
          tertiaryColor: '#111827',
          background: '#030712',
          mainBkg: '#111827',
          secondBkg: '#1f2937',
          nodeBorder: '#4f46e5',
          clusterBkg: '#1f2937',
          clusterBorder: '#374151',
          titleColor: '#f3f4f6',
          edgeLabelBackground: '#1f2937',
          nodeTextColor: '#e5e7eb',
        },
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 14,
        securityLevel: 'loose',
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          padding: 20,
        },
        sequence: {
          useMaxWidth: true,
          showSequenceNumbers: true,
        },
      });
      
      // Generate unique ID for this render
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Render the diagram
      const { svg: renderedSvg } = await mermaid.render(id, block.content);
      setSvg(renderedSvg);
      
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
    } finally {
      setLoading(false);
    }
  }, [block.content]);
  
  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);
  
  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleDownloadSvg = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const handleZoomReset = () => setZoom(1);
  
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-gray-900/80 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Mermaid icon */}
          <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          
          <span className="text-xs font-semibold text-pink-400">
            Mermaid
          </span>
          
          <span className="text-[10px] text-gray-500 font-medium">
            {diagramType}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 mr-2 bg-gray-800/50 rounded-md p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors font-mono"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Toggle source */}
          <button
            onClick={() => setShowSource(!showSource)}
            className={`p-1.5 rounded transition-colors ${
              showSource 
                ? 'text-pink-400 bg-pink-400/10' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title={showSource ? 'Hide source' : 'Show source'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          
          {/* Copy source */}
          <button
            onClick={handleCopySource}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Copy source"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          
          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            disabled={!svg}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download SVG"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="relative">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Rendering diagram...</span>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="p-4 bg-red-500/10 border-t border-red-500/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Failed to render diagram</p>
                <p className="text-xs text-red-300/70 mt-1 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Rendered diagram */}
        {svg && !loading && (
          <div 
            className="overflow-auto p-4 bg-gray-950/50"
            style={{ maxHeight: '500px' }}
          >
            <div
              ref={containerRef}
              className="flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        )}
        
        {/* Source view */}
        {showSource && (
          <div className="border-t border-white/5 bg-gray-950/50">
            <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
              <code>{block.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// Languages this renderer handles
export const MERMAID_LANGUAGES = ['mermaid', 'mmd'];
