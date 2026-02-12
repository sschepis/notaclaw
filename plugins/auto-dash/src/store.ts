import { create } from 'zustand';
import { Layout } from 'react-grid-layout';
import { WidgetInstance } from './types';

interface DashboardState {
  layouts: Record<string, any[]>; // breakpoint -> layout
  currentBreakpoint: string;
  widgets: Record<string, WidgetInstance>;
  isEditing: boolean;
  
  // Actions
  setEditing: (isEditing: boolean) => void;
  updateLayout: (layout: any[]) => void;
  addWidget: (widget: WidgetInstance, layoutItem: any) => void;
  removeWidget: (id: string) => void;
  updateWidgetConfig: (id: string, config: any) => void;
  setWidgets: (widgets: Record<string, WidgetInstance>) => void;
  setLayouts: (layouts: Record<string, any[]>) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  layouts: { lg: [] },
  currentBreakpoint: 'lg',
  widgets: {},
  isEditing: false,

  setEditing: (isEditing) => set({ isEditing }),
  
  updateLayout: (layout) => set((state) => ({
    layouts: { ...state.layouts, [state.currentBreakpoint]: layout }
  })),

  addWidget: (widget, layoutItem) => set((state) => {
    const newLayout = [...(state.layouts[state.currentBreakpoint] || []), layoutItem];
    return {
      widgets: { ...state.widgets, [widget.id]: widget },
      layouts: { ...state.layouts, [state.currentBreakpoint]: newLayout }
    };
  }),

  removeWidget: (id) => set((state) => {
    const { [id]: _, ...remainingWidgets } = state.widgets;
    const newLayout = (state.layouts[state.currentBreakpoint] || []).filter(l => l.i !== id);
    return {
      widgets: remainingWidgets,
      layouts: { ...state.layouts, [state.currentBreakpoint]: newLayout }
    };
  }),

  updateWidgetConfig: (id, config) => set((state) => ({
    widgets: {
      ...state.widgets,
      [id]: { ...state.widgets[id], config: { ...state.widgets[id].config, ...config } }
    }
  })),

  setWidgets: (widgets) => set({ widgets }),
  setLayouts: (layouts) => set({ layouts }),
}));
