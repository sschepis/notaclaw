import React, { useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useFenceStore } from '../../store/useFenceStore';
import { MermaidRenderer, MERMAID_LANGUAGES, HtmlArtifactRenderer, HTML_LANGUAGES } from './fences';

// KaTeX CSS is imported in index.css for proper math rendering

interface MarkdownContentProps {
  /** The raw content to parse and render */
  content: string;
  /** Additional CSS classes */
  className?: string;
}

// Language display names for the code header
const LANG_DISPLAY: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  python: 'Python',
  py: 'Python',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  cs: 'C#',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  sql: 'SQL',
  graphql: 'GraphQL',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  markdown: 'Markdown',
  md: 'Markdown',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Zsh',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  dockerfile: 'Dockerfile',
  docker: 'Docker',
  lua: 'Lua',
  vim: 'Vim',
  diff: 'Diff',
  text: 'Plain Text',
  plain: 'Plain Text',
};

// Custom syntax highlighter theme based on oneDark with tweaks
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: '1rem',
    fontSize: '0.875rem',
    lineHeight: '1.6',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '0.875rem',
    lineHeight: '1.6',
  },
};

/**
 * CodeBlock - Renders a syntax-highlighted code block with copy functionality
 */
const CodeBlock: React.FC<{
  language: string;
  value: string;
  meta?: string;
}> = ({ language, value, meta }) => {
  const [copied, setCopied] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const displayLang = LANG_DISPLAY[language?.toLowerCase()] || language?.toUpperCase() || 'CODE';
  const lines = value.split('\n');
  const lineCount = lines.length;
  const shouldShowCollapse = lineCount > 20;

  // Parse title from meta if present
  const title = meta?.match(/title="([^"]+)"/)?.[1];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

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
          <span className="text-xs font-mono font-semibold text-primary">
            {title || displayLang}
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
        <SyntaxHighlighter
          language={language || 'text'}
          style={customTheme}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'rgba(128, 128, 128, 0.5)',
            userSelect: 'none',
          }}
          customStyle={{
            margin: 0,
            background: 'transparent',
          }}
          wrapLongLines={false}
        >
          {value}
        </SyntaxHighlighter>
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

/**
 * InlineCode - Styled inline code spans
 */
const InlineCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="px-1.5 py-0.5 mx-0.5 rounded bg-muted text-primary font-mono text-[0.9em] border border-border">
    {children}
  </code>
);

/**
 * MarkdownContent - Renders markdown content with full support for:
 * - Standard markdown (headings, bold, italic, lists, links, etc.)
 * - GFM extensions (tables, strikethrough, task lists, autolinks)
 * - Math expressions (inline $...$ and block $$...$$)
 * - Syntax-highlighted code blocks
 * - Mermaid diagrams
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
}) => {
  const registerRenderer = useFenceStore((state) => state.registerRenderer);
  const getRenderer = useFenceStore((state) => state.getRenderer);

  // Register built-in Mermaid renderer on mount
  useEffect(() => {
    const unregisterMermaid = registerRenderer({
      id: 'builtin:mermaid',
      languages: MERMAID_LANGUAGES,
      component: MermaidRenderer,
      priority: 0,
    });

    const unregisterHtml = registerRenderer({
      id: 'builtin:html-artifact',
      languages: HTML_LANGUAGES,
      component: HtmlArtifactRenderer,
      priority: 0,
    });

    return () => {
      unregisterMermaid();
      unregisterHtml();
    };
  }, [registerRenderer]);

  // Custom components for react-markdown
  const components = useMemo(() => ({
    // Code blocks and inline code
    code({ inline, className: codeClassName, children }: any) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      const value = String(children).replace(/\n$/, '');

      if (!inline && language) {
        // Check for custom renderers (Mermaid, Canvas, etc.)
        const customRenderer = getRenderer(language);
        if (customRenderer) {
          const RendererComponent = customRenderer.component;
          return <RendererComponent block={{ lang: language, content: value }} />;
        }

        // Regular code block with syntax highlighting
        return <CodeBlock language={language} value={value} />;
      }

      // Inline code
      return <InlineCode>{children}</InlineCode>;
    },

    // Headings with proper styling
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold text-foreground mt-6 mb-4 pb-2 border-b border-border">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-bold text-foreground mt-5 mb-3 pb-1 border-b border-border/50">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-base font-semibold text-muted-foreground mt-3 mb-2">
        {children}
      </h4>
    ),
    h5: ({ children }: any) => (
      <h5 className="text-sm font-semibold text-muted-foreground mt-3 mb-1">
        {children}
      </h5>
    ),
    h6: ({ children }: any) => (
      <h6 className="text-sm font-medium text-muted-foreground/80 mt-2 mb-1">
        {children}
      </h6>
    ),

    // Paragraphs
    p: ({ children }: any) => (
      <p className="my-3 leading-relaxed text-foreground">
        {children}
      </p>
    ),

    // Links
    a: ({ href, children }: any) => (
      <a
        href={href}
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),

    // Strong and emphasis
    strong: ({ children }: any) => (
      <strong className="font-bold text-foreground">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-muted-foreground">{children}</em>
    ),

    // Strikethrough (GFM)
    del: ({ children }: any) => (
      <del className="line-through text-muted-foreground">{children}</del>
    ),

    // Lists
    ul: ({ children }: any) => (
      <ul className="my-3 ml-6 list-disc space-y-1 text-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="my-3 ml-6 list-decimal space-y-1 text-foreground">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed pl-1">{children}</li>
    ),

    // Task list items (GFM)
    input: ({ checked, disabled, ...props }: any) => (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="mr-2 rounded border-border bg-muted text-primary focus:ring-primary/50"
        {...props}
      />
    ),

    // Blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className="my-4 pl-4 border-l-4 border-primary/50 bg-muted/30 py-2 pr-4 rounded-r italic text-muted-foreground">
        {children}
      </blockquote>
    ),

    // Horizontal rules
    hr: () => (
      <hr className="my-6 border-t border-border" />
    ),

    // Tables (GFM)
    table: ({ children }: any) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-border/50">{children}</tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-muted/20 transition-colors">{children}</tr>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2 text-sm text-foreground">{children}</td>
    ),

    // Images
    img: ({ src, alt }: any) => (
      <span className="block my-4">
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-lg border border-border shadow-lg"
        />
        {alt && (
          <span className="block mt-2 text-center text-xs text-muted-foreground italic">
            {alt}
          </span>
        )}
      </span>
    ),

    // Pre (for code blocks without language)
    pre: ({ children }: any) => {
      // If children is already a CodeBlock (from the code component), render as-is
      if (React.isValidElement(children) && (children.type as any)?.name === 'CodeBlock') {
        return children;
      }
      // Otherwise render as a plain pre with styling
      return (
        <pre className="my-4 p-4 rounded-lg bg-muted/50 border border-border overflow-x-auto font-mono text-sm text-foreground">
          {children}
        </pre>
      );
    },
  }), [getRenderer]);

  return (
    <div className={`markdown-content prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
