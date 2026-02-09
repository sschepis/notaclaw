import { useFenceStore, FenceRenderer, FenceBlock } from '../../../src/renderer/store/useFenceStore';
import React from 'react';

// Helper to reset store between tests
const resetStore = () => {
  useFenceStore.setState({
    renderers: new Map(),
    renderersById: new Map(),
  });
};

// Mock React component for testing
const MockComponent: React.FC<{ block: FenceBlock }> = ({ block }) => {
  return React.createElement('div', null, block.content);
};

describe('useFenceStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('registerRenderer', () => {
    it('should register a renderer for a language', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['javascript', 'js'],
        component: MockComponent,
        priority: 10,
      };

      const unregister = useFenceStore.getState().registerRenderer(renderer);

      expect(useFenceStore.getState().hasRenderer('javascript')).toBe(true);
      expect(useFenceStore.getState().hasRenderer('js')).toBe(true);
      expect(typeof unregister).toBe('function');
    });

    it('should handle case-insensitive language matching', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['JavaScript'],
        component: MockComponent,
      };

      useFenceStore.getState().registerRenderer(renderer);

      expect(useFenceStore.getState().hasRenderer('javascript')).toBe(true);
      expect(useFenceStore.getState().hasRenderer('JAVASCRIPT')).toBe(true);
    });

    it('should default priority to 0', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['python'],
        component: MockComponent,
      };

      useFenceStore.getState().registerRenderer(renderer);

      const retrieved = useFenceStore.getState().getRenderer('python');
      expect(retrieved?.priority).toBe(0);
    });

    it('should return an unregister function', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['ruby'],
        component: MockComponent,
      };

      const unregister = useFenceStore.getState().registerRenderer(renderer);
      expect(useFenceStore.getState().hasRenderer('ruby')).toBe(true);

      unregister();
      expect(useFenceStore.getState().hasRenderer('ruby')).toBe(false);
    });

    it('should replace existing renderer with same id', () => {
      const renderer1: FenceRenderer = {
        id: 'test-renderer',
        languages: ['markdown'],
        component: MockComponent,
        priority: 5,
      };

      const renderer2: FenceRenderer = {
        id: 'test-renderer',
        languages: ['markdown', 'md'],
        component: MockComponent,
        priority: 10,
      };

      useFenceStore.getState().registerRenderer(renderer1);
      useFenceStore.getState().registerRenderer(renderer2);

      const retrieved = useFenceStore.getState().getRenderer('markdown');
      expect(retrieved?.priority).toBe(10);
      expect(useFenceStore.getState().hasRenderer('md')).toBe(true);
    });
  });

  describe('unregisterRenderer', () => {
    it('should unregister a renderer by id', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['go', 'golang'],
        component: MockComponent,
      };

      useFenceStore.getState().registerRenderer(renderer);
      expect(useFenceStore.getState().hasRenderer('go')).toBe(true);

      useFenceStore.getState().unregisterRenderer('test-renderer');
      expect(useFenceStore.getState().hasRenderer('go')).toBe(false);
      expect(useFenceStore.getState().hasRenderer('golang')).toBe(false);
    });

    it('should handle unregistering non-existent renderer gracefully', () => {
      expect(() => {
        useFenceStore.getState().unregisterRenderer('non-existent');
      }).not.toThrow();
    });
  });

  describe('getRenderer', () => {
    it('should return the highest priority renderer for a language', () => {
      const lowPriorityRenderer: FenceRenderer = {
        id: 'low-priority',
        languages: ['typescript'],
        component: MockComponent,
        priority: 5,
      };

      const highPriorityRenderer: FenceRenderer = {
        id: 'high-priority',
        languages: ['typescript'],
        component: MockComponent,
        priority: 15,
      };

      useFenceStore.getState().registerRenderer(lowPriorityRenderer);
      useFenceStore.getState().registerRenderer(highPriorityRenderer);

      const retrieved = useFenceStore.getState().getRenderer('typescript');
      expect(retrieved?.id).toBe('high-priority');
    });

    it('should return undefined for unregistered language', () => {
      const result = useFenceStore.getState().getRenderer('unknown');
      expect(result).toBeUndefined();
    });
  });

  describe('hasRenderer', () => {
    it('should return true for registered language', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['rust'],
        component: MockComponent,
      };

      useFenceStore.getState().registerRenderer(renderer);

      expect(useFenceStore.getState().hasRenderer('rust')).toBe(true);
    });

    it('should return false for unregistered language', () => {
      expect(useFenceStore.getState().hasRenderer('unknown')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const renderer: FenceRenderer = {
        id: 'test-renderer',
        languages: ['CSS'],
        component: MockComponent,
      };

      useFenceStore.getState().registerRenderer(renderer);

      expect(useFenceStore.getState().hasRenderer('css')).toBe(true);
      expect(useFenceStore.getState().hasRenderer('CSS')).toBe(true);
    });
  });

  describe('multiple renderers', () => {
    it('should handle multiple renderers for different languages', () => {
      const jsRenderer: FenceRenderer = {
        id: 'js-renderer',
        languages: ['javascript'],
        component: MockComponent,
      };

      const pythonRenderer: FenceRenderer = {
        id: 'python-renderer',
        languages: ['python'],
        component: MockComponent,
      };

      useFenceStore.getState().registerRenderer(jsRenderer);
      useFenceStore.getState().registerRenderer(pythonRenderer);

      expect(useFenceStore.getState().hasRenderer('javascript')).toBe(true);
      expect(useFenceStore.getState().hasRenderer('python')).toBe(true);
      expect(useFenceStore.getState().getRenderer('javascript')?.id).toBe('js-renderer');
      expect(useFenceStore.getState().getRenderer('python')?.id).toBe('python-renderer');
    });

    it('should maintain priority order when removing renderers', () => {
      const renderer1: FenceRenderer = {
        id: 'renderer-1',
        languages: ['html'],
        component: MockComponent,
        priority: 10,
      };

      const renderer2: FenceRenderer = {
        id: 'renderer-2',
        languages: ['html'],
        component: MockComponent,
        priority: 5,
      };

      useFenceStore.getState().registerRenderer(renderer1);
      useFenceStore.getState().registerRenderer(renderer2);

      expect(useFenceStore.getState().getRenderer('html')?.id).toBe('renderer-1');

      useFenceStore.getState().unregisterRenderer('renderer-1');

      expect(useFenceStore.getState().getRenderer('html')?.id).toBe('renderer-2');
    });
  });
});
