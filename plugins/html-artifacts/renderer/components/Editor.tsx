import React from 'react';
import SimpleEditor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  language: 'html' | 'javascript';
}

const Editor: React.FC<EditorProps> = ({ code, onChange, language }) => {
  return (
    <div className="h-full w-full overflow-auto bg-[#1e1e1e] font-mono text-sm">
      <SimpleEditor
        value={code}
        onValueChange={onChange}
        highlight={code => highlight(code, language === 'html' ? languages.markup : languages.javascript, language)}
        padding={16}
        style={{
          fontFamily: '"Fira Code", "Fira Mono", monospace',
          fontSize: 14,
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          minHeight: '100%'
        }}
        textareaClassName="focus:outline-none"
      />
    </div>
  );
};

export default Editor;
