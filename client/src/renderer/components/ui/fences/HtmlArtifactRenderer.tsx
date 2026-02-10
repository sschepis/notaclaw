import React, { useState, useEffect } from 'react';
import { FenceBlock } from '../../../store/useFenceStore';
import { CodeBlockRenderer } from './CodeBlockRenderer';
import { Eye, Code, RefreshCw } from 'lucide-react';

interface HtmlArtifactRendererProps {
  block: FenceBlock;
}

export const HtmlArtifactRenderer: React.FC<HtmlArtifactRendererProps> = ({ block }) => {
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [key, setKey] = useState(0); // For reloading iframe

  const reload = () => setKey(k => k + 1);

  // If content changes, reload
  useEffect(() => {
    reload();
  }, [block.content]);

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border bg-muted/30 shadow-sm flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground px-2">HTML Artifact</span>
        </div>
        <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-lg border border-border/50">
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'preview' 
                ? 'bg-background text-primary shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'code' 
                ? 'bg-background text-primary shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Code size={14} />
            Code
          </button>
        </div>
        <div className="flex items-center gap-1">
             {mode === 'preview' && (
                <button 
                    onClick={reload}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Reload Preview"
                >
                    <RefreshCw size={14} />
                </button>
             )}
        </div>
      </div>

      {/* Content */}
      <div className="relative bg-background flex-1 min-h-0">
        {mode === 'preview' ? (
          <div className="w-full h-[400px] resize-y overflow-auto bg-white dark:bg-zinc-950">
             <iframe
                key={key}
                srcDoc={block.content}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-popups allow-modals"
                title="HTML Preview"
             />
          </div>
        ) : (
             <div className="overflow-hidden [&>div]:my-0 [&>div]:border-0 [&>div]:shadow-none [&>div]:bg-transparent">
                 <CodeBlockRenderer block={block} />
             </div>
        )}
      </div>
    </div>
  );
};

export const HTML_LANGUAGES = ['html', 'htm'];
