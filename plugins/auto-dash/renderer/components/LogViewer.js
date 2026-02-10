"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogViewer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const LogViewer = ({ title, data }) => {
    const logs = Array.isArray(data) ? data : [];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full max-h-[300px]", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-gray-800 px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-700", children: title }), (0, jsx_runtime_1.jsxs)("div", { className: "p-2 overflow-y-auto flex-1 font-mono text-xs space-y-1", children: [logs.map((log, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-gray-500", children: ["[", new Date(log.timestamp || Date.now()).toLocaleTimeString(), "]"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-green-400", children: [log.source || 'SYSTEM', ":"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-gray-300", children: typeof log.data === 'object' ? JSON.stringify(log.data) : log.data })] }, i))), logs.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "text-gray-600 italic p-2", children: "No logs available" }))] })] }));
};
exports.LogViewer = LogViewer;
