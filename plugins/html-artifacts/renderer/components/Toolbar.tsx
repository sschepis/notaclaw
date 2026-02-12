import React from 'react';
import { templates } from '../templates';

interface ToolbarProps {
  title: string;
  onSave: () => void;
  onExport: () => void;
  onTemplateSelect: (templateId: string) => void;
  isSaving: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ title, onSave, onExport, onTemplateSelect, isSaving }) => {
  return (
    <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        <span className="font-semibold text-gray-200">{title || 'Untitled Artifact'}</span>
        <select 
          className="bg-gray-800 text-xs text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none focus:border-blue-500"
          onChange={(e) => onTemplateSelect(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Load Template...</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={onExport}
          className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded transition-colors text-gray-300 flex items-center space-x-1"
        >
          <span>Export</span>
        </button>
        <button 
          onClick={onSave}
          disabled={isSaving}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors text-white flex items-center space-x-1 ${isSaving ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
