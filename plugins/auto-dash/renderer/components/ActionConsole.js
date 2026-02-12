"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionConsole = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ActionConsole = ({ actions, onAction }) => {
    if (!actions || actions.length === 0)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2 mt-4", children: actions.map((action, i) => ((0, jsx_runtime_1.jsx)("button", { onClick: () => onAction(action.intent, action.context), className: "px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors", children: action.label }, i))) }));
};
exports.ActionConsole = ActionConsole;
