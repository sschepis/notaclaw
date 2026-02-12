"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWidgets = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const MetricCard_1 = require("../components/MetricCard");
const LogViewer_1 = require("../components/LogViewer");
const SimpleChart_1 = require("../components/SimpleChart");
const ActionConsole_1 = require("../components/ActionConsole");
const WidgetRegistry_1 = require("../../src/WidgetRegistry");
const WidgetContext_1 = require("../WidgetContext");
// Wrappers
const MetricWidget = ({ config, data }) => ((0, jsx_runtime_1.jsx)(MetricCard_1.MetricCard, { title: config.title, data: data, context: config.context }));
const LogWidget = ({ config, data }) => ((0, jsx_runtime_1.jsx)(LogViewer_1.LogViewer, { title: config.title, data: data }));
const ChartWidget = ({ config, data }) => ((0, jsx_runtime_1.jsx)(SimpleChart_1.SimpleChart, { title: config.title, data: data }));
const ActionWidget = ({ config, data }) => {
    const { onAction } = (0, react_1.useContext)(WidgetContext_1.WidgetContext);
    return (0, jsx_runtime_1.jsx)(ActionConsole_1.ActionConsole, { actions: data?.actions || [], onAction: onAction });
};
const PlaceholderWidget = ({ config }) => ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-full text-gray-500 bg-gray-900 border border-gray-800 rounded", children: config.title || 'Placeholder' }));
// Register
const registerWidgets = () => {
    WidgetRegistry_1.widgetRegistry.register({
        type: 'metric',
        name: 'Metric Card',
        description: 'Displays a single value with trend',
        component: MetricWidget,
        defaultConfig: { title: 'New Metric', context: '' }
    });
    WidgetRegistry_1.widgetRegistry.register({
        type: 'log',
        name: 'Log Viewer',
        description: 'Displays a list of logs',
        component: LogWidget,
        defaultConfig: { title: 'System Logs' }
    });
    WidgetRegistry_1.widgetRegistry.register({
        type: 'chart',
        name: 'Simple Chart',
        description: 'Displays a line chart',
        component: ChartWidget,
        defaultConfig: { title: 'Performance' }
    });
    WidgetRegistry_1.widgetRegistry.register({
        type: 'action',
        name: 'Action Console',
        description: 'Buttons to trigger actions',
        component: ActionWidget,
        defaultConfig: { title: 'Actions' }
    });
    WidgetRegistry_1.widgetRegistry.register({
        type: 'chat',
        name: 'Chat',
        description: 'Chat interface',
        component: PlaceholderWidget,
        defaultConfig: { title: 'Chat' }
    });
    WidgetRegistry_1.widgetRegistry.register({
        type: 'list',
        name: 'List',
        description: 'List view',
        component: PlaceholderWidget,
        defaultConfig: { title: 'List' }
    });
};
exports.registerWidgets = registerWidgets;
