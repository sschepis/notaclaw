import React, { useState, useEffect } from 'react';

const ArtifactStudio = ({ context }: { context: any }) => {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);

  useEffect(() => {
    // Listen for generated artifacts from the main process
    if (context.ipc && context.ipc.on) {
        context.ipc.on('artifact-generated', (artifact: any) => {
            const newArtifact = { ...artifact, id: Date.now() };
            setArtifacts(prev => [...prev, newArtifact]);
            // Auto-select new artifact
            setSelectedArtifact(newArtifact);
        });
    }

    // Mock data for demonstration
    setArtifacts([
        { id: 1, title: 'Welcome Page', type: 'html', content: '<div style="padding: 20px; background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 8px;"><h1>Welcome to AlephNet</h1><p>This is a generated HTML artifact.</p></div>' },
        { id: 2, title: 'Status Card', type: 'html', content: '<div style="background: #1f2937; color: white; padding: 16px; border-radius: 8px; border: 1px solid #374151;"><h3>System Status</h3><div style="margin-top: 8px; display: flex; align-items: center;"><span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px;"></span><span>Operational</span></div></div>' }
    ]);
  }, [context]);

  const renderPreview = (artifact: any) => {
      if (!artifact) return <div className="text-gray-400 flex items-center justify-center h-full">Select an artifact to preview</div>;
      
      if (artifact.type === 'html') {
          return (
            <div className="h-full w-full bg-white rounded-lg shadow-inner overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 bg-gray-100 border-b px-2 py-1 text-xs text-gray-500 flex items-center">
                    <div className="flex space-x-1 mr-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    Preview
                </div>
                <div className="mt-6 p-4 h-[calc(100%-24px)] overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
                </div>
            </div>
          );
      } else {
          return <div className="text-gray-500 p-4">React preview not yet implemented</div>;
      }
  };

  return (
    <div className="flex h-full text-white bg-gray-950">
      {/* Sidebar List */}
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
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedArtifact?.id === a.id ? 'bg-blue-600/20 border border-blue-500/50 text-blue-100' : 'hover:bg-gray-800 border border-transparent'}`}
                >
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <div className="flex items-center mt-1 space-x-2">
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{a.type}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-200">{selectedArtifact?.title || 'No Selection'}</span>
            </div>
            <div className="flex space-x-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded transition-colors text-gray-300">Copy Code</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white">Download</button>
            </div>
        </div>
        
        {/* Preview/Code Split */}
        <div className="flex-1 flex overflow-hidden">
            {/* Code Editor Stub */}
            <div className="w-1/2 bg-[#0d1117] border-r border-gray-800 flex flex-col">
                <div className="bg-[#161b22] px-4 py-2 text-xs text-gray-400 border-b border-gray-800 font-mono">
                    source.html
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm text-gray-300">
                    <pre className="whitespace-pre-wrap break-all">
                        {selectedArtifact?.content || '// Select an artifact to view source'}
                    </pre>
                </div>
            </div>
            
            {/* Preview Area */}
            <div className="w-1/2 bg-gray-100/5 p-8 flex flex-col items-center justify-center">
                {renderPreview(selectedArtifact)}
            </div>
        </div>
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
