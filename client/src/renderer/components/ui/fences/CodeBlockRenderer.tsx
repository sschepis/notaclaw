import React, { useState, useRef } from 'react';
import { FenceBlock } from '../../../store/useFenceStore';

// Language display names and colors
const LANG_CONFIG: Record<string, { name: string; color: string }> = {
  javascript: { name: 'JavaScript', color: 'text-yellow-400' },
  js: { name: 'JavaScript', color: 'text-yellow-400' },
  typescript: { name: 'TypeScript', color: 'text-blue-400' },
  ts: { name: 'TypeScript', color: 'text-blue-400' },
  tsx: { name: 'TSX', color: 'text-blue-400' },
  jsx: { name: 'JSX', color: 'text-yellow-400' },
  python: { name: 'Python', color: 'text-green-400' },
  py: { name: 'Python', color: 'text-green-400' },
  rust: { name: 'Rust', color: 'text-orange-400' },
  rs: { name: 'Rust', color: 'text-orange-400' },
  go: { name: 'Go', color: 'text-cyan-400' },
  java: { name: 'Java', color: 'text-red-400' },
  cpp: { name: 'C++', color: 'text-blue-300' },
  c: { name: 'C', color: 'text-blue-300' },
  csharp: { name: 'C#', color: 'text-purple-400' },
  cs: { name: 'C#', color: 'text-purple-400' },
  ruby: { name: 'Ruby', color: 'text-red-400' },
  rb: { name: 'Ruby', color: 'text-red-400' },
  php: { name: 'PHP', color: 'text-indigo-400' },
  swift: { name: 'Swift', color: 'text-orange-400' },
  kotlin: { name: 'Kotlin', color: 'text-purple-400' },
  scala: { name: 'Scala', color: 'text-red-400' },
  html: { name: 'HTML', color: 'text-orange-400' },
  css: { name: 'CSS', color: 'text-blue-400' },
  scss: { name: 'SCSS', color: 'text-pink-400' },
  sass: { name: 'Sass', color: 'text-pink-400' },
  less: { name: 'Less', color: 'text-blue-300' },
  sql: { name: 'SQL', color: 'text-blue-400' },
  graphql: { name: 'GraphQL', color: 'text-pink-400' },
  json: { name: 'JSON', color: 'text-yellow-300' },
  yaml: { name: 'YAML', color: 'text-red-300' },
  yml: { name: 'YAML', color: 'text-red-300' },
  toml: { name: 'TOML', color: 'text-orange-300' },
  xml: { name: 'XML', color: 'text-orange-400' },
  markdown: { name: 'Markdown', color: 'text-gray-300' },
  md: { name: 'Markdown', color: 'text-gray-300' },
  bash: { name: 'Bash', color: 'text-green-400' },
  sh: { name: 'Shell', color: 'text-green-400' },
  shell: { name: 'Shell', color: 'text-green-400' },
  zsh: { name: 'Zsh', color: 'text-green-400' },
  powershell: { name: 'PowerShell', color: 'text-blue-400' },
  ps1: { name: 'PowerShell', color: 'text-blue-400' },
  dockerfile: { name: 'Dockerfile', color: 'text-blue-400' },
  docker: { name: 'Docker', color: 'text-blue-400' },
  nginx: { name: 'Nginx', color: 'text-green-400' },
  lua: { name: 'Lua', color: 'text-blue-400' },
  vim: { name: 'Vim', color: 'text-green-400' },
  diff: { name: 'Diff', color: 'text-red-400' },
  text: { name: 'Plain Text', color: 'text-gray-400' },
  plain: { name: 'Plain Text', color: 'text-gray-400' },
};

interface CodeBlockRendererProps {
  block: FenceBlock;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({ block }) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  
  const langConfig = LANG_CONFIG[block.lang.toLowerCase()] || {
    name: block.lang.toUpperCase(),
    color: 'text-gray-400',
  };
  
  // Parse title from meta if present
  const title = block.meta?.match(/title="([^"]+)"/)?.[1];
  
  // Line count for collapse threshold
  const lineCount = block.content.split('\n').length;
  const shouldShowCollapse = lineCount > 20;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };
  
  // Add line numbers
  const lines = block.content.split('\n');
  const maxLineNumWidth = String(lines.length).length;
  
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border bg-muted/50 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          
          {/* Language badge */}
          <span className={`text-xs font-mono font-semibold ${langConfig.color}`}>
            {title || langConfig.name}
          </span>
          
          {/* Line count */}
          <span className="text-[10px] text-muted-foreground font-mono">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Collapse toggle */}
          {shouldShowCollapse && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Code content */}
      <div 
        className={`overflow-x-auto transition-all duration-300 ${collapsed ? 'max-h-32' : 'max-h-[600px]'}`}
      >
        <pre
          ref={codeRef}
          className="p-4 text-sm font-mono leading-relaxed"
        >
          <code className="block">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-muted/20 -mx-4 px-4">
                {/* Line number */}
                <span 
                  className="select-none text-muted-foreground text-right pr-4 min-w-[3ch]"
                  style={{ width: `${maxLineNumWidth + 1}ch` }}
                >
                  {idx + 1}
                </span>
                {/* Code line */}
                <span className="text-foreground flex-1 whitespace-pre">
                  {line || ' '}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
      
      {/* Collapse indicator */}
      {collapsed && shouldShowCollapse && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 border-t border-border transition-colors"
        >
          Show {lineCount - 5} more lines...
        </button>
      )}
    </div>
  );
};

// Register as default renderer for common languages
export const CODE_BLOCK_LANGUAGES = Object.keys(LANG_CONFIG);
