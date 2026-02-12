import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme

interface CodeEditorProps {
    code: string;
    onChange: (code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
    return (
        <div className="h-full overflow-auto bg-gray-950 font-mono text-sm border-r border-gray-800">
            <Editor
                value={code}
                onValueChange={onChange}
                highlight={code => highlight(code, languages.js || languages.javascript, 'javascript')}
                padding={10}
                style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 12,
                    backgroundColor: '#0a0a0f',
                    color: '#e2e8f0',
                    minHeight: '100%'
                }}
                textareaClassName="focus:outline-none"
            />
        </div>
    );
};
