import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSystemItem } from '../../../shared/alephnet-types';
import { useAppStore } from '../../store/useAppStore';

interface FileNodeProps {
  item: FileSystemItem;
  level: number;
  onSelect: (item: FileSystemItem) => void;
}

const FileIcon: React.FC<{ type: 'file' | 'directory'; isOpen?: boolean }> = ({ type, isOpen }) => {
    if (type === 'directory') {
        return (
            <svg className={`w-3 h-3 text-blue-400 ${isOpen ? 'opacity-100' : 'opacity-80'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.7 7h-6.3c-.6 0-1.2-.4-1.4-1L10.8 3c-.2-.6-.8-1-1.4-1H3.3C1.5 2 0 3.5 0 5.3v13.4C0 20.5 1.5 22 3.3 22h16.4c1.8 0 3.3-1.5 3.3-3.3V10.3c0-1.8-1.5-3.3-3.3-3.3zm0 11.7H3.3V5.3h6.1l1.2 3h9.1v10.4z" />
            </svg>
        );
    }
    return (
        <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
    );
};

const FileNode: React.FC<FileNodeProps> = ({ item, level, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const toggleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'directory') {
      if (!isOpen && !hasLoaded) {
        setIsLoading(true);
        try {
          const list = await window.electronAPI.fsList({ path: item.path });
          const sorted = list.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
          });
          setChildren(sorted);
          setHasLoaded(true);
        } catch (err) {
          console.error('Failed to load directory:', err);
        } finally {
          setIsLoading(false);
        }
      }
      setIsOpen(!isOpen);
    } else {
      onSelect(item);
    }
  };

  return (
    <div>
      <motion.div
        className={`
            flex items-center py-1 px-2 cursor-pointer transition-colors duration-150
            hover:bg-white/5 text-gray-400 hover:text-gray-200 text-xs select-none group
            ${isOpen ? 'text-gray-200' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={toggleOpen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="mr-2 opacity-70 group-hover:opacity-100 transition-opacity">
            {isLoading ? (
                <div className="w-3 h-3 rounded-full border border-t-transparent border-gray-500 animate-spin" />
            ) : (
                <FileIcon type={item.type} isOpen={isOpen} />
            )}
        </span>
        <span className="truncate font-medium">{item.name}</span>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children.length === 0 && hasLoaded ? (
                <div className="py-1 px-2 text-[10px] text-gray-600 italic" style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}>
                    Empty
                </div>
            ) : (
                children.map((child) => (
                <FileNode key={child.path} item={child} level={level + 1} onSelect={onSelect} />
                ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FileTree: React.FC<{ rootPath?: string }> = ({ rootPath }) => {
  const [rootItems, setRootItems] = useState<FileSystemItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openTab } = useAppStore();

  useEffect(() => {
    const loadRoot = async () => {
      try {
        setLoading(true);
        setError(null);
        const home = rootPath || await window.electronAPI.fsHome();
        setCurrentPath(home);
        const list = await window.electronAPI.fsList({ path: home });
        const sorted = list.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
        setRootItems(sorted);
      } catch (err: any) {
        console.error('Failed to load root:', err);
        setError(err.message || 'Failed to load directory');
      } finally {
        setLoading(false);
      }
    };
    loadRoot();
  }, [rootPath]);

  const handleSelect = async (item: FileSystemItem) => {
    if (item.type === 'file') {
        // Open file in a new tab
        // We need to read the file content first, or pass the path to the tab and let it load
        // For now, let's just create a tab with the path as metadata
        try {
            const content = await window.electronAPI.fsRead({ path: item.path });
            openTab({
                id: `file-${item.path}`,
                type: 'file', // Assuming 'file' type exists or we use 'chat' for now? 
                // Wait, useAppStore defines Tab type: 'chat' | 'group' | 'feed' | 'file'
                // So 'file' is valid.
                title: item.name,
                data: { path: item.path, content }
            });
        } catch (err) {
            console.error('Failed to read file:', err);
        }
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="text-[10px] text-gray-400 font-mono truncate mr-2" title={currentPath}>
          {currentPath.split('/').pop() || currentPath}
        </div>
        <div className="flex space-x-1">
            <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        {loading ? (
            <div className="flex items-center justify-center h-20 text-gray-500 text-xs">
                Loading...
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-20 text-red-500 text-xs px-4 text-center">
                <p>Error loading directory</p>
                <p className="text-[10px] opacity-70 mt-1">{error}</p>
            </div>
        ) : (
            rootItems.map((item) => (
            <FileNode key={item.path} item={item} level={0} onSelect={handleSelect} />
            ))
        )}
      </div>
    </div>
  );
};
