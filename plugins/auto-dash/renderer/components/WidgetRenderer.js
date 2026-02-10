"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetRenderer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const MetricCard_1 = require("./MetricCard");
const LogViewer_1 = require("./LogViewer");
const ActionConsole_1 = require("./ActionConsole");
const SimpleChart_1 = require("./SimpleChart");
const WidgetRenderer = ({ widget, onAction }) => {
    const renderContent = () => {
        switch (widget.type) {
            case 'metric':
                return (0, jsx_runtime_1.jsx)(MetricCard_1.MetricCard, { title: widget.title || 'Metric', data: widget.data, context: widget.context });
            case 'log':
                return (0, jsx_runtime_1.jsx)(LogViewer_1.LogViewer, { title: widget.title || 'Logs', data: widget.data });
            case 'chat':
                return (0, jsx_runtime_1.jsx)("div", { className: "text-gray-400", children: "Chat widget placeholder" });
            case 'list':
                return (0, jsx_runtime_1.jsx)("div", { className: "text-gray-400", children: "List widget placeholder" });
            case 'chart':
                return (0, jsx_runtime_1.jsx)(SimpleChart_1.SimpleChart, { title: widget.title || 'Chart', data: widget.data });
            default:
                return (0, jsx_runtime_1.jsxs)("div", { className: "text-red-400", children: ["Unknown widget type: ", widget.type] });
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2 p-2 border border-gray-800 rounded bg-gray-900/50", children: [renderContent(), widget.actions && widget.actions.length > 0 && ((0, jsx_runtime_1.jsx)(ActionConsole_1.ActionConsole, { actions: widget.actions, onAction: onAction }))] }));
};
exports.WidgetRenderer = WidgetRenderer;
