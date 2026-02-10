"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDashView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const WidgetRenderer_1 = require("./components/WidgetRenderer");
const AutoDashView = ({ context }) => {
    const [schema, setSchema] = (0, react_1.useState)(null);
    const [lastUpdate, setLastUpdate] = (0, react_1.useState)(Date.now());
    const [generating, setGenerating] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Listen for schema updates
        const handleUpdate = (newSchema) => {
            console.log('[AutoDashView] Received schema update:', newSchema);
            setSchema(newSchema);
            setLastUpdate(Date.now());
            setGenerating(false);
        };
        context.ipc.on('autodash:update', handleUpdate);
        return () => {
            // Cleanup if necessary
        };
    }, [context]);
    const handleAction = async (intent, actionContext) => {
        console.log('[AutoDashView] Triggering action:', intent);
        const result = await context.ipc.invoke('autodash:action', { intent, context: actionContext });
        console.log('[AutoDashView] Action result:', result);
    };
    const requestAIGeneration = async () => {
        setGenerating(true);
        try {
            await context.ipc.invoke('autodash:generate', {});
        }
        catch (e) {
            console.error('[AutoDashView] AI generation failed:', e);
            setGenerating(false);
        }
    };
    if (!schema) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-full text-gray-500", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2", children: "Waiting for system data..." }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-gray-600", children: "Dashboard updates every 5 seconds" })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full w-full bg-gray-950 p-6 overflow-y-auto", children: [(0, jsx_runtime_1.jsxs)("header", { className: "mb-6 flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-white", children: "AutoDash" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsx)("button", { onClick: requestAIGeneration, disabled: generating, className: `px-3 py-1.5 text-xs rounded-md transition-colors ${generating
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'}`, children: generating ? 'Generating...' : '✨ AI Enhance' }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs text-gray-500", children: new Date(lastUpdate).toLocaleTimeString() })] })] }), (0, jsx_runtime_1.jsx)("div", { className: `grid gap-4 ${schema.layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                    schema.layout === 'focus' ? 'grid-cols-1' :
                        'grid-cols-1'}`, children: schema.widgets?.map((widget) => ((0, jsx_runtime_1.jsx)(WidgetRenderer_1.WidgetRenderer, { widget: widget, onAction: handleAction }, widget.id))) })] }));
};
exports.AutoDashView = AutoDashView;
