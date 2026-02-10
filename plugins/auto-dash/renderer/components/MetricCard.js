"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const MetricCard = ({ title, data, context }) => {
    const value = typeof data === 'object' ? (data.value || data.usage || data.temp || data.price) : data;
    const unit = data.unit || (context === 'weather' ? '°F' : context === 'cpu' ? '%' : '');
    const trend = data.trend;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-w-[150px]", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-gray-400 text-sm uppercase tracking-wider mb-2", children: title }), (0, jsx_runtime_1.jsxs)("div", { className: "text-3xl font-bold text-white", children: [value, (0, jsx_runtime_1.jsx)("span", { className: "text-lg text-gray-500 ml-1", children: unit })] }), trend && ((0, jsx_runtime_1.jsxs)("div", { className: `text-sm mt-2 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`, children: [trend === 'up' ? '▲' : '▼', " ", trend] }))] }));
};
exports.MetricCard = MetricCard;
