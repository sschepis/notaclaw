import { parseFences, hasFences, extractFences, getFenceLanguages } from '../../../src/renderer/utils/FenceParser';

describe('FenceParser', () => {
  describe('parseFences', () => {
    it('should return text segment for content without fences', () => {
      const content = 'Hello, this is plain text.';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', content: 'Hello, this is plain text.' });
    });

    it('should return empty array for empty content', () => {
      const result = parseFences('');
      expect(result).toEqual([]);
    });

    it('should parse a single code fence', () => {
      const content = '```js\nconsole.log("hello");\n```';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'fence',
        lang: 'js',
        content: 'console.log("hello");',
        meta: undefined,
      });
    });

    it('should parse text before and after a code fence', () => {
      const content = 'Before\n```python\nprint("hi")\n```\nAfter';
      const result = parseFences(content);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', content: 'Before' });
      expect(result[1]).toEqual({
        type: 'fence',
        lang: 'python',
        content: 'print("hi")',
        meta: undefined,
      });
      expect(result[2]).toEqual({ type: 'text', content: 'After' });
    });

    it('should parse multiple code fences', () => {
      const content = '```js\nconst a = 1;\n```\n\n```python\nb = 2\n```';
      const result = parseFences(content);
      
      // Two fences with an empty text segment between them (which may be omitted)
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].type).toBe('fence');
      expect((result[0] as any).lang).toBe('js');
      // Find the python fence
      const pythonFence = result.find(s => s.type === 'fence' && (s as any).lang === 'python');
      expect(pythonFence).toBeDefined();
      expect((pythonFence as any).content).toBe('b = 2');
    });

    it('should parse fence with metadata', () => {
      const content = '```typescript title="example.ts"\nconst x: number = 42;\n```';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'fence',
        lang: 'typescript',
        content: 'const x: number = 42;',
        meta: 'title="example.ts"',
      });
    });

    it('should handle fence without language (defaults to text)', () => {
      const content = '```\nplain content\n```';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'fence',
        lang: 'text',
        content: 'plain content',
        meta: undefined,
      });
    });

    it('should handle tilde fences', () => {
      const content = '~~~ruby\nputs "hello"\n~~~';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'fence',
        lang: 'ruby',
        content: 'puts "hello"',
        meta: undefined,
      });
    });

    it('should handle mermaid diagrams', () => {
      const content = '```mermaid\ngraph TD\n  A --> B\n```';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'fence',
        lang: 'mermaid',
        content: 'graph TD\n  A --> B',
        meta: undefined,
      });
    });

    it('should handle custom fence types like jsviz', () => {
      const content = '```jsviz\n{"type": "bar", "data": [1,2,3]}\n```';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'fence',
        lang: 'jsviz',
        content: '{"type": "bar", "data": [1,2,3]}',
        meta: undefined,
      });
    });

    it('should preserve multi-line content inside fences', () => {
      const content = '```js\nfunction test() {\n  return 42;\n}\n```';
      const result = parseFences(content);
      
      expect(result).toHaveLength(1);
      expect((result[0] as any).content).toBe('function test() {\n  return 42;\n}');
    });
  });

  describe('hasFences', () => {
    it('should return true when content has fences', () => {
      expect(hasFences('```js\ncode\n```')).toBe(true);
    });

    it('should return false when content has no fences', () => {
      expect(hasFences('plain text')).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(hasFences('')).toBe(false);
    });
  });

  describe('extractFences', () => {
    it('should extract only fence blocks', () => {
      const content = 'Text\n```js\ncode1\n```\nMore text\n```python\ncode2\n```';
      const result = extractFences(content);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ lang: 'js', content: 'code1', meta: undefined });
      expect(result[1]).toEqual({ lang: 'python', content: 'code2', meta: undefined });
    });

    it('should return empty array when no fences', () => {
      expect(extractFences('plain text')).toEqual([]);
    });
  });

  describe('getFenceLanguages', () => {
    it('should return unique languages', () => {
      const content = '```js\na\n```\n```python\nb\n```\n```js\nc\n```';
      const result = getFenceLanguages(content);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('js');
      expect(result).toContain('python');
    });

    it('should return empty array when no fences', () => {
      expect(getFenceLanguages('plain text')).toEqual([]);
    });

    it('should lowercase language names', () => {
      const content = '```JavaScript\ncode\n```';
      const result = getFenceLanguages(content);
      
      expect(result).toContain('javascript');
    });
  });
});
