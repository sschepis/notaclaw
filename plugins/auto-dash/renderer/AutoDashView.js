"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDashView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_grid_layout_1 = __importStar(require("react-grid-layout"));
const store_1 = require("../src/store");
const WidgetRegistry_1 = require("../src/WidgetRegistry");
const index_1 = require("./widgets/index");
const WidgetContext_1 = require("./WidgetContext");
const ResponsiveGridLayout = (0, react_grid_layout_1.default)(react_grid_layout_1.Responsive);
const AutoDashView = ({ context }) => {
    const { layouts, widgets, updateLayout, isEditing, setEditing, setWidgets, setLayouts, addWidget, removeWidget } = (0, store_1.useDashboardStore)();
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        (0, index_1.registerWidgets)();
        setMounted(true);
        const handleUpdate = (newSchema) => {
            console.log('[AutoDashView] Received update:', newSchema);
            if (newSchema.widgets) {
                const newWidgets = {};
                const newLayout = [];
                newSchema.widgets.forEach((w, i) => {
                    const id = w.id || `widget-${i}`;
                    newWidgets[id] = {
                        id: id,
                        type: w.type,
                        config: { title: w.title, context: w.context, ...w.config },
                        dataSource: w.dataSource,
                        data: w.data
                    };
                    // Use saved layout if available
                    const savedLayout = w.config?.layout;
                    newLayout.push({
                        i: id,
                        x: savedLayout ? savedLayout.x : (i * 4) % 12,
                        y: savedLayout ? savedLayout.y : Math.floor((i * 4) / 12) * 4,
                        w: savedLayout ? savedLayout.w : 4,
                        h: savedLayout ? savedLayout.h : 4
                    });
                });
                setWidgets(newWidgets);
                setLayouts({ lg: newLayout });
            }
        };
        context.ipc.on('autodash:update', handleUpdate);
        return () => {
        };
    }, [context, setWidgets, setLayouts]);
    const onLayoutChange = (layout, allLayouts) => {
        updateLayout(layout);
    };
    const handleSave = async () => {
        setEditing(false);
        const currentWidgets = Object.values(widgets).map(w => {
            const l = (layouts['lg'] || []).find((l) => l.i === w.id);
            return {
                id: w.id,
                type: w.type,
                title: w.config.title,
                context: w.config.context,
                config: {
                    ...w.config,
                    layout: l ? { x: l.x, y: l.y, w: l.w, h: l.h } : undefined
                },
                dataSource: w.dataSource,
                data: w.data
            };
        });
        await context.ipc.invoke('autodash:save-layout', {
            layout: 'grid',
            widgets: currentWidgets
        });
    };
    const handleAction = (intent, actionContext) => {
        context.ipc.invoke('autodash:action', { intent, context: actionContext });
    };
    const widgetContextValue = (0, react_1.useMemo)(() => ({ onAction: handleAction }), [context]);
    const requestAIGeneration = async () => {
        try {
            await context.ipc.invoke('autodash:generate', {});
        }
        catch (e) {
            console.error('AI Generation failed', e);
        }
    };
    const handleAddWidget = () => {
        const id = `new-widget-${Date.now()}`;
        const newWidget = {
            id,
            type: 'metric',
            config: { title: 'New Metric' },
            data: { value: 0, unit: 'units' }
        };
        const layoutItem = {
            i: id,
            x: 0,
            y: Infinity,
            w: 4,
            h: 4
        };
        addWidget(newWidget, layoutItem);
    };
    if (!mounted)
        return (0, jsx_runtime_1.jsx)("div", { className: "p-4 text-gray-400", children: "Initializing AutoDash..." });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full w-full bg-gray-950 flex flex-col overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800 shrink-0", children: [(0, jsx_runtime_1.jsxs)("h1", { className: "text-xl font-bold text-white flex items-center gap-2", children: ["AutoDash", (0, jsx_runtime_1.jsx)("span", { className: "text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded", children: "v2.0" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [isEditing && ((0, jsx_runtime_1.jsx)("button", { onClick: handleAddWidget, className: "px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors", children: "+ Add Widget" })), (0, jsx_runtime_1.jsxs)("button", { onClick: requestAIGeneration, className: "px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2728" }), " AI Enhance"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => isEditing ? handleSave() : setEditing(true), className: `px-3 py-1 rounded text-sm transition-colors ${isEditing ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`, children: isEditing ? 'Save & Done' : 'Edit Layout' })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto p-4", children: (0, jsx_runtime_1.jsx)(WidgetContext_1.WidgetContext.Provider, { value: widgetContextValue, children: Object.keys(widgets).length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center h-full text-gray-500", children: [(0, jsx_runtime_1.jsx)("p", { className: "mb-4", children: "No widgets configured." }), (0, jsx_runtime_1.jsx)("button", { onClick: requestAIGeneration, className: "px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm", children: "Ask AI to build a dashboard" })] })) : ((0, jsx_runtime_1.jsx)(ResponsiveGridLayout, { className: "layout", layouts: layouts, breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }, cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }, rowHeight: 30, onLayoutChange: onLayoutChange, isDraggable: isEditing, isResizable: isEditing, draggableHandle: ".drag-handle", margin: [10, 10], children: Object.values(widgets).map((widget) => {
                            const def = WidgetRegistry_1.widgetRegistry.get(widget.type);
                            if (!def) {
                                return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-900/20 border border-red-800 rounded p-2 text-red-400 text-xs", children: ["Unknown widget: ", widget.type] }, widget.id));
                            }
                            const Component = def.component;
                            return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow", children: [isEditing && ((0, jsx_runtime_1.jsxs)("div", { className: "drag-handle h-6 bg-gray-800/80 cursor-move flex items-center px-2 border-b border-gray-800 shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-gray-400 font-mono", children: def.name }), (0, jsx_runtime_1.jsx)("div", { className: "ml-auto flex gap-1", children: (0, jsx_runtime_1.jsx)("button", { className: "text-gray-500 hover:text-red-400 px-1", onClick: (e) => {
                                                        e.stopPropagation(); // Prevent drag start
                                                        if (confirm('Remove widget?')) {
                                                            removeWidget(widget.id);
                                                        }
                                                    }, children: "\u00D7" }) })] })), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-auto p-2 relative", children: (0, jsx_runtime_1.jsx)(Component, { id: widget.id, config: widget.config, data: widget.data || {} }) })] }, widget.id));
                        }) })) }) })] }));
};
exports.AutoDashView = AutoDashView;
