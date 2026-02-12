"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const AutoDashView_1 = require("./AutoDashView");
const activate = (context) => {
    console.log('[AutoDash] Renderer activated');
    const { useAppStore, ui } = context;
    const cleanups = [];
    // Register Sidebar Navigation Item
    if (ui?.registerNavigation && ui?.registerStageView) {
        cleanups.push(ui.registerStageView({
            id: 'autodash-panel',
            name: 'AutoDash',
            icon: lucide_react_1.LayoutDashboard,
            component: () => (0, jsx_runtime_1.jsx)(AutoDashView_1.AutoDashView, { context: context })
        }));
        cleanups.push(ui.registerNavigation({
            id: 'autodash-nav',
            label: 'AutoDash',
            icon: lucide_react_1.LayoutDashboard,
            view: {
                id: 'autodash-panel',
                name: 'AutoDash',
                icon: lucide_react_1.LayoutDashboard,
                component: () => (0, jsx_runtime_1.jsx)(AutoDashView_1.AutoDashView, { context: context })
            },
            order: 50
        }));
    }
    else {
        console.warn('[AutoDash] New UI API not available');
    }
    // Register Commands for Command Menu
    if (ui?.registerCommand) {
        cleanups.push(ui.registerCommand({
            id: 'autodash:open-dashboard',
            label: 'Open AutoDash Dashboard',
            icon: lucide_react_1.LayoutDashboard,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));
        cleanups.push(ui.registerCommand({
            id: 'autodash:view-metrics',
            label: 'View Dashboard Metrics',
            icon: lucide_react_1.Activity,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));
        cleanups.push(ui.registerCommand({
            id: 'autodash:refresh',
            label: 'Refresh Dashboard',
            icon: lucide_react_1.RefreshCw,
            category: 'AutoDash',
            action: () => {
                // Trigger dashboard refresh
                context.ipc?.send?.('autodash:refresh', {});
            }
        }));
        cleanups.push(ui.registerCommand({
            id: 'autodash:run-action',
            label: 'Run Dashboard Action',
            icon: lucide_react_1.Play,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));
        cleanups.push(ui.registerCommand({
            id: 'autodash:configure',
            label: 'Configure Dashboard Widgets',
            icon: lucide_react_1.Settings2,
            category: 'AutoDash',
            action: () => {
                const store = useAppStore.getState();
                store.setActiveSidebarView('autodash');
            }
        }));
    }
    context._cleanups = cleanups;
};
exports.activate = activate;
const deactivate = (context) => {
    console.log('[AutoDash] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup) => cleanup());
    }
};
exports.deactivate = deactivate;
