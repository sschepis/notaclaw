import { create } from 'zustand';
import React from 'react';

/**
 * Represents a parsed code fence block from markdown content.
 */
export interface FenceBlock {
  /** The language identifier (e.g., 'js', 'python', 'mermaid', 'jsviz') */
  lang: string;
  /** The raw content inside the fence */
  content: string;
  /** Optional metadata after the language (e.g., ```js title="example") */
  meta?: string;
}

/**
 * A fence renderer that handles specific language types.
 */
export interface FenceRenderer {
  /** Unique identifier for this renderer */
  id: string;
  /** Languages this renderer handles (e.g., ['jsviz', 'chart']) */
  languages: string[];
  /** React component that renders the fence block */
  component: React.ComponentType<{ block: FenceBlock }>;
  /** Priority (higher wins if multiple renderers match). Default: 0 */
  priority?: number;
}

interface FenceState {
  /** Map of language -> array of renderers (sorted by priority desc) */
  renderers: Map<string, FenceRenderer[]>;
  /** All registered renderers by ID */
  renderersById: Map<string, FenceRenderer>;
  
  /**
   * Register a new fence renderer.
   * @returns Unregister function
   */
  registerRenderer: (renderer: FenceRenderer) => () => void;
  
  /**
   * Unregister a renderer by ID.
   */
  unregisterRenderer: (id: string) => void;
  
  /**
   * Get the best renderer for a language.
   * Returns undefined if no renderer is registered.
   */
  getRenderer: (lang: string) => FenceRenderer | undefined;
  
  /**
   * Check if a language has a registered renderer.
   */
  hasRenderer: (lang: string) => boolean;
}

export const useFenceStore = create<FenceState>((set, get) => ({
  renderers: new Map(),
  renderersById: new Map(),

  registerRenderer: (renderer: FenceRenderer) => {
    const priority = renderer.priority ?? 0;
    const rendererWithPriority = { ...renderer, priority };
    
    set((state) => {
      const newRenderers = new Map(state.renderers);
      const newRenderersById = new Map(state.renderersById);
      
      // Add to ID map
      newRenderersById.set(renderer.id, rendererWithPriority);
      
      // Add to language maps
      for (const lang of renderer.languages) {
        const langLower = lang.toLowerCase();
        const existing = newRenderers.get(langLower) || [];
        
        // Remove any existing entry with same ID
        const filtered = existing.filter(r => r.id !== renderer.id);
        
        // Add and sort by priority (desc)
        const updated = [...filtered, rendererWithPriority].sort(
          (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
        );
        
        newRenderers.set(langLower, updated);
      }
      
      return { renderers: newRenderers, renderersById: newRenderersById };
    });
    
    // Return unregister function
    return () => get().unregisterRenderer(renderer.id);
  },

  unregisterRenderer: (id: string) => {
    set((state) => {
      const renderer = state.renderersById.get(id);
      if (!renderer) return state;
      
      const newRenderers = new Map(state.renderers);
      const newRenderersById = new Map(state.renderersById);
      
      // Remove from ID map
      newRenderersById.delete(id);
      
      // Remove from language maps
      for (const lang of renderer.languages) {
        const langLower = lang.toLowerCase();
        const existing = newRenderers.get(langLower) || [];
        const filtered = existing.filter(r => r.id !== id);
        
        if (filtered.length === 0) {
          newRenderers.delete(langLower);
        } else {
          newRenderers.set(langLower, filtered);
        }
      }
      
      return { renderers: newRenderers, renderersById: newRenderersById };
    });
  },

  getRenderer: (lang: string) => {
    const langLower = lang.toLowerCase();
    const renderers = get().renderers.get(langLower);
    return renderers?.[0]; // First one has highest priority
  },

  hasRenderer: (lang: string) => {
    const langLower = lang.toLowerCase();
    return get().renderers.has(langLower);
  },
}));
