import { create } from 'zustand';
import { PluginManifest, SkillManifest } from '../../shared/plugin-types';

export interface ComponentDefinition {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
  order?: number;
}

export type ExtensionFilter = 'all' | 'installed' | 'upgradeable' | 'native';

interface PluginState {
  plugins: PluginManifest[];
  availableSkills: SkillManifest[];
  filter: ExtensionFilter;
  extensions: Record<string, ComponentDefinition[]>;
  
  setPlugins: (plugins: PluginManifest[]) => void;
  setAvailableSkills: (skills: SkillManifest[]) => void;
  setFilter: (filter: ExtensionFilter) => void;
  updatePluginStatus: (id: string, status: PluginManifest['status']) => void;
  removePlugin: (id: string) => void;
  registerComponent: (slot: string, definition: ComponentDefinition) => void;
  unregisterComponent: (slot: string, id: string) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: [],
  availableSkills: [],
  filter: 'all',
  extensions: {},

  setPlugins: (plugins) => set({ plugins }),
  setAvailableSkills: (skills) => set({ availableSkills: skills }),
  setFilter: (filter) => set({ filter }),
  
  updatePluginStatus: (id, status) => set((state) => ({
    plugins: state.plugins.map(p => p.id === id ? { ...p, status } : p)
  })),

  removePlugin: (id) => set((state) => ({
    plugins: state.plugins.filter(p => p.id !== id)
  })),

  registerComponent: (slot, definition) => set((state) => {
    const currentSlot = state.extensions[slot] || [];
    // Avoid duplicates
    if (currentSlot.find(c => c.id === definition.id)) {
      return state;
    }
    const newSlot = [...currentSlot, definition].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      extensions: {
        ...state.extensions,
        [slot]: newSlot
      }
    };
  }),

  unregisterComponent: (slot, id) => set((state) => {
    const currentSlot = state.extensions[slot];
    if (!currentSlot) return state;

    return {
      extensions: {
        ...state.extensions,
        [slot]: currentSlot.filter(c => c.id !== id)
      }
    };
  })
}));
