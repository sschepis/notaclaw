"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const AutoDashView_1 = require("./AutoDashView");
const activate = (context) => {
    console.log('[AutoDash] Renderer activated');
    const { React, useAppStore } = context;
    // 1. Create the Sidebar Button Component
    const AutoDashButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'autodash';
        return ((0, jsx_runtime_1.jsx)("button", { className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`, onClick: () => setActiveSidebarView('autodash'), title: "AutoDash", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("line", { x1: "3", y1: "9", x2: "21", y2: "9" }), (0, jsx_runtime_1.jsx)("line", { x1: "9", y1: "21", x2: "9", y2: "9" })] }) }));
    };
    // 2. Register Sidebar Navigation Item
    context.ui.registerNavigation({
        id: 'autodash-nav',
        label: 'AutoDash',
        icon: 'dashboard', // Fallback if component not used in some contexts
        view: {
            id: 'autodash-view',
            name: 'AutoDash',
            icon: 'dashboard',
            component: () => (0, jsx_runtime_1.jsx)(AutoDashView_1.AutoDashView, { context: context })
        },
        order: 50
    });
    // 3. Register Sidebar Component (Legacy/Alternative method if navigation registration isn't enough)
    // Some systems separate the button from the view logic
    if (context.registerComponent) {
        context.registerComponent('sidebar:nav-item', {
            id: 'autodash-nav-btn',
            component: AutoDashButton
        });
        context.registerComponent('sidebar:view:autodash', {
            id: 'autodash-panel',
            component: () => (0, jsx_runtime_1.jsx)(AutoDashView_1.AutoDashView, { context: context })
        });
    }
};
exports.activate = activate;
