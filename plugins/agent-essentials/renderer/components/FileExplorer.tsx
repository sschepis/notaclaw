import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Home, RefreshCw, Trash2, FileText, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { getIpc } from '../ipc';

interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
}

export const FileExplorer: React.FC = () => {
    const [currentPath, setCurrentPath] = useState('~/alephnet/sandbox');
    const [files, setFiles] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHidden, setShowHidden] = useState(false);

    const filteredFiles = showHidden
        ? files
        : files.filter(f => !f.startsWith('.'));

    const ipc = getIpc();

    const loadFiles = async (path: string) => {
        if (!ipc) return;
        setLoading(true);
        setError(null);
        try {
            const result = await ipc.invoke('fs:list', { path });
            setFiles(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadFileContent = async (path: string) => {
        if (!ipc) return;
        setLoading(true);
        setError(null);
        try {
            const content = await ipc.invoke('fs:read', { path });
            setFileContent(content);
            setSelectedFile(path);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles(currentPath);
    }, [currentPath]);

    const handleNavigate = (path: string) => {
        setCurrentPath(path);
        setSelectedFile(null);
    };

    const handleFileClick = (filename: string) => {
        // Simple heuristic for directory vs file based on name or previous list
        // Ideally listFiles returns stats. Assuming strings for now as per service implementation
        // Wait, FilesystemService.listFiles returns string[]. I should update it to return objects or check stats.
        // For now, let's assume if it has no extension it's a folder? No, that's bad.
        // I'll try to list it, if it fails it might be a file.
        // Or better, update FilesystemService to return entries with type.
        
        // Let's just try to navigate into it. If it fails, try to read it.
        const newPath = `${currentPath}/${filename}`;
        // This is tricky without metadata.
        // I will assume for this MVP that I can try to list it.
        loadFiles(newPath).catch(() => {
            // If listing fails, maybe it's a file
            loadFileContent(newPath);
        });
    };

    // Update: I should probably update FilesystemService to return structured data.
    // But for now, let's just use the current implementation and maybe guess or use a different IPC call.
    // Actually, I can add a `fs:stat` IPC call.
    
    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4">
            <div className="flex items-center justify-between mb-4 bg-gray-800 p-2 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-400 overflow-hidden">
                    <Home size={16} className="flex-shrink-0" />
                    <span className="truncate">{currentPath}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <button 
                        onClick={() => setShowHidden(!showHidden)} 
                        className={`p-1 rounded transition-colors ${showHidden ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-gray-400'}`}
                        title={showHidden ? "Hide hidden files" : "Show hidden files"}
                    >
                        {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => loadFiles(currentPath)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-2 text-sm">{error}</div>}

            {selectedFile ? (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center mb-2">
                        <button onClick={() => setSelectedFile(null)} className="mr-2 p-1 hover:bg-white/10 rounded">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="font-medium">{selectedFile.split('/').pop()}</span>
                    </div>
                    <textarea 
                        className="flex-1 bg-black/50 p-2 rounded font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={fileContent}
                        readOnly
                    />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
                    {currentPath !== '~/alephnet/sandbox' && (
                        <div 
                            className="flex items-center p-2 hover:bg-white/5 rounded cursor-pointer"
                            onClick={() => {
                                const parts = currentPath.split('/');
                                parts.pop();
                                setCurrentPath(parts.join('/'));
                            }}
                        >
                            <Folder size={16} className="text-yellow-500 mr-2" />
                            <span>..</span>
                        </div>
                    )}
                    {filteredFiles.map((file, idx) => (
                        <div 
                            key={idx} 
                            className="flex items-center p-2 hover:bg-white/5 rounded cursor-pointer group"
                            onClick={() => handleNavigate(`${currentPath}/${file}`)} // Optimistically navigate
                        >
                            <FileText size={16} className="text-blue-400 mr-2" />
                            <span className="flex-1">{file}</span>
                        </div>
                    ))}
                    {filteredFiles.length === 0 && !loading && (
                        <div className="text-center text-gray-500 py-4">No files found</div>
                    )}
                </div>
            )}
        </div>
    );
};
