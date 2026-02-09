/**
 * FenceParser - Parses markdown code fences from content.
 * 
 * Supports standard markdown fenced code blocks:
 * ```language
 * content
 * ```
 * 
 * Also supports metadata after language:
 * ```js title="example.js" highlight={1,3}
 * content
 * ```
 */

export type ContentSegment = 
  | { type: 'text'; content: string }
  | { type: 'fence'; lang: string; content: string; meta?: string };

/**
 * Parse content into segments of text and code fences.
 * 
 * @param content - The raw markdown content to parse
 * @returns Array of content segments
 * 
 * @example
 * const content = "Hello\n```js\nconsole.log('hi');\n```\nGoodbye";
 * const segments = parseFences(content);
 * // [
 * //   { type: 'text', content: 'Hello\n' },
 * //   { type: 'fence', lang: 'js', content: "console.log('hi');" },
 * //   { type: 'text', content: '\nGoodbye' }
 * // ]
 */
export function parseFences(content: string): ContentSegment[] {
  if (!content) return [];
  
  const segments: ContentSegment[] = [];
  const lines = content.split('\n');
  let i = 0;
  let textBuffer = '';
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for fence start (``` or ~~~)
    const fenceMatch = line.match(/^(```|~~~)(\w+)?(?:\s+(.+))?$/);
    
    if (fenceMatch) {
      const fenceChars = fenceMatch[1];
      const lang = fenceMatch[2] || 'text';
      const meta = fenceMatch[3] || undefined;
      
      // Flush text buffer before fence
      if (textBuffer) {
        segments.push({ type: 'text', content: textBuffer });
        textBuffer = '';
      }
      
      // Find the closing fence
      const fenceContent: string[] = [];
      i++;
      
      while (i < lines.length) {
        const currentLine = lines[i];
        // Check for closing fence (must match opening chars)
        if (currentLine === fenceChars) {
          break;
        }
        fenceContent.push(currentLine);
        i++;
      }
      
      segments.push({
        type: 'fence',
        lang,
        content: fenceContent.join('\n'),
        meta,
      });
      
      i++; // Skip past closing fence
    } else {
      // Regular text line
      if (textBuffer) {
        textBuffer += '\n' + line;
      } else {
        textBuffer = line;
      }
      i++;
    }
  }
  
  // Flush remaining text buffer
  if (textBuffer) {
    segments.push({ type: 'text', content: textBuffer });
  }
  
  // If no segments, return the original content as text
  if (segments.length === 0) {
    return [{ type: 'text', content }];
  }
  
  return segments;
}

/**
 * Check if content contains any code fences.
 */
export function hasFences(content: string): boolean {
  if (!content) return false;
  // Simple check for fence markers
  return /^(```|~~~)/m.test(content);
}

/**
 * Extract just the fence blocks from content (ignoring text segments).
 */
export function extractFences(content: string): Array<{ lang: string; content: string; meta?: string }> {
  return parseFences(content)
    .filter((seg): seg is Extract<ContentSegment, { type: 'fence' }> => seg.type === 'fence')
    .map(({ lang, content, meta }) => ({ lang, content, meta }));
}

/**
 * Get all unique languages used in fences.
 */
export function getFenceLanguages(content: string): string[] {
  const fences = extractFences(content);
  const langs = new Set(fences.map(f => f.lang.toLowerCase()));
  return Array.from(langs);
}
