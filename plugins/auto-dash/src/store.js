"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDashboardStore = void 0;
const zustand_1 = require("zustand");
exports.useDashboardStore = (0, zustand_1.create)((set) => ({
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
