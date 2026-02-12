import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Toolbar from './components/Toolbar';
import { compileReact } from './compiler';
import { templates } from './templates';

interface Artifact {
  id: string;
  title: string;
  type: 'html' | 'react';
  content: string;
  compiled?: string;
}

const ArtifactStudio = ({ context }: { context: any }) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [compiledContent, setCompiledContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Debounce compilation
  useEffect(() => {
    if (!selectedArtifact) {
      setCompiledContent('');
      return;
    }

    const timer = setTimeout(() => {
      if (selectedArtifact.type === 'react') {
        const html = compileReact(selectedArtifact.content);
        setCompiledContent(html);
      } else {
        setCompiledContent(selectedArtifact.content);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedArtifact?.content, selectedArtifact?.type]);

  // Load artifacts on mount
  useEffect(() => {
    if (context.ipc) {
      context.ipc.send('load-artifacts');
      
      const handleLoaded = (loaded: Artifact[]) => {
        setArtifacts(loaded);
        if (loaded.length > 0 && !selectedArtifact) {
          setSelectedArtifact(loaded[0]);
        }
      };

      const handleGenerated = (artifact: Artifact) => {
        setArtifacts(prev => {
          const exists = prev.find(a => a.id === artifact.id);
          if (exists) return prev.map(a => a.id === artifact.id ? artifact : a);
          return [...prev, artifact];
        });
        setSelectedArtifact(artifact);
      };

      context.ipc.on('artifacts-loaded', handleLoaded);
      context.ipc.on('artifact-generated', handleGenerated); // Also handles updates

      return () => {
        // Cleanup if method exists (it usually doesn't in this simple IPC mock, but good practice)
        if (context.ipc.removeListener) {
            context.ipc.removeListener('artifacts-loaded', handleLoaded);
            context.ipc.removeListener('artifact-generated', handleGenerated);
        }
      };
    } else {
        // Fallback for dev/testing without full context
        setArtifacts(templates.map(t => ({ ...t, id: Date.now() + Math.random().toString() } as Artifact)));
    }
  }, [context.ipc]);

  const handleSave = async () => {
    if (!selectedArtifact) return;
    setIsSaving(true);
    try {
      if (context.ipc) {
        context.ipc.send('save-artifact', selectedArtifact);
      }
    } finally {
      // Simulate delay if no IPC
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleExport = () => {
    if (!selectedArtifact) return;
    const blob = new Blob([selectedArtifact.type === 'react' ? compiledContent : selectedArtifact.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedArtifact.title.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const newArtifact: Artifact = {
        ...template,
        id: Date.now().toString(),
        title: `${template.title} (Copy)`
      };
      setArtifacts(prev => [...prev, newArtifact]);
      setSelectedArtifact(newArtifact);
      handleSave(); // Auto-save new creation
    }
  };

  const updateContent = (newContent: string) => {
    if (selectedArtifact) {
      setSelectedArtifact({ ...selectedArtifact, content: newContent });
    }
  };

  const handleLog = (args: any) => {
    setLogs(prev => [...prev, { type: 'log', args, time: new Date() }].slice(-50));
  };

  const handleError = (error: any) => {
    setLogs(prev => [...prev, { type: 'error', args: [error.message], time: new Date() }].slice(-50));
  };

  return (
    <div className="flex h-full text-white bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold flex items-center space-x-2">
                <span className="text-blue-400">⚡</span>
                <span>Artifacts</span>
            </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {artifacts.map(a => (
                <div 
                    key={a.id} 
                    onClick={() => setSelectedArtifact(a)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${selectedArtifact?.id === a.id ? 'bg-blue-600/20 border border-blue-500/50 text-blue-100' : 'hover:bg-gray-800 border border-transparent'}`}
                >
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <div className="flex items-center mt-1 space-x-2">
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{a.type}</span>
                    </div>
                </div>
            ))}
            <div className="pt-4 px-2">
                <button 
                    onClick={() => handleTemplateSelect(templates[0].id)}
                    className="w-full py-2 border border-dashed border-gray-700 rounded text-gray-500 hover:border-gray-500 hover:text-gray-300 transition text-sm"
                >
                    + New Artifact
                </button>
            </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar 
            title={selectedArtifact?.title || ''} 
            onSave={handleSave} 
            onExport={handleExport}
            onTemplateSelect={handleTemplateSelect}
            isSaving={isSaving}
        />
        
        {selectedArtifact ? (
            <div className="flex-1 flex overflow-hidden">
                {/* Editor */}
                <div className="w-1/2 flex flex-col border-r border-gray-800">
                    <div className="bg-[#1e1e1e] px-4 py-2 text-xs text-gray-400 border-b border-gray-800 font-mono flex justify-between">
                        <span>source.{selectedArtifact.type === 'react' ? 'tsx' : 'html'}</span>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <Editor 
                            code={selectedArtifact.content} 
                            onChange={updateContent} 
                            language={selectedArtifact.type === 'react' ? 'javascript' : 'html'}
                        />
                    </div>
                    {/* Console Log Area */}
                    <div className="h-32 bg-[#0d1117] border-t border-gray-800 flex flex-col">
                         <div className="px-2 py-1 bg-gray-900 text-[10px] text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-800">Console</div>
                         <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
                            {logs.map((log, i) => (
                                <div key={i} className={log.type === 'error' ? 'text-red-400' : 'text-gray-400'}>
                                    <span className="text-gray-600 mr-2">[{log.time.toLocaleTimeString()}]</span>
                                    {log.args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}
                                </div>
                            ))}
                            {logs.length === 0 && <div className="text-gray-600 italic">No logs...</div>}
                         </div>
                    </div>
                </div>
                
                {/* Preview */}
                <div className="w-1/2 bg-gray-100/5 p-8 flex flex-col items-center justify-center">
                    <Preview 
                        content={compiledContent} 
                        onLog={handleLog}
                        onError={handleError}
                    />
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                Select an artifact to start editing
            </div>
        )}
      </div>
    </div>
  );
};

export const activate = (context: any) => {
  console.log('[HTML Artifacts] Renderer activated');
  const { useAppStore } = context;

  // Register Main View
  context.registerComponent('sidebar:view:artifacts', {
    id: 'artifact-studio',
    component: () => <ArtifactStudio context={context} />
  });
  
  // Register Nav Item
  const ArtifactButton = () => {
      const { activeSidebarView, setActiveSidebarView } = useAppStore();
      const isActive = activeSidebarView === 'artifacts';
      
      return (
          <button
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => setActiveSidebarView('artifacts')}
              title="Artifacts"
          >
              ART
          </button>
      );
  };

  context.registerComponent('sidebar:nav-item', {
    id: 'artifact-nav',
    component: ArtifactButton
  });
};
