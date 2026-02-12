"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_simple_code_editor_1 = __importDefault(require("react-simple-code-editor"));
const prismjs_1 = require("prismjs");
require("prismjs/components/prism-clike");
require("prismjs/components/prism-javascript");
require("prismjs/themes/prism-tomorrow.css"); // Dark theme
const CodeEditor = ({ code, onChange }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: "h-full overflow-auto bg-gray-950 font-mono text-sm border-r border-gray-800", children: (0, jsx_runtime_1.jsx)(react_simple_code_editor_1.default, { value: code, onValueChange: onChange, highlight: code => (0, prismjs_1.highlight)(code, prismjs_1.languages.js || prismjs_1.languages.javascript, 'javascript'), padding: 10, style: {
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 12,
                backgroundColor: '#0a0a0f',
                color: '#e2e8f0',
                minHeight: '100%'
            }, textareaClassName: "focus:outline-none" }) }));
};
exports.CodeEditor = CodeEditor;
