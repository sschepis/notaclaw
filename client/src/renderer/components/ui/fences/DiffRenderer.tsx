/**
 * DiffRenderer - Renders unified diff/patch content with syntax highlighting.
 *
 * Red/green line highlighting, monospace font, optional filename header.
 * Registered as a fence renderer for ```diff / ```patch fences.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Copy, Check, ChevronDown } from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'range';
  content: string;
  lineNumber?: number;
}

interface DiffRendererProps {
  block: FenceBlock;
}

function parseDiffLines(content: string): { lines: DiffLine[]; filename?: string } {
  const rawLines = content.split('\n');
  const lines: DiffLine[] = [];
  let filename: string | undefined;

  for (const line of rawLines) {
    if (line.startsWith('--- ') || line.startsWith('+++ ')) {
      // Extract filename from diff header
      const path = line.substring(4).trim();
      if (line.startsWith('+++ ') && path !== '/dev/null' && path !== 'b/dev/null') {
        filename = path.replace(/^[ab]\//, '');
      }
      lines.push({ type: 'header', content: line });
    } else if (line.startsWith('@@')) {
      lines.push({ type: 'range', content: line });
    } else if (line.startsWith('+')) {
      lines.push({ type: 'add', content: line.substring(1) });
    } else if (line.startsWith('-')) {
      lines.push({ type: 'remove', content: line.substring(1) });
    } else {
      lines.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line });
    }
  }

  return { lines, filename };
}

const LINE_STYLES = {
  add: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    marker: '+',
    markerColor: 'text-emerald-500',
  },
  remove: {
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    marker: '-',
    markerColor: 'text-red-500',
  },
  context: {
    bg: '',
    text: 'text-muted-foreground',
    marker: ' ',
    markerColor: 'text-muted-foreground/50',
  },
  header: {
    bg: 'bg-muted/20',
    text: 'text-muted-foreground/70',
    marker: '',
    markerColor: '',
  },
  range: {
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    marker: '',
    markerColor: '',
  },
};

export const DiffRenderer: React.FC<DiffRendererProps> = ({ block }) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { lines, filename } = useMemo(
    () => parseDiffLines(block.content),
    [block.content]
  );

  const stats = useMemo(() => {
    const adds = lines.filter(l => l.type === 'add').length;
    const removes = lines.filter(l => l.type === 'remove').length;
    return { adds, removes };
  }, [lines]);

  // Use meta as filename override
  const displayFilename = block.meta?.match(/title="([^"]+)"/)?.[1] || filename;
  const shouldShowCollapse = lines.length > 30;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy diff:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-3 rounded-lg overflow-hidden border border-border bg-muted/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-primary" />
          {displayFilename ? (
            <span className="text-xs font-mono font-medium text-foreground truncate">
              {displayFilename}
            </span>
          ) : (
            <span className="text-xs font-mono text-muted-foreground">Diff</span>
          )}

          {/* Stats */}
          <div className="flex items-center gap-1.5 ml-2">
            {stats.adds > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">+{stats.adds}</span>
            )}
            {stats.removes > 0 && (
              <span className="text-[10px] font-mono text-red-400">-{stats.removes}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {shouldShowCollapse && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <ChevronDown size={14} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            title={copied ? 'Copied!' : 'Copy diff'}
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Diff lines */}
      <div className={`overflow-x-auto transition-all duration-300 ${collapsed ? 'max-h-32' : 'max-h-[500px]'} overflow-y-auto`}>
        <pre className="text-[11px] font-mono leading-5">
          {lines.map((line, idx) => {
            const style = LINE_STYLES[line.type];
            return (
              <div key={idx} className={`flex ${style.bg} hover:bg-white/5 px-3`}>
                {/* Marker column */}
                {line.type !== 'header' && line.type !== 'range' ? (
                  <span className={`w-4 select-none flex-shrink-0 ${style.markerColor} text-right pr-2`}>
                    {style.marker}
                  </span>
                ) : (
                  <span className="w-4 flex-shrink-0" />
                )}
                {/* Content */}
                <span className={`flex-1 whitespace-pre ${style.text}`}>
                  {line.content || ' '}
                </span>
              </div>
            );
          })}
        </pre>
      </div>

      {/* Collapse button */}
      {collapsed && shouldShowCollapse && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground border-t border-border hover:bg-muted/20 transition-colors"
        >
          Show all {lines.length} lines...
        </button>
      )}
    </motion.div>
  );
};

export const DIFF_LANGUAGES = ['diff', 'patch'];
