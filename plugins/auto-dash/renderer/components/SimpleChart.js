"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleChart = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const SimpleChart = ({ title, data }) => {
    const points = Array.isArray(data) ? data : (data.points || []);
    const values = points.map((p) => typeof p === 'number' ? p : p.value || 0);
    if (values.length === 0) {
        return (0, jsx_runtime_1.jsx)("div", { className: "text-gray-500 text-xs p-4", children: "No chart data" });
    }
    const max = Math.max(...values, 100);
    const min = Math.min(...values, 0);
    const range = max - min;
    const width = 300;
    const height = 100;
    const path = values.map((val, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-800 p-4 rounded-lg shadow-md min-w-[300px]", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-gray-400 text-sm uppercase tracking-wider mb-2", children: title }), (0, jsx_runtime_1.jsxs)("svg", { width: "100%", height: height, viewBox: `0 0 ${width} ${height}`, className: "overflow-visible", children: [(0, jsx_runtime_1.jsx)("path", { d: path, fill: "none", stroke: "#60a5fa", strokeWidth: "2" }), values.map((val, i) => {
                        const x = (i / (values.length - 1)) * width;
                        const y = height - ((val - min) / range) * height;
                        return (0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: "3", fill: "#3b82f6" }, i);
                    })] })] }));
};
exports.SimpleChart = SimpleChart;
