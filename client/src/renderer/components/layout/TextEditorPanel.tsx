import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Save, AlertCircle, Check } from 'lucide-react';

interface TextEditorPanelProps {
  content: string;
  filePath: string;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'md':
      return 'markdown';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'c':
    case 'cpp':
    case 'h':
      return 'cpp';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return 'text';
  }
};

export const TextEditorPanel: React.FC<TextEditorPanelProps> = ({ content, filePath }) => {
  const { updateTabData, activeTabId } = useAppStore();
  const [localContent, setLocalContent] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const language = getLanguageFromPath(filePath);

  // Sync content from props when file changes
  useEffect(() => {
    setLocalContent(content);
    setIsDirty(false);
    setSaveStatus('idle');
    setErrorMessage(null);
  }, [content, filePath]);

  // Handle content changes
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    setIsDirty(newContent !== content);
    setSaveStatus('idle');
    setErrorMessage(null);
  }, [content]);

  // Update cursor position
  const updateCursorPosition = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const text = textarea.value.substring(0, textarea.selectionStart);
      const lines = text.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      setCursorPosition({ line, col });
    }
  }, []);

  // Save file
  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage(null);
    
    try {
      await window.electronAPI.fsWrite({ path: filePath, content: localContent });
      setIsDirty(false);
      setSaveStatus('success');
      
      // Update the tab's stored content to match
      if (activeTabId && updateTabData) {
        updateTabData(activeTabId, { content: localContent });
      }
      
      // Clear success status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to save file:', err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [filePath, localContent, isDirty, isSaving, activeTabId, updateTabData]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Handle Tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert 2 spaces for tab
      const newContent = localContent.substring(0, start) + '  ' + localContent.substring(end);
      setLocalContent(newContent);
      setIsDirty(newContent !== content);
      
      // Move cursor after the inserted spaces
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [localContent, content]);

  const lineCount = localContent.split('\n').length;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300 font-mono">
      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div className="w-12 bg-[#1e1e1e] border-r border-[#3e3e42] overflow-hidden select-none flex-shrink-0">
          <div className="py-4 pr-3 text-right">
            {Array.from({ length: lineCount }, (_, i) => (
              <div 
                key={i + 1} 
                className={`text-xs leading-[1.5] h-[21px] ${
                  cursorPosition.line === i + 1 ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        
        {/* Text editor */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onSelect={updateCursorPosition}
          onClick={updateCursorPosition}
          onKeyUp={updateCursorPosition}
          className="flex-1 bg-transparent text-gray-200 resize-none outline-none p-4 font-mono text-sm leading-[1.5] overflow-auto"
          style={{
            tabSize: 2,
            caretColor: '#fff',
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
      </div>

      {/* Footer / Status Bar */}
      <div className="px-4 py-1 bg-[#007acc] text-white text-[10px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
          <span>{lineCount} lines</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-green-300">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-red-300" title={errorMessage || undefined}>
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          )}
          {isDirty && <span className="text-orange-200">Modified</span>}
          <span>{language.toUpperCase()}</span>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
              isDirty
                ? 'bg-white/20 hover:bg-white/30 cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
            title={isDirty ? 'Save (⌘S)' : 'No changes to save'}
          >
            <Save className="w-3 h-3" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
