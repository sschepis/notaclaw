import { StateCreator } from 'zustand';
import { AppState, SidebarView } from './types';
import { applyTheme, Theme, DEFAULT_CUSTOM_THEME } from '../../themes';

export interface UISlice {
  activeSidebarView: SidebarView;
  isTerminalOpen: boolean;
  navOrder: string[];
  theme: string;
  customTheme: Theme;
  layoutAction: { type: 'open', component: string, name: string, icon?: string, props?: any } | null;
  
  setActiveSidebarView: (view: SidebarView) => void;
  setIsTerminalOpen: (isOpen: boolean) => void;
  setNavOrder: (order: string[]) => void;
  setTheme: (theme: string) => void;
  setCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (colors: Partial<Theme['colors']>) => void;
  setLayoutAction: (action: { type: 'open', component: string, name: string, icon?: string, props?: any } | null) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  activeSidebarView: 'explorer',
  isTerminalOpen: false,
  navOrder: (() => {
    try {
      const saved = localStorage.getItem('navOrder');
      const defaultOrder = ['explorer', 'extensions', 'messages', 'groups', 'memory', 'coherence', 'agents', 'connections', 'services'];
      
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out chat-mode if present
        const filtered = parsed.filter((id: string) => id !== 'chat-mode');
        
        if (Array.isArray(filtered) && !filtered.includes('connections')) {
            if (!filtered.includes('services')) {
                return [...filtered, 'connections', 'services'];
            }
            return [...filtered, 'connections'];
        }
        if (Array.isArray(filtered) && !filtered.includes('services')) {
            return [...filtered, 'services'];
        }
        return filtered;
      }
      
      return defaultOrder;
    } catch {
      return ['explorer', 'extensions', 'messages', 'groups', 'memory', 'coherence', 'agents', 'connections', 'services'];
    }
  })(),
  
  customTheme: (() => {
    try {
      const saved = localStorage.getItem('customTheme');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_THEME;
    } catch {
      return DEFAULT_CUSTOM_THEME;
    }
  })(),
  
  theme: (() => {
    const theme = localStorage.getItem('theme') || 'default';
    let customTheme = DEFAULT_CUSTOM_THEME;
    try {
       const savedCustom = localStorage.getItem('customTheme');
       if (savedCustom) customTheme = JSON.parse(savedCustom);
    } catch {}
    applyTheme(theme, customTheme);
    return theme;
  })(),

  layoutAction: null,

  setActiveSidebarView: (view) => set({ activeSidebarView: view }),
  setIsTerminalOpen: (isOpen) => set({ isTerminalOpen: isOpen }),
  
  setTheme: (theme) => {
    const { customTheme } = get();
    applyTheme(theme, customTheme);
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  
  setCustomTheme: (customTheme) => {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
    set({ customTheme });
    if (get().theme === 'custom') {
      applyTheme('custom', customTheme);
    }
  },
  
  updateCustomTheme: (colors) => {
    const current = get().customTheme;
    const updated = {
      ...current,
      colors: { ...current.colors, ...colors }
    };
    get().setCustomTheme(updated);
  },
  
  setNavOrder: (order) => {
    localStorage.setItem('navOrder', JSON.stringify(order));
    set({ navOrder: order });
  },

  setLayoutAction: (action) => set({ layoutAction: action }),
});
