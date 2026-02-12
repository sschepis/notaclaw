import React from 'react';

interface ToolbarProps {
    onRun: () => void;
    onPause: () => void;
    onReset: () => void;
    onExportImage: () => void;
    isPaused: boolean;
    view: 'canvas' | 'editor' | 'split';
    setView: (view: 'canvas' | 'editor' | 'split') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    onRun, onPause, onReset, onExportImage, isPaused, view, setView 
}) => {
    return (
        <div className="flex items-center justify-between px-2 py-1 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center gap-2">
                <button onClick={onRun} className="text-green-400 hover:text-green-300 text-xs px-2 py-1">
                    Run
                </button>
                <button onClick={onPause} className="text-yellow-400 hover:text-yellow-300 text-xs px-2 py-1">
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={onReset} className="text-gray-400 hover:text-white text-xs px-2 py-1">
                    Reset
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setView('canvas')} className={`text-xs px-2 py-1 ${view === 'canvas' ? 'text-blue-400' : 'text-gray-400'}`}>Canvas</button>
                <button onClick={() => setView('editor')} className={`text-xs px-2 py-1 ${view === 'editor' ? 'text-blue-400' : 'text-gray-400'}`}>Code</button>
                <button onClick={() => setView('split')} className={`text-xs px-2 py-1 ${view === 'split' ? 'text-blue-400' : 'text-gray-400'}`}>Split</button>
                <div className="w-px h-4 bg-gray-800 mx-1"></div>
                <button onClick={onExportImage} className="text-gray-400 hover:text-white text-xs px-2 py-1">
                    Export PNG
                </button>
            </div>
        </div>
    );
};
